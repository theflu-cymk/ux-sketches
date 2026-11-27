import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CARD, MAX, PX, cssFor, fitScale, layoutRow } from '../box.ts'

const base = { padding: 16, margin: 8, gap: 16 }
const W = CARD.width

test('padding grows nothing outside, squeezes the content', () => {
  const a = layoutRow(3, W, base, PX)
  const b = layoutRow(3, W, { ...base, padding: 32 }, PX)
  assert.equal(a[0].outer, b[0].outer)
  assert.ok(Math.abs(a[0].inner - b[0].inner - 2 * 16 * PX) < 1e-9)
  assert.deepEqual(a.map((c) => c.x), b.map((c) => c.x))
})

test('margin and gap both widen the space between cards', () => {
  const a = layoutRow(3, W, base, PX)
  const m = layoutRow(3, W, { ...base, margin: 24 }, PX)
  const g = layoutRow(3, W, { ...base, gap: 40 }, PX)
  const space = (r: typeof a) => r[1].x - r[0].x - W
  assert.ok(Math.abs(space(m) - space(a) - 2 * 16 * PX) < 1e-9)
  assert.ok(Math.abs(space(g) - space(a) - 24 * PX) < 1e-9)
})

test('layoutRow is centred on zero', () => {
  const r = layoutRow(3, W, base, PX)
  assert.ok(Math.abs(r[0].x + r[2].x) < 1e-9)
  assert.ok(Math.abs(r[1].x) < 1e-9)
})

test('layoutRow never gives negative content width', () => {
  const r = layoutRow(3, 0.1, { padding: MAX.padding, margin: 0, gap: 0 }, PX)
  for (const c of r) assert.ok(c.inner >= 0)
})

test('layoutRow total stays within the stage width', () => {
  const r = layoutRow(3, W, { padding: 0, margin: MAX.margin, gap: MAX.gap }, PX)
  const total = r[2].x + W / 2 - (r[0].x - W / 2)
  assert.ok(total < 2.4, `total ${total}`)
})

test('cssFor formats each rule', () => {
  assert.deepEqual(cssFor({ padding: 24, margin: 16, gap: 8 }), ['padding: 24px;', 'margin: 16px;', 'gap: 8px;'])
})

test('handles on the middle card track the pointer and stay put as the row reflows', async () => {
  const { handleX, fromHandle } = await import('../box.ts')
  for (const x of [0.01, 0.05, 0.08, 0.11].map((d) => W / 2 + d)) {
    const margin = fromHandle('margin', x, W, PX)
    const s = { ...base, margin }
    const mid = layoutRow(3, W, s, PX)[1]
    assert.ok(Math.abs(mid.x) < 1e-9, 'the middle card never moves')
    assert.ok(Math.abs(mid.x + handleX('margin', s, W, PX) - x) < PX, `margin handle at ${x}`)
  }
  const padding = fromHandle('padding', W / 2 - 0.05, W, PX)
  assert.ok(Math.abs(handleX('padding', { ...base, padding }, W, PX) - (W / 2 - 0.05)) < PX)
})

test('fitScale keeps the shipped row, at its widest, inside the view', () => {
  const r = layoutRow(3, CARD.width, { padding: 0, margin: MAX.margin, gap: MAX.gap }, PX)
  const total = r[2].x - r[0].x + CARD.width + 2 * MAX.margin * PX
  assert.ok(total * fitScale(total, 16 / 9) <= 1.9 + 1e-9)
  assert.ok(total * fitScale(total, 360 / 780) <= 1.05 + 1e-9)
  assert.equal(fitScale(0.5, 16 / 9), 1)
})
