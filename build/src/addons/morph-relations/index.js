import { hasMany, hasOne } from '../../orm/decorators/index.js';
import { BaseModel } from '../../orm/base_model/index.js';
import { Preloader } from '../../orm/preloader/index.js';
const globalMorphMap = new Map();
const modelAliasMap = new WeakMap();
export function defineMorphMap(map) {
    for (const [alias, factory] of Object.entries(map)) {
        globalMorphMap.set(alias, factory);
        modelAliasMap.set(factory(), alias);
    }
}
export function MorphMapAlias(alias) {
    return function decorate(Model) {
        modelAliasMap.set(Model, alias);
        globalMorphMap.set(alias, () => Model);
    };
}
function resolveMorphValue(Model, options) {
    if (options.morphValue) {
        return options.morphValue;
    }
    const mapped = modelAliasMap.get(Model);
    if (mapped) {
        return mapped;
    }
    return Model.table;
}
function resolveMorphModelFromType(definition, morphType) {
    if (!morphType) {
        return null;
    }
    const localMap = definition.morphMap;
    if (localMap && localMap[morphType]) {
        return localMap[morphType]();
    }
    const globalFactory = globalMorphMap.get(morphType);
    if (globalFactory) {
        return globalFactory();
    }
    throw new Error(`Unable to resolve morph model for type "${morphType}" on relation "${definition.relationName}".`);
}
function setMorphRelated(parent, relationName, value) {
    if (value === null) {
        delete parent.$preloaded[relationName];
        return;
    }
    ;
    parent.$preloaded[relationName] = value;
}
function patchRelationHydration(Model, relationName, morphTypeKey, value) {
    const relation = Model.$getRelation(relationName);
    if (relation.__morphPatched) {
        return;
    }
    const original = relation.hydrateForPersistance.bind(relation);
    relation.hydrateForPersistance = (parent, related) => {
        original(parent, related);
        if (related && typeof related === 'object') {
            related[morphTypeKey] = value;
        }
    };
    relation.__morphPatched = true;
    relation.meta = {
        ...relation.meta,
        morphSelectRelated: { morphTypeKey, morphValue: value },
    };
}
export const morphOne = (model, options) => {
    return function decorate(target, property) {
        const ParentModel = target.constructor;
        const morphTypeKey = options.morphTypeKey || `${options.name}Type`;
        const morphIdKey = options.morphIdKey || `${options.name}Id`;
        const morphValue = resolveMorphValue(ParentModel, options);
        hasOne(model, {
            localKey: options.localKey,
            foreignKey: morphIdKey,
            serializeAs: options.serializeAs,
            onQuery(query) {
                query.where(morphTypeKey, morphValue);
                options.onQuery?.(query);
            },
            meta: options.meta,
        })(target, property);
        patchRelationHydration(ParentModel, property, morphTypeKey, morphValue);
    };
};
export const morphMany = (model, options) => {
    return function decorate(target, property) {
        const ParentModel = target.constructor;
        const morphTypeKey = options.morphTypeKey || `${options.name}Type`;
        const morphIdKey = options.morphIdKey || `${options.name}Id`;
        const morphValue = resolveMorphValue(ParentModel, options);
        hasMany(model, {
            localKey: options.localKey,
            foreignKey: morphIdKey,
            serializeAs: options.serializeAs,
            onQuery(query) {
                query.where(morphTypeKey, morphValue);
                options.onQuery?.(query);
            },
            meta: options.meta,
        })(target, property);
        patchRelationHydration(ParentModel, property, morphTypeKey, morphValue);
    };
};
class MorphToQueryClient {
    definition;
    parent;
    constructor(definition, parent) {
        this.definition = definition;
        this.parent = parent;
    }
    resolveMorphModel() {
        const morphType = this.parent[this.definition.typeKey];
        return resolveMorphModelFromType(this.definition, morphType);
    }
    query() {
        const model = this.resolveMorphModel();
        if (!model) {
            return null;
        }
        const id = this.parent[this.definition.idKey];
        return model.query().where(model.primaryKey, id);
    }
    async associate(related) {
        const model = related.constructor;
        const alias = modelAliasMap.get(model) || model.table;
        this.parent[this.definition.typeKey] = alias;
        this.parent[this.definition.idKey] = related[model.primaryKey];
        setMorphRelated(this.parent, this.definition.relationName, related);
        await this.parent.save();
    }
    async dissociate() {
        ;
        this.parent[this.definition.typeKey] = null;
        this.parent[this.definition.idKey] = null;
        setMorphRelated(this.parent, this.definition.relationName, null);
        await this.parent.save();
    }
}
let morphRelatedPatched = false;
let morphPreloaderPatched = false;
let morphSerializationPatched = false;
function ensureMorphRelatedPatch() {
    if (morphRelatedPatched) {
        return;
    }
    const originalRelated = BaseModel.prototype.related;
    BaseModel.prototype.related = function (relationName) {
        const Model = this.constructor;
        const def = Model.$morphToDefinitions?.get(relationName);
        if (def) {
            return new MorphToQueryClient(def, this);
        }
        return originalRelated.call(this, relationName);
    };
    morphRelatedPatched = true;
}
function ensureMorphPreloaderPatch() {
    if (morphPreloaderPatched) {
        return;
    }
    const originalLoad = Preloader.prototype.load;
    Preloader.prototype.load = function (name, callback) {
        const model = this['model'];
        const def = model.$morphToDefinitions?.get(name);
        if (!def) {
            return originalLoad.call(this, name, callback);
        }
        this['preloads'][name] = {
            __morphTo: true,
            definition: def,
            callback,
        };
        return this;
    };
    Preloader.prototype.processAllForOne = async function (parent, client) {
        const preloads = this['preloads'];
        const debugQueries = this['debugQueries'];
        const sideloaded = this['sideloaded'];
        await Promise.all(Object.keys(preloads).map(async (relationName) => {
            const node = preloads[relationName];
            if (!node?.__morphTo) {
                return this['processRelation'](relationName, parent, client);
            }
            const definition = node.definition;
            const callback = node.callback;
            const morphType = parent[definition.typeKey];
            const morphId = parent[definition.idKey];
            const model = resolveMorphModelFromType(definition, morphType);
            if (!model || morphId === undefined || morphId === null) {
                setMorphRelated(parent, definition.relationName, null);
                return;
            }
            const query = model.query({ client }).where(model.primaryKey, morphId).debug(debugQueries);
            query.sideload(sideloaded);
            if (typeof callback === 'function') {
                callback(query);
            }
            const result = await query.first();
            setMorphRelated(parent, definition.relationName, result || null);
        }));
    };
    Preloader.prototype.processAllForMany = async function (parent, client) {
        if (!parent.length) {
            return;
        }
        const preloads = this['preloads'];
        const debugQueries = this['debugQueries'];
        const sideloaded = this['sideloaded'];
        await Promise.all(Object.keys(preloads).map(async (relationName) => {
            const node = preloads[relationName];
            if (!node?.__morphTo) {
                return this['processRelationForMany'](relationName, parent, client);
            }
            const definition = node.definition;
            const callback = node.callback;
            const grouped = new Map();
            for (const row of parent) {
                const morphType = row[definition.typeKey];
                const morphId = row[definition.idKey];
                const model = resolveMorphModelFromType(definition, morphType);
                if (!model || morphId === undefined || morphId === null) {
                    setMorphRelated(row, definition.relationName, null);
                    continue;
                }
                const bucketKey = `${morphType}|${model.table}`;
                if (!grouped.has(bucketKey)) {
                    grouped.set(bucketKey, { model, ids: [], parents: [] });
                }
                const bucket = grouped.get(bucketKey);
                bucket.ids.push(morphId);
                bucket.parents.push(row);
            }
            for (const bucket of grouped.values()) {
                const query = bucket.model
                    .query({ client })
                    .whereIn(bucket.model.primaryKey, [...new Set(bucket.ids)])
                    .debug(debugQueries);
                query.sideload(sideloaded);
                if (typeof callback === 'function') {
                    callback(query);
                }
                const result = await query.exec();
                const byId = new Map();
                result.forEach((r) => byId.set(r[bucket.model.primaryKey], r));
                for (const row of bucket.parents) {
                    const morphId = row[definition.idKey];
                    setMorphRelated(row, definition.relationName, byId.get(morphId) || null);
                }
            }
        }));
    };
    morphPreloaderPatched = true;
}
function ensureMorphSerializationPatch() {
    if (morphSerializationPatched) {
        return;
    }
    const originalSerializeRelations = BaseModel.prototype.serializeRelations;
    BaseModel.prototype.serializeRelations = function (cherryPick, raw = false) {
        const Model = this.constructor;
        const preloadKeys = Object.keys(this.$preloaded);
        const morphDefs = Model.$morphToDefinitions || new Map();
        const morphKeys = [...morphDefs.keys()].filter((key) => this.$preloaded[key] !== undefined);
        const keys = [...new Set([...preloadKeys, ...morphKeys])];
        const morphResult = keys.reduce((result, key) => {
            const relation = Model.$relationsDefinitions.get(key);
            if (relation) {
                return result;
            }
            const def = morphDefs.get(key);
            if (!def) {
                return result;
            }
            const serializeAs = def.serializeAs === undefined ? key : def.serializeAs;
            if (!serializeAs) {
                return result;
            }
            const value = this.$preloaded[key];
            if (raw) {
                result[serializeAs] = value;
                return result;
            }
            const relationOptions = cherryPick ? cherryPick[serializeAs] : undefined;
            result[serializeAs] = value && typeof value.serialize === 'function' ? value.serialize(relationOptions) : value;
            return result;
        }, {});
        return { ...originalSerializeRelations.call(this, cherryPick, raw), ...morphResult };
    };
    morphSerializationPatched = true;
}
export function morphTo(options) {
    return function decorate(target, property) {
        ensureMorphRelatedPatch();
        ensureMorphPreloaderPatch();
        ensureMorphSerializationPatch();
        const Model = target.constructor;
        Model.boot();
        if (!Model.$morphToDefinitions) {
            Model.$morphToDefinitions = new Map();
        }
        Model.$morphToDefinitions.set(property, {
            relationName: property,
            typeKey: options.typeKey || `${options.name}Type`,
            idKey: options.idKey || `${options.name}Id`,
            morphMap: options.morphMap,
            serializeAs: options.serializeAs,
        });
    };
}
//# sourceMappingURL=index.js.map