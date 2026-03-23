/*
 * Acesso direto a $extras via Proxy (paridade Laravel).
 * `column()` aplicado manualmente (sem sintaxe de decorator) para o runner `tsx` + esbuild.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { column } from '../src/orm/decorators/index.js'
import { BaseModel } from '../src/orm/base_model/index.js'

test('extras: leitura direta espelha $extras', () => {
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

test('extras: coluna mapeada não duplica em $extras', () => {
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

test('extras: escrita direta atualiza $extras quando a chave já existe', () => {
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
