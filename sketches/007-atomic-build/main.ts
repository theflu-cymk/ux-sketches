import {
  BufferGeometry,
  CanvasTexture,
  CircleGeometry,
  Color,
  Group,
  LineBasicMaterial,
  LineLoop,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  RingGeometry,
  SRGBColorSpace,
  Shape,
  Vector3,
  type Material,
} from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { Text } from 'troika-three-text'
import { FONTS, PALETTE, createStage, type SketchMeta } from '@ux-sketches/stage'
import '@ux-sketches/stage/stage.css'
import meta from './sketch.json' with { type: 'json' }
import { PHONE, STAGES, shotFor, step } from './stages.ts'

const stage = await createStage(document.getElementById('stage')!, { meta: meta as SketchMeta, sound: true })

if (stage) {
  const { scene, camera, sound } = stage
  const smooth = (a: number, b: number, x: number) => {
    const t = Math.max(0, Math.min(1, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)
  }
  const GREY = new Color('#8f8c87')
  const screen = new Group()
  scene.add(screen)

  // ---- The phone body and screen (appear only at the page stage).
  const body = new Mesh(new RoundedBoxGeometry(PHONE.width + 0.06, PHONE.height + 0.06, 0.05, 6, 0.08), new MeshStandardMaterial({ color: '#141416', roughness: 0.35, metalness: 0.5, transparent: true, opacity: 0 }))
  body.position.set(0, PHONE.bottom + PHONE.height / 2, -0.03)
  body.castShadow = true
  screen.add(body)
  const wallCanvas = document.createElement('canvas')
  wallCanvas.width = 256
  wallCanvas.height = 512
  const wctx = wallCanvas.getContext('2d')!
  const grad = wctx.createLinearGradient(0, 0, 256, 512)
  grad.addColorStop(0, '#ff8a3d')
  grad.addColorStop(0.5, '#d14b7a')
  grad.addColorStop(1, '#3b2d7a')
  wctx.fillStyle = grad
  wctx.fillRect(0, 0, 256, 512)
  const wallTex = new CanvasTexture(wallCanvas)
  wallTex.colorSpace = SRGBColorSpace
  const wallpaper = new Mesh(new PlaneGeometry(PHONE.width, PHONE.height), new MeshBasicMaterial({ map: wallTex, transparent: true, opacity: 0 }))
  wallpaper.position.set(0, PHONE.bottom + PHONE.height / 2, -0.004)
  screen.add(wallpaper)

  /** How far into the template stage (grey wireframe blocks) we are: 0 outside it, 1 at its centre. */
  const template = (p: number) => smooth(2.5, 3, p) * (1 - smooth(3.5, 4, p))
  const roundedRect = (w: number, h: number, r: number) => {
    const sh = new Shape()
    sh.moveTo(-w / 2 + r, -h / 2)
    sh.lineTo(w / 2 - r, -h / 2)
    sh.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r)
    sh.lineTo(w / 2, h / 2 - r)
    sh.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2)
    sh.lineTo(-w / 2 + r, h / 2)
    sh.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r)
    sh.lineTo(-w / 2, -h / 2 + r)
    sh.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2)
    return new BufferGeometry().setFromPoints(sh.getPoints(12))
  }

  // ---- Helpers: everything fades and greys out by stage.
  type Part = { obj: Mesh | Text; mat: MeshStandardMaterial | MeshBasicMaterial; color: Color; show: (p: number) => number; grey?: boolean }
  const parts: Part[] = []
  const track = (obj: Mesh | Text, mat: MeshStandardMaterial | MeshBasicMaterial, show: Part['show'], grey = true) => {
    mat.transparent = true
    parts.push({ obj, mat, color: mat.color.clone(), show, grey })
    return obj
  }
  const label = (text: string, size: number, color: string, weight: 'medium' | 'bold' = 'medium') => {
    const t = new Text()
    t.text = text
    t.font = FONTS[weight]
    t.fontSize = size
    const m = new MeshBasicMaterial({ color })
    t.material = m
    t.anchorX = 'center'
    t.anchorY = 'middle'
    t.sync()
    return { t, m }
  }

  // ---- Icons: rounded tiles with original glyphs and generic labels. Atoms first: loose, scattered chips.
  const NAMES = ['Inbox', 'Sketch', 'Alarm', 'Route', 'Tunes', 'Album', 'Lens', 'Sky', 'Docs', 'Feed', 'Cards', 'Pulse', 'Shelf', 'Sums', 'Focus', 'Prefs']
  const COLORS = ['#ff5a1f', '#2bb3a3', '#6c4fd8', '#c7e04a', '#f2a541', '#e5487b', '#1f6f8b', '#7ac4f0', '#9b5de5', '#f15bb5', '#00a878', '#fee440', '#ff8c61', '#3a86ff', '#8ac926', '#495057']
  const GLYPHS = ['ring', 'bar', 'ring', 'tri', 'dot', 'dot', 'ring', 'dot', 'bar', 'bar', 'bar', 'tri', 'bar', 'dot', 'ring', 'ring']
  const ICON = 0.12
  const iconSpot = (i: number): [number, number] => [-0.24 + (i % 4) * 0.16, 1.33 - Math.floor(i / 4) * 0.19]
  const DOCK_Y = 0.22
  type Icon = { group: Group; home: Vector3; scatter: Vector3; spin: number }
  const icons: Icon[] = []
  const makeIcon = (i: number, x: number, y: number, withLabel: boolean, name: string) => {
    const g = new Group()
    const tileMat = new MeshStandardMaterial({ color: COLORS[i % COLORS.length], roughness: 0.4 })
    const tile = new Mesh(new RoundedBoxGeometry(ICON, ICON, 0.02, 4, 0.03), tileMat)
    tile.castShadow = true
    g.add(track(tile, tileMat, () => 1))
    const glyphMat = new MeshStandardMaterial({ color: '#ffffff', roughness: 0.5 })
    const kind = GLYPHS[i % GLYPHS.length]
    const glyph =
      kind === 'ring' ? new Mesh(new RingGeometry(0.02, 0.032, 24), glyphMat)
      : kind === 'tri' ? new Mesh(new CircleGeometry(0.034, 3), glyphMat)
      : kind === 'bar' ? new Mesh(new PlaneGeometry(0.055, 0.014), glyphMat)
      : new Mesh(new CircleGeometry(0.026, 24), glyphMat)
    glyph.position.z = 0.0105
    g.add(track(glyph, glyphMat, (p) => smooth(0.3, 0.9, p) * (1 - template(p))))
    if (withLabel) {
      const { t, m } = label(name, 0.024, '#ffffff')
      t.position.set(0, -0.085, 0.002)
      g.add(track(t, m, (p) => smooth(0.5, 1, p) * (1 - template(p))))
    }
    const home = new Vector3(x, y, 0.012)
    const a = i * 2.39
    const scatter = home.clone().add(new Vector3(Math.cos(a) * 0.09, Math.sin(a) * 0.07, 0.05 + (i % 3) * 0.03))
    g.position.copy(home)
    screen.add(g)
    icons.push({ group: g, home, scatter, spin: ((i % 5) - 2) * 0.35 })
  }
  NAMES.forEach((n, i) => makeIcon(i, ...iconSpot(i), true, n))
  for (let i = 0; i < 4; i++) makeIcon(16 + i, -0.24 + i * 0.16, DOCK_Y, false, '')

  // Loose atoms: colour chips and type samples that only exist before the molecules form.
  const atoms = new Group()
  screen.add(atoms)
  COLORS.slice(0, 8).forEach((c, i) => {
    const m = new MeshStandardMaterial({ color: c, roughness: 0.5 })
    const chip = new Mesh(new PlaneGeometry(0.05, 0.05), m)
    chip.position.set(-0.3 + (i % 4) * 0.07, 1.42 - Math.floor(i / 4) * 0.07, 0.07)
    chip.rotation.z = (i - 4) * 0.12
    atoms.add(track(chip, m, (p) => 1 - smooth(0.6, 1, p), false))
  })
  for (const [s, x, y, w] of [['Aa', -0.06, 1.42, 'bold'], ['Aa', 0.04, 1.42, 'medium'], ['9', 0.12, 1.4, 'bold']] as const) {
    const { t, m } = label(s, 0.05, '#1d1c1a', w)
    t.position.set(x, y, 0.07)
    atoms.add(track(t, m, (p) => 1 - smooth(0.6, 1, p), false))
  }

  // ---- Status bar: clock, signal bars, battery (molecules), on a bar (organism).
  const { t: clock, m: clockMat } = label('10:08', 0.032, '#ffffff', 'bold')
  clock.position.set(-0.22, PHONE.bottom + PHONE.height - 0.05, 0.01)
  screen.add(track(clock, clockMat, (p) => smooth(0.5, 1, p)))
  for (let i = 0; i < 4; i++) {
    const m = new MeshStandardMaterial({ color: '#ffffff' })
    const bar = new Mesh(new PlaneGeometry(0.008, 0.008 + i * 0.006), m)
    bar.position.set(0.16 + i * 0.013, PHONE.bottom + PHONE.height - 0.055 + i * 0.003, 0.01)
    screen.add(track(bar, m, () => 1))
  }
  const battY = PHONE.bottom + PHONE.height - 0.05
  const batt = new LineLoop(roundedRect(0.036, 0.017, 0.004), new LineBasicMaterial({ color: '#ffffff' }))
  batt.position.set(0.268, battY, 0.01)
  screen.add(batt)
  const levelMat = new MeshStandardMaterial({ color: '#ffffff' })
  const level = new Mesh(new PlaneGeometry(0.024, 0.009), levelMat)
  level.position.set(0.264, battY, 0.01)
  screen.add(track(level, levelMat, () => 1))
  const nubMat = new MeshStandardMaterial({ color: '#ffffff' })
  const nub = new Mesh(new PlaneGeometry(0.003, 0.007), nubMat)
  nub.position.set(0.289, battY, 0.01)
  screen.add(track(nub, nubMat, () => 1))

  // ---- Organisms: the dock plate and page dots.
  const dockMat = new MeshStandardMaterial({ color: '#ffffff', roughness: 0.3, transparent: true })
  const dock = new Mesh(new RoundedBoxGeometry(PHONE.width - 0.06, 0.17, 0.01, 4, 0.05), dockMat)
  dock.position.set(0, DOCK_Y, 0.002)
  screen.add(track(dock, dockMat, (p) => smooth(1.4, 2, p) * 0.35, true))
  for (let i = 0; i < 3; i++) {
    const m = new MeshStandardMaterial({ color: '#ffffff' })
    const dot = new Mesh(new CircleGeometry(0.008, 16), m)
    dot.position.set(-0.025 + i * 0.025, 0.4, 0.01)
    screen.add(track(dot, m, (p) => smooth(1.4, 2, p) * (i === 0 ? 1 : 0.5)))
  }

  // ---- Organism: a widget, a wide card with a big number and two bars (its molecules).
  const widgetMat = new MeshStandardMaterial({ color: '#ffffff', roughness: 0.4 })
  const widget = new Mesh(new RoundedBoxGeometry(PHONE.width - 0.1, 0.15, 0.015, 4, 0.04), widgetMat)
  widget.position.set(0, 0.53, 0.008)
  screen.add(track(widget, widgetMat, (p) => smooth(1.4, 2, p) * 0.9))
  const { t: widgetNum, m: widgetNumMat } = label('26', 0.07, '#1d1c1a', 'bold')
  widgetNum.position.set(-0.2, 0.53, 0.018)
  screen.add(track(widgetNum, widgetNumMat, (p) => smooth(0.6, 1.1, p) * (1 - template(p))))
  for (const [w, y] of [[0.3, 0.555], [0.22, 0.505]] as const) {
    const m = new MeshStandardMaterial({ color: '#9b968e' })
    const bar = new Mesh(new PlaneGeometry(w, 0.022), m)
    bar.position.set(-0.07 + w / 2, y, 0.017)
    screen.add(track(bar, m, (p) => smooth(0.6, 1.1, p)))
  }

  // ---- Template: a wire outline of the screen.
  const outlineMat = new LineBasicMaterial({ color: '#5d5a55', transparent: true })
  const outline = new LineLoop(roundedRect(PHONE.width, PHONE.height, 0.07), outlineMat)
  outline.position.set(0, PHONE.bottom + PHONE.height / 2, 0.001)
  screen.add(outline)

  // ---- Controls: Space / arrows, tap, and a scrub bar.
  const status = document.createElement('p')
  status.className = 'sr-only'
  status.setAttribute('aria-live', 'polite')
  stage.container.append(status)
  const extra = document.createElement('div')
  extra.className = 'uxs-extra'
  const scrubLabel = document.createElement('label')
  scrubLabel.className = 'uxs-button'
  scrubLabel.style.display = 'flex'
  scrubLabel.style.alignItems = 'center'
  scrubLabel.style.gap = '8px'
  const scrubText = document.createElement('span')
  const scrub = document.createElement('input')
  scrub.type = 'range'
  scrub.min = '0'
  scrub.max = String(STAGES.length - 1)
  scrub.step = '1'
  scrub.value = '0'
  scrub.setAttribute('aria-label', 'Build stage')
  scrubLabel.append(scrubText, scrub)
  if (!stage.thumbnail) {
    extra.append(scrubLabel)
    stage.container.append(extra)
  }

  let target = 0
  let p = 0
  const setStage = (n: number) => {
    const next = Math.max(0, Math.min(STAGES.length - 1, n))
    if (next === target) return
    target = next
    scrub.value = String(target)
    scrub.setAttribute('aria-valuetext', STAGES[target])
    scrubText.textContent = STAGES[target]
    status.textContent = `${STAGES[target]}${target === STAGES.length - 1 ? ': a phone home screen.' : '.'}`
    sound.tone(330 * 2 ** (target / 4), 0.18, { gain: 0.15 })
  }
  scrubText.textContent = STAGES[0]
  scrub.setAttribute('aria-valuetext', STAGES[0])
  status.textContent = 'ATOMS.'
  scrub.addEventListener('input', () => setStage(Number(scrub.value)))
  document.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLButtonElement) return
    if (e.key === ' ' || e.key === 'ArrowRight') (e.preventDefault(), setStage(step(target, 1)))
    if (e.key === 'ArrowLeft') (e.preventDefault(), setStage(step(target, -1)))
  })
  stage.canvas.addEventListener('click', () => setStage(target === STAGES.length - 1 ? 0 : step(target, 1)))

  // ---- Every frame: ease the stage value and the camera, then dress every part for it.
  const camPos = new Vector3()
  const camTarget = new Vector3()
  const shotPos = new Vector3()
  const shotTarget = new Vector3()
  let fov = 22
  let first = true
  stage.onFrame((dt) => {
    p = stage.reducedMotion ? target : p + (target - p) * Math.min(1, dt * 2.2)
    if (Math.abs(target - p) < 0.002) p = target
    const aspect = camera.aspect
    const shot = shotFor(target, aspect)
    const k = stage.reducedMotion || first ? 1 : Math.min(1, dt * 2.4)
    first = false
    camPos.lerp(shotPos.set(...shot.position), k)
    camTarget.lerp(shotTarget.set(...shot.target), k)
    fov += (shot.fov - fov) * k
    camera.fov = fov
    camera.position.copy(camPos)
    camera.lookAt(camTarget)
    camera.updateProjectionMatrix()

    const assembled = smooth(0, 1, p)
    for (const ic of icons) {
      ic.group.position.lerpVectors(ic.scatter, ic.home, assembled)
      ic.group.rotation.z = ic.spin * (1 - assembled)
    }
    const greyness = smooth(2.5, 3, p) * (1 - smooth(3.5, 4, p))
    for (const part of parts) {
      const o = part.show(p)
      part.mat.opacity = o
      part.obj.visible = o > 0.01
      part.mat.color.copy(part.color)
      if (part.grey) part.mat.color.lerp(GREY, greyness)
    }
    outlineMat.opacity = template(p)
    outline.visible = outlineMat.opacity > 0.01
    const page = smooth(3.5, 4, p)
    ;(wallpaper.material as MeshBasicMaterial).opacity = page
    ;(body.material as MeshStandardMaterial).opacity = page
    ;(body.material as Material).transparent = page < 1
  })

  stage.onReset(() => setStage(0))

  if (stage.thumbnail) {
    target = p = 1
    setTimeout(() => stage.ready(), 900)
  } else setTimeout(() => stage.ready(), 400)
}
