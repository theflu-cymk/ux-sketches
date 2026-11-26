import { BoxGeometry, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry, RingGeometry } from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { PALETTE, createDrag, createStage, type SketchMeta } from '@ux-sketches/stage'
import '@ux-sketches/stage/stage.css'
import meta from './sketch.json' with { type: 'json' }
import { nearestIndex, reflowOrder, rippleKick, slotPosition } from './grid.ts'

const stage = await createStage(document.getElementById('stage')!, { meta: meta as SketchMeta, sound: true })

if (stage) {
  const { scene, sound } = stage
  const COLS = 3
  const COUNT = 9
  const SPACING = 0.36
  const WATER_Y = 0.15
  const CENTER_Z = -0.05
  const TANK = { w: 1.3, d: 1.2 }
  const CARD = { w: 0.3, h: 0.028, d: 0.22 }
  const LABELS = 'ABCDEFGHI'
  const shadow = <T extends Mesh>(m: T) => ((m.castShadow = true), (m.receiveShadow = true), m)

  // The tank: a low dark rim around a pool of still water.
  const rimMat = new MeshStandardMaterial({ color: '#2b2b2e', roughness: 0.5, metalness: 0.2 })
  const rim = (w: number, d: number, x: number, z: number) => {
    const m = shadow(new Mesh(new BoxGeometry(w, WATER_Y + 0.04, d), rimMat))
    m.position.set(x, (WATER_Y + 0.04) / 2, CENTER_Z + z)
    scene.add(m)
  }
  rim(TANK.w + 0.08, 0.04, 0, -TANK.d / 2 - 0.02)
  rim(TANK.w + 0.08, 0.04, 0, TANK.d / 2 + 0.02)
  rim(0.04, TANK.d, -TANK.w / 2 - 0.02, 0)
  rim(0.04, TANK.d, TANK.w / 2 + 0.02, 0)
  const water = new Mesh(
    new PlaneGeometry(TANK.w, TANK.d),
    new MeshStandardMaterial({ color: '#27313a', roughness: 0.08, metalness: 0.3, transparent: true, opacity: 0.92 }),
  )
  water.rotation.x = -Math.PI / 2
  water.position.set(0, WATER_Y, CENTER_Z)
  water.receiveShadow = true
  scene.add(water)

  // Cards: rounded slabs with a header strip and two grey "text" bars; card E's header is the accent.
  const cardGeo = new RoundedBoxGeometry(CARD.w, CARD.h, CARD.d, 3, 0.012)
  const cardMat = new MeshStandardMaterial({ color: PALETTE.tile, roughness: 0.5 })
  const barMat = new MeshStandardMaterial({ color: '#9b968e', roughness: 0.8 })
  const headMat = new MeshStandardMaterial({ color: '#5d5a55', roughness: 0.6 })
  const accentMat = new MeshStandardMaterial({ color: PALETTE.accent, roughness: 0.5 })
  type Card = { id: number; group: Group; x: number; z: number; vx: number; vz: number; phase: number; kick: number; lift: number }
  const cards: Card[] = Array.from({ length: COUNT }, (_, id) => {
    const group = new Group()
    const slab = shadow(new Mesh(cardGeo, cardMat))
    const head = new Mesh(new BoxGeometry(CARD.w - 0.03, 0.004, 0.04), id === 4 ? accentMat : headMat)
    head.position.set(0, CARD.h / 2 + 0.002, -CARD.d / 2 + 0.035)
    const bar1 = new Mesh(new BoxGeometry(CARD.w * 0.62, 0.003, 0.018), barMat)
    bar1.position.set(-0.03, CARD.h / 2 + 0.002, 0.02)
    const bar2 = new Mesh(new BoxGeometry(CARD.w * 0.42, 0.003, 0.016), barMat)
    bar2.position.set(-0.06, CARD.h / 2 + 0.002, 0.06)
    group.add(slab, head, bar1, bar2)
    group.userData.card = id
    scene.add(group)
    const [x, z] = slotPosition(id, COLS, SPACING, COUNT)
    return { id, group, x, z: z + CENTER_Z, vx: 0, vz: 0, phase: id * 1.37, kick: 0, lift: 0 }
  })

  // Ripple rings that spread from wherever a card lands.
  const rings: Array<{ mesh: Mesh; age: number }> = []
  const ripple = (x: number, z: number) => {
    if (stage.reducedMotion) return
    const mesh = new Mesh(new RingGeometry(0.05, 0.058, 48), new MeshBasicMaterial({ color: '#c9d3da', transparent: true, opacity: 0.6 }))
    mesh.rotation.x = -Math.PI / 2
    mesh.position.set(x, WATER_Y + 0.001, z)
    scene.add(mesh)
    rings.push({ mesh, age: 0 })
  }

  const status = document.createElement('p')
  status.className = 'sr-only'
  status.setAttribute('aria-live', 'polite')
  stage.container.append(status)

  let order = cards.map((c) => c.id)
  let preview = order
  let dragged: Card | null = null
  let pointer = { x: 0, z: 0 }
  let grabOffset = { x: 0, z: 0 }
  let lastPreviewIndex = -1

  const clampToTank = (x: number, z: number) => ({
    x: Math.max(-TANK.w / 2 + CARD.w / 2, Math.min(TANK.w / 2 - CARD.w / 2, x)),
    z: Math.max(CENTER_Z - TANK.d / 2 + CARD.d / 2, Math.min(CENTER_Z + TANK.d / 2 - CARD.d / 2, z)),
  })

  createDrag(stage, {
    targets: cards.map((c) => c.group),
    plane: 'floor',
    onStart(hit) {
      let o: typeof hit.object | null = hit.object
      while (o && o.userData.card === undefined) o = o.parent
      if (!o) return
      dragged = cards[o.userData.card as number]
      grabOffset = { x: dragged.x - hit.point.x, z: dragged.z - hit.point.z }
      pointer = { x: dragged.x, z: dragged.z }
      lastPreviewIndex = order.indexOf(dragged.id)
      sound.click({ pitch: 1.3 })
    },
    onMove(point) {
      if (!dragged) return
      pointer = clampToTank(point.x + grabOffset.x, point.z + grabOffset.z)
      // Live reflow: the others part to make room wherever the card hovers.
      const index = nearestIndex(pointer.x, pointer.z - CENTER_Z, COUNT, COLS, SPACING, COUNT)
      if (index !== lastPreviewIndex) {
        lastPreviewIndex = index
        preview = reflowOrder(order, dragged.id, index)
        sound.tick({ pitch: 0.8 })
      }
    },
    onEnd() {
      if (!dragged) return
      order = preview
      const card = dragged
      dragged = null
      const position = order.indexOf(card.id) + 1
      status.textContent = `Card ${LABELS[card.id]} moved to position ${position} of ${COUNT}.`
      // It drops back into the water: a splash, and the neighbours bob.
      setTimeout(() => land(card), stage.reducedMotion ? 0 : 160)
    },
  })

  function land(card: Card) {
    sound.thunk({ gain: 0.4, pitch: 1.6 })
    ripple(card.x, card.z)
    for (const other of cards) {
      if (other === card) continue
      other.kick += rippleKick(Math.hypot(other.x - card.x, other.z - card.z))
    }
  }

  stage.onFrame((dt, t) => {
    const reduced = stage.reducedMotion
    const k = reduced ? 160 : 16
    const c = reduced ? 2 * Math.sqrt(160) : 4.2
    for (const card of cards) {
      const isDragged = card === dragged
      card.lift += ((isDragged ? 0.22 : 0) - card.lift) * Math.min(1, dt * (reduced ? 30 : 10))
      if (isDragged) {
        card.vx = (pointer.x - card.x) / Math.max(dt, 1e-4)
        card.vz = (pointer.z - card.z) / Math.max(dt, 1e-4)
        card.x = pointer.x
        card.z = pointer.z
      } else {
        // Floating, not snapping: a soft, underdamped pull toward the card's slot, like drifting on water.
        const [sx, sz] = slotPosition(preview.indexOf(card.id), COLS, SPACING, COUNT)
        const tz = sz + CENTER_Z
        card.vx += (k * (sx - card.x) - c * card.vx) * dt
        card.vz += (k * (tz - card.z) - c * card.vz) * dt
        card.x += card.vx * dt
        card.z += card.vz * dt
      }
      card.kick *= Math.exp(-dt * 2.2)
      const bob = reduced ? 0 : Math.sin(t * 1.6 + card.phase) * 0.006 + Math.sin(t * 9 + card.phase) * card.kick
      card.group.position.set(card.x, WATER_Y + CARD.h * 0.25 + bob + card.lift, card.z)
      const tilt = reduced ? 0 : 0.03
      card.group.rotation.set(
        Math.max(-0.3, Math.min(0.3, card.vz * tilt)) + (reduced ? 0 : Math.sin(t * 1.3 + card.phase) * 0.02),
        0,
        Math.max(-0.3, Math.min(0.3, -card.vx * tilt)),
      )
    }
    for (const r of [...rings]) {
      r.age += dt
      const s = 1 + r.age * 9
      r.mesh.scale.set(s, s, s)
      ;(r.mesh.material as MeshBasicMaterial).opacity = Math.max(0, 0.6 - r.age * 0.6)
      if (r.age > 1) {
        r.mesh.removeFromParent()
        r.mesh.geometry.dispose()
        rings.splice(rings.indexOf(r), 1)
      }
    }
  })

  stage.onReset(() => {
    order = cards.map((cd) => cd.id)
    preview = order
    dragged = null
    for (const card of cards) {
      const [x, z] = slotPosition(card.id, COLS, SPACING, COUNT)
      Object.assign(card, { x, z: z + CENTER_Z, vx: 0, vz: 0, kick: 0, lift: 0 })
    }
    status.textContent = 'Cards back in their original order.'
  })

  if (stage.thumbnail) {
    // Mid-reflow: card E lifted and carried toward the corner, the others parting around it.
    const e = cards[4]
    dragged = e
    pointer = { x: 0.34, z: CENTER_Z - 0.3 }
    preview = reflowOrder(order, e.id, 2)
    setTimeout(() => stage.ready(), 900)
  } else setTimeout(() => stage.ready(), 400)
}
