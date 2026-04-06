import type { SelectRelatedOptions, SideloadedRelations } from './types.js';
export declare function getSideloadTree(query: object): SideloadedRelations;
/**
 * Apply JOINs and register sideload metadata (Adonis [selectRelated](https://github.com/chirgjin/adonisjs-select-related) style).
 * SELECT aliases + hydration run when the `SelectRelated` mixin registers `before:fetch` / `before:find`.
 */
export declare function applySelectRelated(query: any, path: string, options?: SelectRelatedOptions): any;
//# sourceMappingURL=apply.d.ts.map