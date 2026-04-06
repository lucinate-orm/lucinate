export { generateUuid } from "../../internal/ids/uuid.js";
import { generateUuid } from "../../internal/ids/uuid.js";
function resolveUuidColumns(Model) {
    if (typeof Model.uniqueIds === "function") {
        const ids = Model.uniqueIds();
        if (Array.isArray(ids) && ids.length)
            return ids;
    }
    else if (Array.isArray(Model.uniqueIds) && Model.uniqueIds.length) {
        return Model.uniqueIds;
    }
    const configured = Model.$hasUuids?.columns;
    return configured?.length ? configured : ["id"];
}
export const HasUuids = (superclass) => {
    class HasUuidsModel extends superclass {
        static $hasUuids = {
            columns: [],
            initialized: false,
        };
        static boot() {
            super.boot();
            if (this.$hasUuids.initialized) {
                return;
            }
            this.$hasUuids.initialized = true;
            this.before("create", (model) => {
                for (const column of resolveUuidColumns(this)) {
                    if (!model[column]) {
                        model[column] = generateUuid();
                    }
                }
            });
        }
    }
    return HasUuidsModel;
};
//# sourceMappingURL=index.js.map