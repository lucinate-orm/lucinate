import type { ModelMixin } from "../core/types.js";
export { generateUlid } from "../../internal/ids/ulid.js";
import { generateUlid } from "../../internal/ids/ulid.js";

function resolveUlidColumns(Model: any): string[] {
    if (typeof Model.uniqueIds === "function") {
        const ids = Model.uniqueIds();
        if (Array.isArray(ids) && ids.length) return ids;
    } else if (Array.isArray(Model.uniqueIds) && Model.uniqueIds.length) {
        return Model.uniqueIds;
    }

    const configured = Model.$hasUlids?.columns;
    return configured?.length ? configured : ["id"];
}

export const HasUlids: ModelMixin = (superclass) => {
    class HasUlidsModel extends superclass {
        static $hasUlids = {
            columns: [] as string[],
            generator: null as null | (() => string),
            initialized: false,
        };

        static uniqueIds(): string[] {
            return resolveUlidColumns(this);
        }

        static boot() {
            super.boot();

            if (this.$hasUlids.initialized) {
                return;
            }

            this.$hasUlids.initialized = true;

            this.before("create", (model: any) => {
                for (const column of resolveUlidColumns(this)) {
                    if (!model[column]) {
                        model[column] = generateUlid();
                    }
                }
            });
        }
    }

    return HasUlidsModel as any;
};
