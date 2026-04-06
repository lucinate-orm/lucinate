/*
 * lucinate — Database singleton bootstrap for apps without IoC (HTTP, workers).
 */
import { EventEmitter } from 'node:events'
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { Database } from '../database/main.js'
import type { DatabaseConfig } from '../types/database.js'
import type { NamingStrategyContract } from '../types/model.js'
import type { Emitter } from '../shims/runtime/events.js'
import type { Logger } from '../shims/runtime/logger.js'
import { createConsoleLogger } from './console_logger.js'
import { setDefaultModelAdapter } from '../orm/default_model_adapter.js'
import { BaseModel } from '../orm/base_model/index.js'
import { CamelCaseNamingStrategy } from '../orm/naming_strategies/camel_case.js'
import { loadDatabaseConfig, resolveDefaultDatabaseConfigPath } from './load.js'
import { resolveAppRootFromCandidates } from './resolve_app_root.js'

export type BootDatabaseOptions = {
  /** App root (config/, database/, …). If omitted: `APP_ROOT` or candidates from `process.cwd()`. */
  appRoot?: string
  /**
   * Overrides `process.env.NODE_ENV` for config path resolution (e.g. prefer `config/database.*` in dev).
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
  /** Same as `BaseModel.namingStrategy = …` (after boot, models may already have booted — prefer setting global naming before importing models). */
  namingStrategy?: NamingStrategyContract | null
}

let singleton: Database | null = null
let bootInFlight: Promise<Database> | null = null

function resolveEffectiveAppRoot(options?: BootDatabaseOptions): string {
  if (options?.appRoot) {
    return resolve(options.appRoot)
  }
  if (process.env.APP_ROOT) {
    return resolve(process.env.APP_ROOT)
  }
  return resolveAppRootFromCandidates(process.cwd())
}

function resolveConfigPathFromEnv(): string | undefined {
  const v = process.env.LUCINATE_CONFIG_PATH || process.env.LUCINATE_DATABASE_CONFIG
  return v ? resolve(v) : undefined
}

function resolveConfigFilePath(appRoot: string, options?: BootDatabaseOptions): string {
  if (options?.configPath) {
    return resolve(options.configPath)
  }
  const fromEnv = resolveConfigPathFromEnv()
  if (fromEnv) {
    return fromEnv
  }
  const def = resolveDefaultDatabaseConfigPath(appRoot, { nodeEnv: options?.nodeEnv })
  if (def) {
    return def
  }
  return join(appRoot, 'build', 'config', 'database.js')
}

function applyBaseModelNamingStrategy(strategy: NamingStrategyContract | null): void {
  BaseModel.namingStrategy = strategy ?? new CamelCaseNamingStrategy()
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
          'Set options.configPath, LUCINATE_CONFIG_PATH (or LUCINATE_DATABASE_CONFIG), or add config/database.{ts,js,json} at the app root (compile to build/config/database.js when applicable).'
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

  if (options?.namingStrategy !== undefined) {
    applyBaseModelNamingStrategy(options.namingStrategy)
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
  applyBaseModelNamingStrategy(null)
}
