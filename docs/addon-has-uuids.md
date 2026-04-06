# Addon: Has UUIDs

Generates **UUID v4** (via `generateUuid`) on configured columns **before** persisting on `create`, when the value is still empty.

## Mixin

```ts
import { compose } from '@poppinss/utils'
import { BaseModel, HasUuids } from 'lucinate'
import { column } from 'lucinate/orm'

class ApiToken extends compose(BaseModel, HasUuids) {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare name: string
}
```

By default the target column is **`id`**.

## Multiple columns

Define `uniqueIds` on the model (function or static array):

```ts
class ApiToken extends compose(BaseModel, HasUuids) {
  static uniqueIds() {
    return ['id', 'correlationId']
  }

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare correlationId: string
}
```

Or use `static $hasUuids = { columns: ['id', 'correlationId'], ... }` as exposed by the mixin.

## Export

- `generateUuid` — re-exported from `lucinate` for tests or manual use.

## Hook

`before('create', ...)` only runs for **create**; updates do not auto-fill UUIDs.
