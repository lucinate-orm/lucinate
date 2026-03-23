# lucinate

Camada de dados **framework-agnostic** inspirada no [Lucid ORM](https://github.com/adonisjs/lucid) do AdonisJS: models, query builder, migrações, schema builder e seeders — para usar em **qualquer** app **Node** ou **Bun** (API própria, workers, CLIs) **sem** IoC container, sem `HttpContext` e sem comandos `node ace`.

```bash
npm install lucinate
```

> **Importante:** o pacote publicado no npm inclui a pasta `build/`. Se você clonar o repositório em desenvolvimento, execute `npm run build` na raiz do pacote antes de usar geradores ou scripts que importam `build/index.js`.

---

## Em relação ao Adonis Lucid

| Aspecto | Adonis Lucid | lucinate |
|--------|----------------|-------------------|
| **Integração** | Pensado para AdonisJS (`@adonisjs/lucid`, serviços, `node ace`) | Pacote npm isolado; **sem** framework obrigatório |
| **Boot dos models** | O framework registra o adapter na inicialização da app | Em scripts (migrate/seed), o runner define o adapter; em seeders você pode usar `this.connection('…')` para outra conexão |
| **CLI** | `node ace migration:run`, etc. | Comando **`lucinate`** (`make:migration`, `migrate`, `seed`, …) |
| **Config** | `config/database.ts` + contrato Adonis | `defineConfig()` + `loadDatabaseConfig()`; mesma ideia de `connections`, `migrations`, `seeders` |
| **Geradores** | Ace + templates Adonis | `lucinate make:*` + [stubs](stubs/) (sem Ace) |
| **Código** | Lucid original | Port baseado no Lucid; API de modelos/migrações **muito próxima**, mas o **runtime** é independente |

Ou seja: **a mentalidade (models, relations, migrations) é Lucid**; o **empacotamento e o uso** são os de uma biblioteca Node normal.

---

## Requisitos

- **Node.js** ≥ 20 (runtime de referência para a biblioteca e para `tsc` nos projetos)
- **Bun** (opcional) — pode rodar a CLI (`bunx lucinate …`) e os scripts `.mjs`; o build automático de DB segue o mesmo processo (`process.execPath`)
- Banco de dados suportado via **Knex** (MySQL, PostgreSQL, SQLite, MSSQL, etc., conforme dialects disponíveis)

---

## Primeiros passos no seu projeto

1. Instale o pacote e (recomendado) TypeScript no projeto de aplicação.

2. Crie **`config/database.ts`** com `defineConfig` — em `migrations.paths` e `seeders.paths` use caminhos **lógicos** na raiz do projeto, por exemplo `database/migrations` e `database/seeders`. Em runtime o pacote resolve para **`build/database/...`** (JS compilado).

3. Adicione um **`tsconfig.db.json`** (ou `extends` de um `tsconfig.base.json`) com `module` / `moduleResolution` adequados ao Node (`NodeNext`), `outDir: build`, e os `include` necessários (`config/database.ts`, `database/**/*.ts`, `src/models/**/*.ts`). Os comandos `migrate` e `seed` executam **`tsc -p tsconfig.db.json`** automaticamente se esse arquivo existir (a variável `LUCINATE_DATABASE_SKIP_DB_BUILD=1` desativa isso).

4. Para **aliases** (`@/models/...`) no código compilado, use **`tsc-alias`** depois do `tsc` (o script `compile-db-artifacts` do pacote tenta executá-lo se estiver instalado no projeto).

5. Rode migrações e seeders a partir da **raiz do projeto** (onde ficam `config/`, `database/`, etc.). Não é obrigatório passar **`--app-root`** se a convenção do seu projeto já fixa o caminho base — por exemplo **`ROOT_PATH`** no `package.json`, execução com `cwd` na raiz, ou **`APP_ROOT`**. Os caminhos `database/migrations` etc. são relativos a essa raiz.

```bash
npx lucinate migrate
npx lucinate seed
```

Equivalente com **Bun** (mesmo binário, outro runner):

```bash
bunx lucinate migrate
bunx lucinate seed
```

---

## CLI `lucinate`

O `package.json` define o binário **`lucinate`** (não o `ace` do Adonis). Depois de `npm install`:

```bash
npx lucinate --help
# ou
bunx lucinate --help
```

### Node.js ou Bun

O pacote é testado com **Node.js** (requisito oficial ≥ 20). Na prática, você pode invocar a CLI e os scripts com **Node** ou **Bun**:

| Forma | Exemplo |
|--------|---------|
| **npx** (Node) | `npx lucinate migrate` |
| **bunx** (Bun) | `bunx lucinate migrate` |
| Script direto com **Node** | `node node_modules/lucinate/scripts/migrate.mjs` |
| Script direto com **Bun** | `bun node_modules/lucinate/scripts/migrate.mjs` |

O `compile-db-artifacts` (antes de migrate/seed) usa o mesmo runtime que iniciou o processo (`node` ou `bun` via `process.execPath`).

### Comandos

| Comando | Descrição |
|---------|-----------|
| `make:migration <nome> [opções]` | Gera arquivo de migration (stubs em [stubs/make/migration](stubs/make/migration/)) |
| `make:model <Nome> [opções]` | Gera model em `src/models` (ou `LUCINATE_MODELS_PATH` / `--dir`) |
| `make:seeder <nome> [opções]` | Gera seeder |
| `migrate [opções]` | Executa migrações (up) |
| `migrate:down [opções]` | Rollback (down) |
| `seed [opções]` | Executa seeders |

### Opções comuns

- **Raiz da app** — por padrão, o diretório atual (`cwd`) ou **`APP_ROOT`**. Os caminhos `config/`, `database/` etc. são relativos a essa raiz; em muitos projetos isso já está resolvido pela convenção (ex.: **`ROOT_PATH`** no `package.json`), **sem precisar** de `--app-root` na linha de comando. Use **`--app-root`** só quando precisar sobrescrever explicitamente.
- **`--config` / `-c`** — caminho absoluto para o arquivo de config (sobrescreve a resolução padrão).
- **`LUCINATE_CONFIG_PATH`** — caminho alternativo para a config (variável de ambiente; compatível com **`LUCINATE_DATABASE_CONFIG`**).

### `make:migration`

- **`--create`** / **`--alter`** — intenção da migration (também inferida pelo nome, ex.: `create_posts_table`).
- **`-m` / `--with-model`** — gera também o model (nome derivado da tabela).
- **`-s` / `--with-seeder`** — gera também o seeder.
- **`--dir`** — pasta de destino (sobrescreve o primeiro path em `migrations.paths` / `seeders.paths` da config).

Os geradores **não sobrescrevem** arquivos que já existem (mostram `[skip]`).

### `migrate` / `migrate:down` (script `scripts/migrate.mjs`)

- **`--down`** — rollback (ou use o subcomando `lucinate migrate:down`).
- **`--batch <n>`** / **`--step <n>`** — controle do rollback (down).
- **`--dry-run`** — só mostra SQL, não aplica.
- **`--disable-locks`** — desativa advisory locks (MySQL/Postgres/MariaDB).

### `seed` (script `scripts/seed.mjs`)

- **`-f` / `--file <nome>`** (repetível) — executa só seeders que coincidam com o nome (basename ou caminho lógico tipo `database/seeders/foo_seeder`).
- **`LUCINATE_SEED_FILE`** — lista separada por vírgulas (útil em CI), mesmo efeito que `--file`.

### Variáveis de ambiente úteis

| Variável | Função |
|----------|--------|
| `APP_ROOT` | Raiz da aplicação quando não for o `cwd` (onde estão `config/`, `database/`, …) |
| `LUCINATE_CONFIG_PATH` | Caminho para o ficheiro de config (preferido; ver também `LUCINATE_DATABASE_CONFIG`) |
| `LUCINATE_DATABASE_CONFIG` | Compat: mesmo efeito que `LUCINATE_CONFIG_PATH` (nome legado) |
| `LUCINATE_DATABASE_SKIP_DB_BUILD=1` | Não executa o `tsc` automático antes de migrate/seed |
| `LUCINATE_SEED_FILE` | Filtro de seeders (veja `seed` acima) |

---

## Configuração (`defineConfig`)

Exemplo mínimo (veja também [examples/README.md](examples/README.md) e [examples/cli/config](examples/cli/config) — `database.ts` / `database.js`, sem `database.json`):

- **`connection`** — nome da conexão padrão.
- **`connections.<nome>`** — `client` (ex.: `mysql2`, `pg`, `better-sqlite3`), `connection`, opções Knex.
- **Drivers Knex** — o Knex faz `require()` do pacote do driver a partir do próprio `node_modules/knex`. Por isso, com `lucinate` como dependência, o driver (ex.: **`mysql2`**) tem de estar instalado **no mesmo `node_modules` que o Knex** do pacote: o `lucinate` declara **`mysql2`** em `optionalDependencies`; corre **`npm install` / `bun install` dentro de `lucinate`** (ou garante que `lucinate/node_modules/mysql2` existe). Instalar só na app com `file:../lucinate` não basta, porque a resolução não sobe até à pasta da app.
- **`migrations`** — `paths` (ex.: `["database/migrations"]`), `tableName` (padrão: `migrations`).
- **`seeders`** — `paths` (ex.: `["database/seeders"]`).

Os paths são **lógicos**; em runtime o pacote mapeia para **`build/...`** (veja `toRuntimeDatabasePath` / `toLogicalDatabasePath`).

### Tabela de migrations

Os nomes gravados na tabela de migrations usam o **caminho lógico** (sem prefixo `build/`), ex.: `database/migrations/1234567890_create_users_table`. Bancos antigos com `build/...` são migrados automaticamente na versão interna do runner (versão 3).

---

## Seeders e `BaseModel`

- **`BaseSeeder`** recebe `client`, `db` e o nome da conexão do seed.
- Durante cada `run()`, o adapter dos models fica alinhado com essa conexão — **não** é obrigatório chamar `Model.useAdapter(this.db.modelAdapter())` em cada seeder.
- **`this.connection('nome')`** — passa a usar outra conexão declarada em `connections` para operações de model; **`this.connection()`** sem argumentos restaura a conexão do seed.

---

## TypeScript e `build:db`

- O **`tsconfig.json`** da app pode estar em modo bundler (`noEmit`, etc.).
- Para **emitir** JS para migrations/seeders/config, use **`tsconfig.db.json`** (com `extends` de um `tsconfig.base.json` compartilhado).
- Com **`moduleResolution: NodeNext`**, imports relativos para arquivos locais devem usar a extensão **`.js`** no código-fonte (é o arquivo emitido); o TypeScript resolve para o `.ts`.

---

## `bootDatabase` (singleton na app)

Para HTTP, workers ou qualquer processo que precise de **uma** instância de `Database` sem montar logger/emitter manualmente:

```ts
import { bootDatabase } from 'lucinate'

await bootDatabase()
// BaseModel usa o adapter do singleton via setDefaultModelAdapter; só precisas de
// Post.useAdapter(...) se quiseres um adapter por model diferente do defeito.
```

- Resolve a raiz da app como na CLI (`APP_ROOT`, ou candidatos a partir de `process.cwd()`), carrega `config/database.*` (ou `LUCINATE_CONFIG_PATH` / `LUCINATE_DATABASE_CONFIG`), e devolve **sempre a mesma instância** nas chamadas seguintes.
- Podes passar `appRoot`, `config` (objeto já resolvido), `configPath`, `logger`, `emitter` ou `force: true` para recriar (ex.: testes).
- **`bootDatabase` regista `db.modelAdapter()`** como adapter por defeito dos models (`setDefaultModelAdapter`). `resetBootDatabase()` remove esse registo ao limpar o singleton.
- Para encerrar ou testes isolados: `resetBootDatabase()` fecha conexões e limpa o singleton.

---

## API pública (imports)

Ponto de entrada principal:

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
  // ...
} from 'lucinate'
```

Subpaths exportados (veja `package.json` → `exports`):

- `lucinate/orm`
- `lucinate/schema`
- `lucinate/migration`
- `lucinate/config/load`
- `lucinate/config/boot`

Tipos de relações para `declare user: BelongsTo<typeof User>`:

```ts
import { type BelongsTo } from 'lucinate'
```

---

## Desenvolvimento deste repositório

```bash
git clone <repo>
cd lucinate
npm install
npm run build
npm run demo
```

Scripts úteis no próprio pacote: `migrate`, `seed`, `generate`, `cli:example` (apontam para `examples/cli`).

---

## Licença

MIT — derivado do projeto Lucid original; veja a licença do Lucid/Adonis onde aplicável.
