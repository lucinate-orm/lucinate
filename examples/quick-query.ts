/**
 * Demo rápida: query builder + SQLite em memória (`sqlite3`).
 * Na pasta do pacote: `npm run build && npm run demo`
 *
 * ---
 * Duas formas de obter um `Database`
 *
 * **1) Como está abaixo — instanciar à mão**
 * - `defineConfig(...)` + `new Database(config, logger, emitter)`.
 * - Útil para scripts mínimos, testes unitários ou quando queres controlar logger/emitter.
 * - **Não** regista o adapter por defeito dos models; para `BaseModel` usa `Model.useAdapter(db.modelAdapter())` ou `setDefaultModelAdapter(db.modelAdapter())`.
 *
 * **2) `bootDatabase` — singleton + adapter por defeito**
 * - `await bootDatabase(...)` devolve sempre a mesma instância (exceto com `force`) e chama
 *   `setDefaultModelAdapter(db.modelAdapter())`, para `BaseModel.query()` / `.find()` funcionarem sem `useAdapter` manual.
 * - Opções (`BootDatabaseOptions`):
 *   - **`config`** — objeto já resolvido (`DatabaseConfig`). Não lê ficheiro. Ex.:
 *     `await bootDatabase({ config: defineConfig({ connection: 'default', connections: { ... } }) })`
 *   - **`appRoot`** — raiz da app (`config/`, `database/`, …). Se omitido: `APP_ROOT` ou candidatos a partir de `process.cwd()`.
 *   - **`configPath`** — caminho absoluto ou relativo ao ficheiro de config (sobrepõe a resolução por defeito).
 *   - **`logger`** / **`emitter`** — substituem o logger de consola e o `EventEmitter` por defeito.
 *   - **`force`** — `true`: fecha o singleton anterior, limpa o adapter por defeito e cria uma nova `Database` (útil em testes).
 * - Sem `config` nem `configPath` explícitos, carrega o config por convenção (`build/config/database.js`, `config/database.{js,json,ts}`, env `LUCINATE_CONFIG_PATH` / `LUCINATE_DATABASE_CONFIG`).
 *
 * Exemplo equivalente ao demo abaixo usando `bootDatabase` (comentado):
 *
 * ```ts
 * import { bootDatabase, defineConfig } from '../index.js'
 *
 * const db = await bootDatabase({
 *   config: defineConfig({
 *     connection: 'default',
 *     connections: {
 *       default: {
 *         client: 'sqlite3',
 *         useNullAsDefault: true,
 *         connection: { filename: ':memory:' },
 *       },
 *     },
 *   }),
 * })
 * ```
 */
import { EventEmitter } from 'node:events'
import { Database, defineConfig } from '../index.js'
import type { Logger } from '../src/shims/runtime/logger.js'

function createConsoleLogger(): Logger {
  const log =
    (level: string) =>
    (obj: unknown, msg?: string, ...args: unknown[]) => {
      const line = msg ?? (typeof obj === 'string' ? obj : JSON.stringify(obj))
      const fn = level === 'error' || level === 'fatal' ? console.error : console.log
      fn(`[${level}]`, line, ...args)
    }
  const base: Logger = {
    trace: log('trace'),
    debug: log('debug'),
    info: log('info'),
    warn: log('warn'),
    error: log('error'),
    fatal: log('fatal'),
    child() {
      return base
    },
  }
  return base
}

const config = defineConfig({
  connection: 'default',
  connections: {
    default: {
      client: 'sqlite3',
      useNullAsDefault: true,
      connection: {
        filename: ':memory:',
      },
    },
  },
})

const db = new Database(config, createConsoleLogger(), new EventEmitter())

const client = db.connection()
const sql = client.query().from('sqlite_master').select('name').toQuery()
console.log('SQL gerado (query builder):', sql)

await db.manager.closeAll()
console.log('OK — query builder compilou e gerou SQL.')
