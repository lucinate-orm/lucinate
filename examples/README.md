# Examples

| Path | Description |
|---------|-----------|
| [`quick-query.ts`](quick-query.ts) | Minimal demo: `Database` + `defineConfig` + in-memory SQLite (`sqlite3`). After `npm run build`: `npm run demo` (runs `build/examples/quick-query.js`). |
| [`cli/`](cli/) | Sample app for the CLI (`migrate`, `seed`): `config/database.ts` (`defineConfig`) — after `npm run build`, the resolver uses `build/examples/cli/config/database.js`; points at `demo.sqlite` and migrations/seeders under `build/examples/cli/...`. |

The `migrate` / `seed` scripts in the package **`package.json`** run with **`cwd`** set to **`examples/cli`** (`cd examples/cli && node ../../scripts/...`). Run **`npm run build`** before `migrate` / `seed` (compiles `config/database.ts` and the rest of the package):

```bash
npm run build
npm run demo
npm run migrate
npm run seed
```

The file `examples/cli/demo.sqlite` is created when you run migrations and is listed in `.gitignore`.
