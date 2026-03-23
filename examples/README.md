# Exemplos

| Caminho | Descrição |
|---------|-----------|
| [`quick-query.ts`](quick-query.ts) | Demo mínima: `Database` + `defineConfig` + SQLite em memória (`sqlite3`). Depois de `npm run build`: `npm run demo` (executa `build/examples/quick-query.js`). |
| [`cli/`](cli/) | App de exemplo para a CLI (`migrate`, `seed`): `config/database.ts` (`defineConfig`) — após `npm run build`, o resolver usa `build/examples/cli/config/database.js`; aponta para `demo.sqlite` e migrações/seeders em `build/examples/cli/...`. |

Na raiz do pacote (os scripts `migrate` / `seed` do `package.json` já usam `--app-root examples/cli`). Corre **`npm run build`** antes de `migrate` / `seed` (compila `config/database.ts` e o resto do pacote):

```bash
npm run build
npm run demo
npm run migrate
npm run seed
```

O ficheiro `examples/cli/demo.sqlite` é criado ao correr migrações e está no `.gitignore`.
