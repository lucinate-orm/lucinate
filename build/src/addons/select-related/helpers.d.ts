import type { QueryClientContract } from '../../types/database.js';
import type { LucidModel } from '../../types/model.js';
import type { SideloadedRelations } from './types.js';
export declare function getCol(model: LucidModel, attributeName: string): string;
/**
 * Whether the query already has at least one SELECT column (Knex internal).
 */
export declare function hasSelect(knexQuery: any): boolean;
/**
 * Prefixes bare column names in SELECT with `baseTableOrAlias` so they are not ambiguous
 * after `selectRelated` adds JOINs (e.g. `id` → `partners.id`).
 * Only rewrites plain string identifiers; skips `*`, `table.col`, Raw, Ref, subqueries.
 */
export declare function qualifyBaseSelectColumnsForJoinedRoot(knexQuery: any, baseTableOrAlias: string): void;
/**
 * Build `??.?? as ??` selections for sideloaded relations (Adonis-style `_tableAttr` aliases).
 */
export declare function sideloadColumns(query: {
    knexQuery: any;
    client: QueryClientContract;
}, sideloadedRelations: SideloadedRelations, columnMapping?: Record<string, string>): Record<string, string>;
//# sourceMappingURL=helpers.d.ts.map