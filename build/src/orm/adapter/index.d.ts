import type { Database } from '../../database/main.js';
import { type LucidRow, type LucidModel, type AdapterContract, type ModelAdapterOptions } from '../../types/model.js';
/**
 * Adapter exposes the API to make database queries and constructor
 * model instances from it.
 */
export declare class Adapter implements AdapterContract {
    private db;
    /**
     * When the model does not define `static connection`, use this connection (e.g. seed with `connection('reporting')`).
     */
    private defaultConnectionForModels?;
    constructor(db: Database, 
    /**
     * When the model does not define `static connection`, use this connection (e.g. seed with `connection('reporting')`).
     */
    defaultConnectionForModels?: string | undefined);
    private getPrimaryKeyColumnName;
    /**
     * Returns the query client based upon the model instance
     */
    modelConstructorClient(modelConstructor: LucidModel, options?: ModelAdapterOptions): import("../../types/database.js").QueryClientContract;
    /**
     * Returns the model query builder instance for a given model
     */
    query(modelConstructor: LucidModel, options?: ModelAdapterOptions): any;
    /**
     * Returns query client for a model instance by inspecting its options
     */
    modelClient(instance: LucidRow): any;
    /**
     * Perform insert query on a given model instance
     */
    insert(instance: LucidRow, attributes: any): Promise<void>;
    /**
     * Perform update query on a given model instance
     */
    update(instance: LucidRow, dirty: any): Promise<void>;
    /**
     * Perform delete query on a given model instance
     */
    delete(instance: LucidRow): Promise<void>;
    /**
     * Refresh the model instance attributes
     */
    refresh(instance: LucidRow): Promise<void>;
}
//# sourceMappingURL=index.d.ts.map