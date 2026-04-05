import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { isAbsolute, join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
export { toRuntimeDatabasePath, toRuntimeDatabasePaths, toLogicalDatabasePath, } from './runtime-paths.js';
/**
 * Order under `config/`: `database.js` and `database.json` before `database.ts` (useful when Node
 * loads only JS; `database.ts` is usually the source compiled to `build/config/database.js`).
 */
export function getDefaultDatabaseConfigFilenames(nodeEnv) {
    const prod = (nodeEnv ?? process.env.NODE_ENV) === 'production';
    return prod
        ? ['database.js', 'database.json', 'database.ts']
        : ['database.js', 'database.json', 'database.ts'];
}
/**
 * Resolve path by convention: first `build/config/database.js` (e.g. from `config/database.ts`),
 * then if `config/database.ts` exists and repo-root `tsc` emits to `build/...` (cwd = package root),
 * use that JS; finally `APP_ROOT/config/database.{js,json,ts}`.
 */
export function resolveDefaultDatabaseConfigPath(appRoot, options) {
    const built = join(appRoot, 'build', 'config', 'database.js');
    if (existsSync(built))
        return built;
    const tsConfigPath = join(appRoot, 'config', 'database.ts');
    if (existsSync(tsConfigPath)) {
        const rel = relative(process.cwd(), tsConfigPath);
        if (rel && !rel.startsWith('..') && !isAbsolute(rel)) {
            const compiled = join(process.cwd(), 'build', rel.replace(/\.ts$/, '.js'));
            if (existsSync(compiled))
                return compiled;
        }
    }
    for (const name of getDefaultDatabaseConfigFilenames(options?.nodeEnv)) {
        const p = join(appRoot, 'config', name);
        if (existsSync(p))
            return p;
    }
    return null;
}
/**
 * Load database configuration from a JSON file or an ESM/CJS module (default export).
 */
export async function loadDatabaseConfig(path) {
    if (path.endsWith('.json')) {
        const raw = await readFile(path, 'utf-8');
        return JSON.parse(raw);
    }
    const mod = await import(pathToFileURL(path).href);
    const cfg = mod.default ?? mod;
    if (typeof cfg !== 'object' || cfg === null) {
        throw new Error(`Invalid database config export from ${path}`);
    }
    return cfg;
}
//# sourceMappingURL=load.js.map