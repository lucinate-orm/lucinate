import type { DatabaseConfig } from '../types/database.js';
export { toRuntimeDatabasePath, toRuntimeDatabasePaths, toLogicalDatabasePath, } from './runtime-paths.js';
/**
 * Convention: only `config/database.ts` at the app root (plus compiled `build/config/database.js`).
 */
export declare function getDefaultDatabaseConfigFilenames(_nodeEnv?: string): readonly string[];
/**
 * Resolve path by convention: compiled output under `build/` (from the nearest package root
 * or `cwd`), then `config/database.ts` when no emitted JS exists yet.
 */
export declare function resolveDefaultDatabaseConfigPath(appRoot: string, _options?: {
    nodeEnv?: string;
}): string | null;
/**
 * Load database configuration from a JSON file or an ESM/CJS module (default export).
 */
export declare function loadDatabaseConfig(path: string): Promise<DatabaseConfig>;
//# sourceMappingURL=load.d.ts.map