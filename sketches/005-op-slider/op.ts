/** The slider's value, 0–100, for a thumb at x on a track running from -half to +half. */
export function sliderValue(x: number, half: number): number {
  const t = (Math.max(-half, Math.min(half, x)) + half) / (2 * half)
  return Math.round(t * 100)
}

/**
 * Where the stripe field is sampled for a floor point p, given a thumb at c: a Vasarely-style bulge that
 * pulls samples toward the thumb (magnifying the stripes around it) and fades out by about 2× radius.
 * Strength is capped below 1 so the field never folds over itself. The shader uses the same formula.
 */
export function bulgeSample(px: number, pz: number, cx: number, cz: number, radius: number, strength: number): [number, number] {
  const s = Math.min(0.95, Math.max(0, strength))
  const dx = px - cx
  const dz = pz - cz
  const k = 1 - s * Math.exp(-(dx * dx + dz * dz) / (radius * radius))
  return [cx + dx * k, cz + dz * k]
}

/** How much the stripes shimmer for a thumb moving at `speed` m/s: 0 at rest, 1 when flung. */
export function shimmerFrom(speed: number, reduced: boolean): number {
  return reduced ? 0 : Math.min(1, Math.max(0, speed / 3))
}
