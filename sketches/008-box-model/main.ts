import { BoxGeometry, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, SphereGeometry } from 'three'
import { Text } from 'troika-three-text'
import { CAP_HEIGHT, FONTS, PALETTE, createDrag, createStage, type SketchMeta } from '@ux-sketches/stage'
import '@ux-sketches/stage/stage.css'
import meta from './sketch.json' with { type: 'json' }
import { CARD, MAX, PX, cssFor, fitScale, fromHandle, handleX, layoutRow, type BoxState } from './box.ts'

const stage = await createStage(document.getElementById('stage')!, { meta: meta as SketchMeta, sound: true })

if (stage) {
  const { scene, sound } = stage
  const COUNT = 3
  const W = CARD.width
  const H = CARD.height
  const D = 0.05
  const BORDER = CARD.border
  const LIFT = 0.04
  const state: BoxState = { padding: 16, margin: 12, gap: 16 }

  const row = new Group()
  scene.add(row)
  const shadow = <T extends Mesh>(m: T) => ((m.castShadow = true), (m.receiveShadow = true), m)

  // A card, literally a box inside a box: border frame, padding foam, content block, and a margin shell.
  type Card = { group: Group; foam: Mesh; content: Mesh; bars: Mesh[]; shell: Mesh; x: number; inner: number; innerH: number }
  const borderMat = new MeshStandardMaterial({ color: '#2b2b2e', roughness: 0.5 })
  const foamMat = new MeshStandardMaterial({ color: '#ffb27a', roughness: 0.95 })
  const contentMat = new MeshStandardMaterial({ color: PALETTE.tile, roughness: 0.6 })
  const barMat = new MeshStandardMaterial({ color: '#9b968e', roughness: 0.8 })
  const shellMat = new MeshBasicMaterial({ color: '#5ea7ff', transparent: true, opacity: 0.16, depthWrite: false })
  const cards: Card[] = Array.from({ length: COUNT }, () => {
    const group = new Group()
    const back = shadow(new Mesh(new BoxGeometry(W, H, D * 0.4), borderMat))
    back.position.z = -D * 0.3
    const foam = shadow(new Mesh(new BoxGeometry(1, 1, D * 0.6), foamMat))
    const content = shadow(new Mesh(new BoxGeometry(1, 1, D * 0.8), contentMat))
    const bars = [0.18, 0.06, -0.06].map(() => new Mesh(new BoxGeometry(1, 0.022, 0.004), barMat))
    const shell = new Mesh(new BoxGeometry(1, 1, D * 1.6), shellMat)
    group.add(back, foam, content, ...bars, shell)
    row.add(group)
    return { group, foam, content, bars, shell, x: 0, inner: W, innerH: H }
  })

  // Gutters: dark channels on the floor between the cards, as wide as the gap.
  const channelMat = new MeshStandardMaterial({ color: '#3a3936', roughness: 0.9 })
  const channels = Array.from({ length: COUNT - 1 }, () => {
    const m = new Mesh(new BoxGeometry(1, 0.004, 1), channelMat)
    m.receiveShadow = true
    scene.add(m)
    return m
  })

  // Marbles roll through the gutters, front to back, when there's room for them.
  const marbleGeo = new SphereGeometry(1, 16, 12)
  const marbleMat = new MeshStandardMaterial({ color: PALETTE.accent, roughness: 0.3, metalness: 0.1 })
  const marbles: Array<{ mesh: Mesh; gutter: number; z: number }> = []
  let spawnClock = 0

  // Handles on the middle card (which never moves as the row reflows): inner one for padding, outer for margin.
  const handleMat = new MeshStandardMaterial({ color: '#1d1c1a', roughness: 0.4 })
  const padHandle = shadow(new Mesh(new SphereGeometry(0.022, 20, 16), handleMat))
  const marginHandle = shadow(new Mesh(new SphereGeometry(0.022, 20, 16), new MeshStandardMaterial({ color: '#2f7de1', roughness: 0.4 })))
  // A larger, invisible grab area around each handle, so they're easy to catch with a finger.
  for (const h of [padHandle, marginHandle]) h.add(new Mesh(new SphereGeometry(2.4, 12, 8), new MeshBasicMaterial({ visible: false })))
  row.add(padHandle, marginHandle)

  // The CSS, on a plate in front of the row.
  const plate = new Mesh(new BoxGeometry(0.62, 0.02, 0.2), borderMat)
  plate.position.set(0, 0.01, 0.34)
  plate.receiveShadow = true
  scene.add(plate)
  const css = new Text()
  css.font = FONTS.bold
  css.fontSize = 0.032 / CAP_HEIGHT
  css.color = PALETTE.tile
  css.anchorX = 'center'
  css.anchorY = 'middle'
  css.textAlign = 'left'
  css.lineHeight = 1.35
  css.rotation.x = -Math.PI / 2
  css.position.set(0, 0.021, 0.34)
  scene.add(css)

  const status = document.createElement('p')
  status.className = 'sr-only'
  status.setAttribute('aria-live', 'polite')
  stage.container.append(status)

  // Sliders (keyboard and touch), in the corner.
  const extra = document.createElement('div')
  extra.className = 'uxs-extra'
  extra.style.flexDirection = 'column'
  extra.style.alignItems = 'stretch'
  const sliders = {} as Record<keyof BoxState, HTMLInputElement>
  for (const key of ['padding', 'margin', 'gap'] as const) {
    const label = document.createElement('label')
    label.className = 'uxs-button'
    label.style.display = 'flex'
    label.style.alignItems = 'center'
    label.style.justifyContent = 'space-between'
    label.style.gap = '8px'
    const name = document.createElement('span')
    name.textContent = key
    const input = document.createElement('input')
    input.type = 'range'
    input.min = '0'
    input.max = String(MAX[key])
    input.step = '1'
    input.value = String(state[key])
    input.setAttribute('aria-label', `${key} in pixels`)
    input.addEventListener('input', () => set(key, Number(input.value)))
    sliders[key] = input
    label.append(name, input)
    extra.append(label)
  }
  if (!stage.thumbnail) stage.container.append(extra)

  let lastAnnounce = 0
  function set(key: keyof BoxState, value: number) {
    const v = Math.round(Math.max(0, Math.min(MAX[key], value)))
    if (v === state[key]) return
    state[key] = v
    sliders[key].value = String(v)
    sound.tick({ pitch: 0.6 + v / 60 })
    css.text = cssFor(state).join('\n')
    css.sync()
    // Announce once the values settle, so the last change is always the one read out.
    clearTimeout(lastAnnounce)
    lastAnnounce = window.setTimeout(() => {
      status.textContent = `Padding ${state.padding}px, margin ${state.margin}px, gap ${state.gap}px.`
    }, 350)
  }
  css.text = cssFor(state).join('\n')
  css.sync()
  status.textContent = `Padding ${state.padding}px, margin ${state.margin}px, gap ${state.gap}px.`

  let dragging: 'padding' | 'margin' | null = null
  createDrag(stage, {
    targets: [padHandle, marginHandle],
    plane: 'vertical',
    onStart(hit) {
      dragging = hit.object === padHandle ? 'padding' : 'margin'
    },
    onMove(point) {
      if (!dragging) return
      const local = (point.x - row.position.x) / row.scale.x - cards[1].x
      set(dragging, fromHandle(dragging, local, W, PX))
    },
    onEnd() {
      dragging = null
    },
  })

  stage.onFrame((dt) => {
    const k = stage.reducedMotion ? 1 : Math.min(1, dt * 10)
    const targets = layoutRow(COUNT, W, state, PX)
    // Keep the whole row in view: shrink it on narrow screens.
    const total = targets[COUNT - 1].x - targets[0].x + W + 2 * state.margin * PX
    const fit = fitScale(total, stage.camera.aspect)
    row.scale.setScalar(row.scale.x + (fit - row.scale.x) * k)
    targets.forEach((t, i) => {
      const c = cards[i]
      c.x += (t.x - c.x) * k
      c.inner += (t.inner - c.inner) * k
      c.innerH += (Math.max(0, H - 2 * state.padding * PX) - c.innerH) * k
      const innerH = c.innerH
      // Margin is space on every side, so a big margin lifts the card too: the shell never sinks into the floor.
      const lift = Math.max(LIFT, state.margin * PX + 0.006)
      c.group.position.set(c.x, lift + H / 2, 0)
      c.foam.scale.set(W - 2 * BORDER, H - 2 * BORDER, 1)
      // The content never covers the border, even at zero padding.
      const contentW = Math.min(c.inner, W - 2 * BORDER)
      const contentH = Math.min(innerH, H - 2 * BORDER)
      c.content.scale.set(Math.max(0.001, contentW), Math.max(0.001, contentH), 1)
      c.content.visible = c.inner > 0.002 && innerH > 0.002
      c.content.position.z = D * 0.15
      c.bars.forEach((b, j) => {
        b.scale.set(Math.max(0.001, c.inner * (j === 0 ? 0.7 : 0.5)), 1, 1)
        b.position.set(-c.inner * (j === 0 ? 0.1 : 0.2), Math.min(innerH / 2 - 0.03, [0.12, 0.06, 0][j]) * (innerH / (H - 2 * 16 * PX)), D * 0.56)
        b.visible = c.content.visible && innerH > 0.08
      })
      const m = state.margin * PX
      c.shell.scale.set(W + 2 * m, H + 2 * m, 1)
      c.shell.visible = m > 0.0005
    })
    // Handles ride the middle card's padding edge and margin edge.
    const c1 = cards[1]
    const top = Math.max(LIFT, state.margin * PX + 0.006) + H
    padHandle.position.set(c1.x + c1.inner / 2, top + 0.04, D)
    marginHandle.position.set(c1.x + handleX('margin', state, W, PX), top + 0.09, D)
    const grow = 1 / row.scale.x
    padHandle.scale.setScalar(grow)
    marginHandle.scale.setScalar(grow)
    // Channels sit in each gap, at the row's scale.
    channels.forEach((ch, g) => {
      const a = cards[g]
      const b = cards[g + 1]
      ch.position.set(((a.x + b.x) / 2) * row.scale.x, 0.002, -0.02 * row.scale.x)
      ch.scale.set(Math.max(0.0001, state.gap * PX * row.scale.x), 1, 0.46 * row.scale.x)
      ch.visible = state.gap > 0
    })

    // Gutter marbles: radius fits the gap; none if the gap is too narrow or motion is reduced.
    const gapM = state.gap * PX * row.scale.x
    const r = Math.min(0.014, gapM * 0.4)
    spawnClock += dt
    if (!stage.reducedMotion && r > 0.004 && spawnClock > 0.35) {
      spawnClock = 0
      for (let g = 0; g < COUNT - 1; g++) {
        const mesh = shadow(new Mesh(marbleGeo, marbleMat))
        scene.add(mesh)
        marbles.push({ mesh, gutter: g, z: -0.25 })
      }
    }
    for (const mb of [...marbles]) {
      mb.z += dt * 0.7
      const a = cards[mb.gutter]
      const b = cards[mb.gutter + 1]
      const mid = ((a.x + b.x) / 2) * row.scale.x
      const rr = Math.min(0.014, state.gap * PX * row.scale.x * 0.4)
      mb.mesh.scale.setScalar(Math.max(0.0001, rr))
      mb.mesh.position.set(mid, rr, mb.z * row.scale.x)
      mb.mesh.rotation.x += dt * 0.7 / Math.max(rr, 0.001)
      if (mb.z > 0.21 || rr < 0.003) {
        mb.mesh.removeFromParent()
        marbles.splice(marbles.indexOf(mb), 1)
      }
    }
  })

  stage.onReset(() => {
    set('padding', 16)
    set('margin', 12)
    set('gap', 16)
  })

  if (stage.thumbnail) {
    Object.assign(state, { padding: 30, margin: 18, gap: 28 })
    css.text = cssFor(state).join('\n')
    css.sync()
    setTimeout(() => stage.ready(), 900)
  } else setTimeout(() => stage.ready(), 400)
}
