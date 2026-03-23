import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

/**
 * Se existir `tsconfig.db.json` (cwd ou app-root), corre `tsc -p …` para gerar
 * `build/**` antes do Node carregar migrations/seeders em `.js`.
 *
 * - Desativa: `LUCINATE_DATABASE_SKIP_DB_BUILD=1`
 * - Requer `typescript` no projeto onde está o `tsconfig.db.json`
 * - Usa o mesmo runtime que invocou o script (`node` ou `bun` via `process.execPath`)
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
            `[lucinate] Encontrado ${tsconfigPath} mas não foi possível resolver typescript/bin/tsc (${e?.message ?? e}). Instala "typescript" ou corre o build manualmente.`,
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
 * Se existir `tsc-alias` no projeto, reescreve `paths` do tsconfig no JS emitido
 * (ex.: `@/models/...` → caminhos relativos). Sem isto, `tsc` mantém os aliases
 * e o Node falha ao carregar migrations/seeders.
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
