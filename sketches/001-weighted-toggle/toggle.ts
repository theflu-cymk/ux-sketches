export type ToggleState = 'on' | 'off'

/**
 * Which side the lever is on. Angle in radians: negative is the off side, positive the on side. The state
 * only flips once the lever is past the hysteresis band on the far side, so jitter at the centre can't
 * flicker it.
 */
export function toggleState(angle: number, prev: ToggleState, hysteresis: number): ToggleState {
  if (prev === 'off' && angle > hysteresis) return 'on'
  if (prev === 'on' && angle < -hysteresis) return 'off'
  return prev
}
