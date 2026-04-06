import { hasMany, hasOne } from '../../orm/decorators/index.js'
import { BaseModel } from '../../orm/base_model/index.js'
import { Preloader } from '../../orm/preloader/index.js'
import type { LucidModel, LucidRow, OptionalTypedDecorator } from '../../types/model.js'
import type { MorphTo as MorphToOpaque } from '../../types/relations.js'

export type ModelFactory = () => LucidModel
export type MorphMap = Record<string, ModelFactory>
export type InferMorphModel<TMap extends MorphMap> = ReturnType<TMap[keyof TMap]>

export type MorphOneManyOptions = {
  name: string
  localKey?: string
  morphIdKey?: string
  morphTypeKey?: string
  morphValue?: string
  serializeAs?: string | null
  onQuery?: (query: any) => void
  meta?: any
}

export type MorphToOptions<TMap extends MorphMap = MorphMap> = {
  name: string
  morphMap?: TMap
  typeKey?: string
  idKey?: string
  serializeAs?: string | null
}

export type MorphOne<RelatedModel extends LucidModel> = InstanceType<RelatedModel> | null
export type MorphMany<RelatedModel extends LucidModel> = InstanceType<RelatedModel>[]
export type MorphTo<RelatedModel extends LucidModel> = MorphToOpaque<RelatedModel> | null

type MorphToDefinition = {
  relationName: string
  typeKey: string
  idKey: string
  morphMap?: MorphMap
  serializeAs?: string | null
}

const globalMorphMap = new Map<string, ModelFactory>()
const modelAliasMap = new WeakMap<LucidModel, string>()

export function defineMorphMap(map: MorphMap) {
  for (const [alias, factory] of Object.entries(map)) {
    globalMorphMap.set(alias, factory)
    modelAliasMap.set(factory(), alias)
  }
}

export function MorphMapAlias(alias: string) {
  return function decorate(Model: LucidModel) {
    modelAliasMap.set(Model, alias)
    globalMorphMap.set(alias, () => Model)
  }
}

function resolveMorphValue(Model: LucidModel, options: MorphOneManyOptions): string {
  if (options.morphValue) {
    return options.morphValue
  }

  const mapped = modelAliasMap.get(Model)
  if (mapped) {
    return mapped
  }

  return Model.table
}

function resolveMorphModelFromType(definition: MorphToDefinition, morphType: string | null | undefined) {
  if (!morphType) {
    return null
  }

  const localMap = definition.morphMap
  if (localMap && localMap[morphType]) {
    return localMap[morphType]()
  }

  const globalFactory = globalMorphMap.get(morphType)
  if (globalFactory) {
    return globalFactory()
  }

  throw new Error(
    `Unable to resolve morph model for type "${morphType}" on relation "${definition.relationName}".`
  )
}

function setMorphRelated(parent: LucidRow, relationName: string, value: LucidRow | null) {
  if (value === null) {
    delete (parent as any).$preloaded[relationName]
    return
  }
  ;(parent as any).$preloaded[relationName] = value
}

function patchRelationHydration(Model: LucidModel, relationName: string, morphTypeKey: string, value: string) {
  const relation = (Model as any).$getRelation(relationName)
  if ((relation as any).__morphPatched) {
    return
  }

  const original = relation.hydrateForPersistance.bind(relation)
  relation.hydrateForPersistance = (parent: LucidRow, related: any) => {
    original(parent, related)
    if (related && typeof related === 'object') {
      related[morphTypeKey] = value
    }
  }
  ;(relation as any).__morphPatched = true
}

export function morphOne<RelatedModel extends LucidModel>(
  model: () => RelatedModel,
  options: MorphOneManyOptions
): OptionalTypedDecorator<InstanceType<RelatedModel> | null> {
  return function decorate(target, property) {
    const ParentModel = target.constructor as LucidModel
    const morphTypeKey = options.morphTypeKey || `${options.name}Type`
    const morphIdKey = options.morphIdKey || `${options.name}Id`
    const morphValue = resolveMorphValue(ParentModel, options)

    hasOne(model, {
      localKey: options.localKey,
      foreignKey: morphIdKey,
      serializeAs: options.serializeAs,
      onQuery(query) {
        query.where(morphTypeKey, morphValue)
        options.onQuery?.(query)
      },
      meta: options.meta,
    })(target as any, property)

    patchRelationHydration(ParentModel, property, morphTypeKey, morphValue)
  }
}

