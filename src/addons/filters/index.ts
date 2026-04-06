import type { LucidModel } from '../../types/model.js'
import type { ModelMixin } from '../core/types.js'

export type FilterInput = Record<string, any>

export abstract class BaseFilter<Query = any> {
  constructor(
    protected readonly query: Query,
    protected readonly input: FilterInput
  ) {}

  static blacklist: string[] = []

  setup(): void {}

  apply() {
    this.setup()
    const blacklist = (this.constructor as any).blacklist || []

    for (const [rawKey, value] of Object.entries(this.input)) {
      if (value === '' || value === undefined) {
        continue
      }

      const method = rawKey.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())
      if (blacklist.includes(method)) {
        continue
      }

      const fn = (this as any)[method]
      if (typeof fn === 'function') {
        fn.call(this, value)
      }
    }

    return this.query
  }
}

function ensureFilterMacro(ModelQueryBuilder: any) {
  if (ModelQueryBuilder.__filterMacroRegistered) {
    return
  }

  ModelQueryBuilder.macro('filter', function (this: any, input: FilterInput, FilterCtor?: any) {
    const SelectedFilter = FilterCtor || this.model.$filter
    if (!SelectedFilter) {
      return this
    }

    const filter = new SelectedFilter(this, input || {})
    filter.apply()
    return this
  })

  ModelQueryBuilder.__filterMacroRegistered = true
}

export const Filterable: ModelMixin = (superclass) => {
  class FilterableModel extends superclass {
    static $filter: any

    static boot() {
      super.boot()
      if ((this as any).__filterableBooted) {
        return
      }

      ;(this as any).__filterableBooted = true
    }

    static filter(input: FilterInput = {}, FilterCtor?: any) {
      return (this as any).query().filter(input, FilterCtor)
    }
  }

  return FilterableModel as any
}

export function registerFilterAddon(ModelQueryBuilder: any) {
  ensureFilterMacro(ModelQueryBuilder)
}
