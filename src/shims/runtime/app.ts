/**
 * Minimal application context for migrations, seeders, and schema generator.
 */
export type Application<_T = unknown> = {
  readonly appRoot: string
  rcFile: { exists: boolean; path: string }
  migrationsPath(): string
  seedersPath(): string
  relativePath(path: string): string
  /** e.g. production vs development */
  inProduction: boolean
  /** Resolve absolute path from app root */
  makePath(path: string): string
  /** Load ESM/CJS module default export (e.g. schema rules) */
  importDefault: (path: string) => Promise<unknown>
  /** e.g. development, production, test */
  nodeEnvironment: string
}
