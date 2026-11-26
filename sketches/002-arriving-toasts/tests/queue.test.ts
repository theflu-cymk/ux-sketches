import { test } from 'node:test'
import assert from 'node:assert/strict'
import { emptyQueue, pushToast, removeToast, toastQueue } from '../queue.ts'

const o = { interval: 2.5, cap: 12, auto: true }

test('toastQueue spawns on the interval', () => {
  let s = emptyQueue(0)
  let r = toastQueue(s, 0, o)
  assert.equal(r.spawn, 0)
  s = r.state
  r = toastQueue(s, 2.4, o)
  assert.equal(r.spawn, null)
  r = toastQueue(s, 2.5, o)
  assert.equal(r.spawn, 1)
})

test('toastQueue caps live toasts at 12', () => {
  let s = emptyQueue(0)
  const evicted: number[] = []
  for (let i = 0; i < 13; i++) {
    const r = toastQueue(s, i * 2.5, o)
    s = r.state
    if (r.evict !== null) evicted.push(r.evict)
  }
  assert.deepEqual(evicted, [0])
  assert.equal(s.live.length, 12)
  assert.equal(s.live[0], 1)
})

test('toastQueue never spawns when auto is false', () => {
  const r = toastQueue(emptyQueue(0), 100, { ...o, auto: false })
  assert.equal(r.spawn, null)
})

test('toastQueue spawns at most one toast per call even after a long pause', () => {
  let s = toastQueue(emptyQueue(0), 0, o).state
  const r = toastQueue(s, 25, o)
  assert.equal(r.spawn, 1)
  assert.equal(r.state.nextAt, 27.5)
  s = r.state
  assert.equal(toastQueue(s, 26, o).spawn, null)
})

test('pushToast adds one now and respects the cap', () => {
  let s = emptyQueue(0)
  for (let i = 0; i < 12; i++) s = pushToast(s, 12).state
  const r = pushToast(s, 12)
  assert.equal(r.spawn, 12)
  assert.equal(r.evict, 0)
})

test('removeToast drops a dismissed toast', () => {
  let s = emptyQueue(0)
  for (let i = 0; i < 3; i++) s = pushToast(s, 12).state
  assert.deepEqual(removeToast(s, 1).live, [0, 2])
  assert.deepEqual(removeToast(s, 9).live, [0, 1, 2])
})
