import { Group, MeshStandardMaterial, type Scene } from 'three'
import { Text } from 'troika-three-text'
import type { FloorBlock } from '../camera.ts'
import { CAP_HEIGHT, FONTS } from '../fonts.ts'
import { PALETTE } from '../palette.ts'

export type PrintLine = { text: string; z: number; cap: number; bold?: boolean; wrap?: boolean }

/** Flat text lying on the floor, reading toward the viewer, catching the key light's shadows. */
export function printLines(scene: Scene, lines: PrintLine[], block: FloorBlock): { group: Group; dispose(): void } {
  const group = new Group()
  group.name = 'floor-print'
  const material = new MeshStandardMaterial({ color: PALETTE.ink, roughness: 0.85 })
  for (const line of lines) {
    if (!line.text) continue
    const t = new Text()
    t.text = line.text
    t.font = line.bold ? FONTS.bold : FONTS.medium
    t.fontSize = line.cap / CAP_HEIGHT
    t.color = PALETTE.ink
    t.material = material
    t.anchorX = 'center'
    t.anchorY = 'middle'
    t.textAlign = 'center'
    t.lineHeight = 1.15
    if (line.wrap) t.maxWidth = block.halfWidth * 2
    t.rotation.x = -Math.PI / 2
    t.position.set(0, 0.002, line.z)
    t.receiveShadow = true
    t.sync()
    group.add(t)
  }
  scene.add(group)
  return {
    group,
    dispose() {
      for (const child of group.children) (child as Text).dispose()
      material.dispose()
      group.removeFromParent()
    },
  }
}
