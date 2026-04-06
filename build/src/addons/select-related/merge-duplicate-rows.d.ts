import type { LucidRow } from '../../types/model.js';
/**
 * Após JOIN em relações `hasMany` / `manyToMany`, o SQL devolve uma linha por filho.
 * Junta instâncias raiz com o mesmo PK e concatena as coleções em `$preloaded`.
 */
export declare function mergeSelectRelatedDuplicateRootRows(models: LucidRow[]): void;
//# sourceMappingURL=merge-duplicate-rows.d.ts.map