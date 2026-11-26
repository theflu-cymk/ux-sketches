import type { Object3D } from 'three'
import type RAPIER_NS from '@dimforge/rapier3d-compat'

export type Rapier = typeof RAPIER_NS
export type Physics = {
  rapier: Rapier
  world: RAPIER_NS.World
  bind(object: Object3D, body: RAPIER_NS.RigidBody): void
  unbind(object: Object3D): void
  /** Advances the world on a fixed 1/60 s step, at most 4 sub-steps per frame, then syncs bound objects. */
  step(dt: number): void
}

const STEP = 1 / 60
const MAX_SUBSTEPS = 4

/** Loads Rapier on demand (its own chunk), with gravity and a static floor at y = 0. */
export async function createPhysics(): Promise<Physics> {
  const rapier = (await import('@dimforge/rapier3d-compat')).default
  await rapier.init()
  const world = new rapier.World({ x: 0, y: -9.81, z: 0 })
  world.timestep = STEP
  world.createCollider(rapier.ColliderDesc.cuboid(20, 0.5, 20).setTranslation(0, -0.5, 0).setFriction(0.8))

  const bound = new Map<Object3D, RAPIER_NS.RigidBody>()
  let acc = 0

  return {
    rapier,
    world,
    bind(object, body) {
      bound.set(object, body)
    },
    unbind(object) {
      bound.delete(object)
    },
    step(dt) {
      acc = Math.min(acc + dt, STEP * MAX_SUBSTEPS)
      while (acc >= STEP) {
        world.step()
        acc -= STEP
      }
      for (const [object, body] of bound) {
        const t = body.translation()
        const r = body.rotation()
        object.position.set(t.x, t.y, t.z)
        object.quaternion.set(r.x, r.y, r.z, r.w)
      }
    },
  }
}
