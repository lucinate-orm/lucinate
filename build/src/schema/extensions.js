import { createRequire } from "node:module";
/**
 * Must match `src/connection/index.ts`: ESM `import knex from "knex"` can resolve a
 * different module instance than `require("knex/knex")`, so TableBuilder extensions
 * would not apply to schema queries at runtime (e.g. `table.ulid is not a function`).
 */
const require = createRequire(import.meta.url);
const knex = require("knex/knex");
let registered = false;
let defaultMorphKeyType = "numeric";
/**
 * Register schema column helpers inspired by Laravel.
 */
export function registerSchemaExtensions() {
    if (registered) {
        return;
    }
    const tableBuilder = knex.TableBuilder;
    if (!tableBuilder || typeof tableBuilder.extend !== "function") {
        return;
    }
    const extendIfMissing = (name, handler) => {
        if (typeof tableBuilder.prototype?.[name] === "function") {
            return;
        }
        try {
            tableBuilder.extend(name, handler);
        }
        catch (error) {
            const message = String(error?.message || "");
            if (!message.includes(`existing method ('${name}')`)) {
                throw error;
            }
        }
    };
    extendIfMissing("softDeletes", function (columnName = "deleted_at") {
        return this.timestamp(columnName).nullable();
    });
    extendIfMissing("ulid", function (columnName = "id", length = 26) {
        return this.string(columnName, length);
    });
    extendIfMissing("uuid", function (columnName = "id", length = 36) {
        return this.string(columnName, length);
    });
    extendIfMissing("numericMorphs", function (name, indexName, _after) {
        this.string(`${name}_type`);
        this.bigInteger(`${name}_id`).unsigned();
        this.index([`${name}_type`, `${name}_id`], indexName);
    });
    extendIfMissing("nullableNumericMorphs", function (name, indexName, _after) {
        this.string(`${name}_type`).nullable();
        this.bigInteger(`${name}_id`).unsigned().nullable();
        this.index([`${name}_type`, `${name}_id`], indexName);
    });
    extendIfMissing("uuidMorphs", function (name, indexName, _after) {
        this.string(`${name}_type`);
        this.uuid(`${name}_id`);
        this.index([`${name}_type`, `${name}_id`], indexName);
    });
    extendIfMissing("nullableUuidMorphs", function (name, indexName, _after) {
        this.string(`${name}_type`).nullable();
        this.uuid(`${name}_id`).nullable();
        this.index([`${name}_type`, `${name}_id`], indexName);
    });
    extendIfMissing("ulidMorphs", function (name, indexName, _after) {
        this.string(`${name}_type`);
        this.ulid(`${name}_id`);
        this.index([`${name}_type`, `${name}_id`], indexName);
    });
    extendIfMissing("nullableUlidMorphs", function (name, indexName, _after) {
        this.string(`${name}_type`).nullable();
        this.ulid(`${name}_id`).nullable();
        this.index([`${name}_type`, `${name}_id`], indexName);
    });
    extendIfMissing("morphs", function (name, indexName, after) {
        if (defaultMorphKeyType === "uuid") {
            return this.uuidMorphs(name, indexName, after);
        }
        if (defaultMorphKeyType === "ulid") {
            return this.ulidMorphs(name, indexName, after);
        }
        return this.numericMorphs(name, indexName, after);
    });
    extendIfMissing("nullableMorphs", function (name, indexName, after) {
        if (defaultMorphKeyType === "uuid") {
            return this.nullableUuidMorphs(name, indexName, after);
        }
        if (defaultMorphKeyType === "ulid") {
            return this.nullableUlidMorphs(name, indexName, after);
        }
        return this.nullableNumericMorphs(name, indexName, after);
    });
    registered = true;
}
export function setDefaultMorphKeyType(type) {
    defaultMorphKeyType = type;
}
//# sourceMappingURL=extensions.js.map