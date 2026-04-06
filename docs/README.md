# Addons (lucinate)

Addons extend `BaseModel` and/or `ModelQueryBuilder` via **mixins** (`compose` from `@poppinss/utils`) and **macros** on the builder. Importing `lucinate` registers most macros automatically; some mixins are required for model hooks.

| Addon | Description | Doc |
|--------|-------------|-----|
| Soft deletes | Logical delete (`deleted_at`) and `withTrashed` / `onlyTrashed` scopes | [addon-soft-deletes.md](./addon-soft-deletes.md) |
| Filterable | Chain `.filter(input)` with `BaseFilter` classes | [addon-filters.md](./addon-filters.md) |
| Join relations | `.joinRelation()` / `.leftJoinRelation()` for `belongsTo` / `hasOne` | [addon-join-relations.md](./addon-join-relations.md) |
| Select related | JOIN + aliased columns + hydration (Django-style `select_related`) | [addon-select-related.md](./addon-select-related.md) |
| Has UUIDs | Generate UUIDs on configured columns at `create` | [addon-has-uuids.md](./addon-has-uuids.md) |
| Has ULIDs | Generate ULIDs on configured columns at `create` | [addon-has-ulids.md](./addon-has-ulids.md) |
| Morph relations | Polymorphic `morphOne`, `morphMany`, `morphTo` | [addon-morph-relations.md](./addon-morph-relations.md) |

Example conventions:

- `compose(BaseModel, Mixin1, Mixin2)` to combine mixins.
- Models and `bootDatabase()` as in the rest of the package (see root README).
