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
2. Add **`tsconfig.db.json`** with `outDir: build`, `module` / `moduleResolution` for Node (`NodeNext`), and `include` for `config/database.ts`, `database/**/*.ts`, `src/models/**/*.ts`. **`migrate` / `seed` run `tsc -p tsconfig.db.json` automatically** when that file exists (set `LUCINATE_DATABASE_SKIP_DB_BUILD=1` to skip).
3. For path aliases (`@/models/...`), run **`tsc-alias`** after `tsc` if installed (the package’s compile step tries to invoke it).
4. Run commands from the **project root** (`config/`, `database/`). `cwd` or **`APP_ROOT`** / **`ROOT_PATH`** usually suffice; use **`--app-root`** only when you must override.

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

**`migrate` / `migrate:down`:** `--down` (or use `migrate:down`); `--batch` / `--step`; `--dry-run`; `--disable-locks`.

**`seed`:** `-f` / `--file <name>` (repeatable), or **`LUCINATE_SEED_FILE`** (comma-separated).

**Common:** **`--app-root`**, **`--config` / `-c`**. Config path: **`LUCINATE_CONFIG_PATH`** (preferred) or **`LUCINATE_DATABASE_CONFIG`** (legacy).

| Env | Role |
|-----|------|
| `APP_ROOT` | App root when not `cwd` |
| `LUCINATE_CONFIG_PATH` | Path to database config |
| `LUCINATE_DATABASE_SKIP_DB_BUILD=1` | Skip automatic `tsc` before migrate/seed |
| `LUCINATE_SEED_FILE` | Same as `seed --file` |

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

## Addons (opt-in)

`lucinate` now includes first-party addons. They are opt-in and do not change default ORM behavior unless you apply them.
Macros are auto-registered when addon modules are imported.

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

### `joinRelation` (MVP)

```ts
await User.query().joinRelation('profile')
```

Current MVP supports `belongsTo` and `hasOne`.

---

## TypeScript

Use a dedicated **`tsconfig.db.json`** to emit JS for DB code while the main app `tsconfig` may use `noEmit` / bundler mode. With **`NodeNext`**, use **`.js`** extensions in source imports for local files (they match emitted output).

---

## `bootDatabase` (app singleton)

```ts
import { bootDatabase } from 'lucinate'

await bootDatabase()
```

Resolves app root like the CLI, loads `config/database.*` (or `LUCINATE_CONFIG_PATH`), returns a **singleton** `Database`. Registers **`db.modelAdapter()`** as the default for models. Options: `appRoot`, `config`, `configPath`, `logger`, `emitter`, `force`. Use **`resetBootDatabase()`** to tear down (e.g. tests).

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
```

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
