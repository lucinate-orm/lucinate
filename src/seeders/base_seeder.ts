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
     * Nome da conexão usada pelo comando `seed` (config.connection), para `connection()` sem argumentos.
     */
    public readonly seedConnectionName?: string
  ) {}

  /**
   * Passa a usar esta conexão para operações de `BaseModel` no seeder (até novo `connection` ou fim do `run`).
   * Sem argumentos, repõe a conexão do seed (`seedConnectionName` / primária).
   */
  connection(name?: string): void {
    const resolved = name ?? this.seedConnectionName ?? this.db.primaryConnectionName
    setDefaultModelAdapter(this.db.modelAdapter(resolved))
  }

  async run() {}
}
