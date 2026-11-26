import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PerspectiveCamera, Vector3 } from 'three'
import { cameraFor, floorBlock } from '../packages/stage/src/camera.ts'

function build(aspect: number) {
  const c = cameraFor(aspect)
  const cam = new PerspectiveCamera(c.fov, aspect, 0.05, 100)
  cam.position.set(...c.position)
  cam.lookAt(new Vector3(...c.target))
  cam.updateMatrixWorld()
  return { c, cam }
}

function framingPoints(aspect: number): Vector3[] {
  const b = floorBlock(aspect)
  const pts: Vector3[] = []
  for (const x of [-b.halfWidth, b.halfWidth]) for (const z of [b.zNear, b.zFar]) pts.push(new Vector3(x, 0, z))
  for (const x of [-0.5, 0.5]) for (const y of [0, 1]) for (const z of [-0.5, 0.5]) pts.push(new Vector3(x, y, z))
  return pts
}

function assertFramed(aspect: number) {
  const { cam } = build(aspect)
  for (const p of framingPoints(aspect)) {
    const n = p.clone().project(cam)
    assert.ok(Math.abs(n.x) <= 0.95 && Math.abs(n.y) <= 0.95, `point ${p.toArray()} at ndc ${n.x.toFixed(2)},${n.y.toFixed(2)}`)
  }
}

function questionPixels(aspect: number, heightPx: number) {
  const { cam } = build(aspect)
  const b = floorBlock(aspect)
  const a = new Vector3(0, 0, b.questionZ - b.questionCap / 2).project(cam)
  const z = new Vector3(0, 0, b.questionZ + b.questionCap / 2).project(cam)
  return (Math.abs(a.y - z.y) / 2) * heightPx
}

test('cameraFor keeps the text block in view in portrait', () => {
  assertFramed(360 / 780)
  assert.ok(questionPixels(360 / 780, 780) >= 14, `question line ${questionPixels(360 / 780, 780).toFixed(1)} px`)
})

test('cameraFor in landscape also frames everything', () => {
  assertFramed(16 / 9)
  assert.ok(questionPixels(16 / 9, 810) >= 14)
})

test('portrait stands further back than landscape', () => {
  const dist = (aspect: number) => {
    const c = cameraFor(aspect)
    return new Vector3(...c.position).distanceTo(new Vector3(...c.target))
  }
  assert.ok(dist(360 / 780) > dist(16 / 9))
})

test('floorBlock narrows in portrait', () => {
  assert.ok(floorBlock(360 / 780).halfWidth < floorBlock(16 / 9).halfWidth)
})
