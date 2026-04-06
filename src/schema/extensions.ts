import knex from "knex";

let registered = false;

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

    tableBuilder.extend(
        "softDeletes",
        function (this: any, columnName: string = "deleted_at") {
            return this.timestamp(columnName).nullable();
        },
    );

    tableBuilder.extend(
        "ulid",
        function (this: any, columnName: string = "id", length: number = 26) {
            return this.string(columnName, length);
        },
    );

    /**
     * Knex already provides `uuid` for most dialects. Keep a fallback
     * to preserve API even when unavailable.
     */
    if (typeof tableBuilder.prototype?.uuid !== "function") {
        tableBuilder.extend(
            "uuid",
            function (
                this: any,
                columnName: string = "id",
                length: number = 36,
            ) {
                return this.string(columnName, length);
            },
        );
    }

    registered = true;
}
