import { test } from 'node:test'
import assert from 'node:assert/strict'
import { trimFloor } from '../queue.ts'

test('trimFloor removes every toast over the limit, oldest first', () => {
  assert.deepEqual(trimFloor([1, 2, 3, 4, 5], 2), { keep: [4, 5], remove: [1, 2, 3] })
})

test('trimFloor keeps everything at or under the limit', () => {
  assert.deepEqual(trimFloor([1, 2], 2), { keep: [1, 2], remove: [] })
})
