import type { SketchMeta } from '../packages/stage/src/meta.ts'

export type FeedEntry = SketchMeta & { url: string; thumbnail: string }
export type Feed = { schemaVersion: 1; site: { title: string; url: string }; sketches: FeedEntry[] }

export const SITE_TITLE = 'UX Sketches'

export function buildFeed(metas: SketchMeta[], siteUrl: string): Feed {
  const base = siteUrl.replace(/\/+$/, '')
  const numbers = new Set<number>()
  const slugs = new Set<string>()
  for (const m of metas) {
    if (numbers.has(m.number)) throw new Error(`duplicate sketch number ${m.number}`)
    if (slugs.has(m.slug)) throw new Error(`duplicate sketch slug ${m.slug}`)
    numbers.add(m.number)
    slugs.add(m.slug)
  }
  const sketches = [...metas]
    .sort((a, b) => b.date.localeCompare(a.date) || b.number - a.number)
    .map((m) => {
      const url = `${base}/${m.slug}/`
      return { ...m, url, thumbnail: `${url}thumbnail.jpg` }
    })
  return { schemaVersion: 1, site: { title: SITE_TITLE, url: base }, sketches }
}
