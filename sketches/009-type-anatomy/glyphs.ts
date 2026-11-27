import { BoxGeometry, CircleGeometry, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, SphereGeometry, TorusGeometry } from 'three'
import type { PartId } from './anatomy.ts'

/**
 * The specimen word "Hxgfa", built from primitive strokes so every part is its own mesh, tagged with
 * `userData.part`. Units are metres; each letter's baseline is y = 0, so letter groups can be moved to the
 * baseline guide and scaled vertically by the x-height or cap-height guide.
 * Base metrics: x-height X = 0.28, cap height C = 0.54.
 */
export const X = 0.28
export const C = 0.54

export type Letter = { group: Group; kind: 'cap' | 'lower' }

export function buildSpecimen(ink: MeshStandardMaterial) {
  const T = 0.05 // thick stroke
  const t = 0.028 // thin stroke
  const DEPTH = 0.045
  const meshes: Mesh[] = []
  const counterMat = new MeshBasicMaterial({ color: '#ff5a1f', transparent: true, opacity: 0, depthWrite: false })

  const tag = <M extends Mesh>(m: M, part: PartId | null) => {
    m.userData.part = part
    m.castShadow = true
    meshes.push(m)
    return m
  }
  const box = (w: number, h: number, x: number, y: number, part: PartId | null, rot = 0) => {
    const m = tag(new Mesh(new BoxGeometry(w, h, DEPTH), ink), part)
    m.position.set(x, y, 0)
    m.rotation.z = rot
    return m
  }
  const arc = (r: number, x: number, y: number, from: number, sweep: number, part: PartId | null) => {
    const m = tag(new Mesh(new TorusGeometry(r, t * 0.55, 10, 40, sweep), ink), part)
    m.position.set(x, y, 0)
    m.rotation.z = from
    return m
  }
  const ring = (r: number, x: number, y: number, part: PartId) => {
    const m = tag(new Mesh(new TorusGeometry(r, T * 0.48, 12, 48), ink), part)
    m.position.set(x, y, 0)
    return m
  }
  const counter = (r: number, x: number, y: number) => {
    const m = tag(new Mesh(new CircleGeometry(r, 40), counterMat.clone()), 'counter')
    m.position.set(x, y, -0.005)
    m.castShadow = false
    return m
  }
  const ball = (r: number, x: number, y: number, part: PartId) => {
    const m = tag(new Mesh(new SphereGeometry(r, 16, 12), ink), part)
    m.position.set(x, y, 0)
    return m
  }

  const letters: Letter[] = []
  const letter = (kind: Letter['kind'], ...parts: Mesh[]) => {
    const group = new Group()
    group.add(...parts)
    letters.push({ group, kind })
    return group
  }

  // H: two stems, a crossbar, slab serifs top and bottom.
  const H = letter(
    'cap',
    box(T, C, -0.13, C / 2, 'stem'),
    box(T, C, 0.13, C / 2, 'stem'),
    box(0.26, t, 0, C * 0.52, 'crossbar'),
    ...[-0.13, 0.13].flatMap((x) => [box(0.11, 0.024, x, 0.012, 'serif'), box(0.11, 0.024, x, C - 0.012, 'serif')]),
  )
  // x: two diagonals spanning exactly the x-height, with small serifs.
  const diag = Math.hypot(0.2, X)
  const ang = Math.atan2(X, 0.2)
  const x = letter(
    'lower',
    box(T * 0.9, diag, 0, X / 2, 'x-height', ang - Math.PI / 2),
    box(t, diag, 0, X / 2, 'x-height', Math.PI / 2 - ang),
    ...[-0.1, 0.1].flatMap((sx) => [box(0.07, 0.02, sx, 0.01, 'serif'), box(0.07, 0.02, sx, X - 0.01, 'serif')]),
  )
  // g: a bowl with its counter, an ear, and a descender loop below the baseline.
  const g = letter(
    'lower',
    ring(0.085, 0, 0.15, 'bowl'),
    counter(0.06, 0, 0.15),
    box(0.06, t, 0.1, 0.255, 'ear', 0.35),
    box(t, 0.19, 0.085, 0.06, 'descender'),
    arc(0.085, 0, -0.03, Math.PI, Math.PI, 'descender'),
  )
  // f: stem below the x-height, ascender above it, a crossbar at the x-height and a hooked terminal on top.
  const f = letter(
    'lower',
    box(T, X, -0.03, X / 2, 'stem'),
    box(T, C - X - 0.05, -0.03, X + (C - X - 0.05) / 2, 'ascender'),
    arc(0.055, 0.025, C - 0.05, Math.PI / 2, Math.PI / 2, 'terminal'),
    ball(0.024, 0.07, C - 0.03, 'terminal'),
    box(0.15, t, -0.01, X - t / 2, 'crossbar'),
    box(0.1, 0.02, -0.03, 0.01, 'serif'),
  )
  // a: a bowl with its counter, a stem on the right, and a curled terminal over the top.
  const a = letter(
    'lower',
    ring(0.072, -0.012, 0.08, 'bowl'),
    counter(0.05, -0.012, 0.08),
    box(T, X - 0.06, 0.075, (X - 0.06) / 2, 'stem'),
    arc(0.072, 0.0, X - 0.085, 0, Math.PI, 'terminal'),
    ball(0.024, -0.072, X - 0.085, 'terminal'),
  )

  // Lay the word out, centred on x = 0.
  const widths = [0.36, 0.28, 0.26, 0.2, 0.26]
  const gap = 0.05
  const total = widths.reduce((s, w) => s + w, 0) + gap * (widths.length - 1)
  let cursor = -total / 2
  const word = new Group()
  ;[H, x, g, f, a].forEach((grp, i) => {
    grp.position.x = cursor + widths[i] / 2
    cursor += widths[i] + gap
    word.add(grp)
  })
  return { word, letters, meshes, width: total }
}
