import { hasMany, hasOne } from '../../orm/decorators/index.js'
import { BaseModel } from '../../orm/base_model/index.js'
import type { LucidModel, LucidRow, OptionalTypedDecorator } from '../../types/model.js'

type ModelFactory = () => LucidModel
type MorphMap = Record<string, ModelFactory>

type MorphOneManyOptions = {
  name: string
  localKey?: string
  morphIdKey?: string
  morphTypeKey?: string
  morphValue?: string
  serializeAs?: string | null
  onQuery?: (query: any) => void
  meta?: any
}

type MorphToOptions = {
  name: string
  morphMap?: MorphMap
  typeKey?: string
  idKey?: string
  serializeAs?: string | null
}

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
    if (!morphType) {
      return null
    }

    const localMap = this.definition.morphMap
    if (localMap && localMap[morphType]) {
      return localMap[morphType]()
    }

    const globalFactory = globalMorphMap.get(morphType)
    if (globalFactory) {
      return globalFactory()
    }

    throw new Error(
      `Unable to resolve morph model for type "${morphType}" on relation "${this.definition.relationName}".`
    )
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
    await this.parent.save()
  }

  async dissociate() {
    ;(this.parent as any)[this.definition.typeKey] = null
    ;(this.parent as any)[this.definition.idKey] = null
    await this.parent.save()
  }
}

let morphRelatedPatched = false

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

export function morphTo(options: MorphToOptions): OptionalTypedDecorator<LucidRow | null> {
  return function decorate(target, property) {
    ensureMorphRelatedPatch()

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
