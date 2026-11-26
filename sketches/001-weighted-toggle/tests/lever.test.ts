import { test } from 'node:test'
import assert from 'node:assert/strict'
import { LEVER, initialLever, leverStep, type LeverState } from '../lever.ts'

const run = (s: LeverState, seconds: number, pointer: number | null, reduced = false) => {
  for (let t = 0; t < seconds; t += 1 / 60) s = leverStep(s, { pointer, reduced }, 1 / 60).state
  return s
}

test('the lever rests on its off side', () => {
  const s = run(initialLever(), 2, null)
  assert.equal(s.side, 'off')
  assert.ok(Math.abs(s.angle - -LEVER.rest) < 0.01)
})

test('a small pull is resisted and falls back when released', () => {
  let s = run(initialLever(), 1, LEVER.rest)
  assert.equal(s.side, 'off')
  assert.ok(s.angle < 0, 'pulling as far as the on rest is not enough to cross the centre')
  s = run(s, 2, null)
  assert.ok(Math.abs(s.angle - -LEVER.rest) < 0.01)
})

test('pulling far past the centre flips it on and it stays on', () => {
  let s = run(initialLever(), 1.5, Math.PI / 2)
  assert.equal(s.side, 'on')
  s = run(s, 2, null)
  assert.equal(s.side, 'on')
  assert.ok(Math.abs(s.angle - LEVER.rest) < 0.01)
})

test('flipping reports the flip once', () => {
  let s = initialLever()
  let flips = 0
  for (let t = 0; t < 2; t += 1 / 60) {
    const r = leverStep(s, { pointer: Math.PI / 2, reduced: false }, 1 / 60)
    s = r.state
    if (r.flipped) flips++
  }
  assert.equal(flips, 1)
})

test('the snap overshoots normally but not under reduced motion', () => {
  const peak = (reduced: boolean) => {
    let s = initialLever()
    let flipped = false
    let max = -Infinity
    for (let t = 0; t < 3; t += 1 / 60) {
      const r = leverStep(s, { pointer: flipped ? null : Math.PI / 2, reduced }, 1 / 60)
      s = r.state
      if (r.flipped) flipped = true
      if (flipped) max = Math.max(max, s.angle)
    }
    return max
  }
  assert.ok(peak(false) > LEVER.rest + 0.02, 'overshoots')
  assert.ok(peak(true) <= LEVER.rest + 0.005, 'no overshoot')
})

test('the angle never leaves the housing limits', () => {
  let s = initialLever()
  for (let i = 0; i < 600; i++) s = leverStep(s, { pointer: i % 60 < 30 ? Math.PI : -Math.PI, reduced: false }, 1 / 60).state
  assert.ok(Math.abs(s.angle) <= LEVER.max + 1e-9)
})
