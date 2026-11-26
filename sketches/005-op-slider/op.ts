/** The slider's value, 0–100, for a thumb at x on a track running from -half to +half. */
export function sliderValue(x: number, half: number): number {
  const t = (Math.max(-half, Math.min(half, x)) + half) / (2 * half)
  return Math.round(t * 100)
}

/**
 * Where the stripe field is sampled for a floor point p, given a thumb at c: every line is pushed straight
 * away from the thumb by up to `push` metres, fading out over about `radius`. Points closer than the push
 * all sample the thumb itself, so a clearing opens around it and the lines bunch up at its edge. The
 * distance mapping r -> r - push*exp(-r^2/radius^2) only ever increases, so the field never folds.
 * The shader uses the same formula.
 */
export function bulgeSample(px: number, pz: number, cx: number, cz: number, radius: number, push: number): [number, number] {
  const dx = px - cx
  const dz = pz - cz
  const r = Math.hypot(dx, dz)
  if (r === 0) return [cx, cz]
  const rs = Math.max(0, r - Math.max(0, push) * Math.exp(-(r * r) / (radius * radius)))
  return [cx + (dx / r) * rs, cz + (dz / r) * rs]
}

/** How much the stripes shimmer for a thumb moving at `speed` m/s: 0 at rest, 1 when flung. */
export function shimmerFrom(speed: number, reduced: boolean): number {
  return reduced ? 0 : Math.min(1, Math.max(0, speed / 3))
}

/**
 * Angle of the under-layer stripes for a thumb at x: perpendicular to the top stripes (π/2) at the centre of
 * the track, turning a quarter turn each way to lie parallel with them (0 or π) at the ends.
 */
export function underlayAngle(x: number, half: number): number {
  const t = Math.max(-half, Math.min(half, x)) / half
  return Math.PI / 2 + t * (Math.PI / 2)
}
