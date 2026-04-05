/**
 * Contrato mínimo de health checks (DbCheck / DbConnectionCountCheck).
 */
import type { HealthCheckResult } from './types-health.js';
export declare abstract class BaseCheck {
    abstract name: string;
    abstract run(): Promise<HealthCheckResult>;
}
type ResultChain = HealthCheckResult & {
    mergeMetaData(meta: Record<string, unknown>): ResultChain;
};
export declare const Result: {
    ok(message: string): ResultChain;
    failed(message: string, error?: unknown): ResultChain;
    warning(message: string): ResultChain;
};
export {};
//# sourceMappingURL=health.d.ts.map