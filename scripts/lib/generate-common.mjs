import { existsSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import string from '@poppinss/utils/string'
import { resolveDefaultDatabaseConfigPath } from './default-config-path.mjs'
import { resolveAppRootFromCandidates } from './resolve-app-root.mjs'
import { resolveConfigPathFromEnv } from './config-path-from-env.mjs'

/**
 * @param {string} pkgRoot raiz do pacote lucinate
 */
export async function loadBuildIndex(pkgRoot) {
  const indexJs = join(pkgRoot, 'build', 'index.js')
  if (!existsSync(indexJs)) {
    throw new Error(`Build em falta: ${indexJs}\nCorre primeiro: npm run build`)
  }
  return import(pathToFileURL(indexJs).href)
}

/**
 * @param {string} pkgRoot
 */
export async function loadUtilsIndex(pkgRoot) {
  const utilsJs = join(pkgRoot, 'build', 'src', 'utils', 'index.js')
  if (!existsSync(utilsJs)) {
    throw new Error(`Build em falta: ${utilsJs}`)
  }
  return import(pathToFileURL(utilsJs).href)
}

/**
 * --app-root; APP_ROOT; senão cwd e depois ./src e ./app se existir config/database.*
 * @param {{ appRoot?: string }} opts
 */
export function resolveAppRoot(opts) {
  const cwd = process.cwd()
  if (opts.appRoot) return resolve(opts.appRoot)
  if (process.env.APP_ROOT) return resolve(process.env.APP_ROOT)
  return resolveAppRootFromCandidates(cwd)
}

/** Mesma ordem que migrate.mjs / seed.mjs. */
export function resolveConfigPathForGenerate(appRoot) {
  const fromEnv = resolveConfigPathFromEnv()
  if (fromEnv) return fromEnv
  const def = resolveDefaultDatabaseConfigPath(appRoot)
  if (def) return def
  return join(appRoot, 'database.config.json')
}

/**
 * @param {object} config DatabaseConfig
 * @param {string} connectionName
 * @param {string} appRoot
 * @param {string} [kind] migrations | seeders
 */
export function getFirstConnectionPath(config, connectionName, appRoot, kind) {
  const conn = config.connections?.[connectionName]
  if (!conn) return null
  const node = kind === 'seeders' ? conn.seeders : conn.migrations
  const paths = node?.paths
  if (!paths?.length) return null
  return resolvePath(appRoot, paths[0])
}

function resolvePath(appRoot, p) {
  if (!p) return appRoot
  return resolve(appRoot, p.replace(/^\.\//, ''))
}

/**
 * Diretório de destino para migrations.
 */
export function resolveMigrationDir({ appRoot, config, connectionName, dirOverride, fallbackRelative = 'database/migrations' }) {
  if (dirOverride) return resolvePath(appRoot, dirOverride)
  if (config) {
    const p = getFirstConnectionPath(config, connectionName, appRoot, 'migrations')
    if (p) return p
  }
  return join(appRoot, fallbackRelative.replace(/^\.\//, ''))
}

/**
 * Diretório de destino para seeders.
 */
export function resolveSeederDir({ appRoot, config, connectionName, dirOverride, fallbackRelative = 'database/seeders' }) {
  if (dirOverride) return resolvePath(appRoot, dirOverride)
  if (config) {
    const p = getFirstConnectionPath(config, connectionName, appRoot, 'seeders')
    if (p) return p
  }
  return join(appRoot, fallbackRelative.replace(/^\.\//, ''))
}

/**
 * Diretório de destino para models.
 */
export function resolveModelDir({ appRoot, dirOverride }) {
  if (dirOverride) return resolvePath(appRoot, dirOverride)
  if (process.env.LUCINATE_MODELS_PATH) return resolvePath(appRoot, process.env.LUCINATE_MODELS_PATH)
  return join(appRoot, 'src', 'models')
}

/**
 * @param {string} name input do utilizador (ex.: create_users_table, User)
 */
export function toSnakeCase(name) {
  return string.snakeCase(name.replace(/-/g, '_'))
}

export function toPascalCase(name) {
  return string.pascalCase(string.camelCase(name.replace(/-/g, '_')))
}

/**
 * Tabela por defeito a partir do nome do model (ex.: User -> users).
 */
export function defaultTableName(className) {
  const base = string.snakeCase(className)
  if (base.endsWith('s')) return base
  return `${base}s`
}

/**
 * Nome de ficheiro seeder (ex.: User -> user_seeder.ts).
 */
export function seederFileName(name) {
  return `${toSnakeCase(name)}_seeder.ts`
}

/**
 * Nome de ficheiro model (ex.: User -> User.ts).
 */
export function modelFileName(className) {
  return `${className}.ts`
}

/**
 * Converte nome de tabela em snake (ex.: posts, user_profiles) para nome de classe de modelo.
 * Heurística simples (singulariza sobretudo o último segmento); nomes ambíguos podem exigir `make:model` à parte.
 * @param {string} tableName
 */
export function tableNameToModelClassName(tableName) {
  const parts = tableName.split('_').filter(Boolean)
  if (parts.length === 0) {
    return toPascalCase(tableName)
  }
  const last = parts.length - 1
  parts[last] = singularizeTableSegment(parts[last])
  return toPascalCase(parts.join('_'))
}

/** @param {string} word */
function singularizeTableSegment(word) {
  if (word.length <= 1) {
    return word
  }
  if (word.endsWith('ies')) {
    return word.slice(0, -3) + 'y'
  }
  if (word.length > 2 && word.endsWith('s') && !word.endsWith('ss')) {
    if (/^(status|class|address|process|access|glass|grass|business|mess)$/.test(word)) {
      return word
    }
    return word.slice(0, -1)
  }
  return word
}

/**
 * Escreve ficheiro criando pastas. Se o ficheiro já existir, não altera e devolve `false`.
 * @param {string} absPath
 * @param {string} content
 * @returns {Promise<boolean>} `true` se escreveu, `false` se ignorou (já existia)
 */
export async function writeGeneratedFile(absPath, content) {
  if (existsSync(absPath)) {
    return false
  }
  await mkdir(dirname(absPath), { recursive: true })
  await writeFile(absPath, content, 'utf-8')
  return true
}
