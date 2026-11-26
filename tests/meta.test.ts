import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validateSketchMeta } from '../packages/stage/src/meta.ts'
import { valid } from './fixtures.ts'

test('accepts a valid sketch', () => {
  assert.deepEqual(validateSketchMeta(valid), { ok: true, meta: valid })
})

test('slug must be the zero-padded number plus kebab name', () => {
  for (const slug of ['1-toggle', '002-weighted-toggle', '001_Toggle', '001-']) {
    assert.equal(validateSketchMeta({ ...valid, slug }).ok, false, slug)
  }
})

test('date must be a real YYYY-MM-DD', () => {
  assert.equal(validateSketchMeta({ ...valid, date: '2026-02-30' }).ok, false)
  assert.equal(validateSketchMeta({ ...valid, date: '27/11/2026' }).ok, false)
})

test('question is at most 90 characters', () => {
  assert.equal(validateSketchMeta({ ...valid, question: 'x'.repeat(91) }).ok, false)
  assert.equal(validateSketchMeta({ ...valid, question: 'x'.repeat(90) }).ok, true)
})

test('title is at most 40 characters', () => {
  assert.equal(validateSketchMeta({ ...valid, title: 'X'.repeat(41) }).ok, false)
})

test('floorText and categories are from their sets', () => {
  assert.equal(validateSketchMeta({ ...valid, floorText: 'neon' }).ok, false)
  assert.equal(validateSketchMeta({ ...valid, categories: ['FUN'] }).ok, false)
  assert.equal(validateSketchMeta({ ...valid, categories: [] }).ok, false)
})

test('note, component and tools are required', () => {
  for (const key of ['note', 'component']) assert.equal(validateSketchMeta({ ...valid, [key]: '' }).ok, false, key)
  assert.equal(validateSketchMeta({ ...valid, tools: [] }).ok, false)
})

test('reports every error, not just the first', () => {
  const r = validateSketchMeta({ ...valid, title: '', floorText: 'neon' })
  assert.equal(r.ok, false)
  assert.ok(!r.ok && r.errors.length >= 2)
})

test('rejects non-objects', () => {
  assert.equal(validateSketchMeta(null).ok, false)
  assert.equal(validateSketchMeta('sketch').ok, false)
})
