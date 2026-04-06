import type { LucidRow } from '../../types/model.js';
/**
 * Hydrate related models from `$extras` (Adonis-style `_tableAttr` aliases).
 * Sync; runs in the query rowTransformer after `selectRelated` prepared the tree.
 */
export declare function hydrateSelectRelatedRow(instance: LucidRow): void;
//# sourceMappingURL=hydrate.d.ts.map