import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { listSketchDirs, loadSketches } from '../scripts/build-site.ts'
import { valid } from './fixtures.ts'

function tempRoot() {
  const root = mkdtempSync(join(tmpdir(), 'uxs-'))
  mkdirSync(join(root, 'sketches'))
  return root
}

test('listSketchDirs ignores folders without a number prefix', () => {
  const root = tempRoot()
  for (const d of ['001-a', '_scratch', 'notes', '002-b']) mkdirSync(join(root, 'sketches', d))
  writeFileSync(join(root, 'sketches', '003-file'), '')
  assert.deepEqual(listSketchDirs(root).map((d) => basename(d)), ['001-a', '002-b'])
})

test('build fails with every error when a sketch.json is invalid', () => {
  const root = tempRoot()
  const dir = join(root, 'sketches', '001-weighted-toggle')
  mkdirSync(dir)
  writeFileSync(join(dir, 'sketch.json'), JSON.stringify({ ...valid, slug: '1-bad', note: '' }))
  assert.throws(() => loadSketches(root), (e: Error) => /slug/.test(e.message) && /note/.test(e.message) && /001-weighted-toggle/.test(e.message))
})

test('build fails when the folder name and slug disagree', () => {
  const root = tempRoot()
  const dir = join(root, 'sketches', '001-other-name')
  mkdirSync(dir)
  writeFileSync(join(dir, 'sketch.json'), JSON.stringify(valid))
  assert.throws(() => loadSketches(root), /folder/)
})

test('loadSketches returns valid metas in folder order', () => {
  const root = tempRoot()
  for (const m of [valid, { ...valid, number: 2, slug: '002-arriving-toasts' }]) {
    const dir = join(root, 'sketches', m.slug)
    mkdirSync(dir)
    writeFileSync(join(dir, 'sketch.json'), JSON.stringify(m))
  }
  assert.deepEqual(loadSketches(root).map((s) => s.meta.slug), ['001-weighted-toggle', '002-arriving-toasts'])
})
