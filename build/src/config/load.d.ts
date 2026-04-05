import type { DatabaseConfig } from '../types/database.js';
export { toRuntimeDatabasePath, toRuntimeDatabasePaths, toLogicalDatabasePath, } from './runtime-paths.js';
/**
 * Order under `config/`: `database.js` and `database.json` before `database.ts` (useful when Node
 * loads only JS; `database.ts` is usually the source compiled to `build/config/database.js`).
 */
export declare function getDefaultDatabaseConfigFilenames(nodeEnv?: string): readonly string[];
/**
 * Resolve path by convention: first `build/config/database.js` (e.g. from `config/database.ts`),
 * then if `config/database.ts` exists and repo-root `tsc` emits to `build/...` (cwd = package root),
 * use that JS; finally `APP_ROOT/config/database.{js,json,ts}`.
 */
export declare function resolveDefaultDatabaseConfigPath(appRoot: string, options?: {
    nodeEnv?: string;
}): string | null;
/**
 * Load database configuration from a JSON file or an ESM/CJS module (default export).
 */
export declare function loadDatabaseConfig(path: string): Promise<DatabaseConfig>;
//# sourceMappingURL=load.d.ts.map