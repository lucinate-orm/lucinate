export { generateUlid } from "../../internal/ids/ulid.js";
import { generateUlid } from "../../internal/ids/ulid.js";
function resolveUlidColumns(Model) {
    if (typeof Model.uniqueIds === "function") {
        const ids = Model.uniqueIds();
        if (Array.isArray(ids) && ids.length)
            return ids;
    }
    else if (Array.isArray(Model.uniqueIds) && Model.uniqueIds.length) {
        return Model.uniqueIds;
    }
    const configured = Model.$hasUlids?.columns;
    return configured?.length ? configured : ["id"];
}
export const HasUlids = (superclass) => {
    class HasUlidsModel extends superclass {
        static $hasUlids = {
            columns: [],
            generator: null,
            initialized: false,
        };
        static boot() {
            super.boot();
            if (this.$hasUlids.initialized) {
                return;
            }
            this.$hasUlids.initialized = true;
            this.before("create", (model) => {
                for (const column of resolveUlidColumns(this)) {
                    if (!model[column]) {
                        model[column] = generateUlid();
                    }
                }
            });
        }
    }
    return HasUlidsModel;
};
//# sourceMappingURL=index.js.map