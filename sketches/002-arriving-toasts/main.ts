import { BoxGeometry, CylinderGeometry, Group, Mesh, MeshStandardMaterial, Raycaster, Vector2, type Object3D } from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import type RAPIER_NS from '@dimforge/rapier3d-compat'
import { PALETTE, createStage, type SketchMeta } from '@ux-sketches/stage'
import '@ux-sketches/stage/stage.css'
import meta from './sketch.json' with { type: 'json' }
import { emptyQueue, pushToast, removeToast, toastQueue, type QueueStep } from './queue.ts'

const stage = await createStage(document.getElementById('stage')!, { meta: meta as SketchMeta, physics: true, sound: true })

if (stage && stage.world && stage.rapier) {
  const { scene, world, rapier, sound } = stage
  const INTERVAL = 2.5
  const CAP = 12
  const SHELF = { width: 1.4, depth: 0.4, top: 0.6, z: -0.2 }
  const TOAST = { w: 0.36, h: 0.05, d: 0.16 }
  const FLOOR_LIMIT = 10

  // The shelf: a plank on two legs with a lip at the back, all fixed colliders.
  const shelfMat = new MeshStandardMaterial({ color: '#2b2b2e', roughness: 0.6, metalness: 0.15 })
  const fixedBox = (w: number, h: number, d: number, x: number, y: number, z: number) => {
    const m = new Mesh(new BoxGeometry(w, h, d), shelfMat)
    m.position.set(x, y, z)
    m.castShadow = m.receiveShadow = true
    scene.add(m)
    world.createCollider(rapier.ColliderDesc.cuboid(w / 2, h / 2, d / 2).setTranslation(x, y, z).setFriction(0.6))
  }
  fixedBox(SHELF.width, 0.04, SHELF.depth, 0, SHELF.top - 0.02, SHELF.z)
  fixedBox(SHELF.width, 0.1, 0.02, 0, SHELF.top + 0.05, SHELF.z - SHELF.depth / 2)
  for (const x of [-SHELF.width / 2 + 0.05, SHELF.width / 2 - 0.05]) fixedBox(0.04, SHELF.top - 0.04, SHELF.depth * 0.8, x, (SHELF.top - 0.04) / 2, SHELF.z)

  // A toast: a rounded slab with an icon dot and two grey "text" bars. No words.
  const toastGeo = new RoundedBoxGeometry(TOAST.w, TOAST.h, TOAST.d, 3, 0.018)
  const toastMat = new MeshStandardMaterial({ color: PALETTE.tile, roughness: 0.45 })
  const barMat = new MeshStandardMaterial({ color: '#9b968e', roughness: 0.8 })
  const dotGeo = new CylinderGeometry(0.022, 0.022, 0.006, 20)
  const dotMat = new MeshStandardMaterial({ color: PALETTE.accent, roughness: 0.4 })
  const barGeo = [new BoxGeometry(0.2, 0.004, 0.022), new BoxGeometry(0.13, 0.004, 0.018)]

  type Toast = { id: number; mesh: Group; body: RAPIER_NS.RigidBody; state: 'shelf' | 'dismissed' | 'evicted'; landedAt: number | null; lastY: number; vy: number; prev: { x: number; z: number } }
  const toasts = new Map<number, Toast>()
  const floorOrder: number[] = []
  let queue = emptyQueue(0.5)
  let clock = 0

  const status = document.createElement('p')
  status.className = 'sr-only'
  status.setAttribute('aria-live', 'polite')
  stage.container.append(status)
  const announce = () => {
    const n = [...toasts.values()].filter((t) => t.state === 'shelf').length
    status.textContent = `${n} notification${n === 1 ? '' : 's'} on the shelf.`
  }

  function makeToast(id: number, x: number, y: number, z: number): Toast {
    const mesh = new Group()
    const slab = new Mesh(toastGeo, toastMat)
    slab.castShadow = slab.receiveShadow = true
    const dot = new Mesh(dotGeo, dotMat)
    dot.position.set(-TOAST.w / 2 + 0.05, TOAST.h / 2 + 0.002, 0)
    const bar1 = new Mesh(barGeo[0], barMat)
    bar1.position.set(0.03, TOAST.h / 2 + 0.002, -0.025)
    const bar2 = new Mesh(barGeo[1], barMat)
    bar2.position.set(-0.005, TOAST.h / 2 + 0.002, 0.028)
    mesh.add(slab, dot, bar1, bar2)
    mesh.userData.toastId = id
    scene.add(mesh)
    const body = world.createRigidBody(
      rapier.RigidBodyDesc.dynamic()
        .setTranslation(x, y, z)
        .setRotation({ x: 0, y: Math.sin(id * 1.7) * 0.08, z: 0, w: 1 })
        .setCcdEnabled(true)
        .setLinearDamping(0.1)
        .setAngularDamping(0.4),
    )
    world.createCollider(rapier.ColliderDesc.cuboid(TOAST.w / 2, TOAST.h / 2, TOAST.d / 2).setDensity(400).setFriction(0.5).setRestitution(0.1), body)
    stage!.bind(mesh, body)
    const t: Toast = { id, mesh, body, state: 'shelf', landedAt: null, lastY: y, vy: 0, prev: { x, z } }
    toasts.set(id, t)
    return t
  }

  function destroy(t: Toast) {
    stage!.unbind(t.mesh)
    world.removeRigidBody(t.body)
    t.mesh.removeFromParent()
    toasts.delete(t.id)
    const i = floorOrder.indexOf(t.id)
    if (i >= 0) floorOrder.splice(i, 1)
  }

  // Arrivals land somewhere along the shelf; under reduced motion they appear on the pile, already at rest.
  function arrive(step: QueueStep) {
    queue = step.state
    if (step.evict !== null) evict(step.evict)
    if (step.spawn === null) return
    const x = (((step.spawn * 0.618) % 1) - 0.5) * (SHELF.width - TOAST.w - 0.1)
    const pile = [...toasts.values()].filter((t) => t.state === 'shelf').length
    const y = stage!.reducedMotion ? SHELF.top + TOAST.h / 2 + 0.01 + pile * (TOAST.h + 0.004) : 1.7
    const t = makeToast(step.spawn, stage!.reducedMotion ? 0 : x, y, SHELF.z + 0.02)
    if (stage!.reducedMotion) t.body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true)
    announce()
  }

  // The oldest toast is shoved off the far end of the shelf.
  function evict(id: number) {
    const t = toasts.get(id)
    if (!t) return
    t.state = 'evicted'
    if (stage!.reducedMotion) return destroy(t)
    t.body.setLinvel({ x: 2.6, y: 0.6, z: 0 }, true)
    t.body.setAngvel({ x: 0, y: 0, z: -4 }, true)
  }

  // Tapping a toast flicks it off the shelf toward you, onto the floor text.
  function dismiss(t: Toast) {
    queue = removeToast(queue, t.id)
    t.state = 'dismissed'
    floorOrder.push(t.id)
    if (floorOrder.length > FLOOR_LIMIT) {
      const old = toasts.get(floorOrder[0])
      if (old) destroy(old)
    }
    if (stage!.reducedMotion) {
      const b = stage!.block
      const x = (((t.id * 0.37) % 1) - 0.5) * b.halfWidth * 1.6
      stage!.floor.ink?.stamp(x, b.questionZ, 0.09, 0.9)
      destroy(t)
    } else {
      t.body.setLinvel({ x: (Math.random() - 0.5) * 0.6, y: 2.0, z: 1.5 + Math.random() * 0.5 }, true)
      t.body.setAngvel({ x: 4 + Math.random() * 4, y: (Math.random() - 0.5) * 6, z: (Math.random() - 0.5) * 4 }, true)
    }
    sound.click({ pitch: 1.2 })
    announce()
  }

  // A landing splats the wet ink: a blot under the toast and droplets thrown past its edges.
  function splat(x: number, z: number, impact: number) {
    const ink = stage!.floor.ink
    if (!ink) return
    ink.stamp(x, z, 0.06 + impact * 0.01, 0.85)
    const drops = 6 + Math.round(impact * 3)
    for (let i = 0; i < drops; i++) {
      const a = Math.random() * Math.PI * 2
      const d = 0.2 + Math.random() * 0.14
      ink.stamp(x + Math.cos(a) * d, z + Math.sin(a) * d * 0.7, 0.012 + Math.random() * 0.022, 0.9)
    }
  }

  const ray = new Raycaster()
  const ndc = new Vector2()
  stage.canvas.addEventListener('click', (e) => {
    const r = stage.canvas.getBoundingClientRect()
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
    ray.setFromCamera(ndc, stage.camera)
    const shelfMeshes = [...toasts.values()].filter((t) => t.state === 'shelf').map((t) => t.mesh)
    const hit = ray.intersectObjects(shelfMeshes, true)[0]
    if (!hit) return
    let o: Object3D | null = hit.object
    while (o && o.userData.toastId === undefined) o = o.parent
    const t = o ? toasts.get(o.userData.toastId as number) : undefined
    if (t) dismiss(t)
  })
  stage.canvas.addEventListener('pointermove', (e) => {
    const r = stage.canvas.getBoundingClientRect()
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
    ray.setFromCamera(ndc, stage.camera)
    const over = ray.intersectObjects([...toasts.values()].filter((t) => t.state === 'shelf').map((t) => t.mesh), true).length > 0
    stage.canvas.style.cursor = over ? 'pointer' : ''
  })

  // Reduced motion: nothing arrives on its own; a button sends one.
  if (stage.reducedMotion && !stage.thumbnail) {
    const extra = document.createElement('div')
    extra.className = 'uxs-extra'
    const send = document.createElement('button')
    send.type = 'button'
    send.className = 'uxs-button'
    send.textContent = 'Send notification'
    send.addEventListener('click', () => arrive(pushToast(queue, CAP)))
    extra.append(send)
    stage.container.append(extra)
  }

  stage.onFrame((dt) => {
    clock += dt
    arrive(toastQueue(queue, clock, { interval: INTERVAL, cap: CAP, auto: !stage.reducedMotion }))
    for (const t of [...toasts.values()]) {
      const p = t.body.translation()
      const vy = (p.y - t.lastY) / Math.max(dt, 1e-4)
      // Landing: a sharp stop after falling. Thunk by impact; splat the ink if it's the floor.
      if (t.vy < -1.2 && vy > -0.3) {
        const impact = -t.vy
        sound.thunk({ gain: Math.min(0.9, impact / 6), pitch: p.y < 0.1 ? 0.8 : 1.25 })
        if (p.y < 0.16 && t.state !== 'shelf') splat(p.x, p.z, impact)
      }
      // Sliding across the floor smears whatever ink it drags over.
      if (p.y < 0.06 && t.state !== 'shelf') {
        const moved = Math.hypot(p.x - t.prev.x, p.z - t.prev.z)
        if (moved > 0.002) stage.floor.ink?.smear(t.prev.x, t.prev.z, p.x, p.z, 0.06)
      }
      t.vy = vy
      t.lastY = p.y
      t.prev = { x: p.x, z: p.z }
      // Toasts that fall off the shelf by themselves count as gone from it.
      if (t.state === 'shelf' && p.y < SHELF.top - 0.15) {
        t.state = 'dismissed'
        queue = removeToast(queue, t.id)
        floorOrder.push(t.id)
        announce()
      }
      if (t.state === 'evicted' && (p.y < -1 || Math.abs(p.x) > 3.5)) destroy(t)
      else if (t.state === 'evicted' && p.y < 0.06) {
        t.landedAt ??= clock
        if (clock - t.landedAt > 3) destroy(t)
      }
    }
  })

  stage.onReset(() => {
    for (const t of [...toasts.values()]) destroy(t)
    floorOrder.length = 0
    clock = 0
    queue = emptyQueue(0.5)
    announce()
  })

  announce()
  if (stage.thumbnail) {
    // A settled pile, with one toast flicked onto the floor text.
    for (let i = 0; i < 7; i++) setTimeout(() => arrive(pushToast(queue, CAP)), i * 220)
    setTimeout(() => {
      const onShelf = [...toasts.values()].filter((t) => t.state === 'shelf')
      const top = onShelf.sort((a, b) => b.body.translation().y - a.body.translation().y)[0]
      if (top) dismiss(top)
    }, 2200)
    setTimeout(() => stage.ready(), 4200)
  } else setTimeout(() => stage.ready(), 400)
}
