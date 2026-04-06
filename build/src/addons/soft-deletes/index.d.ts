import { type ModelQueryBuilderContract, type LucidModel } from '../../types/model.js';
import type { ModelMixin } from '../core/types.js';
export type SoftDeletesOptions = {
    /**
     * Model attribute used to store deleted timestamp.
     * Must map to an existing nullable column.
     */
    deletedAtColumn?: string;
};
export declare const SoftDeletes: ModelMixin;
export declare function configureSoftDeletes(Model: LucidModel, options?: SoftDeletesOptions): void;
export declare function registerSoftDeletesAddon(ModelQueryBuilder: any): void;
export type SoftDeletesQueryBuilder<Model extends LucidModel> = ModelQueryBuilderContract<Model> & {
    withTrashed(): SoftDeletesQueryBuilder<Model>;
    onlyTrashed(): SoftDeletesQueryBuilder<Model>;
    withoutTrashed(): SoftDeletesQueryBuilder<Model>;
    restore(): Promise<any>;
    forceDelete(): Promise<any>;
};
//# sourceMappingURL=index.d.ts.map