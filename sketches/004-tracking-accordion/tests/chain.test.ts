import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CHAIN, chainStep, restChain, trackingOf } from '../chain.ts'

const ADV = 0.1
const run = (s: ReturnType<typeof restChain>, seconds: number, hold: { index: number; x: number } | null, reduced = false) => {
  for (let t = 0; t < seconds; t += 1 / 60) s = chainStep(s, hold, 1 / 60, { advance: ADV, reduced })
  return s
}

test('a chain at rest stays at rest', () => {
  const s = run(restChain(6, ADV), 2, null)
  s.x.forEach((x, i) => assert.ok(Math.abs(x - restChain(6, ADV).x[i]) < 1e-6))
})

test('pulling the last letter spreads every gap about evenly', () => {
  const rest = restChain(6, ADV)
  const s = run(rest, 4, { index: 5, x: rest.x[5] + 0.5 })
  const gaps = s.x.slice(1).map((x, i) => x - s.x[i])
  const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length
  assert.ok(mean > ADV * 1.8, `mean gap ${mean}`)
  for (const g of gaps) assert.ok(Math.abs(g - mean) < mean * 0.15, `gap ${g} vs ${mean}`)
})

test('released, it springs back to rest', () => {
  const rest = restChain(6, ADV)
  let s = run(rest, 2, { index: 5, x: rest.x[5] + 0.5 })
  s = run(s, 6, null)
  s.x.forEach((x, i) => assert.ok(Math.abs(x - rest.x[i]) < 0.002, `letter ${i}`))
})

test('squeezing never makes letters overlap', () => {
  const rest = restChain(6, ADV)
  const s = run(rest, 3, { index: 5, x: rest.x[0] - 1 })
  for (let i = 1; i < s.x.length; i++) assert.ok(s.x[i] - s.x[i - 1] >= ADV * CHAIN.minGap - 1e-9)
})

test('release overshoots normally but not under reduced motion', () => {
  const rest = restChain(6, ADV)
  const minAfter = (reduced: boolean) => {
    let s = run(rest, 2, { index: 5, x: rest.x[5] + 0.5 }, reduced)
    let min = Infinity
    for (let t = 0; t < 3; t += 1 / 60) {
      s = chainStep(s, null, 1 / 60, { advance: ADV, reduced })
      min = Math.min(min, s.x[5])
    }
    return min
  }
  assert.ok(minAfter(false) < rest.x[5] - 0.005, 'overshoots past rest')
  assert.ok(minAfter(true) >= rest.x[5] - 0.001, 'no overshoot')
})

test('trackingOf reports letter-spacing in thousandths of an em', () => {
  const rest = restChain(5, ADV)
  assert.equal(Math.round(trackingOf(rest, ADV, 0.16)), 0)
  const wide = { ...rest, x: rest.x.map((x, i) => x + i * 0.016) }
  assert.equal(Math.round(trackingOf(wide, ADV, 0.16)), 100)
})
