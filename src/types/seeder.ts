/*
 * lucinate
 *
 * (c) Harminder Virk
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { Database } from '../database/main.js'
import { type FileNode, type QueryClientContract } from './database.js'

/**
 * Shape of file node returned by the run method
 */
export type SeederFileNode = {
  status: 'pending' | 'completed' | 'failed' | 'ignored'
  error?: any
  file: FileNode<unknown>
}

export type SeederConstructorContract = {
  environment: string[]
  new (
    client: QueryClientContract,
    db: Database,
    seedConnectionName?: string
  ): {
    client: QueryClientContract
    db: Database
    seedConnectionName?: string
    connection?(name?: string): void
    run(): Promise<void>
  }
}
