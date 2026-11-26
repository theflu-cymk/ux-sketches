import { BoxGeometry, CylinderGeometry, Group, Mesh, MeshStandardMaterial } from 'three'
import { Text } from 'troika-three-text'
import { CAP_HEIGHT, FONTS, PALETTE, createDrag, createStage, type SketchMeta } from '@ux-sketches/stage'
import '@ux-sketches/stage/stage.css'
import meta from './sketch.json' with { type: 'json' }
import { LEVER, initialLever, leverStep } from './lever.ts'

const stage = await createStage(document.getElementById('stage')!, { meta: meta as SketchMeta, sound: true })

if (stage) {
  const { scene, sound } = stage
  const shadow = (m: Mesh) => ((m.castShadow = true), (m.receiveShadow = true), m)

  // The housing: a heavy base with a slot, 0 and 1 marked on top, and a lamp.
  const housing = new Group()
  scene.add(housing)
  const body = new MeshStandardMaterial({ color: '#2b2b2e', roughness: 0.55, metalness: 0.2 })
  housing.add(shadow(new Mesh(new BoxGeometry(1.1, 0.16, 0.46), body))).children[0].position.set(0, 0.08, 0)
  const slot = new Mesh(new BoxGeometry(0.64, 0.004, 0.1), new MeshStandardMaterial({ color: '#111113', roughness: 0.9 }))
  slot.position.set(0, 0.162, 0)
  housing.add(slot)
  for (const [label, x] of [['0', -0.42], ['1', 0.42]] as const) {
    const t = new Text()
    t.text = label
    t.font = FONTS.bold
    t.fontSize = 0.07 / CAP_HEIGHT
    t.color = '#d8d3ca'
    t.anchorX = 'center'
    t.anchorY = 'middle'
    t.rotation.x = -Math.PI / 2
    t.position.set(x, 0.161, 0.13)
    t.sync()
    housing.add(t)
  }
  const lampOff = new MeshStandardMaterial({ color: '#4a3a33', roughness: 0.4 })
  const lampOn = new MeshStandardMaterial({ color: PALETTE.accent, emissive: PALETTE.accent, emissiveIntensity: 2.2, roughness: 0.3 })
  const lamp = new Mesh(new CylinderGeometry(0.04, 0.04, 0.02, 24), lampOff)
  lamp.position.set(0.42, 0.17, -0.12)
  housing.add(lamp)

  // The lever: a heavy bar on a pivot at the slot, with a grip on top.
  const pivot = new Group()
  pivot.position.set(0, 0.16, 0)
  housing.add(pivot)
  const bar = shadow(new Mesh(new BoxGeometry(0.12, 0.62, 0.12), new MeshStandardMaterial({ color: '#3d3d42', roughness: 0.35, metalness: 0.5 })))
  bar.position.y = 0.31
  const grip = shadow(new Mesh(new BoxGeometry(0.26, 0.15, 0.26), new MeshStandardMaterial({ color: PALETTE.tile, roughness: 0.6 })))
  grip.position.y = 0.66
  pivot.add(bar, grip)

  // A polite status line, so the state is announced as well as lit.
  const status = document.createElement('p')
  status.className = 'sr-only'
  status.setAttribute('aria-live', 'polite')
  status.textContent = 'The switch is off.'
  stage.container.append(status)

  let lever = initialLever()
  if (stage.thumbnail) lever = { angle: LEVER.rest, velocity: 0, side: 'on' }
  let pointer: number | null = null
  let hop = 0

  createDrag(stage, {
    targets: [bar, grip],
    plane: 'vertical',
    onMove(point) {
      pointer = Math.atan2(point.x - housing.position.x, point.y - 0.16)
    },
    onEnd() {
      pointer = null
    },
  })

  stage.onFrame((dt, t) => {
    const r = leverStep(lever, { pointer, reduced: stage.reducedMotion }, dt)
    lever = r.state
    if (r.flipped) {
      sound.click({ pitch: lever.side === 'on' ? 1.1 : 0.9 })
      status.textContent = `The switch is ${lever.side}.`
    }
    if (r.impact > 0.6) {
      sound.thunk({ gain: Math.min(1, r.impact / 4) })
      if (!stage.reducedMotion) hop = Math.min(0.025, r.impact * 0.004)
    }
    pivot.rotation.z = -lever.angle
    lamp.material = lever.side === 'on' ? lampOn : lampOff

    // The housing strains while you pull against the motor, and jumps when the lever slams home.
    const strain = pointer === null ? 0 : Math.min(1, Math.abs(pointer - lever.angle))
    const shake = stage.reducedMotion ? 0 : Math.sin(t * 75) * 0.005 * strain
    hop *= Math.exp(-dt * 18)
    housing.position.set(shake, hop, 0)
  })

  stage.onReset(() => {
    lever = initialLever()
    pointer = null
    hop = 0
    status.textContent = 'The switch is off.'
  })

  setTimeout(() => stage.ready(), 400)
}
