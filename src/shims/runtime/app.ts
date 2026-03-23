/**
 * Contexto de aplicação mínimo para migrations, seeders e schema generator.
 */
export type Application<_T = unknown> = {
  readonly appRoot: string
  rcFile: { exists: boolean; path: string }
  migrationsPath(): string
  seedersPath(): string
  relativePath(path: string): string
  /** ex.: produção vs desenvolvimento */
  inProduction: boolean
  /** Resolve caminho absoluto a partir da raiz da app */
  makePath(path: string): string
  /** Carrega módulo ESM/CJS default export (ex.: regras de schema) */
  importDefault: (path: string) => Promise<unknown>
  /** ex.: development, production, test */
  nodeEnvironment: string
}
