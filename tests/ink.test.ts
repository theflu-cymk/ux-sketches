import { test } from 'node:test'
import assert from 'node:assert/strict'
import { smearStamps } from '../packages/stage/src/floor-text/geometry.ts'

test('smearStamps spaces stamps at most radius/2 apart', () => {
  const pts = smearStamps(0, 0, 1, 0.5, 0.1)
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])
    assert.ok(d <= 0.05 + 1e-9, `gap ${d}`)
  }
})

test('smearStamps includes both endpoints', () => {
  const pts = smearStamps(0.2, -0.3, 0.9, 0.4, 0.1)
  assert.deepEqual(pts[0], [0.2, -0.3])
  assert.deepEqual(pts.at(-1), [0.9, 0.4])
})

test('smearStamps of a zero-length move is one stamp', () => {
  assert.deepEqual(smearStamps(0.5, 0.5, 0.5, 0.5, 0.1), [[0.5, 0.5]])
})
