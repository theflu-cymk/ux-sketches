import { floorBlock } from '../../packages/stage/src/camera.ts'

export const STAGES = ['ATOMS', 'MOLECULES', 'ORGANISMS', 'TEMPLATE', 'PAGE'] as const

/** The phone screen: upright at the origin, facing +z. Metres. */
export const PHONE = { width: 0.72, height: 1.5, bottom: 0.05 }

export type Shot = { fov: number; position: [number, number, number]; target: [number, number, number] }

/** The next stage in a direction, clamped to the first and last. */
export function step(progress: number, dir: 1 | -1): number {
  return Math.max(0, Math.min(STAGES.length - 1, Math.round(progress) + dir))
}

/** Horizontal extent the camera sees at `distance`, in metres. */
export function visibleWidthAt(shot: Shot, aspect: number, distance: number): number {
  return 2 * distance * Math.tan((shot.fov * Math.PI) / 360) * aspect
}

/**
 * Close-ups for stages 0â€“3, each on a different part of the screen from a different angle, framed so they
 * show well under half the phone's width (the reveal stays hidden). Stage 4 pulls back to the whole screen.
 * Each close-up is `span` metres across at its target, on its narrower side.
 */
const CLOSE: Array<{ at: [number, number]; from: [number, number, number]; span: number }> = [
  { at: [-0.14, 1.3], from: [-0.45, 0.25, 1], span: 0.33 }, // atoms: chips and tiles near the top-left icons
  { at: [0.16, 1.1], from: [0.4, 0.15, 1], span: 0.3 }, // molecules: an icon with its label
  { at: [0, 0.3], from: [0, -0.3, 1], span: 0.32 }, // organisms: the dock, from below
  { at: [0.05, 0.85], from: [0.85, 0.2, 1], span: 0.3 }, // template: wireframe blocks, raking from the side
]

const FOV_CLOSE = 22
const FOV_WIDE = 34

export function shotFor(index: number, aspect: number): Shot {
  const tanHalf = (f: number) => Math.tan((f * Math.PI) / 360)
  if (index >= STAGES.length - 1) {
    // Pull back until the whole screen and the floor heading and question in front of it are in frame,
    // from a little above (the same idea as the stage's own framing).
    const block = floorBlock(aspect)
    const points: Array<[number, number, number]> = [
      [-PHONE.width / 2, PHONE.bottom, 0],
      [PHONE.width / 2, PHONE.bottom, 0],
      [-PHONE.width / 2, PHONE.bottom + PHONE.height, 0],
      [PHONE.width / 2, PHONE.bottom + PHONE.height, 0],
      [-block.halfWidth, 0, block.headingZ],
      [block.halfWidth, 0, block.headingZ],
      [-block.halfWidth, 0, block.questionZ],
      [block.halfWidth, 0, block.questionZ],
    ]
    const target: [number, number, number] = [0, 0.62, 0.45]
    const elev = (16 * Math.PI) / 180
    const t = tanHalf(FOV_WIDE)
    for (let d = 1.5; d < 20; d += 0.05) {
      const pos: [number, number, number] = [0, target[1] + Math.sin(elev) * d, target[2] + Math.cos(elev) * d]
      if (points.every((p) => inFrame(p, pos, target, t, aspect, 0.9))) return { fov: FOV_WIDE, position: pos, target }
    }
    return { fov: FOV_WIDE, position: [0, target[1] + 5, target[2] + 18], target }
  }
  const c = CLOSE[Math.max(0, index)]
  const d = c.span / (2 * tanHalf(FOV_CLOSE) * Math.max(aspect, 1))
  const dir = c.from
  const len = Math.hypot(...dir)
  const pos: [number, number, number] = [c.at[0] + (dir[0] / len) * d, c.at[1] + (dir[1] / len) * d, (dir[2] / len) * d]
  return { fov: FOV_CLOSE, position: pos, target: [c.at[0], c.at[1], 0] }
}

/** Whether a world point projects inside ±limit of a camera at `pos` looking at `target` (no roll, y up). */
function inFrame(p: [number, number, number], pos: [number, number, number], target: [number, number, number], tanHalfV: number, aspect: number, limit: number): boolean {
  const f = norm(sub(target, pos))
  const r = norm(cross(f, [0, 1, 0]))
  const u = cross(r, f)
  const v = sub(p, pos)
  const z = dot(v, f)
  if (z <= 0) return false
  return Math.abs(dot(v, r) / (z * tanHalfV * aspect)) <= limit && Math.abs(dot(v, u) / (z * tanHalfV)) <= limit
}
type V3 = [number, number, number]
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const norm = (a: V3): V3 => {
  const l = Math.hypot(...a)
  return [a[0] / l, a[1] / l, a[2] / l]
}
