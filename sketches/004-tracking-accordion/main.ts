import { BoxGeometry, Mesh, MeshStandardMaterial } from 'three'
import { Text } from 'troika-three-text'
import { CAP_HEIGHT, FONTS, MONO_ADVANCE, PALETTE, createDrag, createStage, type SketchMeta } from '@ux-sketches/stage'
import '@ux-sketches/stage/stage.css'
import meta from './sketch.json' with { type: 'json' }
import { chainStep, restChain, trackingOf } from './chain.ts'

const stage = await createStage(document.getElementById('stage')!, { meta: meta as SketchMeta, sound: true })

if (stage) {
  const { scene, sound } = stage
  const WORD = 'TRACKING'
  const FONT_SIZE = 0.2
  const ADVANCE = FONT_SIZE * MONO_ADVANCE
  const BLOCK = { w: ADVANCE * 0.9, h: FONT_SIZE * 1.3, d: 0.07 }
  const RAIL_Y = 0.06
  const shadow = <T extends Mesh>(m: T) => ((m.castShadow = true), (m.receiveShadow = true), m)

  // The rail the letters slide on.
  const railMat = new MeshStandardMaterial({ color: '#2b2b2e', roughness: 0.5, metalness: 0.3 })
  const rail = shadow(new Mesh(new BoxGeometry(2.2, 0.04, 0.12), railMat))
  rail.position.set(0, RAIL_Y - 0.02, 0)
  scene.add(rail)

  // Readout on a plate in front of the rail.
  const plate = shadow(new Mesh(new BoxGeometry(0.62, 0.02, 0.12), railMat))
  plate.position.set(0, 0.01, 0.2)
  scene.add(plate)
  const readout = new Text()
  readout.font = FONTS.bold
  readout.fontSize = 0.04 / CAP_HEIGHT
  readout.color = PALETTE.tile
  readout.anchorX = 'center'
  readout.anchorY = 'middle'
  readout.rotation.x = -Math.PI / 2
  readout.position.set(0, 0.021, 0.2)
  scene.add(readout)

  // The letters: upright type blocks with the glyph on the front face.
  const blockGeo = new BoxGeometry(BLOCK.w, BLOCK.h, BLOCK.d)
  const blockMat = new MeshStandardMaterial({ color: PALETTE.tile, roughness: 0.6 })
  const glyphMat = new MeshStandardMaterial({ color: PALETTE.ink, roughness: 0.8 })
  const blocks = [...WORD].map((ch, i) => {
    const m = shadow(new Mesh(blockGeo, blockMat))
    m.userData.letter = i
    const glyph = new Text()
    glyph.text = ch
    glyph.font = FONTS.bold
    glyph.fontSize = FONT_SIZE
    glyph.material = glyphMat
    glyph.color = PALETTE.ink
    glyph.anchorX = 'center'
    glyph.anchorY = 'middle'
    glyph.position.set(0, 0, BLOCK.d / 2 + 0.001)
    glyph.sync()
    m.add(glyph)
    scene.add(m)
    return m
  })

  const status = document.createElement('p')
  status.className = 'sr-only'
  status.setAttribute('aria-live', 'polite')
  stage.container.append(status)

  let chain = restChain(WORD.length, ADVANCE)
  let hold: { index: number; x: number } | null = null
  let grabOffset = 0
  let shown = NaN
  let lastTickStep = 0

  const fmt = (t: number) => `${t > 0 ? '+' : t < 0 ? '−' : '±'}${Math.abs(t)}`
  const announce = () => {
    status.textContent = `Tracking ${fmt(Math.round(trackingOf(chain, ADVANCE, FONT_SIZE) / 10) * 10)}.`
  }

  createDrag(stage, {
    targets: blocks,
    plane: 'vertical',
    onStart(hit) {
      let o: typeof hit.object | null = hit.object
      while (o && o.userData.letter === undefined) o = o.parent
      if (!o) return
      const index = o.userData.letter as number
      grabOffset = chain.x[index] - hit.point.x
      hold = { index, x: chain.x[index] }
    },
    onMove(point) {
      if (hold) hold = { index: hold.index, x: Math.max(-1.05, Math.min(1.05, point.x + grabOffset)) }
    },
    onEnd() {
      hold = null
      // The word springs back to its natural fit, so say both.
      const released = Math.round(trackingOf(chain, ADVANCE, FONT_SIZE) / 10) * 10
      status.textContent = `Released at tracking ${fmt(released)}; it springs back to ${fmt(0)}.`
    },
  })

  stage.onFrame((dt) => {
    chain = chainStep(chain, hold, dt, { advance: ADVANCE, reduced: stage.reducedMotion })
    blocks.forEach((b, i) => {
      b.position.set(chain.x[i], RAIL_Y + BLOCK.h / 2, 0)
      // The blocks lean into their own motion, like type sliding in a stick.
      b.rotation.z = stage.reducedMotion ? 0 : Math.max(-0.35, Math.min(0.35, -chain.v[i] * 0.06))
    })
    // Shown in steps of 5, as type tools step tracking, so the last flicker of a settling spring reads as 0.
    const tracking = Math.round(trackingOf(chain, ADVANCE, FONT_SIZE) / 5) * 5
    if (tracking !== shown) {
      shown = tracking
      readout.text = `TRACKING ${fmt(tracking)}`
      readout.sync()
      const step = Math.trunc(tracking / 50)
      if (step !== lastTickStep) {
        sound.tick({ pitch: 0.7 + Math.min(1.5, Math.abs(tracking) / 600) })
        lastTickStep = step
      }
    }
  })

  stage.onReset(() => {
    chain = restChain(WORD.length, ADVANCE)
    hold = null
    announce()
  })

  announce()
  if (stage.thumbnail) {
    // Mid-stretch: the last letter pulled out to the right.
    hold = { index: WORD.length - 1, x: chain.rest[WORD.length - 1] + 0.42 }
    setTimeout(() => stage.ready(), 1500)
  } else setTimeout(() => stage.ready(), 400)
}
