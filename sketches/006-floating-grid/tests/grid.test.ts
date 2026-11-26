import { test } from 'node:test'
import assert from 'node:assert/strict'
import { nearestIndex, reflowOrder, rippleKick, slotPosition } from '../grid.ts'

const close = (a: number, b: number) => Math.abs(a - b) < 1e-9

test('slotPosition centres a 3×3 grid on the origin', () => {
  const [x0, z0] = slotPosition(0, 3, 0.4)
  const [x4, z4] = slotPosition(4, 3, 0.4)
  const [x8, z8] = slotPosition(8, 3, 0.4)
  assert.ok(close(x0, -0.4) && close(z0, -0.4))
  assert.ok(close(x4, 0) && close(z4, 0))
  assert.ok(close(x8, 0.4) && close(z8, 0.4))
})

test('reflowOrder moves a card to a new index and the rest close up around it', () => {
  assert.deepEqual(reflowOrder([1, 2, 3, 4, 5], 2, 4), [1, 3, 4, 5, 2])
  assert.deepEqual(reflowOrder([1, 2, 3, 4, 5], 5, 0), [5, 1, 2, 3, 4])
  assert.deepEqual(reflowOrder([1, 2, 3], 2, 1), [1, 2, 3])
})

test('reflowOrder clamps the index and ignores unknown cards', () => {
  assert.deepEqual(reflowOrder([1, 2, 3], 1, 99), [2, 3, 1])
  assert.deepEqual(reflowOrder([1, 2, 3], 1, -4), [1, 2, 3])
  assert.deepEqual(reflowOrder([1, 2, 3], 9, 0), [1, 2, 3])
})

test('nearestIndex picks the closest slot among the first count slots', () => {
  assert.equal(nearestIndex(0.39, -0.41, 9, 3, 0.4), 2)
  assert.equal(nearestIndex(0, 0, 9, 3, 0.4), 4)
  assert.equal(nearestIndex(0.1, 5, 8, 3, 0.4), 7)
})

test('rippleKick fades with distance and is zero past the reach', () => {
  assert.ok(rippleKick(0) > rippleKick(0.4))
  assert.ok(rippleKick(0.4) > rippleKick(0.8))
  assert.equal(rippleKick(5), 0)
})
