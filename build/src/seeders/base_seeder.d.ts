import type { Database } from '../database/main.js';
import { type QueryClientContract } from '../types/database.js';
export declare class BaseSeeder {
    client: QueryClientContract;
    db: Database;
    /**
     * Connection name used by the `seed` command (`config.connection`), for `connection()` with no arguments.
     */
    readonly seedConnectionName?: string | undefined;
    static environment: string[];
    constructor(client: QueryClientContract, db: Database, 
    /**
     * Connection name used by the `seed` command (`config.connection`), for `connection()` with no arguments.
     */
    seedConnectionName?: string | undefined);
    /**
     * Use this connection for `BaseModel` operations in the seeder (until another `connection` or end of `run`).
     * With no arguments, restores the seed connection (`seedConnectionName` / primary).
     */
    connection(name?: string): void;
    run(): Promise<void>;
}
//# sourceMappingURL=base_seeder.d.ts.map