import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildFeed } from '../scripts/feed.ts'
import { valid } from './fixtures.ts'

const second = { ...valid, number: 2, slug: '002-arriving-toasts', date: '2026-11-29' }

test('buildFeed sorts newest first', () => {
  assert.deepEqual(buildFeed([valid, second], 'https://x.test').sketches.map((s) => s.number), [2, 1])
  const sameDay = { ...second, date: valid.date }
  assert.deepEqual(buildFeed([valid, sameDay], 'https://x.test').sketches.map((s) => s.number), [2, 1])
})

test('buildFeed derives url and thumbnail', () => {
  const [entry] = buildFeed([valid], 'https://x.test/').sketches
  assert.equal(entry.url, 'https://x.test/001-weighted-toggle/')
  assert.equal(entry.thumbnail, 'https://x.test/001-weighted-toggle/thumbnail.jpg')
})

test('buildFeed rejects duplicate numbers', () => {
  assert.throws(() => buildFeed([valid, { ...second, number: 1, slug: '001-other' }], 'https://x.test'), /number/)
})

test('buildFeed rejects duplicate slugs', () => {
  assert.throws(() => buildFeed([valid, { ...valid, number: 2 }], 'https://x.test'), /slug/)
})

test('buildFeed sets schemaVersion 1', () => {
  const feed = buildFeed([valid], 'https://x.test')
  assert.equal(feed.schemaVersion, 1)
  assert.equal(feed.site.url, 'https://x.test')
})
