/**
 * bootDatabase — uses build/ (avoids tsx + knex types issues).
 * Run: npm run build && node --test test/boot_database.test.mjs
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

test('bootDatabase: same instance without force', async () => {
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

test('bootDatabase: registers default model adapter and reset clears', async () => {
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

test('bootDatabase: force recreates instance', async () => {
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

test('bootDatabase: explicit appRoot and configPath loads JSON config', async () => {
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
  try {
    const db = await bootDatabase({ appRoot: tmp, configPath: join(tmp, 'config', 'database.json') })
    assert.ok(db.connection())
  } finally {
    await resetBootDatabase()
    rmSync(tmp, { recursive: true, force: true })
  }
})
