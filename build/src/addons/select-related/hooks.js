import { getSideloadTree } from './apply.js';
import { hasSelect, qualifyBaseSelectColumnsForJoinedRoot, sideloadColumns } from './helpers.js';
import { hydrateSelectRelatedRow } from './hydrate.js';
import { mergeSelectRelatedDuplicateRootRows } from './merge-duplicate-rows.js';
const kFinalized = Symbol.for('lucinate.selectRelated.finalized');
export function finalizeSelectRelatedQuery(query) {
    const tree = getSideloadTree(query);
    if (!tree || Object.keys(tree).length < 1) {
        return;
    }
    const knexQ = query.knexQuery;
    if (knexQ[kFinalized]) {
        return;
    }
    knexQ[kFinalized] = true;
    const baseTable = query.tableAlias ?? query.model.table;
    qualifyBaseSelectColumnsForJoinedRoot(knexQ, baseTable);
    if (!hasSelect(query.knexQuery)) {
        query.select(`${query.model.table}.*`);
    }
    sideloadColumns(query, tree, {});
    const snapshot = tree;
    const prev = query.rowTransformerCallback;
    query.rowTransformer((row) => {
        prev?.(row);
        row.$sideloadedRelations = snapshot;
        hydrateSelectRelatedRow(row);
    });
}
/**
 * Mixin: após `super.boot()`, registra `before:fetch` / `before:find` nesta classe de modelo
 * para finalizar `selectRelated()` (SELECTs + hidratação). Use com `compose(BaseModel, SelectRelated, …)`.
 */
export const SelectRelated = (superclass) => {
    class SelectRelatedModel extends superclass {
        static boot() {
            super.boot();
            if (this.__selectRelatedBooted) {
                return;
            }
            ;
            this.__selectRelatedBooted = true;
            this.before('fetch', (q) => finalizeSelectRelatedQuery(q));
            this.before('find', (q) => finalizeSelectRelatedQuery(q));
            this.after('fetch', (models) => {
                mergeSelectRelatedDuplicateRootRows(models);
            });
        }
    }
    return SelectRelatedModel;
};
//# sourceMappingURL=hooks.js.map