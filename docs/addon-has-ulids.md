# Addon: Has ULIDs

Generates **ULIDs** (lexicographically sortable) on configured columns on **`create`** when the value is empty — same pattern as `HasUuids`, using `generateUlid`.

## Mixin

```ts
import { compose } from '@poppinss/utils'
import { BaseModel, HasUlids } from 'lucinate'
import { column } from 'lucinate/orm'

class Order extends compose(BaseModel, HasUlids) {
  @column({ isPrimary: true })
  declare id: string
}
```

By default the target column is **`id`**.

## Multiple columns

```ts
class Order extends compose(BaseModel, HasUlids) {
  static uniqueIds = ['id', 'publicId'] as const

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare publicId: string
}
```

## Export

- `generateUlid` — re-exported for manual use or tests.

## Note

The mixin’s `static $hasUlids` object includes an optional `generator` hook if you need to replace the default generator in the future.
