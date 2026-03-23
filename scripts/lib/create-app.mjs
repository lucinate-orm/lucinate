import { pathToFileURL } from 'node:url'
import { join } from 'node:path'

/**
 * Contexto mínimo exigido por MigrationRunner / SeedsRunner.
 * @param {string} appRoot caminho absoluto da raiz do projeto (onde resolvem paths de migrations/seeders)
 */
export function createApplication(appRoot) {
  return {
    appRoot,
    rcFile: { exists: false, path: join(appRoot, '.lucinaterc.json') },
    migrationsPath: () => 'database/migrations',
    seedersPath: () => 'database/seeders',
    relativePath: (p) => p.replace(/^\.\//, ''),
    makePath: (p) => (p.startsWith('/') ? p : join(appRoot, p)),
    importDefault: async (p) => {
      const mod = await import(pathToFileURL(p).href)
      return mod.default ?? mod
    },
    inProduction: process.env.NODE_ENV === 'production',
    nodeEnvironment: process.env.NODE_ENV ?? 'development',
  }
}
