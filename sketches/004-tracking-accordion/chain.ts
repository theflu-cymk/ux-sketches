/**
 * A word as a chain of letters on a rail (1-D, along x), joined by springs whose rest length is the letter
 * advance. The first letter is anchored to its rest spot by its own spring; a held letter follows the pointer.
 */
export const CHAIN = {
  stiffness: 420,
  anchor: 2000,
  damping: 4,
  /** Closest two letters may get, as a fraction of the advance. */
  minGap: 0.55,
  substeps: 4,
}

export type Chain = { x: number[]; v: number[]; rest: number[] }

export function restChain(count: number, advance: number): Chain {
  const rest = Array.from({ length: count }, (_, i) => (i - (count - 1) / 2) * advance)
  return { x: [...rest], v: rest.map(() => 0), rest }
}

export function chainStep(
  s: Chain,
  hold: { index: number; x: number } | null,
  dt: number,
  o: { advance: number; reduced: boolean },
): Chain {
  const x = [...s.x]
  const v = [...s.v]
  const n = x.length
  const damping = o.reduced ? 2 * Math.sqrt(CHAIN.stiffness * 2) : CHAIN.damping
  const h = dt / CHAIN.substeps
  for (let step = 0; step < CHAIN.substeps; step++) {
    const f = new Array<number>(n).fill(0)
    for (let i = 1; i < n; i++) {
      const stretch = x[i] - x[i - 1] - o.advance
      f[i] -= CHAIN.stiffness * stretch
      f[i - 1] += CHAIN.stiffness * stretch
    }
    if (!hold || hold.index !== 0) f[0] += CHAIN.anchor * (s.rest[0] - x[0])
    for (let i = 0; i < n; i++) {
      v[i] += (f[i] - damping * v[i]) * h
      x[i] += v[i] * h
    }
    if (hold) {
      x[hold.index] = hold.x
      v[hold.index] = 0
    }
    // Letters can be squeezed, never stacked.
    const min = o.advance * CHAIN.minGap
    for (let i = 1; i < n; i++) {
      if (x[i] - x[i - 1] < min) {
        if (hold && hold.index === i) {
          for (let j = i - 1; j >= 0 && x[j + 1] - x[j] < min; j--) (x[j] = x[j + 1] - min), (v[j] = 0)
        } else {
          x[i] = x[i - 1] + min
          v[i] = Math.max(v[i], v[i - 1])
        }
      }
    }
  }
  return { x, v, rest: s.rest }
}

/** Mean letter-spacing beyond the natural advance, in thousandths of an em (design-tool tracking units). */
export function trackingOf(s: Chain, advance: number, fontSize: number): number {
  if (s.x.length < 2) return 0
  const mean = (s.x[s.x.length - 1] - s.x[0]) / (s.x.length - 1)
  return ((mean - advance) / fontSize) * 1000
}
