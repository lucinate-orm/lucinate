import type { LucidModel, OptionalTypedDecorator } from '../../types/model.js';
import type { MorphMany, MorphOne, MorphTo as MorphToOpaque } from '../../types/relations.js';
export type { MorphMany, MorphOne } from '../../types/relations.js';
export type ModelFactory = () => LucidModel;
export type MorphMap = Record<string, ModelFactory>;
export type InferMorphModel<TMap extends MorphMap> = ReturnType<TMap[keyof TMap]>;
export type MorphOneManyOptions = {
    name: string;
    localKey?: string;
    morphIdKey?: string;
    morphTypeKey?: string;
    morphValue?: string;
    serializeAs?: string | null;
    onQuery?: (query: any) => void;
    meta?: any;
};
export type MorphToOptions<TMap extends MorphMap = MorphMap> = {
    name: string;
    morphMap?: TMap;
    typeKey?: string;
    idKey?: string;
    serializeAs?: string | null;
};
export type MorphTo<RelatedModel extends LucidModel> = MorphToOpaque<RelatedModel> | null;
export type MorphOneDecorator = <RelatedModel extends LucidModel>(model: () => RelatedModel, options: MorphOneManyOptions) => OptionalTypedDecorator<MorphOne<RelatedModel> | null>;
export type MorphManyDecorator = <RelatedModel extends LucidModel>(model: () => RelatedModel, options: MorphOneManyOptions) => OptionalTypedDecorator<MorphMany<RelatedModel>>;
export declare function defineMorphMap(map: MorphMap): void;
export declare function MorphMapAlias(alias: string): (Model: LucidModel) => void;
export declare const morphOne: MorphOneDecorator;
export declare const morphMany: MorphManyDecorator;
export declare function morphTo<TMap extends MorphMap>(options: MorphToOptions<TMap>): OptionalTypedDecorator<MorphToOpaque<InferMorphModel<TMap>> | null>;
//# sourceMappingURL=index.d.ts.map