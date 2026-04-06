/*
 * lucinate
 *
 * (c) Harminder Virk
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */
import Macroable from '@poppinss/macroable';
import { Exception } from '@poppinss/utils/exception';
import { Adapter } from '../orm/adapter/index.js';
import { RawBuilder } from './static_builder/raw.js';
import { QueryClient, pickConnectionDebug } from '../query_client/index.js';
import { prettyPrint } from '../helpers/pretty_print.js';
import { ConnectionManager } from '../connection/manager.js';
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
export class Database extends Macroable {
    config;
    logger;
    emitter;
    /**
     * Reference to connections manager
     */
    manager;
    /**
     * Primary connection name
     */
    primaryConnectionName;
    /**
     * A store of global transactions
     */
    connectionGlobalTransactions = new Map();
    prettyPrint = prettyPrint;
    constructor(config, logger, 
    /** Shared by {@link QueryClient} and connection manager — use `db.on(...)` or `db.emitter.on(...)`. */
    emitter) {
        super();
        this.config = config;
        this.logger = logger;
        this.emitter = emitter;
        this.manager = new ConnectionManager(this.logger, this.emitter);
        this.primaryConnectionName = this.config.connection;
        this.registerConnections();
    }
    /**
     * Registering all connections with the manager, so that we can fetch
     * and connect with them whenver required.
     */
    registerConnections() {
        Object.keys(this.config.connections).forEach((name) => {
            this.manager.add(name, this.config.connections[name]);
        });
    }
    /**
     * Subscribe to database events (`db:query`, `db:connection:*`, …). Same emitter as {@link QueryClient.emitter}.
     */
    on(event, listener) {
        this.emitter.on(event, listener);
        return this;
    }
    /**
     * Subscribe once, then remove the listener.
     */
    once(event, listener) {
        this.emitter.once(event, listener);
        return this;
    }
    /**
     * Remove a listener (Node 14+ alias of removeListener for EventEmitter).
     */
    off(event, listener) {
        this.emitter.off(event, listener);
        return this;
    }
    removeListener(event, listener) {
        this.emitter.removeListener(event, listener);
        return this;
    }
    removeAllListeners(event) {
        this.emitter.removeAllListeners(event);
        return this;
    }
    /**
     * Returns the connection node from the connection manager
     */
    getRawConnection(name) {
        return this.manager.get(name);
    }
    /**
     * Returns the query client for a given connection
     */
    connection(connection = this.primaryConnectionName, options) {
        options = options || {};
        /**
         * Connect is noop when already connected
         */
        this.manager.connect(connection);
        /**
         * Disallow modes other than `read` or `write`
         */
        if (options.mode && !['read', 'write'].includes(options.mode)) {
            throw new Exception(`Invalid mode ${options.mode}. Must be read or write`);
        }
        /**
         * Return the global transaction when it already exists.
         */
        if (this.connectionGlobalTransactions.has(connection)) {
            this.logger.trace({ connection }, 'using pre-existing global transaction connection');
            const globalTransactionClient = this.connectionGlobalTransactions.get(connection);
            return globalTransactionClient;
        }
        /**
         * Fetching connection for the given name
         */
        const rawConnection = this.getRawConnection(connection).connection;
        const poolConfig = this.config.connections[connection];
        const debug = pickConnectionDebug(poolConfig, rawConnection.config, this.config.debug);
        /**
         * Generating query client for a given connection and setting appropriate
         * mode on it
         */
        this.logger.trace({ connection }, 'creating query client in %s mode', [options.mode || 'dual']);
        const queryClient = options.mode
            ? new QueryClient(options.mode, rawConnection, this.emitter, debug)
            : new QueryClient('dual', rawConnection, this.emitter, debug);
        return queryClient;
    }
    /**
     * Returns the knex query builder
     */
    knexQuery() {
        return this.connection(this.primaryConnectionName).knexQuery();
    }
    /**
     * Returns the knex raw query builder
     */
    knexRawQuery(sql, bindings) {
        return this.connection(this.primaryConnectionName).knexRawQuery(sql, bindings);
    }
    /**
     * Returns query builder. Optionally one can define the mode as well
     */
    query(options) {
        return this.connection(this.primaryConnectionName, options).query();
    }
    /**
     * Returns insert query builder. Always has to be dual or write mode and
     * hence it doesn't matter, since in both `dual` and `write` mode,
     * the `write` connection is always used.
     */
    insertQuery(options) {
        return this.connection(this.primaryConnectionName, options).insertQuery();
    }
    /**
     * Returns a query builder instance for a given model.
     */
    modelQuery(model, options) {
        return this.connection(this.primaryConnectionName, options).modelQuery(model);
    }
    /**
     * Returns an adapter lucid models
     *
     * @param defaultConnectionForModels — when models do not define `static connection`, use this connection
     */
    modelAdapter(defaultConnectionForModels) {
        return new Adapter(this, defaultConnectionForModels);
    }
    /**
     * Returns an instance of raw query builder. Optionally one can
     * defined the `read/write` mode in which to execute the
     * query
     */
    rawQuery(sql, bindings, options) {
        return this.connection(this.primaryConnectionName, options).rawQuery(sql, bindings);
    }
    /**
     * Returns an instance of raw builder. This raw builder queries
     * cannot be executed. Use `rawQuery`, if you want to execute
     * queries raw queries.
     */
    raw(sql, bindings) {
        return new RawBuilder(sql, bindings);
    }
    /**
     * Returns reference builder.
     */
    ref(reference) {
        return new ReferenceBuilder(reference, this.connection().getReadClient().client);
    }
    /**
     * Returns instance of a query builder and selects the table
     */
    from = (table) => {
        return this.connection().from(table);
    };
    /**
     * Returns insert query builder and selects the table
     */
    table(table) {
        return this.connection().table(table);
    }
    transaction(callbackOrOptions, options) {
        const client = this.connection();
        return typeof callbackOrOptions === 'function'
            ? client.transaction(callbackOrOptions, options)
            : client.transaction(callbackOrOptions);
    }
    /**
     * Begin a new global transaction
     */
    async beginGlobalTransaction(connectionName, options) {
        connectionName = connectionName || this.primaryConnectionName;
        /**
         * Return global transaction as it is
         */
        const globalTrx = this.connectionGlobalTransactions.get(connectionName);
        if (globalTrx) {
            return globalTrx;
        }
        /**
         * Create a new transaction and store a reference to it
         */
        const trx = await this.connection(connectionName, options).transaction();
        this.connectionGlobalTransactions.set(trx.connectionName, trx);
        /**
         * Listen for events to drop the reference when transaction
         * is over
         */
        trx.on('commit', ($trx) => {
            this.connectionGlobalTransactions.delete($trx.connectionName);
        });
        trx.on('rollback', ($trx) => {
            this.connectionGlobalTransactions.delete($trx.connectionName);
        });
        return trx;
    }
    /**
     * Commit an existing global transaction
     */
    async commitGlobalTransaction(connectionName) {
        connectionName = connectionName || this.primaryConnectionName;
        const trx = this.connectionGlobalTransactions.get(connectionName);
        if (!trx) {
            throw new Exception([
                'Cannot commit a non-existing global transaction.',
                ' Make sure you are not calling "commitGlobalTransaction" twice',
            ].join(''));
        }
        await trx.commit();
    }
    /**
     * Rollback an existing global transaction
     */
    async rollbackGlobalTransaction(connectionName) {
        connectionName = connectionName || this.primaryConnectionName;
        const trx = this.connectionGlobalTransactions.get(connectionName);
        if (!trx) {
            throw new Exception([
                'Cannot rollback a non-existing global transaction.',
                ' Make sure you are not calling "commitGlobalTransaction" twice',
            ].join(''));
        }
        await trx.rollback();
    }
}
//# sourceMappingURL=main.js.map