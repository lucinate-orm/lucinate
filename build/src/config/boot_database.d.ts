import { Database } from '../database/main.js';
import type { DatabaseConfig } from '../types/database.js';
import type { Emitter } from '../shims/runtime/events.js';
import type { Logger } from '../shims/runtime/logger.js';
export type BootDatabaseOptions = {
    /** App root (config/, database/, …). If omitted: `APP_ROOT` or candidates from `process.cwd()`. */
    appRoot?: string;
    /** Resolved config — does not read a file. */
    config?: DatabaseConfig;
    /** Absolute or relative path to the config file. */
    configPath?: string;
    logger?: Logger;
    emitter?: Emitter;
    /** Close the previous instance and create another (useful in tests). */
    force?: boolean;
};
/**
 * Singleton `Database` instance for the app. Repeated calls (without `force`) return the same reference.
 * Concurrent calls share the same boot Promise.
 *
 * After creating (or reusing) the singleton, registers `db.modelAdapter()` as the default model adapter
 * (`setDefaultModelAdapter`) so `BaseModel` works without explicit `Model.useAdapter` in the app.
 */
export declare function bootDatabase(options?: BootDatabaseOptions): Promise<Database>;
/**
 * Close connections and clear the singleton (tests or shutdown).
 */
export declare function resetBootDatabase(): Promise<void>;
//# sourceMappingURL=boot_database.d.ts.map