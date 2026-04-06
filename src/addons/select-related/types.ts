import type { RelationshipsContract } from '../../types/relations.js'

/**
 * Inspired by [adonisjs-select-related](https://github.com/chirgjin/adonisjs-select-related).
 */
export type SelectRelatedJoinType = 'inner' | 'left'

export type SelectRelatedOptions = {
  /**
   * `inner` → INNER JOIN, `left` → LEFT JOIN (LEFT OUTER JOIN in SQL).
   * @default 'inner'
   */
  joinType?: SelectRelatedJoinType
  /**
   * When true, hydrate related rows into `$preloaded` / serialization.
   * When false, only JOIN + SELECT aliases (e.g. for filtering only).
   * @default true
   */
  sideload?: boolean
  /**
   * Limit which related attributes are selected (attribute names, not DB columns).
   * @default '*'
   */
  columns?: '*' | string[]
}

export type SideloadedRelation = {
  relation: RelationshipsContract
  tableName: string
  columns: '*' | string[]
  sideload: boolean
  subRelations: SideloadedRelations
}

export type SideloadedRelations = Record<string, SideloadedRelation | undefined>
