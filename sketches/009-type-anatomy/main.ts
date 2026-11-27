import { BoxGeometry, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, Raycaster, Vector2, type Object3D } from 'three'
import { Text } from 'troika-three-text'
import { CAP_HEIGHT, FONTS, PALETTE, createDrag, createStage, type SketchMeta } from '@ux-sketches/stage'
import '@ux-sketches/stage/stage.css'
import meta from './sketch.json' with { type: 'json' }
import { BASE_GUIDES, PARTS, clampGuides, nextPart, nudgeGuide, scalesFor, type Guides, type PartId } from './anatomy.ts'
import { C, buildSpecimen } from './glyphs.ts'

const stage = await createStage(document.getElementById('stage')!, { meta: meta as SketchMeta, sound: true })

if (stage) {
  const { scene, sound } = stage
  const ink = new MeshStandardMaterial({ color: PALETTE.ink, roughness: 0.55 })
  const hot = new MeshStandardMaterial({ color: PALETTE.accent, roughness: 0.45, emissive: PALETTE.accent, emissiveIntensity: 0.25 })
  const { word, letters, meshes, width } = buildSpecimen(ink)
  const root = new Group()
  root.add(word)
  scene.add(root)
  let guides: Guides = { ...BASE_GUIDES }

  // Guide lines across the word: baseline, x-height, cap height. Each is draggable and is a part too.
  type Guide = { key: keyof Guides; part: PartId; bar: Mesh; hit: Mesh; label: Text }
  const guideMat = new MeshBasicMaterial({ color: '#4a4844' })
  const guideList: Guide[] = (
    [
      ['baseline', 'baseline', 'baseline'],
      ['xHeight', 'x-height', 'x-height'],
      ['capHeight', 'cap-height', 'cap height'],
    ] as const
  ).map(([key, part, text]) => {
    const bar = new Mesh(new BoxGeometry(width + 0.3, 0.005, 0.005), guideMat.clone())
    bar.position.z = 0.04
    bar.userData.part = part
    const hit = new Mesh(new BoxGeometry(width + 0.3, 0.05, 0.02), new MeshBasicMaterial({ visible: false }))
    hit.userData.guide = key
    hit.userData.part = part
    const label = new Text()
    label.text = text
    label.font = FONTS.medium
    label.fontSize = 0.022 / CAP_HEIGHT
    label.color = '#4a4844'
    label.anchorX = 'left'
    label.anchorY = 'bottom'
    label.position.set(-(width + 0.3) / 2, 0.008, 0.04)
    label.sync()
    const g = new Group()
    g.add(bar, hit, label)
    root.add(g)
    return { key, part, bar, hit, label }
  })

  // The callout: the part's name and definition, above the word.
  const calloutName = new Text()
  calloutName.font = FONTS.bold
  calloutName.fontSize = 0.05 / CAP_HEIGHT
  calloutName.color = PALETTE.accent
  calloutName.anchorX = 'center'
  calloutName.anchorY = 'bottom'
  const calloutDef = new Text()
  calloutDef.font = FONTS.medium
  calloutDef.fontSize = 0.026 / CAP_HEIGHT
  calloutDef.color = PALETTE.ink
  calloutDef.anchorX = 'center'
  calloutDef.anchorY = 'top'
  calloutDef.maxWidth = width
  calloutDef.textAlign = 'center'
  root.add(calloutName, calloutDef)

  const status = document.createElement('p')
  status.className = 'sr-only'
  status.setAttribute('aria-live', 'polite')
  stage.container.append(status)

  let selected: PartId | null = null
  const lift: Record<string, number> = {}
  const select = (part: PartId | null) => {
    if (part === selected) return
    selected = part
    const info = PARTS.find((p) => p.id === part)
    calloutName.text = info ? info.name.toUpperCase() : matchMedia('(pointer: coarse)').matches ? 'TAP A PART' : 'HOVER A PART'
    calloutDef.text = info ? info.definition : 'Every letter is built from named parts.'
    calloutName.sync()
    calloutDef.sync()
    const guide = guideList.find((g) => g.part === part)
    if (guide) calloutDef.text = `${info!.definition} Drag it, or press ↑ ↓.`
    if (info) {
      status.textContent = `${info.name}: ${info.definition}${guide ? ' Press the up and down arrows to move it.' : ''}`
      sound.tick({ pitch: 0.8 + PARTS.indexOf(info) * 0.06 })
    }
  }
  select(null)

  // Pointer: hover (or tap) a part to lift it out; drag a guide to re-proportion the letters.
  const ray = new Raycaster()
  const ndc = new Vector2()
  const partAt = (e: PointerEvent | MouseEvent): PartId | null => {
    const r = stage.canvas.getBoundingClientRect()
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
    ray.setFromCamera(ndc, stage.camera)
    const hit = ray.intersectObjects([...meshes, ...guideList.map((g) => g.hit)], false).find((h) => (h.object as Object3D).userData.part)
    return hit ? (hit.object.userData.part as PartId) : null
  }
  let draggingGuide: keyof Guides | null = null
  stage.canvas.addEventListener('pointermove', (e) => {
    if (draggingGuide || e.pointerType === 'touch') return
    const part = partAt(e)
    if (part) select(part)
  })
  stage.canvas.addEventListener('click', (e) => select(partAt(e)))

  createDrag(stage, {
    targets: guideList.map((g) => g.hit),
    plane: 'vertical',
    onStart(hit) {
      draggingGuide = hit.object.userData.guide as keyof Guides
      select(hit.object.userData.part as PartId)
    },
    onMove(point) {
      if (!draggingGuide) return
      const y = (point.y - root.position.y) / root.scale.y
      guides = clampGuides({ ...guides, [draggingGuide]: y })
    },
    onEnd() {
      draggingGuide = null
      const s = scalesFor(guides, BASE_GUIDES)
      status.textContent = `Baseline ${guides.baseline.toFixed(2)} m, x-height ${(s.x * 100).toFixed(0)}%, cap height ${(s.cap * 100).toFixed(0)}%.`
    },
  })

  // Keyboard: with a guide selected, the up and down arrows move it.
  document.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.target instanceof HTMLInputElement) return
    const guide = guideList.find((g) => g.part === selected)
    if (!guide || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return
    e.preventDefault()
    guides = nudgeGuide(guides, guide.key, e.key === 'ArrowUp' ? 1 : -1)
    const s = scalesFor(guides, BASE_GUIDES)
    status.textContent = `${PARTS.find((p) => p.id === guide.part)!.name} moved. Lowercase ${(s.x * 100).toFixed(0)}%, capitals ${(s.cap * 100).toFixed(0)}%.`
    sound.tick({ pitch: 0.7 + s.x * 0.3 })
  })

  // Keyboard: step through the parts.
  const extra = document.createElement('div')
  extra.className = 'uxs-extra'
  for (const [label, dir] of [['Previous part', -1], ['Next part', 1]] as const) {
    const b = document.createElement('button')
    b.type = 'button'
    b.className = 'uxs-button'
    b.textContent = label
    b.addEventListener('click', () => select(nextPart(selected, dir)))
    extra.append(b)
  }
  if (!stage.thumbnail) stage.container.append(extra)

  stage.onFrame((dt) => {
    const k = stage.reducedMotion ? 1 : Math.min(1, dt * 12)
    // Fit the word on narrow screens.
    const fit = stage.camera.aspect < 1 ? 0.82 : 1
    root.scale.setScalar(root.scale.x + (fit - root.scale.x) * k)
    root.position.y = 0
    const s = scalesFor(guides, BASE_GUIDES)
    for (const l of letters) {
      l.group.position.y = guides.baseline
      l.group.scale.y = l.kind === 'cap' ? s.cap : s.x
    }
    for (const g of guideList) {
      const y = guides[g.key]
      g.bar.parent!.position.y = y
      const on = selected === g.part
      ;(g.bar.material as MeshBasicMaterial).color.set(on ? PALETTE.accent : '#4a4844')
      g.bar.scale.y = on ? 3 : 1
    }
    // Lift the selected part out of its letter, toward the viewer.
    for (const m of meshes) {
      const part = m.userData.part as PartId | null
      const on = part !== null && part === selected
      const key = m.uuid
      lift[key] = (lift[key] ?? 0) + ((on ? 0.07 : 0) - (lift[key] ?? 0)) * k
      m.position.z = lift[key]
      if (part === 'counter') (m.material as MeshBasicMaterial).opacity = on ? 0.55 : 0
      else m.material = on ? hot : ink
    }
    // Above whatever is tallest: the cap line, or the f's ascender when the lowercase is stretched.
    const top = Math.max(guides.capHeight, guides.baseline + C * s.x)
    calloutName.position.set(0, top + 0.16, 0)
    calloutDef.position.set(0, top + 0.14, 0)
  })

  stage.onReset(() => {
    guides = { ...BASE_GUIDES }
    select(null)
  })

  if (stage.thumbnail) {
    select('bowl')
    setTimeout(() => stage.ready(), 900)
  } else setTimeout(() => stage.ready(), 400)
}
