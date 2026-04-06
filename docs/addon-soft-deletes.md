# Addon: soft deletes

Logical deletion: instead of removing the row, a timestamp column is set (default attribute `deletedAt` → column `deleted_at`). Normal queries exclude soft-deleted rows.

## Mixin

```ts
import { compose } from '@poppinss/utils'
import { BaseModel, SoftDeletes } from 'lucinate'
import { column } from 'lucinate/orm'
import { DateTime } from 'luxon'

class Post extends compose(BaseModel, SoftDeletes) {
  @column.dateTime()
  declare deletedAt: DateTime | null
}
```

## Custom deleted-at column

If the attribute is not `deletedAt`, call `configureSoftDeletes` **after** defining the class (or set `static $softDeletes` per your app conventions):

```ts
import { configureSoftDeletes } from 'lucinate'

class Post extends compose(BaseModel, SoftDeletes) {
  @column.dateTime()
  declare archivedAt: DateTime | null
}

configureSoftDeletes(Post, { deletedAtColumn: 'archivedAt' })
```

## Instance behavior

- `delete()` / `deleteQuietly()` — set the timestamp on `deletedAt` (or configured column).
- `restore()` — clear the timestamp.
- `forceDelete()` — call the real DB delete (remove the row).
- `trashed` getter — whether the row is soft-deleted.

## Query builder

The addon registers macros on `ModelQueryBuilder` (loaded with the package):

```ts
await Post.query().where('published', true).exec()
// WHERE ... AND posts.deleted_at IS NULL

await Post.query().withTrashed().where('id', id).first()
// includes rows with deleted_at set

await Post.query().onlyTrashed().exec()
// only logically deleted rows

await Post.query().withoutTrashed() // explicit: same as default scope
```

Bulk restore / physical delete:

```ts
await Post.query().withTrashed().where('userId', userId).restore()
await Post.query().withTrashed().where('userId', userId).forceDelete()
```

## Notes

`before:find`, `before:fetch`, and `before:paginate` add `deleted_at IS NULL` using a **qualified** column (`table.column`) to avoid ambiguity when JOINs are present.
