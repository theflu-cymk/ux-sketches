import { BoxGeometry, ConeGeometry, CylinderGeometry, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, Vector3, type Material } from 'three'
import { Text } from 'troika-three-text'
import { CAP_HEIGHT, FONTS, PALETTE, cameraFor, createStage, type SketchMeta } from '@ux-sketches/stage'
import '@ux-sketches/stage/stage.css'
import meta from './sketch.json' with { type: 'json' }
import { BEATS_PER_LEVEL, BPM, LEVELS, beatAt, flexLayout, springOut, type FlexItem } from './journey.ts'

const stage = await createStage(document.getElementById('stage')!, { meta: meta as SketchMeta, sound: true })

if (stage) {
  const { scene, camera, sound } = stage
  const COUNT = LEVELS.length
  const BEAT = 60 / BPM
  /** The current level always fills about this much of the stage, in metres. */
  const FIT = { w: 1.7, h: 0.78 }
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t
  const ease = (t: number) => t * t * (3 - 2 * t)

  // The whole composition is laid out once, in its final frame, from the box model out to the screens.
  // `root` is shrunk and shifted so the current level sits on the floor at about FIT size: the camera
  // "pulls back" by the world getting smaller.
  const root = new Group()
  scene.add(root)
  const shadow = <T extends Mesh>(m: T) => ((m.castShadow = true), (m.receiveShadow = true), m)
  const mat = (color: string, opts: Partial<{ opacity: number; rough: number }> = {}) =>
    new MeshStandardMaterial({ color, roughness: opts.rough ?? 0.6, transparent: opts.opacity !== undefined, opacity: opts.opacity ?? 1, depthWrite: opts.opacity === undefined })

  /** A slab from x0..x1, y0..y1 with its front face at depth z, `d` thick. */
  const slab = (x0: number, x1: number, y0: number, y1: number, z: number, d: number, m: Material) => {
    const mesh = shadow(new Mesh(new BoxGeometry(Math.max(1e-4, x1 - x0), Math.max(1e-4, y1 - y0), d), m))
    mesh.position.set((x0 + x1) / 2, (y0 + y1) / 2, z - d / 2)
    return mesh
  }
  /** An outline frame of four bars, `t` wide. */
  const frame = (x0: number, x1: number, y0: number, y1: number, z: number, t: number, d: number, m: Material) => {
    const g = new Group()
    g.add(slab(x0, x1, y1 - t, y1, z, d, m), slab(x0, x1, y0, y0 + t, z, d, m), slab(x0, x0 + t, y0, y1, z, d, m), slab(x1 - t, x1, y0, y1, z, d, m))
    return g
  }
  const label = (text: string, size: number, color: string, x: number, y: number, z: number) => {
    const t = new Text()
    t.text = text
    t.font = FONTS.bold
    t.fontSize = size / CAP_HEIGHT
    t.color = color
    t.anchorX = 'center'
    t.anchorY = 'bottom'
    t.position.set(x, y, z)
    t.sync()
    return t
  }

  const ink = mat('#1d1c1a')
  const paper = mat(`#${PALETTE.tile.getHexString()}`)
  const bars = mat('#9b968e')
  const foam = mat('#ffb27a', { rough: 0.95 })
  const shell = new MeshBasicMaterial({ color: '#5ea7ff', transparent: true, opacity: 0.18, depthWrite: false })
  const accent = mat(`#${PALETTE.accent.getHexString()}`, { rough: 0.4 })

  // ---- Levels. Each level adds its own parts in a group that pivots on the previous level's centre, so it
  // can spring out from there; bounds are (x0, x1, y0, y1) in the final frame.
  type Bounds = [number, number, number, number]
  type Level = { group: Group; bounds: Bounds }
  const levels: Level[] = []
  const addLevel = (bounds: Bounds, build: (g: Group) => void) => {
    const prev = levels.at(-1)?.bounds ?? bounds
    const pivot = new Vector3((prev[0] + prev[1]) / 2, (prev[2] + prev[3]) / 2, 0)
    const outer = new Group()
    outer.position.copy(pivot)
    const inner = new Group()
    inner.position.copy(pivot).multiplyScalar(-1)
    outer.add(inner)
    build(inner)
    root.add(outer)
    levels.push({ group: outer, bounds })
  }

  // 0 content · 1 padding · 2 border · 3 margin: the box model, centred on (0, 0).
  addLevel([-0.1, 0.1, -0.05, 0.05], (g) => {
    g.add(slab(-0.1, 0.1, -0.05, 0.05, 0.03, 0.02, paper))
    g.add(slab(-0.08, 0.06, 0.012, 0.026, 0.031, 0.002, bars), slab(-0.08, 0.02, -0.018, -0.004, 0.031, 0.002, bars))
  })
  addLevel([-0.14, 0.14, -0.09, 0.09], (g) => g.add(frame(-0.14, 0.14, -0.09, 0.09, 0.02, 0.04, 0.02, foam)))
  addLevel([-0.15, 0.15, -0.1, 0.1], (g) => g.add(frame(-0.15, 0.15, -0.1, 0.1, 0.025, 0.01, 0.04, ink)))
  addLevel([-0.19, 0.19, -0.14, 0.14], (g) => g.add(slab(-0.19, 0.19, -0.14, 0.14, 0.03, 0.06, shell)))

  // 4 border-box vs content-box: the same width set, two different outer sizes.
  addLevel([-0.19, 0.67, -0.14, 0.2], (g) => {
    const cx = 0.43
    g.add(slab(cx - 0.15, cx + 0.15, -0.05, 0.05, 0.03, 0.02, paper))
    g.add(frame(cx - 0.19, cx + 0.19, -0.09, 0.09, 0.02, 0.04, 0.02, foam))
    g.add(frame(cx - 0.2, cx + 0.2, -0.1, 0.1, 0.025, 0.01, 0.04, ink))
    g.add(slab(cx - 0.24, cx + 0.24, -0.14, 0.14, 0.03, 0.06, shell))
    g.add(label('border-box', 0.022, '#1d1c1a', 0, 0.145, 0.04), label('content-box', 0.022, '#1d1c1a', cx, 0.145, 0.04))
  })

  // 5 block vs inline: a document panel; full-width blocks stack, inline chips flow along a line.
  addLevel([-0.27, 0.75, -0.22, 0.62], (g) => {
    g.add(slab(-0.27, 0.75, -0.22, 0.62, -0.04, 0.02, paper))
    g.add(slab(-0.23, 0.71, 0.24, 0.32, 0.0, 0.02, bars), slab(-0.23, 0.71, 0.36, 0.44, 0.0, 0.02, bars))
    let x = -0.23
    for (const w of [0.12, 0.2, 0.08, 0.16, 0.1, 0.14]) {
      g.add(slab(x, x + w, 0.5, 0.56, 0.0, 0.02, accent))
      x += w + 0.03
    }
    g.add(label('block', 0.022, '#1d1c1a', 0.24, 0.445, 0.01), label('inline', 0.022, '#1d1c1a', 0.24, 0.565, 0.01))
  })

  // 6–13 flex: items B and C beside the document (item A), inside a container that lays them out.
  const PAD = 0.12
  const GAP = 0.12
  const A = { x0: -0.27, w: 1.02 }
  const itemsY = [-0.22, 0.62] as const
  const container = { x0: A.x0 - PAD, y0: itemsY[0] - PAD }
  const basis: FlexItem[] = [
    { basis: A.w, grow: 0, shrink: 0 },
    { basis: 0.6, grow: 1, shrink: 1 },
    { basis: 0.6, grow: 2, shrink: 2 },
  ]
  const innerBasis = basis.reduce((s, i) => s + i.basis, 0) + GAP * 2
  const containerW = { basis: innerBasis + 2 * PAD, grow: innerBasis + 2 * PAD + 0.8, shrink: innerBasis + 2 * PAD - 0.5 }
  const itemMats = [mat('#2bb3a3'), mat('#6c4fd8')]
  const unit = new BoxGeometry(1, 1, 0.04)
  const itemB = shadow(new Mesh(unit, itemMats[0]))
  const itemC = shadow(new Mesh(unit, itemMats[1]))
  const placeItem = (m: Mesh, x0: number, w: number, y0: number, y1: number) => {
    m.scale.set(Math.max(1e-4, w), Math.max(1e-4, y1 - y0), 1)
    m.position.set(x0 + w / 2, (y0 + y1) / 2, -0.04)
  }
  const basisRight = container.x0 + containerW.basis
  const growRight = container.x0 + containerW.grow
  addLevel([A.x0, basisRight - PAD, itemsY[0], itemsY[1] + 0.08], (g) => {
    g.add(itemB, itemC)
    g.add(label('flex items', 0.03, '#1d1c1a', (A.x0 + basisRight - PAD) / 2, itemsY[1] + 0.02, 0.01))
  })
  const containerTop = itemsY[1] + PAD
  const containerFill = shadow(new Mesh(new BoxGeometry(1, 1, 0.02), mat('#e8e2d8')))
  const containerEdge = new Group()
  addLevel([container.x0, basisRight, container.y0, containerTop], (g) => g.add(containerFill, containerEdge))
  let edgeKey = ''
  const setContainer = (x1: number, y1: number) => {
    containerFill.scale.set(x1 - container.x0, y1 - container.y0, 1)
    containerFill.position.set((container.x0 + x1) / 2, (container.y0 + y1) / 2, -0.09)
    const key = `${x1.toFixed(3)}:${y1.toFixed(3)}`
    if (key === edgeKey) return
    edgeKey = key
    containerEdge.clear()
    containerEdge.add(frame(container.x0, x1, container.y0, y1, -0.06, 0.02, 0.03, ink))
  }

  // 8 axes: an arrow along the main axis, one across it.
  addLevel([container.x0 - 0.12, basisRight + 0.25, container.y0 - 0.15, containerTop + 0.25], (g) => {
    const arrow = (len: number, along: 'x' | 'y', x: number, y: number, text: string) => {
      const a = new Group()
      const shaft = shadow(new Mesh(new CylinderGeometry(0.012, 0.012, len, 12), accent))
      const head = shadow(new Mesh(new ConeGeometry(0.035, 0.08, 16), accent))
      shaft.position.y = len / 2
      head.position.y = len + 0.04
      a.add(shaft, head)
      if (along === 'x') a.rotation.z = -Math.PI / 2
      a.position.set(x, y, 0.06)
      const color = `#${PALETTE.accent.getHexString()}`
      g.add(a, along === 'x' ? label(text, 0.04, color, x + len / 2, y + 0.02, 0.06) : label(text, 0.04, color, x + 0.2, y + len + 0.06, 0.06))
    }
    arrow(basisRight - container.x0 - 0.1, 'x', container.x0, container.y0 - 0.08, 'main axis')
    arrow(containerTop - container.y0 - 0.1, 'y', container.x0 - 0.06, container.y0, 'cross axis')
  })

  // 9 basis · 10 grow · 11 shrink · 12 align-self: labels only (the items move); bounds cover the widest state.
  for (const [name, right] of [['flex-basis', basisRight], ['flex-grow: 1 · 2', growRight], ['flex-shrink: 1 · 2', growRight], ['align-self: flex-end', growRight]] as const) {
    void name
    addLevel([container.x0 - 0.12, right + 0.25, container.y0 - 0.15, containerTop + 0.25], () => {})
  }

  // 13 align-content: the container wraps a second line of chips and spaces the lines apart.
  const tallTop = itemsY[1] + 0.95
  const line2 = new Group()
  addLevel([container.x0 - 0.12, growRight + 0.25, container.y0 - 0.15, tallTop + PAD + 0.2], (g) => {
    let x = A.x0
    for (const w of [0.7, 0.9, 0.6]) {
      line2.add(slab(x, x + w, 0, 0.3, -0.02, 0.04, mat('#f2a541')))
      x += w + GAP
    }
    g.add(line2)
  })

  // 14 the responsive component: a card around the container, with a header image and title.
  const card: Bounds = [container.x0 - 0.15, basisRight + 0.15, container.y0 - 0.15, tallTop + PAD + 0.7]
  addLevel(card, (g) => {
    g.add(slab(card[0], card[1], card[2], card[3], -0.12, 0.03, mat('#ffffff', { rough: 0.5 })))
    g.add(slab(card[0] + 0.15, card[0] + 0.9, card[3] - 0.55, card[3] - 0.12, -0.08, 0.03, mat('#7ac4f0')))
    g.add(slab(card[0] + 1.05, card[1] - 0.2, card[3] - 0.24, card[3] - 0.15, -0.08, 0.02, ink))
    g.add(slab(card[0] + 1.05, card[1] - 0.6, card[3] - 0.4, card[3] - 0.33, -0.08, 0.02, bars))
  })

  // 15 screens: a desktop around the card, with a tablet and a phone showing the same card re-flowed.
  const desk: Bounds = [card[0] - 0.42, card[1] + 0.42, card[2] - 0.42, card[3] + 0.42]
  const tablet: Bounds = [desk[0] - 2.4, desk[0] - 0.4, desk[2], desk[2] + 2.8]
  const phone: Bounds = [tablet[0] - 1.3, tablet[0] - 0.4, desk[2], desk[2] + 1.8]
  addLevel([phone[0], desk[1], desk[2], desk[3]], (g) => {
    const bezel = mat('#141416', { rough: 0.35 })
    const screenMat = mat('#f6f2ea')
    for (const sz of [desk, tablet, phone]) {
      g.add(slab(sz[0], sz[1], sz[2], sz[3], -0.16, 0.05, bezel))
      if (sz !== desk) g.add(slab(sz[0] + 0.08, sz[1] - 0.08, sz[2] + 0.08, sz[3] - 0.08, -0.15, 0.01, screenMat))
    }
    // The same card, stacked for narrow screens: image on top, then the items in a column.
    for (const sz of [tablet, phone]) {
      const x0 = sz[0] + 0.18
      const x1 = sz[1] - 0.18
      let y = sz[3] - 0.2
      g.add(slab(x0, x1, y - 0.35, y, -0.14, 0.01, mat('#7ac4f0')))
      y -= 0.45
      const h = (y - (sz[2] + 0.18) - 0.12) / 3
      for (const m of [paper, itemMats[0], itemMats[1]]) {
        g.add(slab(x0, x1, y - h, y, -0.14, 0.01, m))
        y -= h + 0.06
      }
    }
  })

  // ---- The level label floats above the composition; the status line speaks it.
  const title = label('', 0.06, '#1d1c1a', 0, 0, 0)
  const subtitle = label('', 0.026, '#4a4844', 0, 0, 0)
  subtitle.font = FONTS.medium
  subtitle.maxWidth = 1.3
  subtitle.textAlign = 'center'
  subtitle.anchorY = 'bottom'
  scene.add(title, subtitle)
  const status = document.createElement('p')
  status.className = 'sr-only'
  status.setAttribute('aria-live', 'polite')
  stage.container.append(status)

  // ---- Controls: play / pause, restart, and the level readout.
  let playing = true
  let clock = 0
  const extra = document.createElement('div')
  extra.className = 'uxs-extra'
  const playBtn = document.createElement('button')
  playBtn.type = 'button'
  playBtn.className = 'uxs-button'
  const restartBtn = document.createElement('button')
  restartBtn.type = 'button'
  restartBtn.className = 'uxs-button'
  restartBtn.textContent = 'Restart'
  const readout = document.createElement('span')
  readout.className = 'uxs-button'
  readout.style.display = 'flex'
  readout.style.alignItems = 'center'
  readout.setAttribute('aria-hidden', 'true')
  const syncPlay = () => {
    playBtn.textContent = playing ? 'Pause' : 'Play'
  }
  syncPlay()
  playBtn.addEventListener('click', () => ((playing = !playing), syncPlay()))
  restartBtn.addEventListener('click', () => (clock = 0))
  extra.append(playBtn, restartBtn, readout)
  if (!stage.thumbnail) stage.container.append(extra)

  // ---- Orbit and zoom on top of the stage's framing: drag to orbit, wheel or pinch to zoom.
  let az = 0
  let el = 0
  let zoom = 1
  const pointers = new Map<number, { x: number; y: number }>()
  stage.canvas.style.cursor = 'grab'
  stage.canvas.addEventListener('pointerdown', (e) => {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
    stage.canvas.setPointerCapture(e.pointerId)
    stage.canvas.style.cursor = 'grabbing'
  })
  stage.canvas.addEventListener('pointermove', (e) => {
    const prev = pointers.get(e.pointerId)
    if (!prev) return
    if (pointers.size >= 2) {
      const [a, b] = [...pointers.values()]
      const before = Math.hypot(a.x - b.x, a.y - b.y)
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
      const [c, d] = [...pointers.values()]
      const after = Math.hypot(c.x - d.x, c.y - d.y)
      if (before > 0 && after > 0) zoom = Math.max(0.4, Math.min(2.5, zoom * (before / after)))
      return
    }
    az -= (e.clientX - prev.x) * 0.0045
    el = Math.max(-0.35, Math.min(0.9, el + (e.clientY - prev.y) * 0.004))
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
  })
  const release = (e: PointerEvent) => {
    pointers.delete(e.pointerId)
    if (!pointers.size) stage.canvas.style.cursor = 'grab'
  }
  stage.canvas.addEventListener('pointerup', release)
  stage.canvas.addEventListener('pointercancel', release)
  stage.canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault()
      zoom = Math.max(0.4, Math.min(2.5, zoom * Math.exp(e.deltaY * 0.001)))
    },
    { passive: false },
  )
  document.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.target instanceof HTMLButtonElement || e.target instanceof HTMLInputElement) return
    if (e.key === ' ') {
      e.preventDefault()
      playing = !playing
      syncPlay()
    }
  })

  // ---- Every frame.
  const scaleFor = (b: Bounds) => Math.min(FIT.w / (b[1] - b[0]), FIT.h / (b[3] - b[2]))
  const UP = new Vector3(0, 1, 0)
  const camTarget = new Vector3()
  const offset = new Vector3()
  const side = new Vector3()
  let shownLevel = -1
  let lastBeat = -1
  const anim = { bW: basis[1].basis, cW: basis[2].basis, cY0: itemsY[0] as number, right: basisRight, top: containerTop, line2: itemsY[1] + GAP }

  stage.onFrame((dt) => {
    if (playing) clock += dt
    const reduced = stage.reducedMotion
    // Reduced motion: a new level every 2 s, plain cuts, no pulse.
    const t = reduced ? Math.floor(clock / 2) * BEATS_PER_LEVEL * BEAT : clock
    const b = beatAt(t, BPM, COUNT)
    const cur = b.level
    const next = (cur + 1) % COUNT
    const tr = reduced || next === 0 ? 0 : b.transition
    const whole = Math.floor(t / BEAT)
    if (whole !== lastBeat) {
      lastBeat = whole
      if (playing && !reduced) {
        if (b.beat === BEATS_PER_LEVEL - 1) sound.thunk({ gain: 0.3, pitch: 1.5 })
        else sound.tick({ pitch: 0.9 + b.beat * 0.1 })
      }
    }

    // Which parts show, the level springing out, and the pulse.
    levels.forEach((lv, i) => {
      lv.group.visible = i <= cur || (i === next && tr > 0)
      let s = 1
      if (i === next && tr > 0) {
        const prev = levels[cur].bounds
        const own = lv.bounds
        const from = Math.min((prev[1] - prev[0]) / (own[1] - own[0]), (prev[3] - prev[2]) / (own[3] - own[2]))
        s = lerp(from, 1, springOut(tr))
      }
      if (i === cur && !reduced && tr === 0) s *= 1 + 0.035 * Math.exp(-b.phase * 7)
      lv.group.scale.setScalar(s)
    })

    // The flex demonstration: basis, then grow, then shrink, then back; align-self and align-content after.
    const showId = LEVELS[tr > 0.5 ? next : cur].id
    const w = showId === 'flex-grow' ? containerW.grow : showId === 'flex-shrink' ? containerW.shrink : containerW.basis
    const sizes = flexLayout(basis, w - 2 * PAD, GAP)
    const k = reduced ? 1 : Math.min(1, dt * 8)
    const stageIndex = tr > 0.5 ? next : cur
    const alignSelf = stageIndex >= 12 && stageIndex <= 13
    const alignContent = stageIndex >= 13
    anim.bW = lerp(anim.bW, sizes[1], k)
    anim.cW = lerp(anim.cW, sizes[2], k)
    anim.cY0 = lerp(anim.cY0, alignSelf ? itemsY[1] - 0.4 : itemsY[0], k)
    anim.right = lerp(anim.right, container.x0 + w, k)
    anim.top = lerp(anim.top, alignContent ? tallTop + PAD : containerTop, k)
    anim.line2 = lerp(anim.line2, alignContent ? tallTop - 0.3 : itemsY[1] + GAP, k)
    const bX = A.x0 + sizes[0] + GAP
    placeItem(itemB, bX, anim.bW, itemsY[0], itemsY[1])
    placeItem(itemC, bX + anim.bW + GAP, anim.cW, anim.cY0, itemsY[1])
    setContainer(anim.right, anim.top)
    line2.position.y = anim.line2

    // The world: the current level fills FIT, easing to the next across the 4th beat (the pull-back).
    const bounds = levels[cur].bounds
    const nb = levels[next].bounds
    const e = next === 0 ? 0 : ease(tr)
    const s = lerp(scaleFor(bounds), scaleFor(nb), e)
    const cx = lerp((bounds[0] + bounds[1]) / 2, (nb[0] + nb[1]) / 2, e)
    const y0 = lerp(bounds[2], nb[2], e)
    const h = lerp(bounds[3] - bounds[2], nb[3] - nb[2], e)
    root.scale.setScalar(s)
    root.position.set(-cx * s, -y0 * s + 0.02, 0)

    const lvl = LEVELS[cur]
    if (shownLevel !== cur) {
      shownLevel = cur
      title.text = lvl.name
      subtitle.text = lvl.line
      title.sync()
      subtitle.sync()
      readout.textContent = `${String(cur + 1).padStart(2, '0')} / ${COUNT}  ${lvl.name}`
      status.textContent = `${lvl.name}. ${lvl.line}`
    }
    // Title and its line stacked above the composition, never over it.
    subtitle.position.set(0, h * s + 0.13, 0.1)
    title.position.set(0, h * s + 0.22, 0.1)

    // Camera: the stage's framing, orbited and zoomed around its target.
    const base = cameraFor(camera.aspect)
    camTarget.set(base.target[0], Math.max(base.target[1], 0.42), base.target[2])
    offset.set(...base.position).sub(camTarget).applyAxisAngle(UP, az)
    side.crossVectors(offset, UP).normalize()
    offset.applyAxisAngle(side, el).multiplyScalar(zoom)
    camera.position.copy(camTarget).add(offset)
    camera.lookAt(camTarget)
    // The level title always faces the viewer, from any angle.
    title.quaternion.copy(camera.quaternion)
    subtitle.quaternion.copy(camera.quaternion)
  })

  stage.onReset(() => {
    clock = 0
    az = el = 0
    zoom = 1
    playing = true
    syncPlay()
  })

  if (stage.thumbnail) {
    clock = BEAT * BEATS_PER_LEVEL * 10 + BEAT * 0.2
    setTimeout(() => {
      playing = false
      stage.ready()
    }, 1500)
  } else setTimeout(() => stage.ready(), 500)
}
