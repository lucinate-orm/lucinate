import type { LucidModel } from '../../types/model.js'
import { ModelQueryBuilder } from '../../orm/query_builder/index.js'

export type JoinType = 'inner' | 'left'

export type JoinRelatedOptions = {
  joinType?: JoinType
}

function getRelationJoinData(builder: any, relationName: string) {
  const relation = builder.model.$getRelation(relationName)
  relation.boot()
  const relatedModel = relation.relatedModel()

  if (relation.type === 'belongsTo') {
    return {
      table: relatedModel.table,
      left: `${builder.model.table}.${relation.foreignKeyColumnName}`,
      right: `${relatedModel.table}.${relation.localKeyColumnName}`,
      relatedTable: relatedModel.table,
    }
  }

  if (relation.type === 'hasOne') {
    return {
      table: relatedModel.table,
      left: `${builder.model.table}.${relation.localKeyColumnName}`,
      right: `${relatedModel.table}.${relation.foreignKeyColumnName}`,
      relatedTable: relatedModel.table,
    }
  }

  throw new Error(
    `join-relations MVP only supports belongsTo/hasOne. Received "${relation.type}" for "${relationName}".`
  )
}

function ensureJoinRelatedMacro(ModelQueryBuilder: any) {
  if (ModelQueryBuilder.__joinRelatedMacroRegistered) {
    return
  }

  ModelQueryBuilder.macro(
    'joinRelation',
    function (this: any, relationName: string, options: JoinRelatedOptions = {}) {
      const join = getRelationJoinData(this, relationName)
      const method = options.joinType === 'left' ? 'leftJoin' : 'innerJoin'

      this[method](join.table, join.left, join.right)
      this.select(`${join.relatedTable}.*`)
      return this
    }
  )

  ModelQueryBuilder.__joinRelatedMacroRegistered = true
}

export function registerJoinRelationsAddon(ModelQueryBuilder: any) {
  ensureJoinRelatedMacro(ModelQueryBuilder)
}

export function applyJoinRelationsToModel(Model: LucidModel) {
  ;(Model as any).boot()
  return Model
}

/**
 * Auto-register joinRelation macro on import.
 */
ensureJoinRelatedMacro(ModelQueryBuilder)
