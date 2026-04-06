import Macroable from '@poppinss/macroable';
import type { Emitter } from '../shims/runtime/events.js';
import type { Logger } from '../shims/runtime/logger.js';
import { type DatabaseConfig, type IsolationLevels, type QueryClientContract, type DatabaseClientOptions, type TransactionClientContract, type ConnectionManagerContract } from '../types/database.js';
import { type LucidModel } from '../types/model.js';
import { Adapter } from '../orm/adapter/index.js';
import { RawBuilder } from './static_builder/raw.js';
import { QueryClient, pickConnectionDebug } from '../query_client/index.js';
import { prettyPrint } from '../helpers/pretty_print.js';
import { InsertQueryBuilder } from './query_builder/insert.js';
import { ReferenceBuilder } from './static_builder/reference.js';
import { SimplePaginator } from './paginator/simple_paginator.js';
import { DatabaseQueryBuilder } from './query_builder/database.js';
export { DbCheck } from './checks/db_check.js';
export { DbConnectionCountCheck } from './checks/db_connection_count_check.js';
export { DatabaseQueryBuilder, InsertQueryBuilder, SimplePaginator, QueryClient, pickConnectionDebug };
/**
 * Database class exposes the API to manage multiple connections and obtain an instance
 * of query/transaction clients.
 */
export declare class Database extends Macroable {
    config: DatabaseConfig;
    private logger;
    /** Shared by {@link QueryClient} and connection manager — use `db.on(...)` or `db.emitter.on(...)`. */
    readonly emitter: Emitter<any>;
    /**
     * Reference to connections manager
     */
    manager: ConnectionManagerContract;
    /**
     * Primary connection name
     */
    primaryConnectionName: string;
    /**
     * A store of global transactions
     */
    connectionGlobalTransactions: Map<string, TransactionClientContract>;
    prettyPrint: typeof prettyPrint;
    constructor(config: DatabaseConfig, logger: Logger, 
    /** Shared by {@link QueryClient} and connection manager — use `db.on(...)` or `db.emitter.on(...)`. */
    emitter: Emitter<any>);
    /**
     * Registering all connections with the manager, so that we can fetch
     * and connect with them whenver required.
     */
    private registerConnections;
    /**
     * Subscribe to database events (`db:query`, `db:connection:*`, …). Same emitter as {@link QueryClient.emitter}.
     */
    on(event: string | symbol, listener: (...args: any[]) => void): this;
    /**
     * Subscribe once, then remove the listener.
     */
    once(event: string | symbol, listener: (...args: any[]) => void): this;
    /**
     * Remove a listener (Node 14+ alias of removeListener for EventEmitter).
     */
    off(event: string | symbol, listener: (...args: any[]) => void): this;
    removeListener(event: string | symbol, listener: (...args: any[]) => void): this;
    removeAllListeners(event?: string | symbol): this;
    /**
     * Returns the connection node from the connection manager
     */
    getRawConnection(name: string): import("../types/database.js").ConnectionNode | undefined;
    /**
     * Returns the query client for a given connection
     */
    connection(connection?: string, options?: DatabaseClientOptions): QueryClientContract | TransactionClientContract;
    /**
     * Returns the knex query builder
     */
    knexQuery(): import("knex").Knex.QueryBuilder<any, any>;
    /**
     * Returns the knex raw query builder
     */
    knexRawQuery(sql: string, bindings?: any[]): import("knex").Knex.Raw<any>;
    /**
     * Returns query builder. Optionally one can define the mode as well
     */
    query<Result = any>(options?: DatabaseClientOptions): import("../types/querybuilder.js").DatabaseQueryBuilderContract<Result>;
    /**
     * Returns insert query builder. Always has to be dual or write mode and
     * hence it doesn't matter, since in both `dual` and `write` mode,
     * the `write` connection is always used.
     */
    insertQuery<ReturnColumns = any>(options?: DatabaseClientOptions): import("../types/querybuilder.js").InsertQueryBuilderContract<ReturnColumns[]>;
    /**
     * Returns a query builder instance for a given model.
     */
    modelQuery<T extends LucidModel, Result = T>(model: any, options?: DatabaseClientOptions): import("../types/model.js").ModelQueryBuilderContract<T, Result>;
    /**
     * Returns an adapter lucid models
     *
     * @param defaultConnectionForModels — when models do not define `static connection`, use this connection
     */
    modelAdapter(defaultConnectionForModels?: string): Adapter;
    /**
     * Returns an instance of raw query builder. Optionally one can
     * defined the `read/write` mode in which to execute the
     * query
     */
    rawQuery<Result = any>(sql: string, bindings?: any, options?: DatabaseClientOptions): import("../types/querybuilder.js").RawQueryBuilderContract<Result>;
    /**
     * Returns an instance of raw builder. This raw builder queries
     * cannot be executed. Use `rawQuery`, if you want to execute
     * queries raw queries.
     */
    raw(sql: string, bindings?: any): RawBuilder;
    /**
     * Returns reference builder.
     */
    ref(reference: string): ReferenceBuilder;
    /**
     * Returns instance of a query builder and selects the table
     */
    from: QueryClientContract['from'];
    /**
     * Returns insert query builder and selects the table
     */
    table<ReturnColumns = any>(table: any): import("../types/querybuilder.js").InsertQueryBuilderContract<ReturnColumns[]>;
    /**
     * Returns a transaction instance on the default
     * connection
     */
    transaction<T>(callback: (trx: TransactionClientContract) => Promise<T>, options?: {
        isolationLevel?: IsolationLevels;
    }): Promise<T>;
    transaction(options?: {
        isolationLevel?: IsolationLevels;
    }): Promise<TransactionClientContract>;
    /**
     * Begin a new global transaction
     */
    beginGlobalTransaction(connectionName?: string, options?: Omit<DatabaseClientOptions, 'mode'>): Promise<TransactionClientContract>;
    /**
     * Commit an existing global transaction
     */
    commitGlobalTransaction(connectionName?: string): Promise<void>;
    /**
     * Rollback an existing global transaction
     */
    rollbackGlobalTransaction(connectionName?: string): Promise<void>;
}
//# sourceMappingURL=main.d.ts.map