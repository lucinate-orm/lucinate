import type { LucidModel } from "../../types/model.js";
import { ModelQueryBuilder } from "../../orm/query_builder/index.js";

export type JoinType = "inner" | "left";

export type JoinRelatedOptions = {
    joinType?: JoinType;
    /**
     * When `true`, appends `select(\`${relatedTable}.*\`)` for the related table.
     * Default is `false`: only the JOIN is applied; add `.select(...)` yourself as needed.
     */
    selectRelated?: boolean;
};

function getRelationJoinData(builder: any, relationName: string) {
    const relation = builder.model.$getRelation(relationName);
    relation.boot();
    const relatedModel = relation.relatedModel();

    if (relation.type === "belongsTo") {
        return {
            table: relatedModel.table,
            left: `${builder.model.table}.${relation.foreignKeyColumnName}`,
            right: `${relatedModel.table}.${relation.localKeyColumnName}`,
            relatedTable: relatedModel.table,
        };
    }

    if (relation.type === "hasOne") {
        return {
            table: relatedModel.table,
            left: `${builder.model.table}.${relation.localKeyColumnName}`,
            right: `${relatedModel.table}.${relation.foreignKeyColumnName}`,
            relatedTable: relatedModel.table,
        };
    }

    throw new Error(
        `join-relations MVP only supports belongsTo/hasOne. Received "${relation.type}" for "${relationName}".`,
    );
}

function applyJoinRelation(
    builder: any,
    relationName: string,
    options: JoinRelatedOptions,
) {
    const join = getRelationJoinData(builder, relationName);
    const method = options.joinType === "left" ? "leftJoin" : "innerJoin";

    builder[method](join.table, join.left, join.right);
    if (options.selectRelated === true) {
        builder.select(`${join.relatedTable}.*`);
    }
    return builder;
}

function ensureJoinRelatedMacro(ModelQueryBuilder: any) {
    if (ModelQueryBuilder.__joinRelatedMacroRegistered) {
        return;
    }

    ModelQueryBuilder.macro(
        "joinRelation",
        function (
            this: any,
            relationName: string,
            options: JoinRelatedOptions = {},
        ) {
            return applyJoinRelation(this, relationName, options);
        },
    );

    /**
     * Same as `joinRelation(relationName, { joinType: 'left' })`.
     * Any `joinType` in `options` is ignored (always left join).
     */
    ModelQueryBuilder.macro(
        "leftJoinRelation",
        function (
            this: any,
            relationName: string,
            options: JoinRelatedOptions = {},
        ) {
            return applyJoinRelation(this, relationName, {
                ...options,
                joinType: "left",
            });
        },
    );

    ModelQueryBuilder.__joinRelatedMacroRegistered = true;
}

export function registerJoinRelationsAddon(ModelQueryBuilder: any) {
    ensureJoinRelatedMacro(ModelQueryBuilder);
}

export function applyJoinRelationsToModel(Model: LucidModel) {
    (Model as any).boot();
    return Model;
}

/**
 * Auto-register joinRelation / leftJoinRelation macros on import.
 */
ensureJoinRelatedMacro(ModelQueryBuilder);
