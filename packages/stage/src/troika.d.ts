declare module 'troika-three-text' {
  import type { Color, Material, Mesh } from 'three'
  export class Text extends Mesh {
    text: string
    font: string | null
    fontSize: number
    color: number | string | Color
    anchorX: number | 'left' | 'center' | 'right' | string
    anchorY: number | 'top' | 'top-baseline' | 'middle' | 'bottom-baseline' | 'bottom' | string
    maxWidth: number
    textAlign: 'left' | 'right' | 'center' | 'justify'
    lineHeight: number | 'normal'
    letterSpacing: number
    outlineWidth: number | string
    depthOffset: number
    material: Material
    sync(callback?: () => void): void
    dispose(): void
  }
}

declare module '*.woff?url' {
  const url: string
  export default url
}
