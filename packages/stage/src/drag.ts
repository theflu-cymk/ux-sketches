import { Plane, Raycaster, Vector2, Vector3, type Intersection, type Object3D } from 'three'
import type { Stage } from './stage.ts'

export type DragPlane = 'floor' | 'vertical'

export type DragOptions = {
  targets: Object3D[]
  /**
   * 'floor': a horizontal plane through the grab point. 'vertical': an upright plane through it, facing the
   * camera. A function picks per grab, from what was hit.
   */
  plane: DragPlane | ((hit: Intersection) => DragPlane)
  onStart?(hit: Intersection): void
  onMove?(point: Vector3, delta: Vector3): void
  onEnd?(): void
}

/**
 * Pointer dragging for mouse, pen and touch. Captures the pointer for the whole drag; Reset ends any drag in
 * progress (releasing the capture) so nothing is left stuck. Returns a function that removes the listeners.
 */
export function createDrag(stage: Stage, o: DragOptions): () => void {
  const { canvas, camera } = stage
  const ray = new Raycaster()
  const ndc = new Vector2()
  const plane = new Plane()
  const point = new Vector3()
  const last = new Vector3()
  let active: number | null = null

  const aim = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect()
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
    ray.setFromCamera(ndc, camera)
  }

  const end = () => {
    if (active === null) return
    if (canvas.hasPointerCapture(active)) canvas.releasePointerCapture(active)
    active = null
    canvas.style.cursor = ''
    o.onEnd?.()
  }

  const down = (e: PointerEvent) => {
    if (active !== null) return
    aim(e)
    const hit = ray.intersectObjects(o.targets, true)[0]
    if (!hit) return
    const kind = typeof o.plane === 'function' ? o.plane(hit) : o.plane
    if (kind === 'floor') plane.setFromNormalAndCoplanarPoint(new Vector3(0, 1, 0), hit.point)
    else {
      const n = camera.position.clone().sub(hit.point).setY(0).normalize()
      plane.setFromNormalAndCoplanarPoint(n, hit.point)
    }
    active = e.pointerId
    canvas.setPointerCapture(e.pointerId)
    canvas.style.cursor = 'grabbing'
    last.copy(hit.point)
    e.preventDefault()
    o.onStart?.(hit)
  }

  const move = (e: PointerEvent) => {
    aim(e)
    if (active === null) {
      canvas.style.cursor = ray.intersectObjects(o.targets, true).length ? 'grab' : ''
      return
    }
    if (e.pointerId !== active || !ray.ray.intersectPlane(plane, point)) return
    const delta = point.clone().sub(last)
    last.copy(point)
    o.onMove?.(point.clone(), delta)
  }

  const up = (e: PointerEvent) => {
    if (e.pointerId === active) end()
  }

  canvas.addEventListener('pointerdown', down)
  canvas.addEventListener('pointermove', move)
  canvas.addEventListener('pointerup', up)
  canvas.addEventListener('pointercancel', up)
  canvas.addEventListener('lostpointercapture', up)
  const offReset = stage.onReset(end)

  return () => {
    end()
    offReset()
    canvas.removeEventListener('pointerdown', down)
    canvas.removeEventListener('pointermove', move)
    canvas.removeEventListener('pointerup', up)
    canvas.removeEventListener('pointercancel', up)
    canvas.removeEventListener('lostpointercapture', up)
  }
}
