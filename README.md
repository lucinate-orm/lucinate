# lucinate

A **framework-agnostic** data layer derived from ideas and code ported from [Adonis Lucid](https://github.com/adonisjs/lucid): models, query builder, migrations, schema builder, and seeders — for any **Node** or **Bun** app without IoC, `HttpContext`, or `node ace`.

**Not affiliated with** the AdonisJS team or Harminder Virk; this is an independent project. See [NOTICE](NOTICE) for upstream licensing and [LICENSE](LICENSE) for this package.

```bash
npm install lucinate
```

**Dev setup:** the published package includes `build/`. If you clone this repo, run `npm run build` in the package root before using generators or scripts that import `build/`.

---

## vs. Adonis Lucid

| | Adonis Lucid | lucinate |
|---|--------------|----------|
| Fit | AdonisJS (`@adonisjs/lucid`, `node ace`) | Standalone npm package |
| CLI | `node ace migration:run`, … | `lucinate` (`make:migration`, `migrate`, `seed`, …) |
| Config | Adonis conventions | `defineConfig()` + `loadDatabaseConfig()` |

Same mental model (models, relations, migrations); normal library packaging and usage.

---

## Requirements

- **Node.js** ≥ 20
- **Bun** (optional) — `bunx lucinate …` works; DB build uses the same runtime as the process (`process.execPath`)
- Databases via **Knex** (MySQL, PostgreSQL, SQLite, MSSQL, …)

---

## Getting started

1. Add **`config/database.ts`** with `defineConfig`. Use **logical** paths for `migrations.paths` and `seeders.paths` (e.g. `database/migrations`, `database/seeders`). At runtime they resolve under **`build/`** (compiled JS).
2. Add **`tsconfig.db.json`** with `outDir: build`, `module` / `moduleResolution` for Node (`NodeNext`), and `include` for `config/database.ts`, `database/**/*.ts`, `src/models/**/*.ts`. **`make:*` / `migrate` / `seed` run `tsc -p tsconfig.db.json` automatically** when that file exists; use **`--skip-build`** on those commands to skip the automatic compile.
3. For path aliases (`@/models/...`), run **`tsc-alias`** after `tsc` if installed (the package’s compile step tries to invoke it).
4. Run commands from the **project root**: layout should include **`config/`** (at least `database.ts`) and **`database/migrations/`**, **`database/seeders/`**. The CLI uses **`process.cwd()`** as the app root — `cd` into that directory before running `lucinate`.

```bash
npx lucinate migrate
npx lucinate seed
# or: bunx lucinate migrate | bunx lucinate seed
```

See [examples/README.md](examples/README.md) and [examples/cli/config](examples/cli/config).

---

## CLI

```bash
npx lucinate --help
```

| Command | Purpose |
|---------|---------|
| `make:migration <name> [opts]` | Create migration ([stubs/make/migration](stubs/make/migration/)) |
| `make:model <Name> [opts]` | Create model (default `src/models`, or `LUCINATE_MODELS_PATH` / `--dir`) |
| `make:seeder <name> [opts]` | Create seeder |
| `migrate` | Run migrations (up) |
| `migrate:down` | Rollback (down) |
| `seed` | Run seeders |

**`make:migration`:** `--create` / `--alter` (or infer from name, e.g. `create_posts_table`); **`-m` / `--with-model`**, **`-s` / `--with-seeder`**; **`--dir`**. Generators **never overwrite** existing files (`[skip]`).

**`migrate` / `migrate:down`:** `--down` (or use `migrate:down`); `--batch` / `--step`; `--dry-run`; `--disable-locks`; **`--skip-build`**.

**`seed`:** `-f` / `--file <name>` (repeatable).

**`make:*` / `migrate` / `seed`:** **`--skip-build`** — skip automatic `tsc -p tsconfig.db.json` when that file exists (e.g. you already built or use a watcher).

Database config is always resolved from **`config/database.ts`** at the project root (or compiled **`build/config/database.js`**). No env vars or `--config` override for the default path.

### TypeScript checks during CLI generation

If your project has `tsconfig.db.json`, generator commands like
`make:migration -m -s` can fail because model/seeder files are typechecked
before stubs are generated.

Common example:

- `TS4114` with `noImplicitOverride: true` (missing `override` in classes extending `BaseModel` / `BaseSeeder`).

Bypass options:

- **Temporary:** run with **`--skip-build`** (e.g. `bunx lucinate make:migration my_table --skip-build`).
- **Structural:** keep a dedicated `tsconfig.db.json` aligned for DB artifacts (or run `build:db` manually before CLI commands).

---

## Configuration (`defineConfig`)

- **`connection`** — default connection name.
- **`connections.<name>`** — `client` (`mysql2`, `pg`, `better-sqlite3`, …), `connection`, Knex options.
- **`migrations`** — `paths`, `tableName` (default `migrations`).
- **`seeders`** — `paths`.

**Knex drivers:** the driver package must resolve where Knex resolves it (often **`lucinate/node_modules`**). `lucinate` lists **`mysql2`** under `optionalDependencies`; ensure the driver is installed for your setup (e.g. `npm install` inside `lucinate` when linking locally).

Logical paths map to **`build/...`** at runtime. Migration rows store **logical** paths (e.g. `database/migrations/…_create_users_table`); older DBs with `build/…` prefixes are upgraded automatically by the runner.

---

## Seeders

- **`BaseSeeder`** receives `client`, `db`, and the connection name.
- During `run()`, model adapters match that connection — you usually **don’t** need `Model.useAdapter(this.db.modelAdapter())` in every seeder.
- **`this.connection('name')`** switches to another declared connection; **`this.connection()`** restores the seed connection.

---

## Password hashing (not included)

`lucinate` is a data layer only: it does **not** ship helpers to hash or verify user passwords (unlike some full-stack frameworks). Anything related to authentication — hashing, tokens, sessions — belongs in **your application** or a dedicated auth library.

**What to do:** add a package such as [`bcrypt`](https://www.npmjs.com/package/bcrypt), [`@node-rs/argon2`](https://www.npmjs.com/package/@node-rs/argon2), or use Node’s [`crypto.scrypt`](https://nodejs.org/api/crypto.html#cryptoscryptpassword-salt-keylen-options-callback) / [`crypto.pbkdf2`](https://nodejs.org/api/crypto.html#cryptopbkdf2password-salt-iterations-keylen-digest-callback). Store only the **hash** in the database (e.g. a `password_hash` column); never store plaintext passwords.

**Example (bcrypt + model hook):** hash on save with `@beforeSave`, and verify on login with `bcrypt.compare`. The hook only runs when `passwordHash` is dirty; strings that already look like a bcrypt hash are left as-is (so you can still assign a pre-computed hash if needed).

```bash
npm install bcrypt
npm install -D @types/bcrypt
```

```ts
import bcrypt from 'bcrypt'
import { BaseModel, column, beforeSave } from 'lucinate'

const ROUNDS = 12

/** Returns true if the value already looks like a bcrypt hash. */
function isBcryptHash(value: string): boolean {
  return /^\$2[aby]\$\d{2}\$/.test(value)
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS)
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}

export default class User extends BaseModel {
  static table = 'users'

  @column({ isPrimary: true })
  declare id: number

  /** DB column should store the bcrypt hash only. Assign plaintext here on register / password change. */
  @column()
  declare passwordHash: string

  @beforeSave()
  async hashPasswordBeforeSave() {
    if (!('passwordHash' in this.$dirty)) {
      return
    }
    const value = this.passwordHash
    if (!value || isBcryptHash(value)) {
      return
    }
    this.passwordHash = await hashPassword(value)
  }
}
```

**Alternative: `@column({ prepare })`** — You can hash in the column’s `prepare` callback (`ColumnOptions` in the published types; runs when persisting). It must be **synchronous**: Lucinate does not await `prepare`, so returning a `Promise` (e.g. from async `hashPassword`, `bcrypt.hash`, or `Bun.password.hash`) would be wrong. Use **`bcrypt.hashSync`** or, on Bun, **`Bun.password.hashSync`** (see [Bun `Bun.password`](https://bun.sh/docs/api/hashing)).

```ts
@column({
  prepare: (value) => {
    if (value == null || typeof value !== 'string' || isBcryptHash(value)) {
      return value
    }
    return bcrypt.hashSync(value, ROUNDS)
  },
})
declare passwordHash: string
```

With Bun (sync API only in `prepare`):

```ts
@column({
  prepare: (value) => {
    if (value == null || typeof value !== 'string') {
      return value
    }
    return Bun.password.hashSync(value, {
      algorithm: 'bcrypt',
      cost: 12,
    })
  },
})
declare passwordHash: string
```

On login, load the user and call `verifyPassword(plain, user.passwordHash)` (or `bcrypt.compare` / `Bun.password.verify`) — verification is **not** done inside the hook or `prepare`.

---

## Addons (opt-in)

`lucinate` includes first-party addons. They are opt-in and do not change default ORM behavior unless you apply them.
Macros are auto-registered when addon modules are imported.

**Documentation:** see the addon index and guides in [`docs/README.md`](docs/README.md).

| Addon | Doc |
|-------|-----|
| Soft deletes (`SoftDeletes`) | [`docs/addon-soft-deletes.md`](docs/addon-soft-deletes.md) |
| Filterable (`Filterable`, `BaseFilter`) | [`docs/addon-filters.md`](docs/addon-filters.md) |
| Join relations (`.joinRelation` / `.leftJoinRelation`) | [`docs/addon-join-relations.md`](docs/addon-join-relations.md) |
| Select related (`.selectRelated` + `SelectRelated` mixin) | [`docs/addon-select-related.md`](docs/addon-select-related.md) |
| Has UUIDs (`HasUuids`) | [`docs/addon-has-uuids.md`](docs/addon-has-uuids.md) |
| Has ULIDs (`HasUlids`) | [`docs/addon-has-ulids.md`](docs/addon-has-ulids.md) |
| Morph relations (`morphOne`, `morphMany`, `morphTo`, …) | [`docs/addon-morph-relations.md`](docs/addon-morph-relations.md) |

### `HasUuids` (UUID v7 default)

```ts
import { BaseModel } from 'lucinate'
import { compose } from '@poppinss/utils'
import { HasUuids } from 'lucinate'

class User extends compose(BaseModel, HasUuids) {
  static uniqueIds() {
    return ['id'] // optional, default is ['id']
  }
}
```

Details: [`docs/addon-has-uuids.md`](docs/addon-has-uuids.md).

### `HasUlids` (monotonic default)

```ts
import { BaseModel } from 'lucinate'
import { compose } from '@poppinss/utils'
import { HasUlids } from 'lucinate'

class Order extends compose(BaseModel, HasUlids) {
  static uniqueIds() {
    return ['id'] // optional, default is ['id']
  }
}
```

Details: [`docs/addon-has-ulids.md`](docs/addon-has-ulids.md).

### `SoftDeletes`

```ts
import { BaseModel } from 'lucinate'
import { compose } from '@poppinss/utils'
import { SoftDeletes } from 'lucinate'

class Post extends compose(BaseModel, SoftDeletes) {}

await Post.query().withTrashed()
await Post.query().onlyTrashed()
await Post.query().restore()
await Post.query().forceDelete()
```

Details: [`docs/addon-soft-deletes.md`](docs/addon-soft-deletes.md).

### `Filterable`

```ts
import { BaseModel } from 'lucinate'
import { compose } from '@poppinss/utils'
import { Filterable, BaseFilter } from 'lucinate'

class UserFilter extends BaseFilter {
  name(value: string) {
    this['query'].where('name', 'like', `%${value}%`)
  }
}

class User extends compose(BaseModel, Filterable) {
  static $filter = UserFilter
}

await User.filter({ name: 'marcio' }).exec()
```

Details: [`docs/addon-filters.md`](docs/addon-filters.md).

### `joinRelation` (MVP)

```ts
await User.query().joinRelation('profile')
await User.query().leftJoinRelation('profile')
```

Current MVP supports `belongsTo` and `hasOne`. Details: [`docs/addon-join-relations.md`](docs/addon-join-relations.md).

### `selectRelated`

JOIN + aliased columns + hydration (Django-style `select_related`). The **`.selectRelated()`** macro must be used together with the **`SelectRelated` mixin** on the root model so hooks can finalize the query and merge rows for “many” relations.

```ts
import { BaseModel } from 'lucinate'
import { compose } from '@poppinss/utils'
import { SelectRelated } from 'lucinate'

class Partner extends compose(BaseModel, SelectRelated) {}

const partners = await Partner.query()
  .selectRelated('partnerType', { joinType: 'left', columns: ['id', 'name'] })
  .select('id', 'name')
  .exec()
```

Details: [`docs/addon-select-related.md`](docs/addon-select-related.md).

### `morph-relations` (MVP)

```ts
import { BaseModel } from 'lucinate'
import { column } from 'lucinate/orm'
import { morphOne, morphMany, morphTo } from 'lucinate'

class Image extends BaseModel {
  @column() declare imageableType: string
  @column() declare imageableId: string
  @morphTo({ name: 'imageable' })
  declare imageable: any
}

class Post extends BaseModel {
  @morphOne(() => Image, { name: 'imageable' })
  declare image: Image | null
}
```

MVP supports `morphOne`, `morphMany`, and `morphTo` with `related(...).query()/associate()/dissociate()`. `defineMorphMap` and `MorphMapAlias` are available for type aliases. Details: [`docs/addon-morph-relations.md`](docs/addon-morph-relations.md).

---

## TypeScript

Use a dedicated **`tsconfig.db.json`** to emit JS for DB code while the main app `tsconfig` may use `noEmit` / bundler mode. With **`NodeNext`**, use **`.js`** extensions in source imports for local files (they match emitted output).

---

## `bootDatabase` (app singleton)

```ts
import { bootDatabase } from 'lucinate'

await bootDatabase()
```

Uses **`process.cwd()`** as the app root (unless you pass **`appRoot`**). Loads **`config/database.ts`** (or compiled **`build/config/database.js`**). Returns a **singleton** `Database`. Registers **`db.modelAdapter()`** as the default for models. Options: `appRoot`, `config`, `configPath`, `logger`, `emitter`, `force`. Use **`resetBootDatabase()`** to tear down (e.g. tests).

**Naming strategy** is not configured here. Set the global default with **`BaseModel.namingStrategy`** (e.g. `BaseModel.namingStrategy = new SnakeCaseNamingStrategy()` from `lucinate/orm`), ideally on an app base model file that runs **before** other models are imported, or use **`static namingStrategy`** on a specific model class.

---

## Public API

```ts
import {
  Database,
  defineConfig,
  bootDatabase,
  resetBootDatabase,
  loadDatabaseConfig,
  BaseModel,
  BaseSeeder,
  MigrationRunner,
  SeedsRunner,
  toRuntimeDatabasePath,
  toLogicalDatabasePath,
} from 'lucinate'
```

Subpaths (see `package.json` → `exports`): `lucinate/orm`, `lucinate/schema`, `lucinate/migration`, `lucinate/config/load`, `lucinate/config/boot`. Relation types: `import type { BelongsTo } from 'lucinate'`.

---

## Schema helpers (Laravel-like)

The schema builder exposes convenience helpers:

```ts
this.schema.createTable('comments', (table) => {
  table.uuid('id').primary()
  table.softDeletes() // deleted_at nullable timestamp
})

this.schema.createTable('images', (table) => {
  table.ulid('id').primary()
})

this.schema.createTable('attachments', (table) => {
  table.morphs('attachable')
  // or: numericMorphs / uuidMorphs / ulidMorphs
})
```

Helpers attach to the same Knex module used for connections (`knex/knex`), so they apply to migration/schema queries at runtime.

---

## Developing this repo

```bash
git clone <repo>
cd lucinate
npm install
npm run build
npm run demo
```

Package scripts: `migrate`, `seed`, `generate`, `cli:example` (under `examples/cli`).

---

## License

**lucinate** is released under the [MIT License](LICENSE).

Portions are derived from [@adonisjs/lucid](https://github.com/adonisjs/lucid); the upstream MIT text and copyright notice are reproduced in [NOTICE](NOTICE). Keep that file when redistributing.

For high-stakes commercial or compliance-sensitive use, consult your own legal counsel; this README is not legal advice.
