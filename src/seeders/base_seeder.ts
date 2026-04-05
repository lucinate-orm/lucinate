/*
 * lucinate
 *
 * (c) Harminder Virk
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { Database } from '../database/main.js'
import { type QueryClientContract } from '../types/database.js'
import { setDefaultModelAdapter } from '../orm/default_model_adapter.js'

export class BaseSeeder {
  static environment: string[]
  constructor(
    public client: QueryClientContract,
    public db: Database,
    /**
     * Connection name used by the `seed` command (`config.connection`), for `connection()` with no arguments.
     */
    public readonly seedConnectionName?: string
  ) {}

  /**
   * Use this connection for `BaseModel` operations in the seeder (until another `connection` or end of `run`).
   * With no arguments, restores the seed connection (`seedConnectionName` / primary).
   */
  connection(name?: string): void {
    const resolved = name ?? this.seedConnectionName ?? this.db.primaryConnectionName
    setDefaultModelAdapter(this.db.modelAdapter(resolved))
  }

  async run() {}
}
