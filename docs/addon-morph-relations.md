# Addon: morph relations

**Polymorphic** relations: a row references another table via a **type** + **id** pair (e.g. `commentable_type`, `commentable_id`).

## Global type map

To resolve the morph type string → model, register aliases at app startup:

```ts
import { defineMorphMap } from 'lucinate'
import { Post } from './models/post.js'
import { Video } from './models/video.js'

defineMorphMap({
  posts: () => Post,
  videos: () => Video,
})
```

Or decorate a model with `@MorphMapAlias('posts')` (exported from the addon).

## `morphOne` / `morphMany` (inverse side)

The **owned** model declares who points at it:

```ts
import { morphMany } from 'lucinate'
import type { MorphMany } from 'lucinate'
import { Comment } from './comment.js'

class Post extends BaseModel {
  @morphMany(() => Comment, { name: 'commentable' })
  declare comments: MorphMany<typeof Comment>
}
```

Useful `MorphOneManyOptions`:

- `name` — prefix for `morphTypeKey` / `morphIdKey` (e.g. `commentable` → `commentableType`, `commentableId`).
- `morphTypeKey`, `morphIdKey`, `morphValue` — overrides.
- `serializeAs` — JSON key.

## `morphTo` (polymorphic owner side)

```ts
import { morphTo } from 'lucinate'
import type { LucidModel } from 'lucinate'

class Comment extends BaseModel {
  @column()
  declare commentableType: string

  @column()
  declare commentableId: string

  @morphTo({ name: 'commentable', morphMap: { posts: () => Post, videos: () => Video } })
  declare commentable: LucidModel | null
}
```

- Local `morphMap` can coexist with `defineMorphMap` global.
- Exposes `related('commentable')` with `query()`, `associate()`, `dissociate()` (patch on `BaseModel`).

## Preload

The preloader is extended for `morphTo`: loads the correct model from `type` + `id`.

## Serialization

`morphTo` relations that are not in the classic `$relationsDefinitions` map are merged into `serialize()` via a `serializeRelations` patch.

## Select related

The `select-related` addon can use `morphSelectRelated` metadata on morph relations to constrain JOINs; a bare `morphTo` path is not a single JOIN chain — see [addon-select-related.md](./addon-select-related.md).

## MVP surface

Exports: `morphOne`, `morphMany`, `morphTo`, `defineMorphMap`, `MorphMapAlias`. Importing the module applies internal patches (related, preloader, serialize).
