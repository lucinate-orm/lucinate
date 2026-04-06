/*
 * lucinate — public entry (Lucid ORM port, framework-agnostic).
 */
export * as errors from './src/errors.js'
export { defineConfig } from './src/define_config.js'
export {
  Database,
  DatabaseQueryBuilder,
  InsertQueryBuilder,
  QueryClient,
  SimplePaginator,
  pickConnectionDebug,
} from './src/database/main.js'
export {
  loadDatabaseConfig,
  resolveDefaultDatabaseConfigPath,
  getDefaultDatabaseConfigFilenames,
  toRuntimeDatabasePath,
  toRuntimeDatabasePaths,
  toLogicalDatabasePath,
} from './src/config/load.js'
export {
  bootDatabase,
  resetBootDatabase,
  type BootDatabaseOptions,
} from './src/config/boot_database.js'
export { createConsoleLogger } from './src/config/console_logger.js'
export { hasDatabaseConfigMarker, resolveAppRootFromCandidates } from './src/config/resolve_app_root.js'
export { parseMigrationIntent } from './src/utils/index.js'
export { MigrationRunner, SchemaDumper } from './src/migration/main.js'
export { BaseSeeder, SeedsRunner } from './src/seeders/main.js'
export { OrmSchemaGenerator } from './src/orm/schema_generator/generator.js'
export * from './src/orm/main.js'
export * from './src/addons/index.js'
export * from './src/schema/main.js'

/** Relation types for `declare user: BelongsTo<typeof User>` etc. */
export type {
  BelongsTo,
  HasMany,
  HasManyThrough,
  HasOne,
  ManyToMany,
  MorphMany,
  MorphOne,
  MorphTo,
} from './src/types/relations.js'
export type { LucidRow as ModelRow } from './src/types/model.js'
