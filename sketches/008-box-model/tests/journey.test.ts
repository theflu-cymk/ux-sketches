import { test } from 'node:test'
import assert from 'node:assert/strict'
import { BEATS_PER_LEVEL, LEVELS, flexLayout, hitAt, springOut } from '../journey.ts'

const close = (a: number, b: number, e = 1e-6) => Math.abs(a - b) < e
const HITS = Array.from({ length: 40 }, (_, i) => 0.5 + i * 0.8)

test('sixteen levels, four hits each', () => {
  assert.equal(BEATS_PER_LEVEL, 4)
  assert.equal(LEVELS.length, 16)
  assert.equal(LEVELS[0].id, 'content')
  assert.equal(LEVELS.at(-1)!.id, 'screens')
  for (const l of LEVELS) assert.ok(l.name && l.line, l.id)
})

test('hitAt follows the hit times: hit index, beat in the phrase, phase to the next hit', () => {
  const a = hitAt(0.5 + 0.8 * 1.5, HITS, 16)
  assert.equal(a.hit, 1)
  assert.equal(a.beat, 1)
  assert.ok(close(a.phase, 0.5))
  assert.equal(a.level, 0)
  assert.equal(hitAt(0.5 + 0.8 * 4 + 0.01, HITS, 16).level, 1)
})

test('hitAt holds the first level, unpulsed, before the first hit', () => {
  const b = hitAt(0.2, HITS, 16)
  assert.equal(b.level, 0)
  assert.equal(b.beat, 0)
  assert.equal(b.transition, 0)
  assert.equal(b.phase, 1)
})

test('the transition runs across the fourth hit only', () => {
  assert.equal(hitAt(0.5 + 0.8 * 2.5, HITS, 16).transition, 0)
  assert.ok(close(hitAt(0.5 + 0.8 * 3.25, HITS, 16).transition, 0.25))
})

test('levels loop through the journey as the hits continue', () => {
  const ten = Array.from({ length: 200 }, (_, i) => i * 0.8)
  assert.equal(hitAt(0.8 * 64 + 0.01, ten, 16).level, 0)
  assert.equal(hitAt(0.8 * 68 + 0.01, ten, 16).level, 1)
})

test('after the last hit the phase keeps the last spacing and stops at 1', () => {
  const end = hitAt(HITS.at(-1)! + 5, HITS, 16)
  assert.equal(end.hit, HITS.length - 1)
  assert.equal(end.phase, 1)
})

test('springOut starts at 0, overshoots, and settles at 1', () => {
  assert.equal(springOut(0), 0)
  assert.ok(close(springOut(1), 1, 1e-3))
  let max = 0
  for (let x = 0; x <= 1; x += 0.01) max = Math.max(max, springOut(x))
  assert.ok(max > 1.05, `overshoot ${max}`)
})

test('flexLayout shares free space by grow', () => {
  const w = flexLayout([{ basis: 1, grow: 1, shrink: 1 }, { basis: 1, grow: 2, shrink: 1 }, { basis: 1, grow: 1, shrink: 1 }], 7, 0)
  assert.ok(close(w[0], 2) && close(w[1], 3) && close(w[2], 2))
})

test('flexLayout shrinks by shrink times basis', () => {
  const w = flexLayout([{ basis: 2, grow: 0, shrink: 1 }, { basis: 2, grow: 0, shrink: 3 }], 2, 0)
  // overflow 2, weights 2 and 6: shrink 0.5 and 1.5
  assert.ok(close(w[0], 1.5) && close(w[1], 0.5))
})

test('flexLayout never gives a negative width and respects the gap', () => {
  const w = flexLayout([{ basis: 1, grow: 0, shrink: 1 }, { basis: 1, grow: 0, shrink: 1 }], 0.1, 0.5)
  for (const x of w) assert.ok(x >= 0)
  const fit = flexLayout([{ basis: 1, grow: 1, shrink: 1 }, { basis: 1, grow: 1, shrink: 1 }], 2.5, 0.5)
  assert.ok(close(fit[0], 1) && close(fit[1], 1))
})
