import { test } from 'node:test'
import assert from 'node:assert/strict'
import { letterHomes } from '../packages/stage/src/floor-text/geometry.ts'

test('letterHomes centres the line on the origin', () => {
  const homes = letterHomes('AB', [0.2, 0.2], 0.1, [0, 1])
  const expected = [[-0.15, 1], [0.15, 1]]
  homes.forEach(([x, z], i) => {
    assert.ok(Math.abs(x - expected[i][0]) < 1e-9, `x ${x}`)
    assert.equal(z, expected[i][1])
  })
})

test('letterHomes skips spaces but keeps their width', () => {
  const homes = letterHomes('A B', [0.2, 0.2, 0.2], 0, [0, 0])
  assert.equal(homes.length, 2)
  assert.ok(Math.abs(homes[0][0] - -0.2) < 1e-9 && Math.abs(homes[1][0] - 0.2) < 1e-9)
})
