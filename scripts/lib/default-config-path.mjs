import { existsSync } from 'node:fs'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'

function findPackageRoot(startDir) {
    let dir = resolve(startDir);
    for (;;) {
        if (existsSync(join(dir, "package.json"))) {
            return dir;
        }
        const parent = dirname(dir);
        if (parent === dir) {
            return null;
        }
        dir = parent;
    }
}

/**
 * Convention: only `config/database.ts` (plus compiled `build/config/database.js`).
 */
export function getDefaultDatabaseConfigFilenames() {
  return ['database.ts']
}

/**
 * Whether a recognizable DB config exists under appRoot.
 * @param {string} appRoot
 */
export function hasDatabaseConfigMarker(appRoot) {
  if (resolveDefaultDatabaseConfigPath(appRoot)) return true
  if (existsSync(join(appRoot, 'config', 'database.ts'))) return true
  return false
}

/**
 * @param {string} appRoot absolute application root path
 * @returns {string | null}
 */
export function resolveDefaultDatabaseConfigPath(appRoot) {
  const tsPath = join(appRoot, 'config', 'database.ts')

  const built = join(appRoot, 'build', 'config', 'database.js')
  if (existsSync(built)) return built

  if (existsSync(tsPath)) {
    const pkgRoot = findPackageRoot(appRoot)
    if (pkgRoot) {
      const rel = relative(pkgRoot, tsPath)
      if (rel && !rel.startsWith('..') && !isAbsolute(rel)) {
        const compiled = join(pkgRoot, 'build', rel.replace(/\.ts$/, '.js'))
        if (existsSync(compiled)) return compiled
      }
    }
    const relCwd = relative(process.cwd(), tsPath)
    if (relCwd && !relCwd.startsWith('..') && !isAbsolute(relCwd)) {
      const compiled = join(process.cwd(), 'build', relCwd.replace(/\.ts$/, '.js'))
      if (existsSync(compiled)) return compiled
    }
  }

  if (existsSync(tsPath)) return tsPath

  return null
}
