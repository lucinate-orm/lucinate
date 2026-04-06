/**
 * Minimal logger interface for Knex / connection (compatible with Pino-like loggers).
 */
export interface Logger {
    trace(obj: unknown, msg?: string, ...args: unknown[]): void;
    debug(obj: unknown, msg?: string, ...args: unknown[]): void;
    info(obj: unknown, msg?: string, ...args: unknown[]): void;
    warn(obj: unknown, msg?: string, ...args: unknown[]): void;
    error(obj: unknown, msg?: string, ...args: unknown[]): void;
    fatal(obj: unknown, msg?: string, ...args: unknown[]): void;
    child(bindings: Record<string, unknown>): Logger;
}
//# sourceMappingURL=logger.d.ts.map