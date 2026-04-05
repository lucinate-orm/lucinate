import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

/**
 * If `tsconfig.db.json` exists (cwd or app-root), runs `tsc -p …` to emit
 * `build/**` before Node loads migrations/seeders as `.js`.
 *
 * - Disable: `LUCINATE_DATABASE_SKIP_DB_BUILD=1`
 * - Requires `typescript` in the project where `tsconfig.db.json` lives
 * - Uses the same runtime as the invoking script (`node` or `bun` via `process.execPath`)
 */
export function compileDbArtifactsIfNeeded(cwd, appRoot) {
    if (process.env.LUCINATE_DATABASE_SKIP_DB_BUILD === "1") {
        return;
    }

    const tsconfigPath = findTsconfigDbPath(cwd, appRoot);
    if (!tsconfigPath) {
        return;
    }

    const projectDir = dirname(tsconfigPath);
    let tscPath;
    try {
        const requirePkg = createRequire(join(projectDir, "package.json"));
        tscPath = requirePkg.resolve("typescript/bin/tsc");
    } catch (e) {
        console.warn(
            `[lucinate] Found ${tsconfigPath} but could not resolve typescript/bin/tsc (${e?.message ?? e}). Install "typescript" or run the build manually.`,
        );
        return;
    }

    const r = spawnSync(process.execPath, [tscPath, "-p", tsconfigPath], {
        cwd: projectDir,
        stdio: "inherit",
        env: process.env,
    });

    if (r.error) {
        console.error(r.error);
        process.exit(1);
    }
    if (r.status !== 0) {
        process.exit(r.status ?? 1);
    }

    runTscAliasIfAvailable(projectDir, tsconfigPath);
}

/**
 * If `tsc-alias` exists in the project, rewrites tsconfig `paths` in emitted JS
 * (e.g. `@/models/...` → relative paths). Without this, `tsc` keeps aliases
 * and Node fails loading migrations/seeders.
 */
function runTscAliasIfAvailable(projectDir, tsconfigPath) {
    let tscAliasPath;
    try {
        const requirePkg = createRequire(join(projectDir, "package.json"));
        tscAliasPath = requirePkg.resolve("tsc-alias/dist/bin/index.js");
    } catch {
        return;
    }

    const r = spawnSync(process.execPath, [tscAliasPath, "-p", tsconfigPath], {
        cwd: projectDir,
        stdio: "inherit",
        env: process.env,
    });

    if (r.error) {
        console.error(r.error);
        process.exit(1);
    }
    if (r.status !== 0) {
        process.exit(r.status ?? 1);
    }
}

function findTsconfigDbPath(cwd, appRoot) {
    const candidates = [
        join(cwd, "tsconfig.db.json"),
        join(appRoot, "tsconfig.db.json"),
    ];
    for (const p of candidates) {
        if (existsSync(p)) {
            return p;
        }
    }
    return null;
}
