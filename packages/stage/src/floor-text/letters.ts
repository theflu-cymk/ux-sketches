import { BoxGeometry, Mesh, MeshStandardMaterial, Vector3, type Scene } from 'three'
import { Text } from 'troika-three-text'
import type RAPIER_NS from '@dimforge/rapier3d-compat'
import type { FloorBlock } from '../camera.ts'
import { CAP_HEIGHT, FONTS, MONO_ADVANCE } from '../fonts.ts'
import { PALETTE } from '../palette.ts'
import type { Physics } from '../physics.ts'
import { fitCap, letterHomes } from './geometry.ts'

export type LetterBody = { char: string; mesh: Mesh; body: RAPIER_NS.RigidBody; home: Vector3 }

const TILE_HEIGHT = 0.03

/**
 * The heading as movable type: a light block per glyph with the glyph printed on top. At rest it reads as
 * printed text; anything that hits it can knock the letters over and scatter them.
 */
export function createLetters(scene: Scene, physics: Physics, text: string, z: number, block: FloorBlock) {
  const cap = fitCap(text, block.headingCap, block.halfWidth * 2)
  const fontSize = cap / CAP_HEIGHT
  const advance = fontSize * MONO_ADVANCE
  const chars = [...text]
  const homes = letterHomes(text, chars.map(() => advance), 0, [0, z])
  const tileMat = new MeshStandardMaterial({ color: PALETTE.tile, roughness: 0.7 })
  const glyphMat = new MeshStandardMaterial({ color: PALETTE.ink, roughness: 0.85 })
  const size = { x: advance * 0.94, y: TILE_HEIGHT, z: fontSize * 0.95 }
  const geo = new BoxGeometry(size.x, size.y, size.z)
  const { rapier, world } = physics

  const letters: LetterBody[] = chars
    .filter((c) => c !== ' ')
    .map((char, i) => {
      const [x, hz] = homes[i]
      const home = new Vector3(x, TILE_HEIGHT / 2, hz)
      const mesh = new Mesh(geo, tileMat)
      mesh.castShadow = true
      mesh.receiveShadow = true
      const glyph = new Text()
      glyph.text = char
      glyph.font = FONTS.bold
      glyph.fontSize = fontSize
      glyph.material = glyphMat
      glyph.color = PALETTE.ink
      glyph.anchorX = 'center'
      glyph.anchorY = 'middle'
      glyph.rotation.x = -Math.PI / 2
      glyph.position.y = TILE_HEIGHT / 2 + 0.0008
      glyph.sync()
      mesh.add(glyph)
      mesh.position.copy(home)
      scene.add(mesh)
      const body = world.createRigidBody(
        rapier.RigidBodyDesc.dynamic().setTranslation(home.x, home.y, home.z).setCcdEnabled(true).setLinearDamping(0.05).setAngularDamping(0.1),
      )
      world.createCollider(rapier.ColliderDesc.cuboid(size.x / 2, size.y / 2, size.z / 2).setDensity(350).setFriction(0.7).setRestitution(0.15), body)
      physics.bind(mesh, body)
      return { char, mesh, body, home }
    })

  return {
    letters,
    reset() {
      for (const l of letters) {
        l.body.setTranslation(l.home, true)
        l.body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true)
        l.body.setLinvel({ x: 0, y: 0, z: 0 }, true)
        l.body.setAngvel({ x: 0, y: 0, z: 0 }, true)
      }
    },
    dispose() {
      for (const l of letters) {
        physics.unbind(l.mesh)
        world.removeRigidBody(l.body)
        ;(l.mesh.children[0] as Text).dispose()
        l.mesh.removeFromParent()
      }
      geo.dispose()
      tileMat.dispose()
      glyphMat.dispose()
    },
  }
}
