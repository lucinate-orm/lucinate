# Addon: Filterable

Chain `.filter(input)` on the query builder and delegate to a class extending `BaseFilter`: each object key maps to a `camelCase` method (e.g. `user_name` → `userName`).

## Model mixin

```ts
import { compose } from '@poppinss/utils'
import { BaseModel, Filterable, BaseFilter } from 'lucinate'
import type { FilterInput } from 'lucinate'

class PostFilter extends BaseFilter {
  title(value: string) {
    this.query.where('title', 'like', `%${value}%`)
  }

  published(value: boolean) {
    this.query.where('published', value)
  }
}

class Post extends compose(BaseModel, Filterable) {
  static $filter = PostFilter
}
```

## Usage

```ts
const posts = await Post.query()
  .filter({ title: 'lucinate', published: true } satisfies FilterInput)
  .exec()
```

Second argument: a different filter class (one-off override):

```ts
await Post.query().filter({ title: 'x' }, CustomPostFilter).exec()
```

## Blacklist

```ts
class PostFilter extends BaseFilter {
  static blacklist = ['dangerousMethod']
}
```

## Macro registration

The `filter` macro is registered when the addon module is imported. You can also call `registerFilterAddon(ModelQueryBuilder)` for a custom builder.

## BaseFilter

- `apply()` walks `input` keys, skips `''` and `undefined`, converts keys to camelCase, and invokes matching methods.
- Override `setup()` for shared logic before the loop.
