#!/usr/bin/env node
/**
 * Run seeders.
 *
 * Config: `config/database.ts` at project root (`process.cwd()`), or compiled `build/config/database.js`.
 * Run CLI from the project root. Use `--skip-build` to skip automatic `tsc -p tsconfig.db.json`.
 *
 * Filter seeders: repeatable --file <name> (-f).
 * Name: basename (e.g. users_seeder_seeder) or logical path (e.g. database/seeders/users_seeder_seeder).
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
import { prependConsumerNodeModulesPaths } from './lib/prepend-consumer-node-modules.mjs'
import { compileDbArtifactsIfNeeded } from './lib/compile-db-artifacts.mjs'

const pkgRoot = getPackageRoot(import.meta.url)
const indexJs = entryIndexJs(pkgRoot)

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    /** One or more seeders (repeat flag or comma-separated list). E.g. --file users_seeder_seeder */
    file: { type: 'string', short: 'f', multiple: true },
    'skip-build': { type: 'boolean', default: false },
  },
  strict: true,
})

const cwd = process.cwd()
const appRoot = resolve(cwd)

if (!existsSync(indexJs)) {
  console.error(`Missing build: ${indexJs}\nRun npm run build first`)
  process.exit(1)
}

compileDbArtifactsIfNeeded(cwd, appRoot, { skipBuild: values['skip-build'] })

const resolvedDefault = resolveDefaultDatabaseConfigPath(appRoot)
const configPath = resolve(resolvedDefault ?? join(appRoot, 'build', 'config', 'database.js'))

if (!existsSync(configPath)) {
  console.error(`Config not found: ${configPath}`)
  console.error(
    'Add config/database.ts at the project root (compiled to build/config/database.js) and run this command with cwd set to that root.'
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
    `[lucinate] No seeder matches: ${seedFilters.join(', ')}\n` +
      'Use the logical name (e.g. database/seeders/users_seeder_seeder) or the file name only (e.g. users_seeder_seeder).'
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
  const raw = [...(fromCli ?? [])]
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
 * Match seeder logical name (e.g. database/seeders/foo_seeder) against filter.
 * Accepts: full path, basename only, or with build/ prefix.
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
