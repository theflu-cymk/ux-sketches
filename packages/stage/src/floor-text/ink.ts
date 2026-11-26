import { CanvasTexture, Mesh, MeshStandardMaterial, PlaneGeometry, SRGBColorSpace, type Scene } from 'three'
import type { FloorBlock } from '../camera.ts'
import { CAP_HEIGHT, loadPageFonts } from '../fonts.ts'
import { PALETTE } from '../palette.ts'
import type { PrintLine } from './print.ts'
import { smearStamps } from './geometry.ts'

export type InkSurface = {
  stamp(x: number, z: number, radius: number, strength: number): void
  smear(fromX: number, fromZ: number, toX: number, toZ: number, radius: number): void
}

const WIDTH_PX = 2048
const MARGIN = 0.12

/** The floor text painted into a decal the sketch can stamp into and smear, like wet ink. */
export async function createInk(scene: Scene, lines: PrintLine[], block: FloorBlock) {
  await loadPageFonts()
  const x0 = -block.halfWidth - MARGIN
  const x1 = block.halfWidth + MARGIN
  const z0 = block.zNear - MARGIN
  const z1 = block.zFar + MARGIN
  const ppm = WIDTH_PX / (x1 - x0)
  const canvas = document.createElement('canvas')
  canvas.width = WIDTH_PX
  canvas.height = Math.round((z1 - z0) * ppm)
  const ctx = canvas.getContext('2d')!
  const scratch = document.createElement('canvas')
  const sctx = scratch.getContext('2d')!
  const ink = `#${PALETTE.ink.getHexString()}`
  const tex = new CanvasTexture(canvas)
  tex.colorSpace = SRGBColorSpace
  tex.anisotropy = 8

  const toPx = (x: number, z: number): [number, number] => [(x - x0) * ppm, (z - z0) * ppm]
  const inside = (x: number, z: number) => x >= x0 && x <= x1 && z >= z0 && z <= z1

  const wrap = (text: string, maxPx: number) => {
    const out: string[] = []
    let line = ''
    for (const word of text.split(' ')) {
      const next = line ? `${line} ${word}` : word
      if (ctx.measureText(next).width > maxPx && line) {
        out.push(line)
        line = word
      } else line = next
    }
    if (line) out.push(line)
    return out
  }

  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = ink
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (const line of lines) {
      if (!line.text) continue
      const sizePx = (line.cap / CAP_HEIGHT) * ppm
      ctx.font = `${line.bold ? 700 : 500} ${sizePx}px "UXS Plex Mono", ui-monospace, monospace`
      const rows = line.wrap ? wrap(line.text, block.halfWidth * 2 * ppm) : [line.text]
      const [cx, cy] = toPx(0, line.z)
      rows.forEach((row, i) => ctx.fillText(row, cx, cy + (i - (rows.length - 1) / 2) * sizePx * 1.15))
    }
    tex.needsUpdate = true
  }
  draw()

  const mesh = new Mesh(
    new PlaneGeometry(x1 - x0, z1 - z0),
    new MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }),
  )
  mesh.rotation.x = -Math.PI / 2
  mesh.position.set(0, 0.002, (z0 + z1) / 2)
  mesh.receiveShadow = true
  mesh.name = 'floor-ink'
  scene.add(mesh)

  const surface: InkSurface = {
    stamp(x, z, radius, strength) {
      if (!inside(x, z)) return
      const [px, pz] = toPx(x, z)
      const r = radius * ppm
      ctx.fillStyle = ink
      ctx.globalAlpha = Math.min(1, Math.max(0, strength))
      for (let i = 0; i < 7; i++) {
        const a = Math.random() * Math.PI * 2
        const d = Math.random() * r * 0.6
        ctx.beginPath()
        ctx.arc(px + Math.cos(a) * d, pz + Math.sin(a) * d, r * (0.25 + Math.random() * 0.45), 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
      tex.needsUpdate = true
    },
    smear(fromX, fromZ, toX, toZ, radius) {
      if (!inside(fromX, fromZ) && !inside(toX, toZ)) return
      const r = Math.max(2, Math.round(radius * ppm))
      scratch.width = scratch.height = r * 2
      const pts = smearStamps(fromX, fromZ, toX, toZ, radius)
      for (let i = 1; i < pts.length; i++) {
        const [ax, az] = toPx(...pts[i - 1])
        const [bx, bz] = toPx(...pts[i])
        sctx.clearRect(0, 0, r * 2, r * 2)
        sctx.drawImage(canvas, ax - r, az - r, r * 2, r * 2, 0, 0, r * 2, r * 2)
        ctx.globalAlpha = 0.55
        ctx.drawImage(scratch, bx - r, bz - r)
        ctx.globalAlpha = 1
      }
      tex.needsUpdate = true
    },
  }

  return {
    surface,
    reset: draw,
    dispose() {
      mesh.removeFromParent()
      mesh.geometry.dispose()
      ;(mesh.material as MeshStandardMaterial).dispose()
      tex.dispose()
    },
  }
}
