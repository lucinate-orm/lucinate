import { BaseCheck } from '../../shims/runtime/health.js';
import type { HealthCheckResult } from '../../shims/runtime/types-health.js';
import type { QueryClientContract } from '../../types/database.js';
/**
 * The DbCheck attempts to establish the database connection by
 * executing a sample query.
 */
export declare class DbCheck extends BaseCheck {
    #private;
    /**
     * Health check public name
     */
    name: string;
    constructor(client: QueryClientContract);
    /**
     * Executes the health check
     */
    run(): Promise<HealthCheckResult>;
}
//# sourceMappingURL=db_check.d.ts.map