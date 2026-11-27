export const BEATS_PER_LEVEL = 4

export type LevelId =
  | 'content' | 'padding' | 'border' | 'margin' | 'border-box' | 'block-inline' | 'flex-items'
  | 'flex-container' | 'axes' | 'flex-basis' | 'flex-grow' | 'flex-shrink' | 'align-self'
  | 'align-content' | 'component' | 'screens'

/** The journey, innermost first. Each level is embedded in the next. */
export const LEVELS: Array<{ id: LevelId; name: string; line: string }> = [
  { id: 'content', name: 'CONTENT', line: 'The thing itself: text, an image.' },
  { id: 'padding', name: 'PADDING', line: 'Space inside the box, around the content.' },
  { id: 'border', name: 'BORDER', line: 'The edge of the box.' },
  { id: 'margin', name: 'MARGIN', line: 'Space outside the box, pushing others away.' },
  { id: 'border-box', name: 'BORDER-BOX', line: 'Same width set; border-box keeps it, content-box grows.' },
  { id: 'block-inline', name: 'BLOCK VS INLINE', line: 'Blocks stack; inline boxes flow and wrap.' },
  { id: 'flex-items', name: 'FLEX ITEMS', line: 'Boxes laid out by their parent.' },
  { id: 'flex-container', name: 'FLEX CONTAINER', line: 'The parent that arranges its items.' },
  { id: 'axes', name: 'MAIN AXIS · CROSS AXIS', line: 'Items run along the main axis; the cross axis is across it.' },
  { id: 'flex-basis', name: 'FLEX-BASIS', line: 'Each item’s starting size on the main axis.' },
  { id: 'flex-grow', name: 'FLEX-GROW', line: 'Spare space is shared out by grow.' },
  { id: 'flex-shrink', name: 'FLEX-SHRINK', line: 'Missing space is taken back by shrink.' },
  { id: 'align-self', name: 'ALIGN-SELF', line: 'One item breaks rank on the cross axis.' },
  { id: 'align-content', name: 'ALIGN-CONTENT', line: 'Wrapped lines are spaced across the container.' },
  { id: 'component', name: 'RESPONSIVE COMPONENT', line: 'A card built from all of it.' },
  { id: 'screens', name: 'SCREEN SIZES', line: 'The same component, re-flowed for phone, tablet and desktop.' },
]

/**
 * Where we are at time `t` (seconds into the track), from the list of strong hits: the hit we're on, the
 * beat within its phrase of four (0–3), the phase towards the next hit (0–1), the level (one per phrase,
 * looping through `count`), and the transition (0→1 across the fourth hit, when the next level springs out).
 * Before the first hit the first level holds, unpulsed (phase 1).
 */
export function hitAt(t: number, hits: number[], count: number): { hit: number; beat: number; phase: number; level: number; transition: number } {
  if (!hits.length || t < hits[0]) return { hit: 0, beat: 0, phase: 1, level: 0, transition: 0 }
  let lo = 0
  let hi = hits.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (hits[mid] <= t) lo = mid
    else hi = mid - 1
  }
  const span = lo + 1 < hits.length ? hits[lo + 1] - hits[lo] : lo > 0 ? hits[lo] - hits[lo - 1] : 1
  const phase = Math.min(1, (t - hits[lo]) / span)
  const beat = lo % BEATS_PER_LEVEL
  const last = lo === hits.length - 1
  return {
    hit: lo,
    beat,
    phase,
    level: Math.floor(lo / BEATS_PER_LEVEL) % count,
    transition: beat === BEATS_PER_LEVEL - 1 && !last ? phase : 0,
  }
}

/** A springy 0→1: overshoots and settles by x = 1. */
export function springOut(x: number): number {
  if (x <= 0) return 0
  if (x >= 1) return 1
  return 1 - Math.exp(-6 * x) * Math.cos(9 * x) * (1 - x * x * x)
}

export type FlexItem = { basis: number; grow: number; shrink: number }

/**
 * Main-axis sizes for one flex line (the CSS algorithm, simplified: no min/max sizes). Positive free space
 * is shared in proportion to `grow`; negative free space is taken in proportion to `shrink × basis`.
 */
export function flexLayout(items: FlexItem[], container: number, gap: number): number[] {
  const used = items.reduce((s, i) => s + i.basis, 0) + gap * Math.max(0, items.length - 1)
  const free = container - used
  if (free >= 0) {
    const g = items.reduce((s, i) => s + i.grow, 0)
    return items.map((i) => i.basis + (g > 0 ? (free * i.grow) / g : 0))
  }
  const w = items.reduce((s, i) => s + i.shrink * i.basis, 0)
  return items.map((i) => Math.max(0, i.basis + (w > 0 ? (free * i.shrink * i.basis) / w : 0)))
}
