/*
 * lucinate — Database singleton bootstrap for apps without IoC (HTTP, workers).
 */
import { EventEmitter } from 'node:events';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { Database } from '../database/main.js';
import { createConsoleLogger } from './console_logger.js';
import { setDefaultModelAdapter } from '../orm/default_model_adapter.js';
import { loadDatabaseConfig, resolveDefaultDatabaseConfigPath } from './load.js';
let singleton = null;
let bootInFlight = null;
function resolveEffectiveAppRoot(options) {
    if (options?.appRoot) {
        return resolve(options.appRoot);
    }
    return resolve(process.cwd());
}
function resolveConfigFilePath(appRoot, options) {
    if (options?.configPath) {
        return resolve(options.configPath);
    }
    const def = resolveDefaultDatabaseConfigPath(appRoot, { nodeEnv: options?.nodeEnv });
    if (def) {
        return def;
    }
    return join(appRoot, 'build', 'config', 'database.js');
}
/**
 * Load or use `options.config`, create `Database` with default logger/emitter.
 */
async function createDatabaseInstance(options) {
    const appRoot = resolveEffectiveAppRoot(options);
    let config;
    if (options?.config) {
        config = options.config;
    }
    else {
        const configPath = resolveConfigFilePath(appRoot, options);
        if (!existsSync(configPath)) {
            throw new Error(`Config not found: ${configPath}\n` +
                'Set options.configPath or add config/database.ts at the app root (compile to build/config/database.js when applicable).');
        }
        config = await loadDatabaseConfig(configPath);
    }
    const logger = options?.logger ?? createConsoleLogger();
    const emitter = (options?.emitter ?? new EventEmitter());
    return new Database(config, logger, emitter);
}
/**
 * Singleton `Database` instance for the app. Repeated calls (without `force`) return the same reference.
 * Concurrent calls share the same boot Promise.
 *
 * After creating (or reusing) the singleton, registers `db.modelAdapter()` as the default model adapter
 * (`setDefaultModelAdapter`) so `BaseModel` works without explicit `Model.useAdapter` in the app.
 */
export async function bootDatabase(options) {
    if (bootInFlight) {
        await bootInFlight;
    }
    if (!options?.force && singleton) {
        setDefaultModelAdapter(singleton.modelAdapter());
        return singleton;
    }
    if (options?.force && singleton) {
        await singleton.manager.closeAll();
        setDefaultModelAdapter(null);
        singleton = null;
    }
    bootInFlight = createDatabaseInstance(options)
        .then((db) => {
        singleton = db;
        setDefaultModelAdapter(db.modelAdapter());
        return db;
    })
        .finally(() => {
        bootInFlight = null;
    });
    return bootInFlight;
}
/**
 * Close connections and clear the singleton (tests or shutdown).
 */
export async function resetBootDatabase() {
    if (bootInFlight) {
        await bootInFlight.catch(() => { });
    }
    if (singleton) {
        await singleton.manager.closeAll();
    }
    singleton = null;
    bootInFlight = null;
    setDefaultModelAdapter(null);
}
//# sourceMappingURL=boot_database.js.map