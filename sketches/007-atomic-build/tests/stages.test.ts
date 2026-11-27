import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PerspectiveCamera, Vector3 } from 'three'
import { PHONE, STAGES, shotFor, step, visibleWidthAt } from '../stages.ts'

const ASPECTS = [16 / 9, 360 / 780]
const dist = (s: ReturnType<typeof shotFor>) => new Vector3(...s.position).distanceTo(new Vector3(...s.target))

test('there are five stages, atoms to page', () => {
  assert.deepEqual([...STAGES], ['ATOMS', 'MOLECULES', 'ORGANISMS', 'TEMPLATE', 'PAGE'])
})

test('step clamps at both ends', () => {
  assert.equal(step(4, 1), 4)
  assert.equal(step(0, -1), 0)
  assert.equal(step(2, 1), 3)
  assert.equal(step(2, -1), 1)
})

test('shots 0–3 show less than half the phone width', () => {
  for (const aspect of ASPECTS) {
    for (let i = 0; i < 4; i++) {
      const s = shotFor(i, aspect)
      const w = visibleWidthAt(s, aspect, dist(s))
      assert.ok(w < PHONE.width / 2, `stage ${i} at aspect ${aspect.toFixed(2)} shows ${w.toFixed(3)} m`)
    }
  }
})

test('shotFor(4) frames the whole phone in portrait and landscape', () => {
  for (const aspect of ASPECTS) {
    const s = shotFor(4, aspect)
    const cam = new PerspectiveCamera(s.fov, aspect, 0.01, 50)
    cam.position.set(...s.position)
    cam.lookAt(new Vector3(...s.target))
    cam.updateMatrixWorld()
    const hw = PHONE.width / 2
    for (const [x, y] of [[-hw, PHONE.bottom], [hw, PHONE.bottom], [-hw, PHONE.bottom + PHONE.height], [hw, PHONE.bottom + PHONE.height]]) {
      const n = new Vector3(x, y, 0).project(cam)
      assert.ok(Math.abs(n.x) <= 0.95 && Math.abs(n.y) <= 0.95, `corner ${x},${y} at ${n.x.toFixed(2)},${n.y.toFixed(2)}`)
    }
  }
})

test('each stage has a different shot', () => {
  const ps = [0, 1, 2, 3, 4].map((i) => shotFor(i, 16 / 9).position.join(','))
  assert.equal(new Set(ps).size, 5)
})

test('shotFor(4) also shows the floor heading and question', async () => {
  const { floorBlock } = await import('../../../packages/stage/src/camera.ts')
  for (const aspect of ASPECTS) {
    const s = shotFor(4, aspect)
    const cam = new PerspectiveCamera(s.fov, aspect, 0.01, 50)
    cam.position.set(...s.position)
    cam.lookAt(new Vector3(...s.target))
    cam.updateMatrixWorld()
    const b = floorBlock(aspect)
    for (const [x, z] of [[-b.halfWidth, b.headingZ], [b.halfWidth, b.headingZ], [-b.halfWidth, b.questionZ], [b.halfWidth, b.questionZ]]) {
      const n = new Vector3(x, 0, z).project(cam)
      assert.ok(Math.abs(n.x) <= 0.95 && Math.abs(n.y) <= 0.95, `floor point ${x},${z} at ${n.x.toFixed(2)},${n.y.toFixed(2)}`)
    }
  }
})

test('close-ups cover less than half the phone width on the phone itself', () => {
  for (const aspect of ASPECTS) {
    for (let i = 0; i < 4; i++) {
      const s = shotFor(i, aspect)
      const cam = new PerspectiveCamera(s.fov, aspect, 0.01, 50)
      cam.position.set(...s.position)
      cam.lookAt(new Vector3(...s.target))
      cam.updateMatrixWorld()
      // Where the left and right edges of the view, through the target's height, meet the phone plane z = 0.
      const xs = [-1, 1].map((nx) => {
        const p = new Vector3(nx, 0, 0.5).unproject(cam)
        const dir = p.sub(cam.position).normalize()
        const t = -cam.position.z / dir.z
        return cam.position.x + dir.x * t
      })
      const span = Math.abs(xs[1] - xs[0])
      assert.ok(span < PHONE.width / 2, `stage ${i} at aspect ${aspect.toFixed(2)} covers ${span.toFixed(3)} m of the phone`)
    }
  }
})
