import type { ModelMixin } from '../core/types.js';
export declare function finalizeSelectRelatedQuery(query: any): void;
/**
 * Mixin: após `super.boot()`, registra `before:fetch` / `before:find` nesta classe de modelo
 * para finalizar `selectRelated()` (SELECTs + hidratação). Use com `compose(BaseModel, SelectRelated, …)`.
 */
export declare const SelectRelated: ModelMixin;
//# sourceMappingURL=hooks.d.ts.map