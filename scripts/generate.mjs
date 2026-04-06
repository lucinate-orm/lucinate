#!/usr/bin/env node
/**
 * Generate files: migration | model | seeder
 *
 * Usage:
 *   node scripts/generate.mjs migration <name> [--create|--alter]
 *   node scripts/generate.mjs model <Name> [--table users]
 *   node scripts/generate.mjs seeder <name>
 *
 * Options: --skip-build, --dir, --import-from lucinate, --contents-from
 */
import { parseArgs } from 'node:util'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join, relative, resolve, isAbsolute } from 'node:path'
import { getPackageRoot } from './lib/resolve-pkg.mjs'
import { compileDbArtifactsIfNeeded } from './lib/compile-db-artifacts.mjs'
import { renderStubFile } from './lib/stub-render.mjs'
import {
  loadBuildIndex,
  loadUtilsIndex,
  resolveAppRoot,
  resolveConfigPathForGenerate,
  resolveMigrationDir,
  resolveSeederDir,
  resolveModelDir,
  toSnakeCase,
  toPascalCase,
  defaultTableName,
  seederFileName,
  modelFileName,
  tableNameToModelClassName,
  writeGeneratedFile,
} from './lib/generate-common.mjs'

const pkgRoot = getPackageRoot(import.meta.url)

/** Path relative to cwd for logs (POSIX-style slashes). Falls back to absolute if outside cwd. */
function pathForLog(absPath) {
  const rel = relative(process.cwd(), absPath)
  if (rel && !rel.startsWith('..') && !isAbsolute(rel)) {
    return rel.replace(/\\/g, '/')
  }
  return absPath
}

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    'skip-build': { type: 'boolean', default: false },
    dir: { type: 'string' },
    'import-from': { type: 'string', default: 'lucinate' },
    /** Use this file's contents instead of the stub (migration, model, seeder). */
    'contents-from': { type: 'string' },
    create: { type: 'boolean', default: false },
    alter: { type: 'boolean', default: false },
    table: { type: 'string' },
    /** Only with migration: also generate model (name derived from table). */
    'with-model': { type: 'boolean', short: 'm', default: false },
    /** Only with migration: also generate seeder (name derived from table). */
    'with-seeder': { type: 'boolean', short: 's', default: false },
    help: { type: 'boolean', short: 'h', default: false },
  },
  allowPositionals: true,
  strict: true,
})

if (values.help || positionals.length < 2) {
  console.log(`
lucinate generate

  node scripts/generate.mjs migration <name> [--create] [--alter] [-m|--with-model] [-s|--with-seeder] [--dir path]
  node scripts/generate.mjs model <ModelName> [--table table_name] [--dir path]
  node scripts/generate.mjs seeder <name> [--dir path]

  --skip-build      skip automatic tsc when tsconfig.db.json exists
  --dir             output directory (overrides config paths)
  --import-from     package to import from (default: lucinate)
  --contents-from   path to file whose contents replace the generated stub
  -m, --with-model  (migration only) also generate model
  -s, --with-seeder (migration only) also generate seeder

  Does not overwrite: if the target file already exists, skips and prints [skip].

Requires npm run build in the lucinate package.
`)
  process.exit(positionals.length < 2 ? 1 : 0)
}

const [command, rawName] = positionals
const appRoot = resolveAppRoot()
const cwd = process.cwd()
compileDbArtifactsIfNeeded(cwd, appRoot, { skipBuild: values['skip-build'] })
const importFrom = values['import-from']

const { loadDatabaseConfig } = await loadBuildIndex(pkgRoot)
const { parseMigrationIntent } = await loadUtilsIndex(pkgRoot)

let config = null
const configPath = resolveConfigPathForGenerate(appRoot)
if (existsSync(configPath)) {
  try {
    config = await loadDatabaseConfig(configPath)
  } catch (e) {
    console.warn('Warning: could not load config:', configPath, e.message)
  }
}

const connectionName = config?.connection ?? 'default'

/**
 * @param {string} stubPath
 * @param {Record<string, string>} stubVars
 */
