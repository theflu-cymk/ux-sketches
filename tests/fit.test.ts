import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fitCap } from '../packages/stage/src/floor-text/geometry.ts'
import { CAP_HEIGHT, MONO_ADVANCE } from '../packages/stage/src/font-metrics.ts'

const width = (text: string, cap: number) => [...text].length * (cap / CAP_HEIGHT) * MONO_ADVANCE

test('fitCap keeps the cap when the line fits', () => {
  assert.equal(fitCap('SHORT', 0.1, 1.5), 0.1)
})

test('fitCap shrinks a long line to fit the width', () => {
  const text = 'WEIGHTED TOGGLE · 001'
  const cap = fitCap(text, 0.1, 1.5)
  assert.ok(cap < 0.1)
  assert.ok(width(text, cap) <= 1.5 + 1e-9)
})
