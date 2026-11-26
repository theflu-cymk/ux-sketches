import {
  ACESFilmicToneMapping,
  CanvasTexture,
  DirectionalLight,
  Fog,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PCFShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from 'three'
import { cameraFor, floorBlock, type FloorBlock } from './camera.ts'
import { mountControls } from './controls.ts'
import { createFloorText, type FloorText } from './floor-text/index.ts'
import type { SketchMeta } from './meta.ts'
import { prefersReducedMotion } from './motion.ts'
import { PALETTE } from './palette.ts'
import { createPhysics, type Physics, type Rapier } from './physics.ts'
import { createSound, type Sound } from './sound.ts'
import { hasWebGL } from './webgl.ts'

export { PALETTE } from './palette.ts'

export type StageOptions = { meta: SketchMeta; physics?: boolean; sound?: boolean }

export type Stage = {
  scene: Scene
  camera: PerspectiveCamera
  renderer: WebGLRenderer
  canvas: HTMLCanvasElement
  container: HTMLElement
  meta: SketchMeta
  reducedMotion: boolean
  thumbnail: boolean
  /** The floor text block for the current aspect (see camera.ts). */
  block: FloorBlock
  /** Runs every frame with the clamped frame time and elapsed time, in seconds. Returns an unsubscribe. */
  onFrame(cb: (dt: number, t: number) => void): () => void
  /** Runs on every resize, after the camera and block are updated. Returns an unsubscribe. */
  onResize(cb: (block: FloorBlock) => void): () => void
  /** Runs on Reset, in registration order. Returns an unsubscribe. */
  onReset(cb: () => void): () => void
  reset(): void
  /** The sketch has settled: thumbnail capture and browser checks wait for this. */
  ready(): void
  /** The floor text, with the ink surface or the letter bodies when the sketch's mode has them. */
  floor: FloorText
  /** Present when the sketch asked for physics, or uses letters mode. */
  world: Physics['world'] | null
  rapier: Rapier | null
  /** Copies a body's transform to an object after every physics step. No-op without physics. */
  bind: Physics['bind']
  unbind: Physics['unbind']
  sound: Sound
}

function paragraph(text: string) {
  const p = document.createElement('p')
  p.textContent = text
  return p
}

/** The floor text as real page text, for screen readers. Always the original wording. */
function hiddenText(container: HTMLElement, meta: SketchMeta) {
  const section = document.createElement('section')
  section.className = 'sr-only'
  section.setAttribute('aria-label', 'About this sketch')
  const h1 = document.createElement('h1')
  h1.textContent = meta.title
  section.append(
    h1,
    paragraph(`Sketch ${String(meta.number).padStart(3, '0')}, ${meta.date}.`),
    paragraph(`Component: ${meta.component}.`),
    paragraph(`Question: ${meta.question}`),
    paragraph(meta.note),
    paragraph(`Made with ${meta.tools.join(', ')}.`),
  )
  container.append(section)
}

function noWebGL(container: HTMLElement, meta: SketchMeta) {
  const box = document.createElement('div')
  box.className = 'uxs-fallback'
  const img = document.createElement('img')
  img.src = 'thumbnail.jpg'
  img.alt = meta.question
  box.append(
    paragraph('This sketch needs WebGL, which this browser has turned off.'),
    img,
    paragraph(`${meta.title}: ${meta.question} ${meta.note}`),
  )
  container.append(box)
  document.body.dataset.ready = '1'
}

/** The lit bay: floor colour in the middle, falling off to the surround so the floor has an edge. */
function floorFalloff(): CanvasTexture {
  const size = 1024
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(size / 2, size / 2, size * 0.12, size / 2, size / 2, size / 2)
  g.addColorStop(0, `#${PALETTE.floor.getHexString()}`)
  g.addColorStop(0.24, `#${PALETTE.floor.getHexString()}`)
  g.addColorStop(0.52, `#${PALETTE.surround.getHexString()}`)
  g.addColorStop(1, `#${PALETTE.surround.getHexString()}`)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const tex = new CanvasTexture(c)
  tex.colorSpace = SRGBColorSpace
  return tex
}

/** Registration marks on the floor, for the testing-rig look: thin ink crosses at the corners of the bay. */
function addRigMarks(scene: Scene) {
  const mat = new MeshBasicMaterial({ color: PALETTE.ink, transparent: true, opacity: 0.5 })
  const len = 0.16
  const w = 0.008
  const bar = (x: number, z: number, along: 'x' | 'z') => {
    const m = new Mesh(new PlaneGeometry(along === 'x' ? len : w, along === 'x' ? w : len), mat)
    m.rotation.x = -Math.PI / 2
    m.position.set(x, 0.001, z)
    scene.add(m)
  }
  for (const x of [-1.6, 1.6]) {
    for (const z of [-1.1, 0.5]) {
      bar(x, z, 'x')
      bar(x, z, 'z')
    }
  }
}

export async function createStage(container: HTMLElement, options: StageOptions): Promise<Stage | null> {
  const { meta } = options
  container.classList.add('uxs-stage')
  const thumbnail = new URLSearchParams(location.search).get('thumbnail') === '1'
  if (thumbnail) document.body.classList.add('uxs-thumbnail')
  document.title = `${meta.title} · UX Sketch ${String(meta.number).padStart(3, '0')}`
  hiddenText(container, meta)

  if (!hasWebGL()) {
    noWebGL(container, meta)
    return null
  }

  const renderer = new WebGLRenderer({ antialias: true, preserveDrawingBuffer: thumbnail })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  renderer.outputColorSpace = SRGBColorSpace
  renderer.toneMapping = ACESFilmicToneMapping
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = PCFShadowMap
  const canvas = renderer.domElement
  canvas.setAttribute('role', 'img')
  canvas.setAttribute('aria-label', `${meta.title}: ${meta.question}`)
  container.prepend(canvas)

  const scene = new Scene()
  scene.background = PALETTE.surround
  scene.fog = new Fog(PALETTE.surround, 7, 16)

  const camera = new PerspectiveCamera(32, 1, 0.05, 60)

  const floor = new Mesh(
    new PlaneGeometry(16, 16),
    new MeshStandardMaterial({ map: floorFalloff(), roughness: 0.92, metalness: 0 }),
  )
  floor.rotation.x = -Math.PI / 2
  floor.receiveShadow = true
  floor.name = 'floor'
  scene.add(floor)
  addRigMarks(scene)

  scene.add(new HemisphereLight('#f4efe8', '#2a2826', 0.9))
  const key = new DirectionalLight('#fff6ea', 2.6)
  key.position.set(-2.6, 5.5, 3.4)
  key.castShadow = true
  key.shadow.mapSize.set(2048, 2048)
  Object.assign(key.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 0.5, far: 14 })
  key.shadow.bias = -0.0004
  key.shadow.normalBias = 0.02
  scene.add(key)

  const frameCbs = new Set<(dt: number, t: number) => void>()
  const resizeCbs = new Set<(block: FloorBlock) => void>()
  const resetCbs: Array<() => void> = []

  const stage: Stage = {
    scene,
    camera,
    renderer,
    canvas,
    container,
    meta,
    reducedMotion: prefersReducedMotion(),
    thumbnail,
    block: floorBlock(16 / 9),
    floor: { mode: meta.floorText },
    world: null,
    rapier: null,
    bind: () => {},
    unbind: () => {},
    sound: createSound(),
    onFrame(cb) {
      frameCbs.add(cb)
      return () => frameCbs.delete(cb)
    },
    onResize(cb) {
      resizeCbs.add(cb)
      return () => resizeCbs.delete(cb)
    },
    onReset(cb) {
      resetCbs.push(cb)
      return () => {
        const i = resetCbs.indexOf(cb)
        if (i >= 0) resetCbs.splice(i, 1)
      }
    },
    reset() {
      for (const cb of [...resetCbs]) cb()
    },
    ready() {
      document.body.dataset.ready = '1'
    },
  }

  let lastAspectPortrait: boolean | null = null
  const resize = () => {
    const w = container.clientWidth || innerWidth
    const h = container.clientHeight || innerHeight
    const aspect = w / h
    const setup = cameraFor(aspect)
    camera.fov = setup.fov
    camera.aspect = aspect
    camera.position.set(...setup.position)
    camera.lookAt(new Vector3(...setup.target))
    camera.updateProjectionMatrix()
    renderer.setSize(w, h, false)
    stage.block = floorBlock(aspect)
    const portrait = aspect < 1
    if (portrait !== lastAspectPortrait) {
      lastAspectPortrait = portrait
      for (const cb of resizeCbs) cb(stage.block)
    }
  }
  new ResizeObserver(resize).observe(container)
  resize()

  // Physics steps before any sketch frame callback, so sketches read this frame's poses.
  const physics = options.physics || meta.floorText === 'letters' ? await createPhysics() : null
  if (physics) {
    stage.world = physics.world
    stage.rapier = physics.rapier
    stage.bind = physics.bind
    stage.unbind = physics.unbind
    stage.onFrame((dt) => physics.step(dt))
  }

  const floorText = await createFloorText(scene, meta, physics, stage.block)
  stage.floor = floorText.floor
  stage.onReset(() => floorText.reset())
  stage.onResize((b) => void floorText.rebuild(b))

  if (!thumbnail) {
    mountControls(container, {
      meta,
      soundAvailable: !!options.sound,
      onReset: () => stage.reset(),
      onSound: (on) => stage.sound.setEnabled(on),
    })
  }

  let last = performance.now()
  let elapsed = 0
  const loop = (now: number) => {
    const dt = Math.min(Math.max((now - last) / 1000, 0), 1 / 30)
    last = now
    elapsed += dt
    for (const cb of frameCbs) cb(dt, elapsed)
    renderer.render(scene, camera)
    requestAnimationFrame(loop)
  }
  document.addEventListener('visibilitychange', () => {
    last = performance.now()
  })
  requestAnimationFrame((now) => {
    last = now
    loop(now)
  })

  return stage
}
