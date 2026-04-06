import knex from "knex";

let registered = false;
let defaultMorphKeyType: "numeric" | "uuid" | "ulid" = "numeric";

/**
 * Register schema column helpers inspired by Laravel.
 */
export function registerSchemaExtensions() {
    if (registered) {
        return;
    }

    const tableBuilder = (knex as any).TableBuilder;
    if (!tableBuilder || typeof tableBuilder.extend !== "function") {
        return;
    }

    const extendIfMissing = (name: string, handler: (this: any, ...args: any[]) => any) => {
        if (typeof tableBuilder.prototype?.[name] === "function") {
            return;
        }

        try {
            tableBuilder.extend(name, handler);
        } catch (error: any) {
            const message = String(error?.message || "");
            if (!message.includes(`existing method ('${name}')`)) {
                throw error;
            }
        }
    };

    extendIfMissing(
        "softDeletes",
        function (this: any, columnName: string = "deleted_at") {
            return this.timestamp(columnName).nullable();
        },
    );

    extendIfMissing(
        "ulid",
        function (this: any, columnName: string = "id", length: number = 26) {
            return this.string(columnName, length);
        },
    );

    extendIfMissing(
        "uuid",
        function (
            this: any,
            columnName: string = "id",
            length: number = 36,
        ) {
            return this.string(columnName, length);
        },
    );

    extendIfMissing(
        "numericMorphs",
        function (this: any, name: string, indexName?: string, _after?: string) {
            this.string(`${name}_type`);
            this.bigInteger(`${name}_id`).unsigned();
            this.index([`${name}_type`, `${name}_id`], indexName);
        },
    );

    extendIfMissing(
        "nullableNumericMorphs",
        function (this: any, name: string, indexName?: string, _after?: string) {
            this.string(`${name}_type`).nullable();
            this.bigInteger(`${name}_id`).unsigned().nullable();
            this.index([`${name}_type`, `${name}_id`], indexName);
        },
    );

    extendIfMissing(
        "uuidMorphs",
        function (this: any, name: string, indexName?: string, _after?: string) {
            this.string(`${name}_type`);
            this.uuid(`${name}_id`);
            this.index([`${name}_type`, `${name}_id`], indexName);
        },
    );

    extendIfMissing(
        "nullableUuidMorphs",
        function (this: any, name: string, indexName?: string, _after?: string) {
            this.string(`${name}_type`).nullable();
            this.uuid(`${name}_id`).nullable();
            this.index([`${name}_type`, `${name}_id`], indexName);
        },
    );

    extendIfMissing(
        "ulidMorphs",
        function (this: any, name: string, indexName?: string, _after?: string) {
            this.string(`${name}_type`);
            this.ulid(`${name}_id`);
            this.index([`${name}_type`, `${name}_id`], indexName);
        },
    );

    extendIfMissing(
        "nullableUlidMorphs",
        function (this: any, name: string, indexName?: string, _after?: string) {
            this.string(`${name}_type`).nullable();
            this.ulid(`${name}_id`).nullable();
            this.index([`${name}_type`, `${name}_id`], indexName);
        },
    );

    extendIfMissing(
        "morphs",
        function (this: any, name: string, indexName?: string, after?: string) {
            if (defaultMorphKeyType === "uuid") {
                return this.uuidMorphs(name, indexName, after);
            }
            if (defaultMorphKeyType === "ulid") {
                return this.ulidMorphs(name, indexName, after);
            }
            return this.numericMorphs(name, indexName, after);
        },
    );

    extendIfMissing(
        "nullableMorphs",
        function (this: any, name: string, indexName?: string, after?: string) {
            if (defaultMorphKeyType === "uuid") {
                return this.nullableUuidMorphs(name, indexName, after);
            }
            if (defaultMorphKeyType === "ulid") {
                return this.nullableUlidMorphs(name, indexName, after);
            }
            return this.nullableNumericMorphs(name, indexName, after);
        },
    );

    registered = true;
}

export function setDefaultMorphKeyType(type: "numeric" | "uuid" | "ulid") {
    defaultMorphKeyType = type;
}
