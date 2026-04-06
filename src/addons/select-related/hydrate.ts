import type { LucidRow } from '../../types/model.js'
import type { RelationshipsContract } from '../../types/relations.js'
import { BaseModel } from '../../orm/base_model/index.js'
import type { SideloadedRelation, SideloadedRelations } from './types.js'

function getRoot(instance: LucidRow): LucidRow {
  let r: LucidRow = instance
  while ((r as any).$sideloadedRelationParent) {
    r = (r as any).$sideloadedRelationParent
  }
  return r
}

const MANY_RELATIONS = new Set(['hasMany', 'manyToMany', 'hasManyThrough', 'morphMany'])

/**
 * Hydrate related models from `$extras` (Adonis-style `_tableAttr` aliases).
 * Sync; runs in the query rowTransformer after `selectRelated` prepared the tree.
 */
export function hydrateSelectRelatedRow(instance: LucidRow): void {
  const tree = (instance as any).$sideloadedRelations as SideloadedRelations | undefined
  if (!tree) {
    return
  }

  const rootForExtras = getRoot(instance)

  for (const relationName in tree) {
    const entry = tree[relationName] as SideloadedRelation | undefined
    if (!entry || !entry.sideload) {
      continue
    }

    const { relation, subRelations, tableName } = entry
    const colPrefix = `_${tableName}`
    const relatedModel = relation.relatedModel() as typeof BaseModel

    const data: Record<string, unknown> = {}

    relatedModel.$columnsDefinitions.forEach((column, attributeName) => {
      const mappingKey = `${colPrefix}${attributeName}`
      if (mappingKey in rootForExtras.$extras) {
        data[column.columnName] = rootForExtras.$extras[mappingKey]
        delete rootForExtras.$extras[mappingKey]
      }
    })

    const hasAny = Object.keys(data).some(
      (k) => data[k] !== undefined && data[k] !== null,
    )
    if (!hasAny) {
      continue
    }

    const childInstance = relatedModel.$createFromAdapterResult(
      data,
      instance.$sideloaded,
      (instance as any).$options,
    )

    if (!childInstance) {
      continue
    }

    ;(childInstance as any).$sideloadedRelationParent = instance
    ;(childInstance as any).$sideloadedRelations = subRelations

    hydrateSelectRelatedRow(childInstance)

    const rel = relation as RelationshipsContract
    if (MANY_RELATIONS.has(rel.type)) {
      rel.pushRelated(instance, childInstance)
    } else {
      rel.setRelated(instance, childInstance as any)
    }
  }
}