export function morphMany<RelatedModel extends LucidModel>(
  model: () => RelatedModel,
  options: MorphOneManyOptions
): OptionalTypedDecorator<InstanceType<RelatedModel>[]> {
  return function decorate(target, property) {
    const ParentModel = target.constructor as LucidModel
    const morphTypeKey = options.morphTypeKey || `${options.name}Type`
    const morphIdKey = options.morphIdKey || `${options.name}Id`
    const morphValue = resolveMorphValue(ParentModel, options)

    hasMany(model, {
      localKey: options.localKey,
      foreignKey: morphIdKey,
      serializeAs: options.serializeAs,
      onQuery(query) {
        query.where(morphTypeKey, morphValue)
        options.onQuery?.(query)
      },
      meta: options.meta,
    })(target as any, property)

    patchRelationHydration(ParentModel, property, morphTypeKey, morphValue)
  }
}

class MorphToQueryClient {
  constructor(
    private definition: MorphToDefinition,
    private parent: LucidRow
  ) {}

  private resolveMorphModel() {
    const morphType = (this.parent as any)[this.definition.typeKey]
    return resolveMorphModelFromType(this.definition, morphType)
  }

  query() {
    const model = this.resolveMorphModel()
    if (!model) {
      return null
    }

    const id = (this.parent as any)[this.definition.idKey]
    return model.query().where(model.primaryKey, id)
  }

  async associate(related: LucidRow) {
    const model = related.constructor as LucidModel
    const alias = modelAliasMap.get(model) || model.table

    ;(this.parent as any)[this.definition.typeKey] = alias
    ;(this.parent as any)[this.definition.idKey] = (related as any)[model.primaryKey]
    setMorphRelated(this.parent, this.definition.relationName, related)
    await this.parent.save()
  }

  async dissociate() {
    ;(this.parent as any)[this.definition.typeKey] = null
    ;(this.parent as any)[this.definition.idKey] = null
    setMorphRelated(this.parent, this.definition.relationName, null)
    await this.parent.save()
  }
}

let morphRelatedPatched = false
let morphPreloaderPatched = false
let morphSerializationPatched = false

function ensureMorphRelatedPatch() {
  if (morphRelatedPatched) {
    return
  }

  const originalRelated = (BaseModel as any).prototype.related
  ;(BaseModel as any).prototype.related = function (relationName: string) {
    const Model = this.constructor as any
    const def = Model.$morphToDefinitions?.get(relationName)
    if (def) {
      return new MorphToQueryClient(def, this)
    }

    return originalRelated.call(this, relationName)
  }

  morphRelatedPatched = true
}

