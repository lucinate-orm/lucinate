import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { DatabaseConfig } from '../types/database.js'

export {
  toRuntimeDatabasePath,
  toRuntimeDatabasePaths,
  toLogicalDatabasePath,
} from './runtime-paths.js'

/**
 * Convention: only `config/database.ts` at the app root (plus compiled `build/config/database.js`).
 */
export function getDefaultDatabaseConfigFilenames(_nodeEnv?: string): readonly string[] {
  return ['database.ts'] as const
}

function findPackageRoot(startDir: string): string | null {
  let dir = resolve(startDir)
  for (;;) {
    if (existsSync(join(dir, 'package.json'))) {
      return dir
    }
    const parent = dirname(dir)
    if (parent === dir) {
      return null
    }
    dir = parent
  }
}

/**
 * Resolve path by convention: compiled output under `build/` (from the nearest package root
 * or `cwd`), then `config/database.ts` when no emitted JS exists yet.
 */
export function resolveDefaultDatabaseConfigPath(
  appRoot: string,
  _options?: { nodeEnv?: string }
): string | null {
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

/**
 * Load database configuration from a JSON file or an ESM/CJS module (default export).
 */
export async function loadDatabaseConfig(path: string): Promise<DatabaseConfig> {
  if (path.endsWith('.json')) {
    const raw = await readFile(path, 'utf-8')
    return JSON.parse(raw) as DatabaseConfig
  }
  const mod = await import(pathToFileURL(path).href)
  const cfg = (mod as { default?: unknown }).default ?? mod
  if (typeof cfg !== 'object' || cfg === null) {
    throw new Error(`Invalid database config export from ${path}`)
  }
  return cfg as DatabaseConfig
}
