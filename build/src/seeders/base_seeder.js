/*
 * lucinate
 *
 * (c) Harminder Virk
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */
import { setDefaultModelAdapter } from '../orm/default_model_adapter.js';
export class BaseSeeder {
    client;
    db;
    seedConnectionName;
    static environment;
    constructor(client, db, 
    /**
     * Connection name used by the `seed` command (`config.connection`), for `connection()` with no arguments.
     */
    seedConnectionName) {
        this.client = client;
        this.db = db;
        this.seedConnectionName = seedConnectionName;
    }
    /**
     * Use this connection for `BaseModel` operations in the seeder (until another `connection` or end of `run`).
     * With no arguments, restores the seed connection (`seedConnectionName` / primary).
     */
    connection(name) {
        const resolved = name ?? this.seedConnectionName ?? this.db.primaryConnectionName;
        setDefaultModelAdapter(this.db.modelAdapter(resolved));
    }
    async run() { }
}
//# sourceMappingURL=base_seeder.js.map