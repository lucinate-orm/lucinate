# Addon: join relations

Adds an explicit **JOIN** from a **`belongsTo`** or **`hasOne`** relation name — useful for filtering or ordering by related columns without preload.

## Macros

- `joinRelation(relationName, options?)` — INNER JOIN by default.
- `leftJoinRelation(relationName, options?)` — LEFT JOIN (`joinType` inside `options` is ignored; always left).

## Options

```ts
type JoinRelatedOptions = {
  joinType?: 'inner' | 'left'
  /**
   * When `true`, also appends `select(\`${relatedTable}.*\`)`.
   * Default is `false`: JOIN only; pick columns with `.select(...)`.
   */
  selectRelated?: boolean
}
```

## Example

```ts
import { User } from './models/user.js'

const rows = await User.query()
  .joinRelation('profile', { joinType: 'left' })
  .where('profiles.country', 'PT')
  .select('users.id', 'users.email', 'profiles.bio')
  .exec()
```

Include all columns from the related table:

```ts
await User.query()
  .joinRelation('profile', { selectRelated: true })
  .where('users.active', true)
  .exec()
```

## Limitations (MVP)

Only **`belongsTo`** and **`hasOne`**. Other relation types (`hasMany`, etc.) throw until supported.

## Registration

Macros register on addon import. `registerJoinRelationsAddon(ModelQueryBuilder)` exists for alternate builders.
