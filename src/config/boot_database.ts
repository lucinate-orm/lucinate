/*
 * lucinate — Database singleton bootstrap for apps without IoC (HTTP, workers).
 */
import { EventEmitter } from 'node:events'
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { Database } from '../database/main.js'
import type { DatabaseConfig } from '../types/database.js'
import type { Emitter } from '../shims/runtime/events.js'
import type { Logger } from '../shims/runtime/logger.js'
import { createConsoleLogger } from './console_logger.js'
import { setDefaultModelAdapter } from '../orm/default_model_adapter.js'
import { loadDatabaseConfig, resolveDefaultDatabaseConfigPath } from './load.js'

export type BootDatabaseOptions = {
  /** App root (`config/`, `database/`, …). If omitted: `process.cwd()` (run from project root). */
  appRoot?: string
  /**
   * Overrides `process.env.NODE_ENV` for config path resolution (e.g. prefer `config/database.ts` in dev).
   * Use `"production"` when you want production-style resolution without setting env globally.
   */
  nodeEnv?: string
  /** Resolved config — does not read a file. */
  config?: DatabaseConfig
  /** Absolute or relative path to the config file. */
  configPath?: string
  logger?: Logger
  emitter?: Emitter
  /** Close the previous instance and create another (useful in tests). */
  force?: boolean
}

let singleton: Database | null = null
let bootInFlight: Promise<Database> | null = null

function resolveEffectiveAppRoot(options?: BootDatabaseOptions): string {
  if (options?.appRoot) {
    return resolve(options.appRoot)
  }
  return resolve(process.cwd())
}

function resolveConfigFilePath(appRoot: string, options?: BootDatabaseOptions): string {
  if (options?.configPath) {
    return resolve(options.configPath)
  }
  const def = resolveDefaultDatabaseConfigPath(appRoot, { nodeEnv: options?.nodeEnv })
  if (def) {
    return def
  }
  return join(appRoot, 'build', 'config', 'database.js')
}

/**
 * Load or use `options.config`, create `Database` with default logger/emitter.
 */
async function createDatabaseInstance(options?: BootDatabaseOptions): Promise<Database> {
  const appRoot = resolveEffectiveAppRoot(options)
  let config: DatabaseConfig

  if (options?.config) {
    config = options.config
  } else {
    const configPath = resolveConfigFilePath(appRoot, options)
    if (!existsSync(configPath)) {
      throw new Error(
        `Config not found: ${configPath}\n` +
          'Set options.configPath or add config/database.ts at the app root (compile to build/config/database.js when applicable).'
      )
    }
    config = await loadDatabaseConfig(configPath)
  }

  const logger = options?.logger ?? createConsoleLogger()
  const emitter = (options?.emitter ?? new EventEmitter()) as Emitter
  return new Database(config, logger, emitter)
}

/**
 * Singleton `Database` instance for the app. Repeated calls (without `force`) return the same reference.
 * Concurrent calls share the same boot Promise.
 *
 * After creating (or reusing) the singleton, registers `db.modelAdapter()` as the default model adapter
 * (`setDefaultModelAdapter`) so `BaseModel` works without explicit `Model.useAdapter` in the app.
 */
export async function bootDatabase(options?: BootDatabaseOptions): Promise<Database> {
  if (bootInFlight) {
    await bootInFlight
  }

  if (!options?.force && singleton) {
    setDefaultModelAdapter(singleton.modelAdapter())
    return singleton
  }

  if (options?.force && singleton) {
    await singleton.manager.closeAll()
    setDefaultModelAdapter(null)
    singleton = null
  }

  bootInFlight = createDatabaseInstance(options)
    .then((db) => {
      singleton = db
      setDefaultModelAdapter(db.modelAdapter())
      return db
    })
    .finally(() => {
      bootInFlight = null
    })

  return bootInFlight
}

/**
 * Close connections and clear the singleton (tests or shutdown).
 */
export async function resetBootDatabase(): Promise<void> {
  if (bootInFlight) {
    await bootInFlight.catch(() => {})
  }
  if (singleton) {
    await singleton.manager.closeAll()
  }
  singleton = null
  bootInFlight = null
  setDefaultModelAdapter(null)
}
