import { existsSync } from 'node:fs'
import { isAbsolute, join, relative } from 'node:path'

/**
 * In Node scripts: `database.ts` under `config/` is not loadable without a loader; the compiled
 * artifact `build/config/database.js` is preferred (e.g. from `config/database.ts`).
 *
 * Dev / prod: database.js → database.json → database.ts
 */
export function getDefaultDatabaseConfigFilenames(nodeEnv) {
  const prod = nodeEnv === 'production'
  return prod
    ? ['database.js', 'database.json', 'database.ts']
    : ['database.js', 'database.json', 'database.ts']
}

/**
 * Whether a recognizable DB config file exists (to detect APP_ROOT before compile).
 * @param {string} appRoot
 */
export function hasDatabaseConfigMarker(appRoot) {
  if (resolveDefaultDatabaseConfigPath(appRoot)) return true
  if (existsSync(join(appRoot, 'config', 'database.ts'))) return true
  if (existsSync(join(appRoot, 'src', 'config', 'database.ts'))) return true
  return false
}

/**
 * @param {string} appRoot absolute application root path
 * @returns {string | null}
 */
export function resolveDefaultDatabaseConfigPath(appRoot) {
  const built = join(appRoot, 'build', 'config', 'database.js')
  if (existsSync(built)) return built

  const tsConfigPath = join(appRoot, 'config', 'database.ts')
  if (existsSync(tsConfigPath)) {
    const rel = relative(process.cwd(), tsConfigPath)
    if (rel && !rel.startsWith('..') && !isAbsolute(rel)) {
      const compiled = join(process.cwd(), 'build', rel.replace(/\.ts$/, '.js'))
      if (existsSync(compiled)) return compiled
    }
  }

  const names = getDefaultDatabaseConfigFilenames(process.env.NODE_ENV)
  for (const name of names) {
    const p = join(appRoot, 'config', name)
    if (existsSync(p)) return p
  }
  return null
}
