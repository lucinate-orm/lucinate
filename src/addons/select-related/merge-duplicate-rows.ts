import type { LucidModel, LucidRow } from '../../types/model.js'
import type { RelationshipsContract } from '../../types/relations.js'
import type { SideloadedRelations } from './types.js'

const MANY_RELATIONS = new Set(['hasMany', 'manyToMany', 'hasManyThrough', 'morphMany'])

function treeHasManySideload(tree: SideloadedRelations): boolean {
  for (const name in tree) {
    const e = tree[name]
    if (!e) {
      continue
    }
    if (MANY_RELATIONS.has((e.relation as RelationshipsContract).type)) {
      return true
    }
    if (treeHasManySideload(e.subRelations)) {
      return true
    }
  }
  return false
}

function mergeTwoSideloadedByTree(
  base: LucidRow,
  other: LucidRow,
  tree: SideloadedRelations,
): void {
  for (const name in tree) {
    const entry = tree[name]
    if (!entry || !entry.sideload) {
      continue
    }

    const rel = entry.relation as RelationshipsContract
    if (!MANY_RELATIONS.has(rel.type)) {
      continue
    }

    const relatedModel = rel.relatedModel() as LucidModel
    const a = (base.$preloaded as any)[name] as LucidRow[] | undefined
    const b = (other.$preloaded as any)[name] as LucidRow[] | undefined
    const combined = [...(a || []), ...(b || [])]
    ;(base.$preloaded as any)[name] = mergeNestedManyByPk(combined, entry.subRelations, relatedModel)
  }
}

function mergeNestedManyByPk(
  items: LucidRow[],
  subTree: SideloadedRelations,
  relatedModel: LucidModel,
): LucidRow[] {
  if (items.length === 0) {
    return items
  }

  const pkAttr = relatedModel.primaryKey
  const map = new Map<string, LucidRow[]>()

  for (const item of items) {
    const key = String((item as any)[pkAttr])
    if (!map.has(key)) {
      map.set(key, [])
    }
    map.get(key)!.push(item)
  }

  const out: LucidRow[] = []
  for (const [, group] of map) {
    out.push(mergeGroup(group, subTree))
  }
  return out
}

function mergeGroup(group: LucidRow[], tree: SideloadedRelations): LucidRow {
  if (group.length === 1) {
    return group[0]
  }
  const base = group[0]
  for (let i = 1; i < group.length; i++) {
    mergeTwoSideloadedByTree(base, group[i], tree)
  }
  return base
}

function mergeRootRowsByPrimaryKey(models: LucidRow[], tree: SideloadedRelations): LucidRow[] {
  const Model = models[0].constructor as LucidModel
  const pkAttr = Model.primaryKey
  const groups = new Map<string, LucidRow[]>()

  for (const m of models) {
    const key = String((m as any)[pkAttr])
    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(m)
  }

  const out: LucidRow[] = []
  for (const [, group] of groups) {
    out.push(mergeGroup(group, tree))
  }
  return out
}

/**
 * Após JOIN em relações `hasMany` / `manyToMany`, o SQL devolve uma linha por filho.
 * Junta instâncias raiz com o mesmo PK e concatena as coleções em `$preloaded`.
 */
export function mergeSelectRelatedDuplicateRootRows(models: LucidRow[]): void {
  if (models.length < 2) {
    return
  }

  const tree = (models[0] as any).$sideloadedRelations as SideloadedRelations | undefined
  if (!tree || !treeHasManySideload(tree)) {
    return
  }

  const merged = mergeRootRowsByPrimaryKey(models, tree)
  models.length = 0
  models.push(...merged)
}
