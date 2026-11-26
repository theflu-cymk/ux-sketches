import medium from '@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff?url'
import bold from '@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-700-normal.woff?url'

/** IBM Plex Mono (SIL Open Font License), bundled so no font is fetched from a third party. */
export const FONTS = { medium, bold }

export { CAP_HEIGHT, MONO_ADVANCE } from './font-metrics.ts'

let loaded: Promise<void> | null = null

/** Registers the fonts with the page too, for text drawn onto canvases (ink mode). */
export function loadPageFonts(): Promise<void> {
  loaded ??= (async () => {
    const faces = [new FontFace('UXS Plex Mono', `url(${medium})`, { weight: '500' }), new FontFace('UXS Plex Mono', `url(${bold})`, { weight: '700' })]
    for (const face of faces) document.fonts.add(await face.load())
  })()
  return loaded
}
