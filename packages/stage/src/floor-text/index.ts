import type { Scene } from 'three'
import type { FloorBlock } from '../camera.ts'
import { floorLines } from '../floor-lines.ts'
import type { FloorTextMode, SketchMeta } from '../meta.ts'
import type { Physics } from '../physics.ts'
import { createInk, type InkSurface } from './ink.ts'
import { createLetters, type LetterBody } from './letters.ts'
import { printLines, type PrintLine } from './print.ts'

export type { InkSurface } from './ink.ts'
export type { LetterBody } from './letters.ts'
export { letterHomes, smearStamps } from './geometry.ts'

export type FloorText = { mode: FloorTextMode; ink?: InkSurface; letters?: LetterBody[] }

function linesFor(meta: SketchMeta, block: FloorBlock, withHeading: boolean): PrintLine[] {
  const l = floorLines(meta)
  const number = String(meta.number).padStart(3, '0')
  return [
    ...(withHeading ? [{ text: l.heading, z: block.headingZ, cap: block.headingCap, bold: true }] : []),
    { text: withHeading ? l.date : `${number} · ${l.date}`, z: block.dateZ, cap: block.smallCap },
    { text: l.question, z: block.questionZ, cap: block.questionCap, wrap: true },
    { text: l.tools, z: block.toolsZ, cap: block.smallCap },
  ]
}

/**
 * Builds the floor text for the sketch's mode, and rebuilds it when the view switches between portrait and
 * landscape (the text block changes shape). `current` always points at the live surfaces.
 */
export async function createFloorText(scene: Scene, meta: SketchMeta, physics: Physics | null, block: FloorBlock) {
  const floor: FloorText = { mode: meta.floorText }
  let reset = () => {}
  let dispose = () => {}

  const build = async (b: FloorBlock) => {
    dispose()
    if (meta.floorText === 'ink') {
      const ink = await createInk(scene, linesFor(meta, b, true), b)
      floor.ink = ink.surface
      reset = ink.reset
      dispose = ink.dispose
    } else if (meta.floorText === 'letters' && physics) {
      const letters = createLetters(scene, physics, meta.title, b.headingZ, b)
      const rest = printLines(scene, linesFor(meta, b, false), b)
      floor.letters = letters.letters
      reset = letters.reset
      dispose = () => {
        letters.dispose()
        rest.dispose()
      }
    } else {
      const print = printLines(scene, linesFor(meta, b, true), b)
      reset = () => {}
      dispose = print.dispose
    }
  }
  await build(block)

  return {
    floor,
    reset: () => reset(),
    rebuild: (b: FloorBlock) => build(b),
  }
}
