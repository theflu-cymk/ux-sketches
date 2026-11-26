import { BoxGeometry, Mesh, MeshStandardMaterial } from 'three'
import { createStage, type SketchMeta } from '../src/index.ts'
import '../src/stage.css'

const meta: SketchMeta = {
  number: 0,
  slug: '000-stage-demo',
  title: 'STAGE DEMO',
  date: '2026-11-26',
  component: 'Nothing yet',
  question: 'Does the stage hold up on its own, at every size?',
  note: 'A scratch page for working on the stage.',
  tools: ['Three.js'],
  floorText: 'print',
  categories: ['3D'],
}

const stage = await createStage(document.getElementById('stage')!, { meta })
if (stage) {
  const cube = new Mesh(new BoxGeometry(0.6, 0.6, 0.6), new MeshStandardMaterial({ color: '#ff5a1f' }))
  cube.position.y = 0.5
  cube.castShadow = true
  stage.scene.add(cube)
  stage.onFrame((dt) => {
    if (!stage.reducedMotion) cube.rotation.y += dt
  })
  stage.onReset(() => cube.rotation.set(0, 0, 0))
  stage.ready()
}
