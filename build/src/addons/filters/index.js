import { ModelQueryBuilder } from '../../orm/query_builder/index.js';
export class BaseFilter {
    query;
    input;
    constructor(query, input) {
        this.query = query;
        this.input = input;
    }
    static blacklist = [];
    setup() { }
    apply() {
        this.setup();
        const blacklist = this.constructor.blacklist || [];
        for (const [rawKey, value] of Object.entries(this.input)) {
            if (value === '' || value === undefined) {
                continue;
            }
            const method = rawKey.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
            if (blacklist.includes(method)) {
                continue;
            }
            const fn = this[method];
            if (typeof fn === 'function') {
                fn.call(this, value);
            }
        }
        return this.query;
    }
}
function ensureFilterMacro(ModelQueryBuilder) {
    if (ModelQueryBuilder.__filterMacroRegistered) {
        return;
    }
    ModelQueryBuilder.macro('filter', function (input, FilterCtor) {
        const SelectedFilter = FilterCtor || this.model.$filter;
        if (!SelectedFilter) {
            return this;
        }
        const filter = new SelectedFilter(this, input || {});
        filter.apply();
        return this;
    });
    ModelQueryBuilder.__filterMacroRegistered = true;
}
export const Filterable = (superclass) => {
    class FilterableModel extends superclass {
        static $filter;
        static boot() {
            super.boot();
            if (this.__filterableBooted) {
                return;
            }
            ;
            this.__filterableBooted = true;
        }
    }
    return FilterableModel;
};
export function registerFilterAddon(ModelQueryBuilder) {
    ensureFilterMacro(ModelQueryBuilder);
}
/**
 * Auto-register filter macro on import.
 */
ensureFilterMacro(ModelQueryBuilder);
//# sourceMappingURL=index.js.map