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
 * Close-ups for stages 0–3, each on a different part of the screen from a different angle, framed so they
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
    // Fit the whole screen with a margin, from slightly above centre.
    const cx = 0
    const cy = PHONE.bottom + PHONE.height / 2
    const needH = (PHONE.height / 2 + 0.1) / tanHalf(FOV_WIDE)
    const needW = (PHONE.width / 2 + 0.1) / (tanHalf(FOV_WIDE) * aspect)
    const d = Math.max(needH, needW) / 0.92
    return { fov: FOV_WIDE, position: [cx, cy + d * 0.1, d], target: [cx, cy, 0] }
  }
  const c = CLOSE[Math.max(0, index)]
  const d = c.span / (2 * tanHalf(FOV_CLOSE) * Math.max(aspect, 1))
  const dir = c.from
  const len = Math.hypot(...dir)
  const pos: [number, number, number] = [c.at[0] + (dir[0] / len) * d, c.at[1] + (dir[1] / len) * d, (dir[2] / len) * d]
  return { fov: FOV_CLOSE, position: pos, target: [c.at[0], c.at[1], 0] }
}
