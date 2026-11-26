import { test } from 'node:test'
import assert from 'node:assert/strict'
import { toggleState } from '../toggle.ts'

const h = (4 * Math.PI) / 180

test('toggleState stays off until the angle passes +hysteresis', () => {
  assert.equal(toggleState(0, 'off', h), 'off')
  assert.equal(toggleState(h * 0.99, 'off', h), 'off')
  assert.equal(toggleState(h * 1.01, 'off', h), 'on')
})

test('toggleState stays on until the angle passes -hysteresis', () => {
  assert.equal(toggleState(0, 'on', h), 'on')
  assert.equal(toggleState(-h * 0.99, 'on', h), 'on')
  assert.equal(toggleState(-h * 1.01, 'on', h), 'off')
})

test('toggleState ignores jitter inside the hysteresis band', () => {
  for (const start of ['on', 'off'] as const) {
    let s: 'on' | 'off' = start
    for (let i = 0; i <= 40; i++) s = toggleState(Math.sin(i) * (h / 2), s, h)
    assert.equal(s, start)
  }
})
