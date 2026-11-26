const TAU = Math.PI * 2

/** The angle of the nearest of `count` evenly spaced detents. */
export function snapToDetent(angle: number, count: number): number {
  const slot = TAU / count
  return Math.round(angle / slot) * slot
}

/** The value under the window at this drum angle, wrapping any number of turns either way. */
export function valueAt<T>(angle: number, values: T[]): T {
  const slot = TAU / values.length
  const i = Math.round(angle / slot) % values.length
  return values[(i + values.length) % values.length]
}

/** One step of a free spin: clamped to ±maxVelocity, then decayed by friction (per second). */
export function spinStep(velocity: number, dt: number, o: { friction: number; maxVelocity: number }): number {
  const v = Math.max(-o.maxVelocity, Math.min(o.maxVelocity, velocity))
  return v * Math.exp(-o.friction * dt)
}
