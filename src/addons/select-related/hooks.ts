import type { LucidRow } from '../../types/model.js'
import type { ModelMixin } from '../core/types.js'
import { getSideloadTree } from './apply.js'
import { hasSelect, qualifyBaseSelectColumnsForJoinedRoot, sideloadColumns } from './helpers.js'
import { hydrateSelectRelatedRow } from './hydrate.js'
import { mergeSelectRelatedDuplicateRootRows } from './merge-duplicate-rows.js'

const kFinalized = Symbol.for('lucinate.selectRelated.finalized')

export function finalizeSelectRelatedQuery(query: any) {
  const tree = getSideloadTree(query)
  if (!tree || Object.keys(tree).length < 1) {
    return
  }
  const knexQ = query.knexQuery
  if (knexQ[kFinalized]) {
    return
  }
  knexQ[kFinalized] = true

  const baseTable = (query as { tableAlias?: string }).tableAlias ?? query.model.table
  qualifyBaseSelectColumnsForJoinedRoot(knexQ, baseTable)

  if (!hasSelect(query.knexQuery)) {
    query.select(`${query.model.table}.*`)
  }

  sideloadColumns(query, tree, {})

  const snapshot = tree
  const prev = query.rowTransformerCallback as ((row: LucidRow) => void) | undefined
  query.rowTransformer((row: LucidRow) => {
    prev?.(row)
    ;(row as any).$sideloadedRelations = snapshot
    hydrateSelectRelatedRow(row)
  })
}

/**
 * Mixin: após `super.boot()`, registra `before:fetch` / `before:find` nesta classe de modelo
 * para finalizar `selectRelated()` (SELECTs + hidratação). Use com `compose(BaseModel, SelectRelated, …)`.
 */
export const SelectRelated: ModelMixin = (superclass) => {
  class SelectRelatedModel extends superclass {
    static boot() {
      super.boot()

      if ((this as any).__selectRelatedBooted) {
        return
      }
      ;(this as any).__selectRelatedBooted = true

      this.before('fetch', (q: any) => finalizeSelectRelatedQuery(q))
      this.before('find', (q: any) => finalizeSelectRelatedQuery(q))

      this.after('fetch', (models: LucidRow[]) => {
        mergeSelectRelatedDuplicateRootRows(models)
      })
    }
  }

  return SelectRelatedModel as any
}
