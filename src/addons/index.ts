import { ModelQueryBuilder } from '../orm/query_builder/index.js'

import { registerFilterAddon } from './filters/index.js'
import { registerJoinRelationsAddon } from './join-relations/index.js'
import { registerSoftDeletesAddon } from './soft-deletes/index.js'
import { SoftDeletes } from './soft-deletes/index.js'
import { Filterable } from './filters/index.js'
import { HasUuids } from './has-uuids/index.js'
import { HasUlids } from './has-ulids/index.js'

let addonsRegistered = false

/**
 * Register query-builder macros for optional addons.
 * Safe to call multiple times.
 */
export function registerAddons() {
  if (addonsRegistered) {
    return
  }

  registerFilterAddon(ModelQueryBuilder)
  registerJoinRelationsAddon(ModelQueryBuilder)
  registerSoftDeletesAddon(ModelQueryBuilder)
  addonsRegistered = true
}

export { SoftDeletes, Filterable, HasUuids, HasUlids }
export * from './soft-deletes/index.js'
export * from './filters/index.js'
export * from './join-relations/index.js'
export * from './has-uuids/index.js'
export * from './has-ulids/index.js'
