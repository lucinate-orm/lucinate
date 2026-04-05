import { pathToFileURL } from 'node:url'
import { join } from 'node:path'

/**
 * Minimal context required by MigrationRunner / SeedsRunner.
 * @param {string} appRoot absolute project root (where migration/seeder paths resolve)
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
