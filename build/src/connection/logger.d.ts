import type { Logger as PinoLogger } from '../shims/runtime/logger.js';
/**
 * Knex logger that forwards to the logger injected into the connection.
 */
export declare class Logger {
    name: string;
    runtimeLogger: PinoLogger;
    warn: (message: any) => void;
    error: (message: any) => void;
    deprecate: (message: any) => void;
    debug: (message: any) => void;
    constructor(name: string, runtimeLogger: PinoLogger);
}
//# sourceMappingURL=logger.d.ts.map