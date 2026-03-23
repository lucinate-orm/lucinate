/*
 * lucinate — boot singleton de Database para apps sem IoC (HTTP, workers).
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
import { resolveAppRootFromCandidates } from './resolve_app_root.js'

export type BootDatabaseOptions = {
  /** Raiz da app (config/, database/, …). Se omitido: `APP_ROOT` ou candidatos a partir de `process.cwd()`. */
  appRoot?: string
  /** Config já resolvida — não lê ficheiro. */
  config?: DatabaseConfig
  /** Caminho absoluto ou relativo para o ficheiro de config. */
  configPath?: string
  logger?: Logger
  emitter?: Emitter
  /** Fecha a instância anterior e cria outra (útil em testes). */
  force?: boolean
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
  const def = resolveDefaultDatabaseConfigPath(appRoot)
  if (def) {
    return def
  }
  return join(appRoot, 'build', 'config', 'database.js')
}

/**
 * Carrega ou usa `options.config`, cria `Database` com logger/emitter por defeito.
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
        `Config não encontrado: ${configPath}\n` +
          'Indica options.configPath, LUCINATE_CONFIG_PATH (ou LUCINATE_DATABASE_CONFIG), ou cria config/database.{ts,js,json} na raiz da app (compile para build/config/database.js quando aplicável).'
      )
    }
    config = await loadDatabaseConfig(configPath)
  }

  const logger = options?.logger ?? createConsoleLogger()
  const emitter = (options?.emitter ?? new EventEmitter()) as Emitter
  return new Database(config, logger, emitter)
}

/**
 * Instância singleton de `Database` para a app. Chamadas repetidas (sem `force`) devolvem a mesma referência.
 * Chamadas concorrentes partilham a mesma Promise de arranque.
 *
 * Após criar (ou reutilizar) o singleton, regista `db.modelAdapter()` como adapter por defeito dos models
 * (`setDefaultModelAdapter`), para `BaseModel` funcionar sem `Model.useAdapter` explícito na app.
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
 * Fecha conexões e limpa o singleton (testes ou shutdown).
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
