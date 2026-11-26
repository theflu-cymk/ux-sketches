import { Mesh, MeshStandardMaterial, Plane, Raycaster, SphereGeometry, Vector2, Vector3 } from 'three'
import { createStage, type FloorTextMode, type SketchMeta } from '../src/index.ts'
import '../src/stage.css'

const mode = (new URLSearchParams(location.search).get('mode') ?? 'print') as FloorTextMode

const meta: SketchMeta = {
  number: 0,
  slug: '000-stage-demo',
  title: 'STAGE DEMO',
  date: '2026-11-26',
  component: 'Nothing yet',
  question: 'Does the stage hold up on its own, at every size?',
  note: 'A scratch page for working on the stage.',
  tools: ['Three.js', 'Rapier', 'Web Audio'],
  floorText: mode,
  categories: ['3D'],
}

const stage = await createStage(document.getElementById('stage')!, { meta, physics: true, sound: true })
if (stage && stage.world && stage.rapier) {
  const { world, rapier } = stage
  const r = 0.18
  const ball = new Mesh(new SphereGeometry(r, 32, 16), new MeshStandardMaterial({ color: '#ff5a1f', roughness: 0.4 }))
  ball.castShadow = true
  stage.scene.add(ball)
  const start = { x: 0, y: 0.6, z: 0 }
  const body = world.createRigidBody(rapier.RigidBodyDesc.dynamic().setTranslation(start.x, start.y, start.z).setCcdEnabled(true))
  world.createCollider(rapier.ColliderDesc.ball(r).setDensity(800).setRestitution(0.3), body)
  stage.bind(ball, body)

  // Drag the ball along the floor plane; release throws it with the last velocity.
  const ray = new Raycaster()
  const ndc = new Vector2()
  const floorPlane = new Plane(new Vector3(0, 1, 0), -r)
  const hit = new Vector3()
  let dragging = false
  let last = new Vector3()
  let vel = new Vector3()
  const toFloor = (e: PointerEvent) => {
    const rect = stage.canvas.getBoundingClientRect()
    ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1)
    ray.setFromCamera(ndc, stage.camera)
    return ray.ray.intersectPlane(floorPlane, hit)
  }
  stage.canvas.addEventListener('pointerdown', (e) => {
    if (!toFloor(e) || !ray.intersectObject(ball).length) return
    dragging = true
    stage.canvas.setPointerCapture(e.pointerId)
    body.setBodyType(rapier.RigidBodyType.KinematicPositionBased, true)
    last = hit.clone()
  })
  stage.canvas.addEventListener('pointermove', (e) => {
    if (!dragging || !toFloor(e)) return
    vel = hit.clone().sub(last).multiplyScalar(60)
    stage.floor.ink?.smear(last.x, last.z, hit.x, hit.z, 0.08)
    body.setNextKinematicTranslation({ x: hit.x, y: r, z: hit.z })
    last = hit.clone()
  })
  const release = () => {
    if (!dragging) return
    dragging = false
    body.setBodyType(rapier.RigidBodyType.Dynamic, true)
    body.setLinvel({ x: vel.x, y: 0, z: vel.z }, true)
    stage.sound.thunk()
  }
  stage.canvas.addEventListener('pointerup', release)
  stage.canvas.addEventListener('pointercancel', release)

  let wasOnFloor = false
  stage.onFrame(() => {
    const t = body.translation()
    const onFloor = t.y < r + 0.01
    if (onFloor && !wasOnFloor) stage.floor.ink?.stamp(t.x, t.z, 0.12, 0.9)
    wasOnFloor = onFloor
  })
  stage.onReset(() => {
    dragging = false
    body.setBodyType(rapier.RigidBodyType.Dynamic, true)
    body.setTranslation(start, true)
    body.setLinvel({ x: 0, y: 0, z: 0 }, true)
    body.setAngvel({ x: 0, y: 0, z: 0 }, true)
  })
  setTimeout(() => stage.ready(), 1200)
}

// ?lines=1 draws straight floor lines running away from the camera, to check perspective lean.
if (stage && new URLSearchParams(location.search).get('lines') === '1') {
  const { BoxGeometry, MeshBasicMaterial } = await import('three')
  for (const x of [-1.2, -0.6, 0, 0.6, 1.2]) {
    const m = new Mesh(new BoxGeometry(0.01, 0.001, 1.2), new MeshBasicMaterial({ color: '#0050ff' }))
    m.position.set(x, 0.004, 1.1)
    stage.scene.add(m)
  }
}
