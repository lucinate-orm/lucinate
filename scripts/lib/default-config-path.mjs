import { existsSync } from 'node:fs'
import { isAbsolute, join, relative } from 'node:path'

/**
 * Em scripts Node: `database.ts` em `config/` não é carregável sem loader; prioriza-se
 * o artefacto compilado `build/config/database.js` (ex.: a partir de `config/database.ts`).
 *
 * Dev: database.js → database.json → database.ts (último; só se usares loader)
 * Produção: database.js → database.json → database.ts
 */
export function getDefaultDatabaseConfigFilenames(nodeEnv) {
  const prod = nodeEnv === 'production'
  return prod
    ? ['database.js', 'database.json', 'database.ts']
    : ['database.js', 'database.json', 'database.ts']
}

/**
 * Há ficheiro de config reconhecível (para detetar APP_ROOT antes do compile).
 * @param {string} appRoot
 */
export function hasDatabaseConfigMarker(appRoot) {
  if (resolveDefaultDatabaseConfigPath(appRoot)) return true
  if (existsSync(join(appRoot, 'config', 'database.ts'))) return true
  if (existsSync(join(appRoot, 'src', 'config', 'database.ts'))) return true
  return false
}

/**
 * @param {string} appRoot caminho absoluto da raiz da aplicação
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
