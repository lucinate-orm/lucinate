# Addon: select related

Inspired by Django *select_related* and [adonisjs-select-related](https://github.com/chirgjin/adonisjs-select-related): **JOIN** along a relation path, add aliased **SELECT**s, hydrate related models into `$preloaded`, and for “many” relations **merge** duplicate parent rows after fetch.

## Requirements

1. **Macro** `.selectRelated()` — registered when you import the package (`select-related` addon).
2. **`SelectRelated` mixin** on the root model — required for `before:fetch` / `before:find` (finalize SELECT + hydration) and `after:fetch` (merge rows for `hasMany` / `manyToMany` / etc.).

```ts
import { compose } from '@poppinss/utils'
import { BaseModel, SelectRelated } from 'lucinate'

class Partner extends compose(BaseModel, SelectRelated) {
  // ...
}
```

## Basic usage

```ts
const partners = await Partner.query()
  .selectRelated('partnerType', {
    joinType: 'left',
    columns: ['id', 'name'],
  })
  .select('id', 'name')
  .exec()
```

Nested paths (dot notation):

```ts
await Order.query()
  .selectRelated('customer.profile', { joinType: 'inner' })
  .select('id')
  .exec()
```

## Options (`SelectRelatedOptions`)

| Option | Description |
|--------|-------------|
| `joinType` | `'inner'` (default) or `'left'` |
| `sideload` | `true` (default): hydrate and fill `$preloaded`. `false`: JOIN + metadata only (e.g. filtering). |
| `columns` | `'*'` or a list of related model **attribute** names |

## Limitations

- **`morphTo`**: not supported as a single linear JOIN path; use preload or filter by type.
- With **`hasMany`**, SQL returns one row per child; the mixin folds rows with the same parent PK into one model with an array on the relation.

## Additional API

- `registerSelectRelatedAddon(ModelQueryBuilder)` — if you need the macro on another builder.
- `applySelectRelated(query, path, options)` — advanced / integration use.

## Comparison with `join-relations`

| | join-relations | select-related |
|---|----------------|----------------|
| Relations | `belongsTo`, `hasOne` | Several types (incl. `hasMany`, M2M, *through*) |
| SELECT / hydrate | Optional (`selectRelated: true`) | Mixin finalizes aliased columns + hydration |
