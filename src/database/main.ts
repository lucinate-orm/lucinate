/*
 * lucinate
 *
 * (c) Harminder Virk
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import Macroable from '@poppinss/macroable'
import { Exception } from '@poppinss/utils/exception'
import type { Emitter } from '../shims/runtime/events.js'
import type { Logger } from '../shims/runtime/logger.js'

import {
  type ConnectionConfig,
  type DatabaseConfig,
  type IsolationLevels,
  type QueryClientContract,
  type DatabaseClientOptions,
  type TransactionClientContract,
  type ConnectionManagerContract,
} from '../types/database.js'

import { type LucidModel } from '../types/model.js'
import { Adapter } from '../orm/adapter/index.js'
import { RawBuilder } from './static_builder/raw.js'
import { QueryClient, pickConnectionDebug } from '../query_client/index.js'
import { prettyPrint } from '../helpers/pretty_print.js'
import { ConnectionManager } from '../connection/manager.js'
import { InsertQueryBuilder } from './query_builder/insert.js'
import { ReferenceBuilder } from './static_builder/reference.js'
import { SimplePaginator } from './paginator/simple_paginator.js'
import { DatabaseQueryBuilder } from './query_builder/database.js'

export { DbCheck } from './checks/db_check.js'
export { DbConnectionCountCheck } from './checks/db_connection_count_check.js'
export { DatabaseQueryBuilder, InsertQueryBuilder, SimplePaginator, QueryClient, pickConnectionDebug }

/**
 * Database class exposes the API to manage multiple connections and obtain an instance
 * of query/transaction clients.
 */
export class Database extends Macroable {
  /**
   * Reference to connections manager
   */
  manager: ConnectionManagerContract

  /**
   * Primary connection name
   */
  primaryConnectionName: string

  /**
   * A store of global transactions
   */
  connectionGlobalTransactions: Map<string, TransactionClientContract> = new Map()
  prettyPrint = prettyPrint

  constructor(
    public config: DatabaseConfig,
    private logger: Logger,
    /** Shared by {@link QueryClient} and connection manager — use `db.on(...)` or `db.emitter.on(...)`. */
    public readonly emitter: Emitter<any>
  ) {
    super()
    this.manager = new ConnectionManager(this.logger, this.emitter)
    this.primaryConnectionName = this.config.connection

    this.registerConnections()
  }

  /**
   * Registering all connections with the manager, so that we can fetch
   * and connect with them whenver required.
   */
  private registerConnections() {
    Object.keys(this.config.connections).forEach((name) => {
      this.manager.add(name, this.config.connections[name])
    })
  }

  /**
   * Subscribe to database events (`db:query`, `db:connection:*`, …). Same emitter as {@link QueryClient.emitter}.
   */
  on(event: string | symbol, listener: (...args: any[]) => void): this {
    this.emitter.on(event, listener)
    return this
  }

  /**
   * Subscribe once, then remove the listener.
   */
  once(event: string | symbol, listener: (...args: any[]) => void): this {
    this.emitter.once(event, listener)
    return this
  }

  /**
   * Remove a listener (Node 14+ alias of removeListener for EventEmitter).
   */
  off(event: string | symbol, listener: (...args: any[]) => void): this {
    this.emitter.off(event, listener)
    return this
  }

  removeListener(event: string | symbol, listener: (...args: any[]) => void): this {
    this.emitter.removeListener(event, listener)
    return this
  }

  removeAllListeners(event?: string | symbol): this {
    this.emitter.removeAllListeners(event)
    return this
  }

  /**
   * Returns the connection node from the connection manager
   */
  getRawConnection(name: string) {
    return this.manager.get(name)
  }

  /**
   * Returns the query client for a given connection
   */
  connection(
    connection: string = this.primaryConnectionName,
    options?: DatabaseClientOptions
  ): QueryClientContract | TransactionClientContract {
    options = options || {}

    /**
     * Connect is noop when already connected
     */
    this.manager.connect(connection)

    /**
     * Disallow modes other than `read` or `write`
     */
    if (options.mode && !['read', 'write'].includes(options.mode)) {
      throw new Exception(`Invalid mode ${options.mode}. Must be read or write`)
    }

    /**
     * Return the global transaction when it already exists.
     */
    if (this.connectionGlobalTransactions.has(connection)) {
      this.logger.trace({ connection }, 'using pre-existing global transaction connection')
      const globalTransactionClient = this.connectionGlobalTransactions.get(connection)!
      return globalTransactionClient
    }

    /**
     * Fetching connection for the given name
     */
    const rawConnection = this.getRawConnection(connection)!.connection!

    const poolConfig = this.config.connections[connection] as ConnectionConfig | undefined
    const debug = pickConnectionDebug(
      poolConfig,
      rawConnection.config,
      this.config.debug
    )

    /**
     * Generating query client for a given connection and setting appropriate
     * mode on it
     */
    this.logger.trace({ connection }, 'creating query client in %s mode', [options.mode || 'dual'])
    const queryClient = options.mode
      ? new QueryClient(options.mode, rawConnection, this.emitter, debug)
      : new QueryClient('dual', rawConnection, this.emitter, debug)

    return queryClient
  }

