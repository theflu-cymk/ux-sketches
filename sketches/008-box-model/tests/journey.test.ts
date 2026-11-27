import { test } from 'node:test'
import assert from 'node:assert/strict'
import { BEATS_PER_LEVEL, BPM, LEVELS, beatAt, flexLayout, springOut } from '../journey.ts'

const beat = 60 / BPM
const close = (a: number, b: number, e = 1e-6) => Math.abs(a - b) < e

test('the journey runs at 140 BPM, four beats a level, sixteen levels', () => {
  assert.equal(BPM, 140)
  assert.equal(BEATS_PER_LEVEL, 4)
  assert.equal(LEVELS.length, 16)
  assert.equal(LEVELS[0].id, 'content')
  assert.equal(LEVELS.at(-1)!.id, 'screens')
  for (const l of LEVELS) assert.ok(l.name && l.line, l.id)
})

test('beatAt counts beats and levels', () => {
  assert.deepEqual({ ...beatAt(0, BPM, 16), phase: 0 }, { level: 0, beat: 0, phase: 0, transition: 0 })
  const b = beatAt(beat * 1.5, BPM, 16)
  assert.equal(b.level, 0)
  assert.equal(b.beat, 1)
  assert.ok(close(b.phase, 0.5))
  assert.equal(beatAt(beat * 4 + 0.001, BPM, 16).level, 1)
  assert.equal(beatAt(beat * 4 * 5 + 0.001, BPM, 16).level, 5)
})

test('beatAt loops after the last level', () => {
  assert.equal(beatAt(beat * 4 * 16 + 0.001, BPM, 16).level, 0)
})

test('the transition runs only across the fourth beat', () => {
  assert.equal(beatAt(beat * 2.5, BPM, 16).transition, 0)
  assert.ok(close(beatAt(beat * 3.5, BPM, 16).transition, 0.5))
  assert.equal(beatAt(beat * 3, BPM, 16).transition, 0)
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
