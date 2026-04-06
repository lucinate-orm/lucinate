import type { ModelMixin } from '../core/types.js';
export type FilterInput = Record<string, any>;
export declare abstract class BaseFilter<Query = any> {
    protected readonly query: Query;
    protected readonly input: FilterInput;
    constructor(query: Query, input: FilterInput);
    static blacklist: string[];
    setup(): void;
    apply(): Query;
}
export declare const Filterable: ModelMixin;
export declare function registerFilterAddon(ModelQueryBuilder: any): void;
//# sourceMappingURL=index.d.ts.map