import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { isAbsolute, join, relative } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { DatabaseConfig } from '../types/database.js'

export {
  toRuntimeDatabasePath,
  toRuntimeDatabasePaths,
  toLogicalDatabasePath,
} from './runtime-paths.js'

/**
 * Ordem em `config/`: `database.js` e `database.json` antes de `database.ts` (útil quando o Node
 * carrega só JS; `database.ts` costuma ser fonte compilada para `build/config/database.js`).
 */
export function getDefaultDatabaseConfigFilenames(nodeEnv?: string): readonly string[] {
  const prod = (nodeEnv ?? process.env.NODE_ENV) === 'production'
  return prod
    ? (['database.js', 'database.json', 'database.ts'] as const)
    : (['database.js', 'database.json', 'database.ts'] as const)
}

/**
 * Resolve o caminho por convenção: primeiro `build/config/database.js` (ex.: de `config/database.ts`),
 * depois, se existir `config/database.ts` e o `tsc` da raiz do repo emitir para `build/...` (cwd = raiz do pacote),
 * usa esse JS; por fim `APP_ROOT/config/database.{js,json,ts}`.
 */
export function resolveDefaultDatabaseConfigPath(
  appRoot: string,
  options?: { nodeEnv?: string }
): string | null {
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

  for (const name of getDefaultDatabaseConfigFilenames(options?.nodeEnv)) {
    const p = join(appRoot, 'config', name)
    if (existsSync(p)) return p
  }
  return null
}

/**
 * Carrega configuração de base de dados a partir de um ficheiro JSON ou de um módulo ESM/CJS (default export).
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
