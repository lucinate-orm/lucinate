#!/usr/bin/env node
/**
 * Gera ficheiros: migration | model | seeder
 *
 * Uso:
 *   node scripts/generate.mjs migration <nome> [--create|--alter]
 *   node scripts/generate.mjs model <Nome> [--table users]
 *   node scripts/generate.mjs seeder <nome>
 *
 * Opções: --app-root, --dir, --import-from lucinate, --contents-from
 */
import { parseArgs } from 'node:util'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join, resolve, isAbsolute } from 'node:path'
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

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    'app-root': { type: 'string' },
    dir: { type: 'string' },
    'import-from': { type: 'string', default: 'lucinate' },
    /** Usa o conteúdo deste ficheiro em vez do stub (migration, model, seeder). */
    'contents-from': { type: 'string' },
    create: { type: 'boolean', default: false },
    alter: { type: 'boolean', default: false },
    table: { type: 'string' },
    /** Só com comando migration: gera também o model (nome derivado da tabela). */
    'with-model': { type: 'boolean', short: 'm', default: false },
    /** Só com comando migration: gera também o seeder (nome derivado da tabela). */
    'with-seeder': { type: 'boolean', short: 's', default: false },
    help: { type: 'boolean', short: 'h', default: false },
  },
  allowPositionals: true,
  strict: true,
})

if (values.help || positionals.length < 2) {
  console.log(`
lucinate generate

  node scripts/generate.mjs migration <nome> [--create] [--alter] [-m|--with-model] [-s|--with-seeder] [--dir path]
  node scripts/generate.mjs model <NomeModelo> [--table nome_tabela] [--dir path]
  node scripts/generate.mjs seeder <nome> [--dir path]

  --app-root        raiz da app (default: cwd ou APP_ROOT)
  --dir             pasta de destino (sobrepõe paths da config)
  --import-from     pacote a importar (default: lucinate)
  --contents-from   caminho do ficheiro cujo conteúdo substitui o stub gerado
  -m, --with-model  (só migration) gera também o model
  -s, --with-seeder (só migration) gera também o seeder

  Não sobrescreve: se o ficheiro de destino já existir, ignora e mostra [skip].

Requer npm run build no pacote lucinate.
`)
  process.exit(positionals.length < 2 ? 1 : 0)
}

const [command, rawName] = positionals
const appRoot = resolveAppRoot({ appRoot: values['app-root'] })
const cwd = process.cwd()
compileDbArtifactsIfNeeded(cwd, appRoot)
const importFrom = values['import-from']

const { loadDatabaseConfig } = await loadBuildIndex(pkgRoot)
const { parseMigrationIntent } = await loadUtilsIndex(pkgRoot)

let config = null
const configPath = resolveConfigPathForGenerate(appRoot)
if (existsSync(configPath)) {
  try {
    config = await loadDatabaseConfig(configPath)
  } catch (e) {
    console.warn('Aviso: não foi possível carregar a config:', configPath, e.message)
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
    throw new Error(`--contents-from: ficheiro não encontrado: ${abs}`)
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
      console.warn('Aviso: --create e --alter juntos; a usar --alter.')
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
    console.log(`Migration gerada: ${outPath}`)
  } else {
    console.log(`[skip] já existe: ${outPath}`)
  }

  /** Evita que `-m`/`-s` reutilizem o mesmo `--contents-from` da migration. */
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
    console.log(`Model gerado: ${outPath}`)
  } else {
    console.log(`[skip] já existe: ${outPath}`)
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
    console.log(`Seeder gerado: ${outPath}`)
  } else {
    console.log(`[skip] já existe: ${outPath}`)
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
    console.error(`Comando desconhecido: ${command}. Usa migration, model ou seeder.`)
    process.exit(1)
  }
} catch (e) {
  console.error(e)
  process.exit(1)
}