  /**
   * Returns the knex query builder
   */
  knexQuery() {
    return this.connection(this.primaryConnectionName).knexQuery()
  }

  /**
   * Returns the knex raw query builder
   */
  knexRawQuery(sql: string, bindings?: any[]) {
    return this.connection(this.primaryConnectionName).knexRawQuery(sql, bindings)
  }

  /**
   * Returns query builder. Optionally one can define the mode as well
   */
  query<Result = any>(options?: DatabaseClientOptions) {
    return this.connection(this.primaryConnectionName, options).query<Result>()
  }

  /**
   * Returns insert query builder. Always has to be dual or write mode and
   * hence it doesn't matter, since in both `dual` and `write` mode,
   * the `write` connection is always used.
   */
  insertQuery<ReturnColumns = any>(options?: DatabaseClientOptions) {
    return this.connection(this.primaryConnectionName, options).insertQuery<ReturnColumns>()
  }

  /**
   * Returns a query builder instance for a given model.
   */
  modelQuery<T extends LucidModel, Result = T>(model: any, options?: DatabaseClientOptions) {
    return this.connection(this.primaryConnectionName, options).modelQuery<T, Result>(model)
  }

  /**
   * Returns an adapter lucid models
   *
   * @param defaultConnectionForModels — when models do not define `static connection`, use this connection
   */
  modelAdapter(defaultConnectionForModels?: string) {
    return new Adapter(this, defaultConnectionForModels)
  }

  /**
   * Returns an instance of raw query builder. Optionally one can
   * defined the `read/write` mode in which to execute the
   * query
   */
  rawQuery<Result = any>(sql: string, bindings?: any, options?: DatabaseClientOptions) {
    return this.connection(this.primaryConnectionName, options).rawQuery<Result>(sql, bindings)
  }

  /**
   * Returns an instance of raw builder. This raw builder queries
   * cannot be executed. Use `rawQuery`, if you want to execute
   * queries raw queries.
   */
  raw(sql: string, bindings?: any) {
    return new RawBuilder(sql, bindings)
  }

  /**
   * Returns reference builder.
   */
  ref(reference: string) {
    return new ReferenceBuilder(reference, this.connection().getReadClient().client)
  }

  /**
   * Returns instance of a query builder and selects the table
   */
  from: QueryClientContract['from'] = (table) => {
    return this.connection().from(table)
  }

  /**
   * Returns insert query builder and selects the table
   */
  table<ReturnColumns = any>(table: any) {
    return this.connection().table<ReturnColumns>(table)
  }

  /**
   * Returns a transaction instance on the default
   * connection
   */
  transaction<T>(
    callback: (trx: TransactionClientContract) => Promise<T>,
    options?: { isolationLevel?: IsolationLevels }
  ): Promise<T>
  transaction(options?: { isolationLevel?: IsolationLevels }): Promise<TransactionClientContract>
  transaction<T>(
    callbackOrOptions?:
      | ((trx: TransactionClientContract) => Promise<T>)
      | { isolationLevel?: IsolationLevels },
    options?: { isolationLevel?: IsolationLevels }
  ): Promise<TransactionClientContract | T> {
    const client = this.connection()

    return typeof callbackOrOptions === 'function'
      ? client.transaction(callbackOrOptions, options)
      : client.transaction(callbackOrOptions)
  }

  /**
   * Begin a new global transaction
   */
  async beginGlobalTransaction(
    connectionName?: string,
    options?: Omit<DatabaseClientOptions, 'mode'>
  ) {
    connectionName = connectionName || this.primaryConnectionName

    /**
     * Return global transaction as it is
     */
    const globalTrx = this.connectionGlobalTransactions.get(connectionName)
    if (globalTrx) {
      return globalTrx
    }

    /**
     * Create a new transaction and store a reference to it
     */
    const trx = await this.connection(connectionName, options).transaction()
    this.connectionGlobalTransactions.set(trx.connectionName, trx)

    /**
     * Listen for events to drop the reference when transaction
     * is over
     */
    trx.on('commit', ($trx) => {
      this.connectionGlobalTransactions.delete($trx.connectionName)
    })

    trx.on('rollback', ($trx) => {
      this.connectionGlobalTransactions.delete($trx.connectionName)
    })

    return trx
  }

  /**
   * Commit an existing global transaction
   */
  async commitGlobalTransaction(connectionName?: string) {
    connectionName = connectionName || this.primaryConnectionName
    const trx = this.connectionGlobalTransactions.get(connectionName)

    if (!trx) {
      throw new Exception(
        [
          'Cannot commit a non-existing global transaction.',
          ' Make sure you are not calling "commitGlobalTransaction" twice',
        ].join('')
      )
    }

    await trx.commit()
  }

  /**
   * Rollback an existing global transaction
   */
  async rollbackGlobalTransaction(connectionName?: string) {
    connectionName = connectionName || this.primaryConnectionName
    const trx = this.connectionGlobalTransactions.get(connectionName)

    if (!trx) {
      throw new Exception(
        [
          'Cannot rollback a non-existing global transaction.',
          ' Make sure you are not calling "commitGlobalTransaction" twice',
        ].join('')
      )
    }

    await trx.rollback()
  }
}
