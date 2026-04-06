import { ModelQueryBuilder } from '../../orm/query_builder/index.js'
import { applySelectRelated } from './apply.js'
import type { SelectRelatedOptions } from './types.js'

export type {
  SelectRelatedJoinType,
  SelectRelatedOptions,
  SideloadedRelation,
  SideloadedRelations,
} from './types.js'
export { applySelectRelated } from './apply.js'
export { getSideloadTree } from './apply.js'
export { SelectRelated } from './hooks.js'

function ensureSelectRelatedMacro(ModelQueryBuilderCtor: typeof ModelQueryBuilder) {
  if ((ModelQueryBuilderCtor as any).__selectRelatedMacroRegistered) {
    return
  }

  ModelQueryBuilderCtor.macro(
    'selectRelated',
    function (this: any, path: string, options: SelectRelatedOptions = {}) {
      return applySelectRelated(this, path, options)
    },
  )

  ;(ModelQueryBuilderCtor as any).__selectRelatedMacroRegistered = true
}

export function registerSelectRelatedAddon(ModelQueryBuilderCtor: typeof ModelQueryBuilder = ModelQueryBuilder) {
  ensureSelectRelatedMacro(ModelQueryBuilderCtor)
}

ensureSelectRelatedMacro(ModelQueryBuilder)
