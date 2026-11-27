export type PartId =
  | 'baseline' | 'x-height' | 'cap-height' | 'ascender' | 'descender' | 'stem'
  | 'crossbar' | 'serif' | 'bowl' | 'counter' | 'ear' | 'terminal'

export const PARTS: Array<{ id: PartId; name: string; definition: string }> = [
  { id: 'baseline', name: 'Baseline', definition: 'The invisible line most letters sit on.' },
  { id: 'x-height', name: 'X-height', definition: 'The height of lowercase letters without ascenders, like x.' },
  { id: 'cap-height', name: 'Cap height', definition: 'The height of capital letters from the baseline.' },
  { id: 'ascender', name: 'Ascender', definition: 'The part of a lowercase letter that rises above the x-height.' },
  { id: 'descender', name: 'Descender', definition: 'The part of a letter that drops below the baseline.' },
  { id: 'stem', name: 'Stem', definition: 'The main vertical stroke of a letter.' },
  { id: 'crossbar', name: 'Crossbar', definition: 'A horizontal stroke joining or crossing other strokes.' },
  { id: 'serif', name: 'Serif', definition: 'The small foot or cap at the end of a stroke.' },
  { id: 'bowl', name: 'Bowl', definition: 'A curved stroke that encloses a space, as in a or g.' },
  { id: 'counter', name: 'Counter', definition: 'The enclosed or partly enclosed space inside a letter.' },
  { id: 'ear', name: 'Ear', definition: 'The small stroke that sticks out from the top of a g.' },
  { id: 'terminal', name: 'Terminal', definition: 'The end of a stroke that has no serif, often a curl or ball.' },
]

/** Guide heights in metres above the floor. */
export type Guides = { baseline: number; xHeight: number; capHeight: number }

export const BASE_GUIDES: Guides = { baseline: 0.22, xHeight: 0.5, capHeight: 0.76 }
export const MIN_GAP = 0.12
/** Lowest baseline: leaves room for the descenders above the floor. */
const FLOOR = 0.18
/** Highest cap height: keeps the cap line and the callout above it in frame. */
const CEILING = 0.98

/**
 * Keeps baseline < x-height < cap height with at least MIN_GAP between each, the baseline high enough for
 * descenders and the cap height inside the frame.
 */
export function clampGuides(g: Guides): Guides {
  const baseline = Math.max(FLOOR, Math.min(g.baseline, CEILING - 2 * MIN_GAP))
  // Lowercase can grow to 1.5× its natural x-height: beyond that the ascenders leave the frame.
  const maxX = baseline + (BASE_GUIDES.xHeight - BASE_GUIDES.baseline) * 1.5
  const xHeight = Math.max(baseline + MIN_GAP, Math.min(g.xHeight, maxX, CEILING - MIN_GAP))
  const capHeight = Math.max(xHeight + MIN_GAP, Math.min(g.capHeight, CEILING))
  return { baseline, xHeight, capHeight }
}

/** Vertical scales for lowercase bodies (from x-height) and capitals (from cap height), relative to `base`. */
export function scalesFor(g: Guides, base: Guides): { x: number; cap: number } {
  return {
    x: (g.xHeight - g.baseline) / (base.xHeight - base.baseline),
    cap: (g.capHeight - g.baseline) / (base.capHeight - base.baseline),
  }
}

/** The next part in PARTS order, wrapping; from nothing, the first (or last, going back). */
export function nextPart(current: PartId | null, dir: 1 | -1): PartId {
  const i = current === null ? (dir === 1 ? -1 : 0) : PARTS.findIndex((p) => p.id === current)
  return PARTS[(i + dir + PARTS.length) % PARTS.length].id
}

/** Keyboard step for a guide, in metres. */
export const GUIDE_STEP = 0.02

/**
 * Moves one guide to `value`. Moving the baseline moves the whole set (the letters sit on it), so the
 * x-height and cap height keep their sizes; the move stops where the floor or the frame would cut them.
 */
export function moveGuide(g: Guides, key: keyof Guides, value: number): Guides {
  if (key !== 'baseline') return clampGuides({ ...g, [key]: value })
  const delta = Math.max(FLOOR - g.baseline, Math.min(value - g.baseline, CEILING - g.capHeight))
  return clampGuides({ baseline: g.baseline + delta, xHeight: g.xHeight + delta, capHeight: g.capHeight + delta })
}

/** Moves one guide a keyboard step up (1) or down (-1), keeping the guide rules. */
export function nudgeGuide(g: Guides, key: keyof Guides, dir: 1 | -1): Guides {
  return moveGuide(g, key, g[key] + dir * GUIDE_STEP)
}
