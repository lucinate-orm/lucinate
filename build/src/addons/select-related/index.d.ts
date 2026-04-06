import { ModelQueryBuilder } from '../../orm/query_builder/index.js';
export type { SelectRelatedJoinType, SelectRelatedOptions, SideloadedRelation, SideloadedRelations, } from './types.js';
export { applySelectRelated } from './apply.js';
export { getSideloadTree } from './apply.js';
export { SelectRelated } from './hooks.js';
export declare function registerSelectRelatedAddon(ModelQueryBuilderCtor?: typeof ModelQueryBuilder): void;
//# sourceMappingURL=index.d.ts.map