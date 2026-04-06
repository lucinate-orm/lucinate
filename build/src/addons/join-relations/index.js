import { ModelQueryBuilder } from "../../orm/query_builder/index.js";
function getRelationJoinData(builder, relationName) {
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
    throw new Error(`join-relations MVP only supports belongsTo/hasOne. Received "${relation.type}" for "${relationName}".`);
}
function applyJoinRelation(builder, relationName, options) {
    const join = getRelationJoinData(builder, relationName);
    const method = options.joinType === "left" ? "leftJoin" : "innerJoin";
    builder[method](join.table, join.left, join.right);
    if (options.selectRelated === true) {
        builder.select(`${join.relatedTable}.*`);
    }
    return builder;
}
function ensureJoinRelatedMacro(ModelQueryBuilder) {
    if (ModelQueryBuilder.__joinRelatedMacroRegistered) {
        return;
    }
    ModelQueryBuilder.macro("joinRelation", function (relationName, options = {}) {
        return applyJoinRelation(this, relationName, options);
    });
    /**
     * Same as `joinRelation(relationName, { joinType: 'left' })`.
     * Any `joinType` in `options` is ignored (always left join).
     */
    ModelQueryBuilder.macro("leftJoinRelation", function (relationName, options = {}) {
        return applyJoinRelation(this, relationName, {
            ...options,
            joinType: "left",
        });
    });
    ModelQueryBuilder.__joinRelatedMacroRegistered = true;
}
export function registerJoinRelationsAddon(ModelQueryBuilder) {
    ensureJoinRelatedMacro(ModelQueryBuilder);
}
export function applyJoinRelationsToModel(Model) {
    Model.boot();
    return Model;
}
/**
 * Auto-register joinRelation / leftJoinRelation macros on import.
 */
ensureJoinRelatedMacro(ModelQueryBuilder);
//# sourceMappingURL=index.js.map