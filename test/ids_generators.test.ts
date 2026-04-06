import { test } from 'node:test'
import assert from 'node:assert/strict'
import { generateUlid } from '../src/addons/has-ulids/index.js'
import { generateUuid } from '../src/addons/has-uuids/index.js'
import { decodeTime, monotonicUlid, ulid } from '../src/internal/ids/ulid.js'
import { extractTimestamp, validate } from '../src/internal/ids/uuid.js'

test('generateUlid: returns 26-char Crockford base32', () => {
  const id = generateUlid()
  assert.equal(id.length, 26)
  assert.match(id, /^[0-9A-HJKMNP-TV-Z]{26}$/)
})

test('generateUuid: returns valid uuid v7 shape', () => {
  const id = generateUuid()
  assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  assert.equal(validate(id), true)
})

test('generateUuid: keeps extractable timestamp close to now', () => {
  const now = Date.now()
  const id = generateUuid(now)
  assert.equal(extractTimestamp(id), now)
})

test('monotonicUlid: keeps lexicographic order in same ms', () => {
  const fixedNow = 1743926400000
  const id1 = monotonicUlid(fixedNow)
  const id2 = monotonicUlid(fixedNow)
  const id3 = monotonicUlid(fixedNow)

  assert.ok(id1 < id2)
  assert.ok(id2 < id3)
})

test('ulid: decodes to original timestamp when seed is provided', () => {
  const seed = 1743926400000
  const id = ulid(seed)
  assert.equal(decodeTime(id), seed)
})
