import { test } from 'node:test'
import assert from 'node:assert/strict'
import { floorLines } from '../packages/stage/src/floor-lines.ts'
import { valid } from './fixtures.ts'

test('floorLines formats the heading with a zero-padded number', () => {
  assert.equal(floorLines({ ...valid, number: 7, slug: '007-weighted-toggle' }).heading, 'WEIGHTED TOGGLE · 007')
})

test('floorLines joins tools with middots', () => {
  assert.equal(floorLines(valid).tools, 'Three.js · Rapier · Web Audio')
})

test('floorLines keeps the date and question as given', () => {
  const l = floorLines(valid)
  assert.equal(l.date, '2026-11-27')
  assert.equal(l.question, 'What if switching cost effort?')
})
