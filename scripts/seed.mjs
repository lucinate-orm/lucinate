#!/usr/bin/env node
/**
 * Corre seeders.
 *
 * Config por defeito: build/config/database.js (ex.: config/database.ts na raiz), depois
 * APP_ROOT/config/database.{js,json,ts}
 * Env: APP_ROOT, LUCINATE_CONFIG_PATH (ou LUCINATE_DATABASE_CONFIG)
 *
 * Só alguns seeders: --file <nome> (-f) repetível, ou LUCINATE_SEED_FILE (lista separada por vírgulas).
 * Nome: basename (ex.: users_seeder_seeder) ou caminho lógico (ex.: database/seeders/users_seeder_seeder).
 */
import { EventEmitter } from 'node:events'
import { parseArgs } from 'node:util'
import { basename, resolve, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { existsSync } from 'node:fs'
import { getPackageRoot, entryIndexJs } from './lib/resolve-pkg.mjs'
import { createConsoleLogger } from './lib/console-logger.mjs'
import { createApplication } from './lib/create-app.mjs'
import { resolveDefaultDatabaseConfigPath } from './lib/default-config-path.mjs'
import { resolveAppRootFromCandidates } from './lib/resolve-app-root.mjs'
import { prependConsumerNodeModulesPaths } from './lib/prepend-consumer-node-modules.mjs'
import { compileDbArtifactsIfNeeded } from './lib/compile-db-artifacts.mjs'
import { resolveConfigPathFromEnv } from './lib/config-path-from-env.mjs'

const pkgRoot = getPackageRoot(import.meta.url)
const indexJs = entryIndexJs(pkgRoot)

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    config: { type: 'string', short: 'c' },
    'app-root': { type: 'string' },
    /** Um ou mais seeders (repetir a flag ou lista separada por vírgula). Ex.: --file users_seeder_seeder */
    file: { type: 'string', short: 'f', multiple: true },
  },
  strict: true,
})

const cwd = process.cwd()

function getAppRoot() {
  if (values['app-root']) return resolve(values['app-root'])
  if (process.env.APP_ROOT) return resolve(process.env.APP_ROOT)
  return resolveAppRootFromCandidates(cwd)
}

const appRoot = getAppRoot()

if (!existsSync(indexJs)) {
  console.error(`Build em falta: ${indexJs}\nCorre primeiro: npm run build`)
  process.exit(1)
}

compileDbArtifactsIfNeeded(cwd, appRoot)

const resolvedDefault = resolveDefaultDatabaseConfigPath(appRoot)
const configPath = resolve(
  values.config ||
    resolveConfigPathFromEnv() ||
    resolvedDefault ||
    join(appRoot, 'build', 'config', 'database.js')
)

if (!existsSync(configPath)) {
  console.error(`Config não encontrado: ${configPath}`)
  console.error(
    'Indica --config ou LUCINATE_CONFIG_PATH (ou LUCINATE_DATABASE_CONFIG), ou cria config/database.ts na raiz (compilado para build/config/database.js) ou config/database.{js,json}.'
  )
  process.exit(1)
}

prependConsumerNodeModulesPaths(cwd, appRoot)

const mod = await import(pathToFileURL(indexJs).href)
const { Database, loadDatabaseConfig, SeedsRunner } = mod

const config = await loadDatabaseConfig(configPath)
const db = new Database(config, createConsoleLogger(), new EventEmitter())
const app = createApplication(appRoot)

const runner = new SeedsRunner(db, app, config.connection)

/** @type {string[]} */
const seedFilters = collectSeedFilters(values.file)
const files = filterSeedFiles(await runner.getList(), seedFilters)
if (seedFilters.length && files.length === 0) {
  console.error(
    `[lucinate] Nenhum seeder corresponde a: ${seedFilters.join(', ')}\n` +
      'Usa o nome lógico (ex.: database/seeders/users_seeder_seeder) ou só o ficheiro (ex.: users_seeder_seeder).'
  )
  await runner.close()
  process.exit(1)
}

let failed = 0

for (const file of files) {
  const result = await runner.run(file)
  const name = file.name
  if (result.status === 'ignored') {
    console.log(`[skip] ${name} (environment)`)
  } else if (result.status === 'completed') {
    console.log(`[ok] ${name}`)
  } else {
    console.error(`[fail] ${name}`, result.error)
    failed++
  }
}

await runner.close()

if (failed > 0) {
  process.exit(1)
}

process.exit(0)

/**
 * @param {string[] | undefined} fromCli
 */
function collectSeedFilters(fromCli) {
  const env = process.env.LUCINATE_SEED_FILE
  const fromEnv = env ? env.split(',').map((s) => s.trim()).filter(Boolean) : []
  const raw = [...(fromCli ?? []), ...fromEnv]
  const out = []
  for (const part of raw) {
    for (const piece of part.split(',')) {
      const t = piece.trim()
      if (t) out.push(t)
    }
  }
  return out
}

/**
 * @param {{ name: string }[]} all
 * @param {string[]} filters
 */
function filterSeedFiles(all, filters) {
  if (!filters.length) {
    return all
  }
  return all.filter((f) => filters.some((fl) => seederNameMatches(f.name, fl)))
}

/**
 * Compara nome lógico do seeder (ex.: database/seeders/foo_seeder) com o filtro.
 * Aceita: caminho completo, só o basename, ou com prefixo build/.
 * @param {string} fileName
 * @param {string} filter
 */
function seederNameMatches(fileName, filter) {
  const n = normalizeSeederToken(fileName)
  const f = normalizeSeederToken(filter)
  if (!f) {
    return false
  }
  if (n === f) {
    return true
  }
  if (n.endsWith(`/${f}`)) {
    return true
  }
  if (basename(n) === f) {
    return true
  }
  return false
}

/** @param {string} s */
function normalizeSeederToken(s) {
  return s
    .trim()
    .replace(/^build\//, '')
    .replace(/^\.\//, '')
    .replace(/\.(mjs|cjs|js|ts)$/i, '')
}
