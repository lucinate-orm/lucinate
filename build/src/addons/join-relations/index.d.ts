import type { LucidModel } from "../../types/model.js";
export type JoinType = "inner" | "left";
export type JoinRelatedOptions = {
    joinType?: JoinType;
    /**
     * When `true`, appends `select(\`${relatedTable}.*\`)` for the related table.
     * Default is `false`: only the JOIN is applied; add `.select(...)` yourself as needed.
     */
    selectRelated?: boolean;
};
export declare function registerJoinRelationsAddon(ModelQueryBuilder: any): void;
export declare function applyJoinRelationsToModel(Model: LucidModel): LucidModel;
//# sourceMappingURL=index.d.ts.map