async function bodyFromStubOrFile(stubPath, stubVars) {
  const cf = values['contents-from']
  if (!cf) {
    return renderStubFile(stubPath, stubVars)
  }
  const abs = isAbsolute(cf) ? cf : resolve(appRoot, cf)
  if (!existsSync(abs)) {
    throw new Error(`--contents-from: file not found: ${abs}`)
  }
  return readFile(abs, 'utf-8')
}

async function cmdMigration() {
  const snakeInput = toSnakeCase(rawName)
  const intent = parseMigrationIntent(snakeInput)

  let tableName
  let useCreate
  let useAlter

  if (intent) {
    tableName = intent.tableName
    useCreate = intent.create
    useAlter = intent.alter
  } else {
    tableName = snakeInput
    if (values.alter && values.create) {
      console.warn('Warning: --create and --alter together; using --alter.')
    }
    if (values.alter) {
      useAlter = true
      useCreate = false
    } else {
      useCreate = true
      useAlter = false
    }
  }

  const action = useAlter ? 'alter' : 'create'
  const stubRel = join('stubs', 'make', 'migration', `${action}.stub`)
  const stubPath = join(pkgRoot, stubRel)

  const outDir = resolveMigrationDir({
    appRoot,
    config,
    connectionName,
    dirOverride: values.dir,
  })

  const fileName = `${Date.now()}_${action}_${tableName}_table.ts`
  const outPath = join(outDir, fileName)

  const body = await bodyFromStubOrFile(stubPath, {
    importFrom,
    tableName,
  })

  const wroteMigration = await writeGeneratedFile(outPath, body)
  if (wroteMigration) {
    console.log(`Migration written: ${pathForLog(outPath)}`)
  } else {
    console.log(`[skip] already exists: ${pathForLog(outPath)}`)
  }

  /** Prevent `-m`/`-s` from reusing the same `--contents-from` as the migration. */
  values['contents-from'] = undefined

  if (values['with-model']) {
    const className = tableNameToModelClassName(tableName)
    await cmdModel({ className, tableName })
  }
  if (values['with-seeder']) {
    await cmdSeeder({ name: tableName })
  }
}

/**
 * @param {{ className?: string, tableName?: string }} [opts]
 */
async function cmdModel(opts = {}) {
  const className = opts.className ?? toPascalCase(rawName)
  const tableName = values.table ?? opts.tableName ?? defaultTableName(className)
  const stubPath = join(pkgRoot, 'stubs', 'make', 'model', 'main.stub')

  const outDir = resolveModelDir({
    appRoot,
    dirOverride: values.dir,
  })

  const file = modelFileName(className)
  const outPath = join(outDir, file)

  const body = await bodyFromStubOrFile(stubPath, {
    importFrom,
    className,
    tableName,
  })

  const wrote = await writeGeneratedFile(outPath, body)
  if (wrote) {
    console.log(`Model written: ${pathForLog(outPath)}`)
  } else {
    console.log(`[skip] already exists: ${pathForLog(outPath)}`)
  }
}

/**
 * @param {{ name?: string }} [opts]
 */
async function cmdSeeder(opts = {}) {
  const stubPath = join(pkgRoot, 'stubs', 'make', 'seeder', 'main.stub')

  const outDir = resolveSeederDir({
    appRoot,
    config,
    connectionName,
    dirOverride: values.dir,
  })

  const nameForSeeder = opts.name ?? rawName
  const file = seederFileName(nameForSeeder)
  const outPath = join(outDir, file)

  const body = await bodyFromStubOrFile(stubPath, {
    importFrom,
  })

  const wrote = await writeGeneratedFile(outPath, body)
  if (wrote) {
    console.log(`Seeder written: ${pathForLog(outPath)}`)
  } else {
    console.log(`[skip] already exists: ${pathForLog(outPath)}`)
  }
}

try {
  if (command === 'migration') {
    await cmdMigration()
  } else if (command === 'model') {
    await cmdModel()
  } else if (command === 'seeder') {
    await cmdSeeder()
  } else {
    console.error(`Unknown command: ${command}. Use migration, model, or seeder.`)
    process.exit(1)
  }
} catch (e) {
  console.error(e)
  process.exit(1)
}
