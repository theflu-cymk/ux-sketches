import { test } from 'node:test'
import assert from 'node:assert/strict'
import { bulgeSample, shimmerFrom, sliderValue } from '../op.ts'

test('sliderValue maps the track to 0–100 and clamps', () => {
  assert.equal(sliderValue(-1, 1), 0)
  assert.equal(sliderValue(0, 1), 50)
  assert.equal(sliderValue(1, 1), 100)
  assert.equal(sliderValue(5, 1), 100)
  assert.equal(sliderValue(-5, 1), 0)
})

test('bulgeSample leaves the field alone far from the thumb', () => {
  const [x, z] = bulgeSample(2, 1, 0, 0, 0.4, 0.8)
  assert.ok(Math.abs(x - 2) < 1e-6 && Math.abs(z - 1) < 1e-6)
})

test('bulgeSample magnifies around the thumb (samples pulled toward it)', () => {
  const [x, z] = bulgeSample(0.2, 0.1, 0, 0, 0.4, 0.8)
  assert.ok(Math.hypot(x, z) < Math.hypot(0.2, 0.1))
  assert.ok(x > 0 && z > 0, 'stays on the same side')
})

test('bulgeSample never folds the field (sample stays monotonic along a ray)', () => {
  let prev = -1
  for (let r = 0; r <= 1.5; r += 0.01) {
    const [x] = bulgeSample(r, 0, 0, 0, 0.4, 0.8)
    assert.ok(x >= prev - 1e-9, `fold at ${r}`)
    prev = x
  }
})

test('shimmerFrom rises with speed, caps, and is off under reduced motion', () => {
  assert.equal(shimmerFrom(0, false), 0)
  assert.ok(shimmerFrom(2, false) > shimmerFrom(0.5, false))
  assert.equal(shimmerFrom(100, false), 1)
  assert.equal(shimmerFrom(3, true), 0)
})
