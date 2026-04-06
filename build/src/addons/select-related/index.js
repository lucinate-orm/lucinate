import { ModelQueryBuilder } from '../../orm/query_builder/index.js';
import { applySelectRelated } from './apply.js';
export { applySelectRelated } from './apply.js';
export { getSideloadTree } from './apply.js';
export { SelectRelated } from './hooks.js';
function ensureSelectRelatedMacro(ModelQueryBuilderCtor) {
    if (ModelQueryBuilderCtor.__selectRelatedMacroRegistered) {
        return;
    }
    ModelQueryBuilderCtor.macro('selectRelated', function (path, options = {}) {
        return applySelectRelated(this, path, options);
    });
    ModelQueryBuilderCtor.__selectRelatedMacroRegistered = true;
}
export function registerSelectRelatedAddon(ModelQueryBuilderCtor = ModelQueryBuilder) {
    ensureSelectRelatedMacro(ModelQueryBuilderCtor);
}
ensureSelectRelatedMacro(ModelQueryBuilder);
//# sourceMappingURL=index.js.map