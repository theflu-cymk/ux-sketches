export type BoxState = { padding: number; margin: number; gap: number }

/** Slider ranges, in CSS pixels. */
export const MAX = { padding: 48, margin: 48, gap: 48 }

/** Metres per CSS pixel on the stage. */
export const PX = 0.0025

export type CardLayout = { x: number; outer: number; inner: number }

/**
 * A row of `count` border-box cards `cardWidth` metres wide, centred on 0. Padding eats into the content (the
 * card's outside never changes); margins sit outside every card, so two neighbours are 2 × margin + gap apart.
 */
export function layoutRow(count: number, cardWidth: number, s: BoxState, pxToM: number): CardLayout[] {
  const space = (2 * s.margin + s.gap) * pxToM
  const total = count * cardWidth + (count - 1) * space
  const inner = Math.max(0, cardWidth - 2 * s.padding * pxToM)
  return Array.from({ length: count }, (_, i) => ({
    x: -total / 2 + cardWidth / 2 + i * (cardWidth + space),
    outer: cardWidth,
    inner,
  }))
}

export function cssFor(s: BoxState): string[] {
  return [`padding: ${s.padding}px;`, `margin: ${s.margin}px;`, `gap: ${s.gap}px;`]
}

export type HandleKind = 'padding' | 'margin'

/**
 * Where a handle sits, relative to its card's centre: the padding handle on the content's right edge, the
 * margin handle on the margin shell's right edge. Handles live on the middle card, which never moves.
 */
export function handleX(kind: HandleKind, s: BoxState, cardWidth: number, pxToM: number): number {
  return kind === 'padding' ? cardWidth / 2 - s.padding * pxToM : cardWidth / 2 + s.margin * pxToM
}

/** The value a handle dragged to `x` (relative to the middle card's centre) asks for, clamped and rounded. */
export function fromHandle(kind: HandleKind, x: number, cardWidth: number, pxToM: number): number {
  const raw = kind === 'padding' ? (cardWidth / 2 - x) / pxToM : (x - cardWidth / 2) / pxToM
  return Math.round(Math.max(0, Math.min(MAX[kind], raw)))
}

/** The cards' border-box size and the frame around them, in metres. */
export const CARD = { width: 0.5, height: 0.58, border: 0.012 }

/** Scale for a row `total` metres wide so it fits the view: 1.9 m on wide screens, 1.05 m in portrait. */
export function fitScale(total: number, aspect: number): number {
  return Math.min(1, (aspect < 1 ? 1.05 : 1.9) / total)
}
