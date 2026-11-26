import medium from '@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff?url'
import bold from '@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-700-normal.woff?url'

/** IBM Plex Mono (SIL Open Font License), bundled so no font is fetched from a third party. */
export const FONTS = { medium, bold }

/** Monospace advance as a fraction of the font size (IBM Plex Mono: 600 / 1000 em). */
export const MONO_ADVANCE = 0.6

/** Cap height as a fraction of the font size (IBM Plex Mono: 698 / 1000 em). */
export const CAP_HEIGHT = 0.698

let loaded: Promise<void> | null = null

/** Registers the fonts with the page too, for text drawn onto canvases (ink mode). */
export function loadPageFonts(): Promise<void> {
  loaded ??= (async () => {
    const faces = [new FontFace('UXS Plex Mono', `url(${medium})`, { weight: '500' }), new FontFace('UXS Plex Mono', `url(${bold})`, { weight: '700' })]
    for (const face of faces) document.fonts.add(await face.load())
  })()
  return loaded
}
