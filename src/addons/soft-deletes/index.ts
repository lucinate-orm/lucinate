import { DateTime } from 'luxon'
import { type ModelQueryBuilderContract, type LucidModel } from '../../types/model.js'
import type { ModelMixin } from '../core/types.js'
import { ModelQueryBuilder } from '../../orm/query_builder/index.js'

const SOFT_DELETE_MODE = Symbol('lucinate.softDeleteMode')

type SoftDeleteMode = 'with' | 'only' | undefined

export type SoftDeletesOptions = {
  /**
   * Model attribute used to store deleted timestamp.
   * Must map to an existing nullable column.
   */
  deletedAtColumn?: string
}

function getDeletedAtColumn(Model: any): string {
  return Model.$softDeletes?.deletedAtColumn ?? 'deletedAt'
}

/**
 * Coluna qualificada `tabela.coluna` no SQL (ex.: `partners.deleted_at`).
 * Evita ambiguidade em JOINs quando outra tabela também tem a mesma coluna.
 */
function getQualifiedDeletedAtColumn(Model: any): string {
  const attr = getDeletedAtColumn(Model)
  const columnName = Model.$keys.attributesToColumns.resolve(attr)
  return `${Model.table}.${columnName}`
}

function getMode(builder: any): SoftDeleteMode {
  return builder[SOFT_DELETE_MODE]
}

function setMode(builder: any, mode: SoftDeleteMode) {
  builder[SOFT_DELETE_MODE] = mode
}

function applySoftDeleteScope(builder: any, Model: any) {
  const qualifiedDeletedAt = getQualifiedDeletedAtColumn(Model)
  const mode = getMode(builder)

  if (mode === 'with') {
    return
  }

  if (mode === 'only') {
    builder.whereNotNull(qualifiedDeletedAt)
    return
  }

  builder.whereNull(qualifiedDeletedAt)
}

function ensureSoftDeleteMacros(ModelQueryBuilder: any) {
  if (ModelQueryBuilder.__softDeletesMacrosRegistered) {
    return
  }

  ModelQueryBuilder.macro('withTrashed', function (this: any) {
    setMode(this, 'with')
    return this
  })

  ModelQueryBuilder.macro('onlyTrashed', function (this: any) {
    setMode(this, 'only')
    return this
  })

  ModelQueryBuilder.macro('withoutTrashed', function (this: any) {
    setMode(this, undefined)
    return this
  })

  ModelQueryBuilder.macro('restore', async function (this: any) {
    const deletedAtColumn = getDeletedAtColumn(this.model)
    const qualifiedDeletedAt = getQualifiedDeletedAtColumn(this.model)
    return this.withTrashed().whereNotNull(qualifiedDeletedAt).update({ [deletedAtColumn]: null })
  })

  ModelQueryBuilder.macro('forceDelete', async function (this: any) {
    return this.withTrashed().delete()
  })

  ModelQueryBuilder.__softDeletesMacrosRegistered = true
}

export const SoftDeletes: ModelMixin = (superclass) => {
  class SoftDeletesModel extends superclass {
    static $softDeletes = {
      deletedAtColumn: 'deletedAt',
      initialized: false,
    }

    static boot() {
      super.boot()
      ensureSoftDeleteMacros(ModelQueryBuilder)

      if (this.$softDeletes.initialized) {
        return
      }

      this.$softDeletes.initialized = true

      this.before('find', (query: any) => {
        applySoftDeleteScope(query, this)
      })
      this.before('fetch', (query: any) => {
        applySoftDeleteScope(query, this)
      })
      this.before('paginate', (queries: any) => {
        const [mainQuery, countQuery] = queries
        applySoftDeleteScope(mainQuery, this)
        applySoftDeleteScope(countQuery, this)
      })
    }

    async delete() {
      const Model = this.constructor as any
      const deletedAtColumn = getDeletedAtColumn(Model)
      ;(this as any)[deletedAtColumn] = DateTime.now()
      await (this as any).save()
    }

    async deleteQuietly() {
      const Model = this.constructor as any
      const deletedAtColumn = getDeletedAtColumn(Model)
      ;(this as any)[deletedAtColumn] = DateTime.now()
      await (this as any).saveQuietly()
    }

    async restore() {
      const Model = this.constructor as any
      const deletedAtColumn = getDeletedAtColumn(Model)
      ;(this as any)[deletedAtColumn] = null
      await (this as any).save()
      return this
    }

    async forceDelete() {
      return super.delete()
    }

    get trashed() {
      const Model = this.constructor as any
      const deletedAtColumn = getDeletedAtColumn(Model)
      return !!(this as any)[deletedAtColumn]
    }
  }

  return SoftDeletesModel as any
}

export function configureSoftDeletes(Model: LucidModel, options: SoftDeletesOptions = {}) {
  const target = Model as any
  target.boot()
  target.$softDeletes = {
    ...(target.$softDeletes || {}),
    deletedAtColumn: options.deletedAtColumn ?? target.$softDeletes?.deletedAtColumn ?? 'deletedAt',
    initialized: target.$softDeletes?.initialized ?? true,
  }
}

export function registerSoftDeletesAddon(ModelQueryBuilder: any) {
  ensureSoftDeleteMacros(ModelQueryBuilder)
}

export type SoftDeletesQueryBuilder<Model extends LucidModel> = ModelQueryBuilderContract<Model> & {
  withTrashed(): SoftDeletesQueryBuilder<Model>
  onlyTrashed(): SoftDeletesQueryBuilder<Model>
  withoutTrashed(): SoftDeletesQueryBuilder<Model>
  restore(): Promise<any>
  forceDelete(): Promise<any>
}
