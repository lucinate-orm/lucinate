/*
 * lucinate — app root resolution (parity with scripts/lib/resolve-app-root.mjs).
 */
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { resolveDefaultDatabaseConfigPath } from './load.js';
/**
 * Whether `appRoot` has a recognizable DB config marker.
 */
export function hasDatabaseConfigMarker(appRoot) {
    if (resolveDefaultDatabaseConfigPath(appRoot)) {
        return true;
    }
    if (existsSync(join(appRoot, 'config', 'database.ts'))) {
        return true;
    }
    if (existsSync(join(appRoot, 'src', 'config', 'database.ts'))) {
        return true;
    }
    return false;
}
/**
 * Pick the first base (`cwd`, `cwd/src`, `cwd/app`) where DB config exists; otherwise absolute `cwd`.
 */
export function resolveAppRootFromCandidates(cwd) {
    const bases = [cwd, join(cwd, 'src'), join(cwd, 'app')];
    for (const base of bases) {
        const abs = resolve(base);
        if (hasDatabaseConfigMarker(abs)) {
            return abs;
        }
    }
    return resolve(cwd);
}
//# sourceMappingURL=resolve_app_root.js.map