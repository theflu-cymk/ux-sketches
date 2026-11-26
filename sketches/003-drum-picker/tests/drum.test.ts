import { test } from 'node:test'
import assert from 'node:assert/strict'
import { snapToDetent, spinStep, valueAt } from '../drum.ts'

const slot = (count: number) => (Math.PI * 2) / count
const close = (a: number, b: number) => Math.abs(a - b) < 1e-9

test('snapToDetent rounds to the nearest of count slots', () => {
  assert.ok(close(snapToDetent(slot(12) * 0.4, 12), 0))
  assert.ok(close(snapToDetent(slot(12) * 0.6, 12), slot(12)))
  assert.ok(close(snapToDetent(-slot(12) * 2.3, 12), -slot(12) * 2))
})

test('valueAt wraps negative and multi-turn angles', () => {
  const values = ['a', 'b', 'c', 'd']
  assert.equal(valueAt(0, values), 'a')
  assert.equal(valueAt(-slot(4), values), 'd')
  assert.equal(valueAt(slot(4) * 5, values), 'b')
  assert.equal(valueAt(slot(4) * 1.4, values), 'b')
})

test('spinStep decays toward zero', () => {
  let v = 10
  for (let i = 0; i < 600; i++) v = spinStep(v, 1 / 60, { friction: 2.2, maxVelocity: 25 })
  assert.ok(Math.abs(v) < 0.01)
  assert.ok(spinStep(-5, 1 / 60, { friction: 2.2, maxVelocity: 25 }) > -5)
})

test('spinStep clamps velocity', () => {
  assert.equal(spinStep(250, 0, { friction: 2.2, maxVelocity: 25 }), 25)
  assert.equal(spinStep(-250, 0, { friction: 2.2, maxVelocity: 25 }), -25)
})