function ensureMorphPreloaderPatch() {
  if (morphPreloaderPatched) {
    return
  }

  const originalLoad = (Preloader as any).prototype.load
  ;(Preloader as any).prototype.load = function (name: string, callback?: any) {
    const model = this['model']
    const def = model.$morphToDefinitions?.get(name)
    if (!def) {
      return originalLoad.call(this, name, callback)
    }

    this['preloads'][name] = {
      __morphTo: true,
      definition: def,
      callback,
    }
    return this
  }

  ;(Preloader as any).prototype.processAllForOne = async function (parent: LucidRow, client: any) {
    const preloads = this['preloads']
    const debugQueries = this['debugQueries']
    const sideloaded = this['sideloaded']

    await Promise.all(
      Object.keys(preloads).map(async (relationName) => {
        const node = preloads[relationName]
        if (!node?.__morphTo) {
          return this['processRelation'](relationName, parent, client)
        }

        const definition: MorphToDefinition = node.definition
        const callback = node.callback
        const morphType = (parent as any)[definition.typeKey]
        const morphId = (parent as any)[definition.idKey]
        const model = resolveMorphModelFromType(definition, morphType)

        if (!model || morphId === undefined || morphId === null) {
          setMorphRelated(parent, definition.relationName, null)
          return
        }

        const query = model.query({ client }).where(model.primaryKey, morphId).debug(debugQueries)
        query.sideload(sideloaded)
        if (typeof callback === 'function') {
          callback(query)
        }

        const result = await query.first()
        setMorphRelated(parent, definition.relationName, result || null)
      })
    )
  }

  ;(Preloader as any).prototype.processAllForMany = async function (parent: LucidRow[], client: any) {
    if (!parent.length) {
      return
    }

    const preloads = this['preloads']
    const debugQueries = this['debugQueries']
    const sideloaded = this['sideloaded']

    await Promise.all(
      Object.keys(preloads).map(async (relationName) => {
        const node = preloads[relationName]
        if (!node?.__morphTo) {
          return this['processRelationForMany'](relationName, parent, client)
        }

        const definition: MorphToDefinition = node.definition
        const callback = node.callback
        const grouped = new Map<string, { model: LucidModel; ids: any[]; parents: LucidRow[] }>()

        for (const row of parent) {
          const morphType = (row as any)[definition.typeKey]
          const morphId = (row as any)[definition.idKey]
          const model = resolveMorphModelFromType(definition, morphType)
          if (!model || morphId === undefined || morphId === null) {
            setMorphRelated(row, definition.relationName, null)
            continue
          }

          const bucketKey = `${morphType}|${model.table}`
          if (!grouped.has(bucketKey)) {
            grouped.set(bucketKey, { model, ids: [], parents: [] })
          }

          const bucket = grouped.get(bucketKey)!
          bucket.ids.push(morphId)
          bucket.parents.push(row)
        }

        for (const bucket of grouped.values()) {
          const query = bucket.model
            .query({ client })
            .whereIn(bucket.model.primaryKey, [...new Set(bucket.ids)])
            .debug(debugQueries)

          query.sideload(sideloaded)
          if (typeof callback === 'function') {
            callback(query)
          }

          const result = await query.exec()
          const byId = new Map<any, any>()
          result.forEach((r: any) => byId.set(r[bucket.model.primaryKey], r))

          for (const row of bucket.parents) {
            const morphId = (row as any)[definition.idKey]
            setMorphRelated(row, definition.relationName, byId.get(morphId) || null)
          }
        }
      })
    )
  }

  morphPreloaderPatched = true
}

function ensureMorphSerializationPatch() {
  if (morphSerializationPatched) {
    return
  }

  const originalSerializeRelations = (BaseModel as any).prototype.serializeRelations
  ;(BaseModel as any).prototype.serializeRelations = function (cherryPick?: any, raw: boolean = false) {
    const Model = this.constructor as any
    const preloadKeys = Object.keys(this.$preloaded)
    const morphDefs = Model.$morphToDefinitions || new Map<string, MorphToDefinition>()
    const morphKeys = [...morphDefs.keys()].filter((key) => this.$preloaded[key] !== undefined)
    const keys = [...new Set([...preloadKeys, ...morphKeys])]

    const morphResult = keys.reduce((result: any, key) => {
      const relation = Model.$relationsDefinitions.get(key)
      if (relation) {
        return result
      }

      const def = morphDefs.get(key)
      if (!def) {
        return result
      }

      const serializeAs = def.serializeAs === undefined ? key : def.serializeAs
      if (!serializeAs) {
        return result
      }

      const value = this.$preloaded[key]
      if (raw) {
        result[serializeAs] = value
        return result
      }

      const relationOptions = cherryPick ? cherryPick[serializeAs] : undefined
      result[serializeAs] = value && typeof value.serialize === 'function' ? value.serialize(relationOptions) : value
      return result
    }, {})

    return { ...originalSerializeRelations.call(this, cherryPick, raw), ...morphResult }
  }

  morphSerializationPatched = true
}

export function morphTo<TMap extends MorphMap>(
  options: MorphToOptions<TMap>
): OptionalTypedDecorator<MorphToOpaque<InferMorphModel<TMap>> | null>
export function morphTo(options: MorphToOptions): OptionalTypedDecorator<MorphToOpaque<LucidModel> | null> {
  return function decorate(target, property) {
    ensureMorphRelatedPatch()
    ensureMorphPreloaderPatch()
    ensureMorphSerializationPatch()

    const Model = target.constructor as any
    Model.boot()
    if (!Model.$morphToDefinitions) {
      Model.$morphToDefinitions = new Map<string, MorphToDefinition>()
    }

    Model.$morphToDefinitions.set(property, {
      relationName: property,
      typeKey: options.typeKey || `${options.name}Type`,
      idKey: options.idKey || `${options.name}Id`,
      morphMap: options.morphMap,
      serializeAs: options.serializeAs,
    })
  }
}
