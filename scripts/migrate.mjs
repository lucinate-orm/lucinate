#!/usr/bin/env node
/**
 * Run migrations (up or down).
 *
 * Config: `config/database.ts` at project root (`process.cwd()`), or compiled `build/config/database.js`.
 * Run CLI from the project root. Use `--skip-build` to skip automatic `tsc -p tsconfig.db.json`.
 */
import { EventEmitter } from "node:events";
import { parseArgs } from "node:util";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { existsSync } from "node:fs";
import { getPackageRoot, entryIndexJs } from "./lib/resolve-pkg.mjs";
import { createConsoleLogger } from "./lib/console-logger.mjs";
import { createApplication } from "./lib/create-app.mjs";
import { resolveDefaultDatabaseConfigPath } from "./lib/default-config-path.mjs";
import { prependConsumerNodeModulesPaths } from "./lib/prepend-consumer-node-modules.mjs";
import { compileDbArtifactsIfNeeded } from "./lib/compile-db-artifacts.mjs";

const pkgRoot = getPackageRoot(import.meta.url);
const indexJs = entryIndexJs(pkgRoot);

const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
        down: { type: "boolean", default: false },
        batch: { type: "string" },
        step: { type: "string" },
        "dry-run": { type: "boolean", default: false },
        "disable-locks": { type: "boolean", default: false },
        "skip-build": { type: "boolean", default: false },
    },
    strict: true,
});

const cwd = process.cwd();
const appRoot = resolve(cwd);

if (!existsSync(indexJs)) {
    console.error(`Missing build: ${indexJs}\nRun npm run build first`);
    process.exit(1);
}

compileDbArtifactsIfNeeded(cwd, appRoot, { skipBuild: values["skip-build"] });

const resolvedDefault = resolveDefaultDatabaseConfigPath(appRoot);
const configPath = resolve(resolvedDefault ?? join(appRoot, "build/config/database.js"));

if (!existsSync(configPath)) {
    console.error(`Config not found: ${configPath}`);
    console.error(
        "Add config/database.ts at the project root (compiled to build/config/database.js) and run this command with cwd set to that root.",
    );
    process.exit(1);
}

prependConsumerNodeModulesPaths(cwd, appRoot);

const mod = await import(pathToFileURL(indexJs).href);
const { Database, loadDatabaseConfig, MigrationRunner } = mod;

const config = await loadDatabaseConfig(configPath);
const db = new Database(config, createConsoleLogger(), new EventEmitter());
const app = createApplication(appRoot);

const baseOpts = {
    connectionName: config.connection,
    dryRun: values["dry-run"],
    disableLocks: values["disable-locks"],
};

const runner =
    values.down === true
        ? new MigrationRunner(db, app, {
              direction: "down",
              batch:
                  values.batch !== undefined ? Number(values.batch) : undefined,
              step: values.step !== undefined ? Number(values.step) : undefined,
              ...baseOpts,
          })
        : new MigrationRunner(db, app, {
              direction: "up",
              ...baseOpts,
          });

await runner.run();

if (runner.error) {
    console.error(runner.error);
    process.exit(1);
}

console.log(`Migrations: status=${runner.status}`);
await runner.close();
process.exit(0);
