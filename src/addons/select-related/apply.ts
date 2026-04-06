import type { LucidModel } from '../../types/model.js'
import type { RelationshipsContract } from '../../types/relations.js'
import type { SelectRelatedOptions, SideloadedRelations } from './types.js'
import { getCol } from './helpers.js'

const kSideload = Symbol.for('lucinate.selectRelated.sideloadTree')

export function getSideloadTree(query: object): SideloadedRelations {
  return ((query as any)[kSideload] ??= {}) as SideloadedRelations
}

function joinFn(joinType: 'inner' | 'left'): 'innerJoin' | 'leftJoin' {
  return joinType === 'left' ? 'leftJoin' : 'innerJoin'
}

function applyMorphWhere(
  query: any,
  relationName: string,
  relatedModel: LucidModel,
  morph: { morphTypeKey: string; morphValue: string },
) {
  const col = getCol(relatedModel, morph.morphTypeKey)
  query.where(`${relationName}.${col}`, morph.morphValue)
}

/**
 * Apply JOINs and register sideload metadata (Adonis [selectRelated](https://github.com/chirgjin/adonisjs-select-related) style).
 * SELECT aliases + hydration run when the `SelectRelated` mixin registers `before:fetch` / `before:find`.
 */
export function applySelectRelated(
  query: any,
  path: string,
  options: SelectRelatedOptions = {},
): any {
  const parts = path.split('.').filter(Boolean)
  if (parts.length === 0) {
    throw new Error('selectRelated: path must not be empty')
  }

  const joinType: 'inner' | 'left' = options.joinType === 'left' ? 'left' : 'inner'
  const sideload = options.sideload !== false
  const columns = options.columns ?? '*'
  const jf = joinFn(joinType)

  let model: LucidModel = query.model
  let lastTableAlias: string | undefined
  let $sideloadedRelations = getSideloadTree(query)

  for (const part of parts) {
    const morphDef = (model as any).$morphToDefinitions?.get?.(part)
    if (morphDef) {
      throw new Error(
        `selectRelated: relation "${part}" is morphTo — use preload or filter by type; a single JOIN cannot target a polymorphic association.`,
      )
    }

    const relation = model.$getRelation(part) as RelationshipsContract
    if (!relation) {
      throw new Error(`selectRelated: unknown relation "${part}" on model "${model.name}"`)
    }
    relation.boot()

    const relatedModel = relation.relatedModel() as LucidModel
    const relationName = `${lastTableAlias ? `${lastTableAlias}__` : ''}${relation.relationName}`

    if (!$sideloadedRelations[part]) {
      $sideloadedRelations[part] = {
        relation,
        tableName: relationName,
        columns,
        sideload,
        subRelations: {},
      }

      const r = relation as any
      const type = r.type

      if (type === 'manyToMany') {
        const pivotAlias = `${relationName}_pivot`
        const pivotTable = r.pivotTable
        const parentTable = lastTableAlias ?? model.table
        query[jf](
          `${pivotTable} as ${pivotAlias}`,
          `${parentTable}.${getCol(model, r.localKey)}`,
          `${pivotAlias}.${r.pivotForeignKey}`,
        )
        query[jf](
          `${relatedModel.table} as ${relationName}`,
          `${pivotAlias}.${r.pivotRelatedForeignKey}`,
          `${relationName}.${getCol(relatedModel, r.relatedKey)}`,
        )
      } else if (type === 'hasManyThrough') {
        const throughModel = r.throughModel()
        const throughTable = throughModel.table
        const throughAlias = `${relationName}_through`
        const parentTable = lastTableAlias ?? model.table
        query[jf](
          `${throughTable} as ${throughAlias}`,
          `${parentTable}.${getCol(model, r.localKey)}`,
          `${throughAlias}.${r.foreignKeyColumnName}`,
        )
        query[jf](
          `${relatedModel.table} as ${relationName}`,
          `${throughAlias}.${r.throughLocalKeyColumnName}`,
          `${relationName}.${r.throughForeignKeyColumnName}`,
        )
      } else {
        const localAttr = type === 'belongsTo' ? r.foreignKey : r.localKey
        const foreignAttr = type === 'belongsTo' ? r.localKey : r.foreignKey

        const leftRef = `${lastTableAlias ?? model.table}.${getCol(model, localAttr)}`
        const rightRef = `${relationName}.${getCol(relatedModel, foreignAttr)}`

        query[jf](`${relatedModel.table} as ${relationName}`, leftRef, rightRef)

        const morph = r.meta?.morphSelectRelated as
          | { morphTypeKey: string; morphValue: string }
          | undefined
        if (morph) {
          applyMorphWhere(query, relationName, relatedModel, morph)
        }
      }
    }

    $sideloadedRelations = $sideloadedRelations[part]!.subRelations
    model = relatedModel
    lastTableAlias = relationName
  }

  return query
}
