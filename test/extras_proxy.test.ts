/*
 * Direct access to $extras via Proxy (Laravel-style parity).
 * `column()` applied manually (no decorator syntax) for the `tsx` + esbuild runner.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { column } from '../src/orm/decorators/index.js'
import { BaseModel } from '../src/orm/base_model/index.js'

test('extras: direct read mirrors $extras', () => {
  class Demo extends BaseModel {
    static override table = 'demos'
    declare id: number
    declare name: string
  }

  column({ isPrimary: true })(Demo.prototype, 'id')
  column()(Demo.prototype, 'name')

  const row = new Demo()
  row.$consumeAdapterResult({
    id: 1,
    name: 'one',
    posts_count: 42,
    raw_alias: 'x',
  })

  assert.equal(row.$extras.posts_count, 42)
  assert.equal(row.posts_count, 42)
  assert.equal(row.$extras.raw_alias, 'x')
  assert.equal(row.raw_alias, 'x')
  assert.equal(row.id, 1)
  assert.equal(row.name, 'one')
})

test('extras: mapped column is not duplicated in $extras', () => {
  class Demo extends BaseModel {
    static override table = 'demos'
    declare id: number
  }

  column({ isPrimary: true })(Demo.prototype, 'id')

  const row = new Demo()
  row.$consumeAdapterResult({ id: 42 })

  assert.equal(row.id, 42)
  assert.equal(Object.prototype.hasOwnProperty.call(row.$extras, 'id'), false)
})

test('extras: direct write updates $extras when key already exists', () => {
  class Demo extends BaseModel {
    static override table = 'demos'
    declare id: number
  }

  column({ isPrimary: true })(Demo.prototype, 'id')

  const row = new Demo()
  row.$consumeAdapterResult({ id: 1, total: 5 })

  assert.equal(row.total, 5)
  row.total = 10
  assert.equal(row.$extras.total, 10)
  assert.equal(row.total, 10)
})

test('extras: serialize / toJSON merges $extras at top level by default', () => {
  class Demo extends BaseModel {
    static override table = 'demos'
    declare id: number
    declare name: string
  }

  column({ isPrimary: true })(Demo.prototype, 'id')
  column()(Demo.prototype, 'name')

  const row = new Demo()
  row.$consumeAdapterResult({
    id: 1,
    name: 'one',
    partner_type_name: 'Type A',
  })

  const json = row.serialize() as Record<string, unknown>
  assert.equal(json.id, 1)
  assert.equal(json.name, 'one')
  assert.equal(json.partner_type_name, 'Type A')
  assert.equal('meta' in json, false)
  assert.deepEqual(row.toJSON(), json)
})

test('extras: serializeExtras false omits $extras from JSON', () => {
  class Demo extends BaseModel {
    static override table = 'demos'
    override serializeExtras = false as false
    declare id: number
  }

  column({ isPrimary: true })(Demo.prototype, 'id')

  const row = new Demo()
  row.$consumeAdapterResult({ id: 1, extra_col: 'x' })

  const json = row.serialize() as Record<string, unknown>
  assert.equal(json.id, 1)
  assert.equal(json.extra_col, undefined)
})
