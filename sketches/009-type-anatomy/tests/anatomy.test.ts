import { test } from 'node:test'
import assert from 'node:assert/strict'
import { BASE_GUIDES, MIN_GAP, PARTS, clampGuides, nextPart, scalesFor } from '../anatomy.ts'

test('every part has a name and definition', () => {
  assert.equal(PARTS.length, 12)
  assert.deepEqual(
    PARTS.map((p) => p.id),
    ['baseline', 'x-height', 'cap-height', 'ascender', 'descender', 'stem', 'crossbar', 'serif', 'bowl', 'counter', 'ear', 'terminal'],
  )
  for (const p of PARTS) assert.ok(p.name.trim() && p.definition.trim().length > 20, p.id)
})

test('clampGuides keeps order and minimum gaps', () => {
  const g = clampGuides({ baseline: 0.6, xHeight: 0.3, capHeight: 0.31 })
  assert.ok(g.xHeight - g.baseline >= MIN_GAP - 1e-9)
  assert.ok(g.capHeight - g.xHeight >= MIN_GAP - 1e-9)
  assert.ok(g.baseline >= 0.05)
  const low = clampGuides({ baseline: -1, xHeight: 0.4, capHeight: 0.7 })
  assert.equal(low.baseline, 0.05)
})

test('clampGuides leaves valid guides alone', () => {
  assert.deepEqual(clampGuides(BASE_GUIDES), BASE_GUIDES)
})

test('scalesFor returns 1 at the base guides', () => {
  assert.deepEqual(scalesFor(BASE_GUIDES, BASE_GUIDES), { x: 1, cap: 1 })
})

test('raising the x-height scales lowercase only', () => {
  const g = { ...BASE_GUIDES, xHeight: BASE_GUIDES.xHeight + 0.1 }
  const s = scalesFor(g, BASE_GUIDES)
  assert.ok(s.x > 1)
  assert.equal(s.cap, 1)
})

test('nextPart wraps both ways', () => {
  assert.equal(nextPart(null, 1), 'baseline')
  assert.equal(nextPart('terminal', 1), 'baseline')
  assert.equal(nextPart('baseline', -1), 'terminal')
  assert.equal(nextPart('stem', 1), 'crossbar')
})

test('clampGuides caps the x-height at 1.5× its natural size', () => {
  const g = clampGuides({ ...BASE_GUIDES, xHeight: 1.3, capHeight: 1.4 })
  const natural = BASE_GUIDES.xHeight - BASE_GUIDES.baseline
  assert.ok(g.xHeight - g.baseline <= natural * 1.5 + 1e-9)
})
