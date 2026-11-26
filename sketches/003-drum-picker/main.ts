import { BoxGeometry, CylinderGeometry, Group, Mesh, MeshStandardMaterial, Vector3, type Object3D } from 'three'
import { Text } from 'troika-three-text'
import { CAP_HEIGHT, FONTS, PALETTE, createDrag, createStage, type SketchMeta } from '@ux-sketches/stage'
import '@ux-sketches/stage/stage.css'
import meta from './sketch.json' with { type: 'json' }
import { snapToDetent, spinStep, valueAt } from './drum.ts'

const stage = await createStage(document.getElementById('stage')!, { meta: meta as SketchMeta, physics: true, sound: true })

if (stage && stage.world && stage.rapier) {
  const { scene, world, rapier, sound } = stage
  const TAU = Math.PI * 2
  const R = 0.3
  const AXLE_Y = 0.42
  /** Where the window sits on the drum: tilted up toward the camera. */
  const WINDOW = 0.5
  const SPIN = { friction: 2.2, maxVelocity: 25 }
  const HOP_SPEED = 9
  /** Where the picker's centre may be dragged: far enough forward to reach the letters, no further. */
  const BAY = { x: 1.0, zMin: -0.7, zMax: 0.75 }

  const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
  type DrumSpec = { name: string; values: string[]; width: number; x: number; start: number }
  const specs: DrumSpec[] = [
    { name: 'day', values: Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0')), width: 0.2, x: -0.34, start: 25 },
    { name: 'month', values: MONTHS, width: 0.28, x: -0.04, start: 10 },
    { name: 'year', values: Array.from({ length: 16 }, (_, i) => String(2020 + i)), width: 0.3, x: 0.3, start: 6 },
  ]

  // The picker: a heavy frame on the floor, one dynamic body, with three drums on a shared axle.
  const picker = new Group()
  scene.add(picker)
  const frameMat = new MeshStandardMaterial({ color: '#2b2b2e', roughness: 0.55, metalness: 0.2 })
  const shadow = <T extends Mesh>(m: T) => ((m.castShadow = true), (m.receiveShadow = true), m)
  const base = shadow(new Mesh(new BoxGeometry(1.0, 0.08, 0.5), frameMat))
  base.position.y = 0.04
  const cheeks = [-0.52, 0.52].map((x) => {
    const m = shadow(new Mesh(new BoxGeometry(0.04, AXLE_Y + 0.08, 0.16), frameMat))
    m.position.set(x, (AXLE_Y + 0.08) / 2, 0)
    return m
  })
  picker.add(base, ...cheeks)

  // Readout plate on the front of the base.
  const readout = new Text()
  readout.font = FONTS.bold
  readout.fontSize = 0.045 / CAP_HEIGHT
  readout.color = PALETTE.tile
  readout.anchorX = 'center'
  readout.anchorY = 'middle'
  readout.rotation.x = -Math.PI / 2
  readout.position.set(0, 0.081, 0.19)
  picker.add(readout)

  const drumMat = new MeshStandardMaterial({ color: PALETTE.tile, roughness: 0.5 })
  const labelMat = new MeshStandardMaterial({ color: PALETTE.ink, roughness: 0.8 })
  const bandMat = new MeshStandardMaterial({ color: PALETTE.accent, roughness: 0.4 })
  type Drum = DrumSpec & { group: Group; mesh: Mesh; angle: number; velocity: number; held: boolean; lastDetent: number }
  const drums: Drum[] = specs.map((spec) => {
    const group = new Group()
    group.position.set(spec.x, AXLE_Y, 0)
    picker.add(group)
    const mesh = shadow(new Mesh(new CylinderGeometry(R, R, spec.width, 64), drumMat))
    mesh.rotation.z = Math.PI / 2
    group.add(mesh)
    const slot = TAU / spec.values.length
    spec.values.forEach((v, i) => {
      const t = new Text()
      t.text = v
      t.font = FONTS.bold
      t.fontSize = Math.min(0.05, slot * R * 0.62) / CAP_HEIGHT
      t.material = labelMat
      t.color = PALETTE.ink
      t.anchorX = 'center'
      t.anchorY = 'middle'
      const phi = i * slot + WINDOW
      t.position.set(0, R * Math.sin(phi) + Math.sin(phi) * 0.001, R * Math.cos(phi) + Math.cos(phi) * 0.001)
      t.rotation.x = -phi
      t.sync()
      group.add(t)
    })
    // The window: two accent bars just outside the drum, either side of the selected value.
    for (const s of [-0.5, 0.5]) {
      const phi = WINDOW + s * slot
      const bar = new Mesh(new BoxGeometry(spec.width + 0.02, 0.006, 0.006), bandMat)
      bar.position.set(spec.x, AXLE_Y + (R + 0.012) * Math.sin(phi), (R + 0.012) * Math.cos(phi))
      picker.add(bar)
    }
    mesh.userData.drum = spec.name
    const angle = spec.start * slot
    return { ...spec, group, mesh, angle, velocity: 0, held: false, lastDetent: spec.start }
  })

  // Physics for the whole picker: a heavy box on the floor that can hop and be shoved.
  const start = { x: 0, y: 0.04, z: -0.05 }
  const body = world.createRigidBody(rapier.RigidBodyDesc.dynamic().setTranslation(start.x, start.y, start.z).setAngularDamping(1.2).setLinearDamping(0.4).setCcdEnabled(true))
  world.createCollider(rapier.ColliderDesc.cuboid(0.5, 0.04, 0.25).setDensity(900).setFriction(0.9), body)
  world.createCollider(rapier.ColliderDesc.cuboid(0.54, (AXLE_Y + R) / 2, 0.14).setTranslation(0, (AXLE_Y + R) / 2, 0).setDensity(120), body)
  stage.bind(picker, body)

  const status = document.createElement('p')
  status.className = 'sr-only'
  status.setAttribute('aria-live', 'polite')
  stage.container.append(status)

  const current = () => drums.map((d) => valueAt(d.angle, d.values))
  const isRealDate = ([day, month, year]: string[]) => {
    const m = MONTHS.indexOf(month)
    const d = new Date(Date.UTC(Number(year), m, Number(day)))
    return d.getUTCDate() === Number(day)
  }
  let shown = ''
  const showDate = () => {
    const parts = current()
    const text = parts.join(' ')
    if (text === shown) return
    shown = text
    const real = isRealDate(parts)
    readout.text = real ? text : `${text} ?`
    readout.sync()
    status.textContent = `Selected date: ${text}${real ? '' : ' (not a real date)'}.`
  }
  showDate()

  // One drag: a drum turns with a vertical drag; the base slides the whole picker across the floor.
  let grabbed: Drum | null = null
  let dragBase = false
  const grabOffset = new Vector3()
  let dragVelocity = 0
  const drumOf = (o: Object3D | null) => drums.find((d) => d.mesh === o) ?? null
  createDrag(stage, {
    targets: [...drums.map((d) => d.mesh), base, ...cheeks],
    plane: (hit) => (drumOf(hit.object) ? 'vertical' : 'floor'),
    onStart(hit) {
      grabbed = drumOf(hit.object)
      if (grabbed) {
        grabbed.held = true
        grabbed.velocity = 0
        dragVelocity = 0
      } else {
        dragBase = true
        const t = body.translation()
        grabOffset.set(hit.point.x - t.x, 0, hit.point.z - t.z)
      }
    },
    onMove(point, delta) {
      if (grabbed) {
        // Pulling down on the front of a drum turns it forward.
        const turn = -delta.y / R
        grabbed.angle += turn
        dragVelocity = dragVelocity * 0.6 + (turn / (1 / 60)) * 0.4
      } else if (dragBase) {
        // The picker can be shoved anywhere on the bay up to its label, but not up to the camera.
        const t = body.translation()
        const tx = Math.max(-BAY.x, Math.min(BAY.x, point.x - grabOffset.x))
        const tz = Math.max(BAY.zMin, Math.min(BAY.zMax, point.z - grabOffset.z))
        const vx = Math.max(-4, Math.min(4, (tx - t.x) * 12))
        const vz = Math.max(-4, Math.min(4, (tz - t.z) * 12))
        body.setLinvel({ x: vx, y: body.linvel().y, z: vz }, true)
      }
    },
    onEnd() {
      if (grabbed) {
        grabbed.held = false
        grabbed.velocity = stage.reducedMotion ? 0 : dragVelocity
        if (stage.reducedMotion) grabbed.angle = snapToDetent(grabbed.angle, grabbed.values.length)
      }
      grabbed = null
      dragBase = false
    },
  })

  let hopCooldown = 0
  let lastTick = 0
  stage.onFrame((dt, t) => {
    let fastest = 0
    for (const d of drums) {
      const count = d.values.length
      const slot = TAU / count
      if (!d.held) {
        d.velocity = spinStep(d.velocity, dt, SPIN)
        if (Math.abs(d.velocity) < 2) {
          // Settle onto the nearest detent, with a little overshoot unless motion is reduced.
          const target = snapToDetent(d.angle, count)
          if (stage.reducedMotion) {
            d.angle = target
            d.velocity = 0
          } else d.velocity += (140 * (target - d.angle) - 9 * d.velocity) * dt
        }
        d.angle += d.velocity * dt
      }
      fastest = Math.max(fastest, Math.abs(d.held ? dragVelocity : d.velocity))
      const detent = Math.round(d.angle / slot)
      if (detent !== d.lastDetent) {
        d.lastDetent = detent
        if (t - lastTick > 0.025) {
          sound.tick({ pitch: 0.8 + (count % 7) * 0.08 })
          lastTick = t
        }
      }
      d.group.rotation.x = d.angle
    }
    showDate()

    // Spun hard enough, the whole picker rattles and hops, and walks forward into the letters.
    hopCooldown -= dt
    const pos = body.translation()
    const grounded = pos.y < 0.08 && Math.abs(body.linvel().y) < 0.5
    if (!stage.reducedMotion && fastest > HOP_SPEED && hopCooldown <= 0 && grounded) {
      // Small hops that walk it forward until it reaches its label; never a launch.
      const m = body.mass()
      const k = Math.min(1.4, fastest / HOP_SPEED)
      const forward = pos.z < BAY.zMax ? m * (0.22 + Math.random() * 0.16) * k : 0
      body.applyImpulse({ x: (Math.random() - 0.5) * m * 0.12, y: m * 0.55 * k, z: forward }, true)
      body.applyTorqueImpulse({ x: 0, y: (Math.random() - 0.5) * m * 0.02, z: (Math.random() - 0.5) * m * 0.01 }, true)
      sound.thunk({ gain: 0.35, pitch: 1.4 })
      hopCooldown = 0.14
    }
    // Safety net: if the picker ever leaves the stage, put it back.
    if (pos.y < -0.5 || Math.abs(pos.x) > 3 || pos.z > 2 || pos.z < -2.5) resetPicker()
  })

  function resetPicker() {
    body.setTranslation(start, true)
    body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true)
    body.setLinvel({ x: 0, y: 0, z: 0 }, true)
    body.setAngvel({ x: 0, y: 0, z: 0 }, true)
  }

  stage.onReset(() => {
    resetPicker()
    for (const d of drums) {
      d.angle = d.start * (TAU / d.values.length)
      d.velocity = 0
      d.held = false
    }
    grabbed = null
    dragBase = false
    showDate()
  })

  if (stage.thumbnail) {
    // Mid-gamble: the year drum spun hard, the picker hopped into the letters.
    drums[2].velocity = 24
    drums[0].velocity = -18
    setTimeout(() => stage.ready(), 3500)
  } else setTimeout(() => stage.ready(), 500)
}
