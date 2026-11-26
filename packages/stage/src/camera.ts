import { PerspectiveCamera, Vector3 } from 'three'

/**
 * Where the floor text sits, in metres on the floor plane (y = 0). The component stands at the origin, about
 * 1 m tall; the text lies in front of it, toward the viewer (+z). Lines run far to near: heading, date,
 * question, tools. In portrait the block narrows and lengthens so the question wraps and stays legible.
 */
export type FloorBlock = {
  halfWidth: number
  zNear: number
  zFar: number
  headingZ: number
  dateZ: number
  questionZ: number
  toolsZ: number
  headingCap: number
  questionCap: number
  smallCap: number
}

export function floorBlock(aspect: number): FloorBlock {
  if (aspect < 1) {
    return { halfWidth: 0.75, zNear: 0.7, zFar: 1.75, headingZ: 0.8, dateZ: 0.97, questionZ: 1.25, toolsZ: 1.62, headingCap: 0.1, questionCap: 0.09, smallCap: 0.05 }
  }
  return { halfWidth: 1.2, zNear: 0.7, zFar: 1.55, headingZ: 0.8, dateZ: 0.97, questionZ: 1.17, toolsZ: 1.42, headingCap: 0.11, questionCap: 0.075, smallCap: 0.05 }
}

export type CameraSetup = { fov: number; position: [number, number, number]; target: [number, number, number] }

const FOV = 32
const LIMIT = 0.9

function framingPoints(block: FloorBlock): Vector3[] {
  const pts: Vector3[] = []
  for (const x of [-block.halfWidth, block.halfWidth]) for (const z of [block.zNear, block.zFar]) pts.push(new Vector3(x, 0, z))
  for (const x of [-0.5, 0.5]) for (const y of [0, 1]) for (const z of [-0.5, 0.5]) pts.push(new Vector3(x, y, z))
  return pts
}

/**
 * The default view: a slightly high, front-on look at the component with the floor text readable below it.
 * Walks the camera back along a fixed elevation until the component and the text block fit inside the frame.
 */
export function cameraFor(aspect: number): CameraSetup {
  const block = floorBlock(aspect)
  const portrait = aspect < 1
  const elevation = ((portrait ? 52 : 42) * Math.PI) / 180
  const target = new Vector3(0, portrait ? 0.25 : 0.35, (block.zFar + -0.5) / 2)
  const dir = new Vector3(0, Math.sin(elevation), Math.cos(elevation))
  const pts = framingPoints(block)
  const cam = new PerspectiveCamera(FOV, aspect, 0.05, 100)
  let distance = 1.5
  for (; distance < 30; distance += 0.05) {
    cam.position.copy(target).addScaledVector(dir, distance)
    cam.lookAt(target)
    cam.updateMatrixWorld()
    const fits = pts.every((p) => {
      const n = p.clone().project(cam)
      return Math.abs(n.x) <= LIMIT && Math.abs(n.y) <= LIMIT && n.z < 1
    })
    if (fits) break
  }
  const position = target.clone().addScaledVector(dir, distance)
  return { fov: FOV, position: [position.x, position.y, position.z], target: [target.x, target.y, target.z] }
}
