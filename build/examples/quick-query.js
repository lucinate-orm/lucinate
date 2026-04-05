/**
 * Quick demo: query builder + in-memory SQLite (`sqlite3`).
 * From the package folder: `npm run build && npm run demo`
 *
 * ---
 * Two ways to get a `Database`
 *
 * **1) As below — construct manually**
 * - `defineConfig(...)` + `new Database(config, logger, emitter)`.
 * - Handy for minimal scripts, unit tests, or when you want full control of logger/emitter.
 * - Does **not** register the default model adapter; for `BaseModel` use `Model.useAdapter(db.modelAdapter())` or `setDefaultModelAdapter(db.modelAdapter())`.
 *
 * **2) `bootDatabase` — singleton + default adapter**
 * - `await bootDatabase(...)` returns the same instance (unless `force`) and calls
 *   `setDefaultModelAdapter(db.modelAdapter())` so `BaseModel.query()` / `.find()` work without manual `useAdapter`.
 * - Options (`BootDatabaseOptions`):
 *   - **`config`** — resolved `DatabaseConfig` object. Does not read a file. E.g.
 *     `await bootDatabase({ config: defineConfig({ connection: 'default', connections: { ... } }) })`
 *   - **`appRoot`** — app root (`config/`, `database/`, …). If omitted: `APP_ROOT` or candidates from `process.cwd()`.
 *   - **`configPath`** — absolute or relative path to config (overrides default resolution).
 *   - **`logger`** / **`emitter`** — replace the default console logger and `EventEmitter`.
 *   - **`force`** — `true`: tear down the previous singleton, clear the default adapter, and create a new `Database` (useful in tests).
 * - Without explicit `config` or `configPath`, loads config by convention (`build/config/database.js`, `config/database.{js,json,ts}`, env `LUCINATE_CONFIG_PATH` / `LUCINATE_DATABASE_CONFIG`).
 *
 * Equivalent to the demo below using `bootDatabase` (commented):
 *
 * ```ts
 * import { bootDatabase, defineConfig } from '../index.js'
 *
 * const db = await bootDatabase({
 *   config: defineConfig({
 *     connection: 'default',
 *     connections: {
 *       default: {
 *         client: 'sqlite3',
 *         useNullAsDefault: true,
 *         connection: { filename: ':memory:' },
 *       },
 *     },
 *   }),
 * })
 * ```
 */
import { EventEmitter } from 'node:events';
import { Database, defineConfig } from '../index.js';
function createConsoleLogger() {
    const log = (level) => (obj, msg, ...args) => {
        const line = msg ?? (typeof obj === 'string' ? obj : JSON.stringify(obj));
        const fn = level === 'error' || level === 'fatal' ? console.error : console.log;
        fn(`[${level}]`, line, ...args);
    };
    const base = {
        trace: log('trace'),
        debug: log('debug'),
        info: log('info'),
        warn: log('warn'),
        error: log('error'),
        fatal: log('fatal'),
        child() {
            return base;
        },
    };
    return base;
}
const config = defineConfig({
    connection: 'default',
    connections: {
        default: {
            client: 'sqlite3',
            useNullAsDefault: true,
            connection: {
                filename: ':memory:',
            },
        },
    },
});
const db = new Database(config, createConsoleLogger(), new EventEmitter());
const client = db.connection();
const sql = client.query().from('sqlite_master').select('name').toQuery();
console.log('SQL from query builder:', sql);
await db.manager.closeAll();
console.log('OK — query builder compiled and produced SQL.');
//# sourceMappingURL=quick-query.js.map