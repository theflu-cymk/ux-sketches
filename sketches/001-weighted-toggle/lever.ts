import { toggleState, type ToggleState } from './toggle.ts'

const deg = (d: number) => (d * Math.PI) / 180

/** The lever's feel. Angles in radians; positive tips toward the on side. */
export const LEVER = {
  max: deg(35),
  rest: deg(30),
  hysteresis: deg(4),
  inertia: 1,
  /** The motor holding the lever on its current side: what you have to fight. */
  stiffness: 60,
  /** How hard the pointer pulls, relative to nothing: below the motor, so you have to pull well past centre. */
  pull: 48,
  damping: 3,
  bounce: 0.3,
}

export type LeverState = { angle: number; velocity: number; side: ToggleState }
export type LeverInput = { pointer: number | null; reduced: boolean }

export function initialLever(): LeverState {
  return { angle: -LEVER.rest, velocity: 0, side: 'off' }
}

/** One step of the lever. Returns the new state, whether it flipped this step, and any impact speed at a limit. */
export function leverStep(s: LeverState, input: LeverInput, dt: number): { state: LeverState; flipped: boolean; impact: number } {
  const target = s.side === 'on' ? LEVER.rest : -LEVER.rest
  // Held in the hand (or reduced motion): close to critically damped, so it strains rather than wobbles.
  // Let go: lightly damped, so it springs to its side and overshoots.
  const held = input.pointer !== null
  const k = LEVER.stiffness + (held ? LEVER.pull : 0)
  const damping = held || input.reduced ? 1.9 * Math.sqrt(k * LEVER.inertia) : LEVER.damping
  let torque = LEVER.stiffness * (target - s.angle) - damping * s.velocity
  if (input.pointer !== null) torque += LEVER.pull * (input.pointer - s.angle)
  let velocity = s.velocity + (torque / LEVER.inertia) * dt
  let angle = s.angle + velocity * dt
  let impact = 0
  if (Math.abs(angle) > LEVER.max) {
    angle = Math.sign(angle) * LEVER.max
    impact = Math.abs(velocity)
    velocity = input.reduced ? 0 : -velocity * LEVER.bounce
  }
  const side = toggleState(angle, s.side, LEVER.hysteresis)
  const flipped = side !== s.side
  if (flipped && input.reduced && input.pointer === null) {
    angle = side === 'on' ? LEVER.rest : -LEVER.rest
    velocity = 0
  }
  return { state: { angle, velocity, side }, flipped, impact }
}
