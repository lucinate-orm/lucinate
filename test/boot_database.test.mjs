/**
 * bootDatabase — usa build/ (evita tsx + knex types).
 * Executar: npm run build && node --test test/boot_database.test.mjs
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { afterEach, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const { bootDatabase, resetBootDatabase } = await import(
  pathToFileURL(join(root, 'build/src/config/boot_database.js')).href
)
const { defineConfig } = await import(pathToFileURL(join(root, 'build/src/define_config.js')).href)
const { getDefaultModelAdapter } = await import(
  pathToFileURL(join(root, 'build/src/orm/default_model_adapter.js')).href
)

beforeEach(async () => {
  await resetBootDatabase()
})

afterEach(async () => {
  await resetBootDatabase()
})

test('bootDatabase: mesma instância sem force', async () => {
  const cfg = defineConfig({
    connection: 'default',
    connections: {
      default: {
        client: 'better-sqlite3',
        useNullAsDefault: true,
        connection: { filename: ':memory:' },
      },
    },
  })
  const a = await bootDatabase({ config: cfg })
  const b = await bootDatabase()
  assert.strictEqual(a, b)
})

test('bootDatabase: regista default model adapter e reset limpa', async () => {
  const cfg = defineConfig({
    connection: 'default',
    connections: {
      default: {
        client: 'better-sqlite3',
        useNullAsDefault: true,
        connection: { filename: ':memory:' },
      },
    },
  })
  assert.strictEqual(getDefaultModelAdapter(), null)
  await bootDatabase({ config: cfg })
  assert.ok(getDefaultModelAdapter())
  await resetBootDatabase()
  assert.strictEqual(getDefaultModelAdapter(), null)
})

test('bootDatabase: force recria instância', async () => {
  const cfg = defineConfig({
    connection: 'default',
    connections: {
      default: {
        client: 'better-sqlite3',
        useNullAsDefault: true,
        connection: { filename: ':memory:' },
      },
    },
  })
  const a = await bootDatabase({ config: cfg })
  const b = await bootDatabase({ config: cfg, force: true })
  assert.notStrictEqual(a, b)
})

test('bootDatabase: appRoot explícito carrega config/database.json', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'lucinate-boot-'))
  mkdirSync(join(tmp, 'config'), { recursive: true })
  writeFileSync(
    join(tmp, 'config', 'database.json'),
    JSON.stringify({
      connection: 'default',
      connections: {
        default: {
          client: 'better-sqlite3',
          useNullAsDefault: true,
          connection: { filename: ':memory:' },
        },
      },
    }),
  )
  const prevRoot = process.env.APP_ROOT
  process.env.APP_ROOT = '/nonexistent-lucinate-root-xyz'
  try {
    const db = await bootDatabase({ appRoot: tmp })
    assert.ok(db.connection())
  } finally {
    if (prevRoot === undefined) {
      delete process.env.APP_ROOT
    } else {
      process.env.APP_ROOT = prevRoot
    }
    await resetBootDatabase()
    rmSync(tmp, { recursive: true, force: true })
  }
})
