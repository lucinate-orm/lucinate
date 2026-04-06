import type { LucidModel, LucidRow } from '../../types/model.js';
export type AnyModelCtor<TInstance extends LucidRow = LucidRow> = LucidModel & {
    new (...args: any[]): TInstance;
};
export type ModelMixin = (superclass: AnyModelCtor) => AnyModelCtor;
//# sourceMappingURL=types.d.ts.map