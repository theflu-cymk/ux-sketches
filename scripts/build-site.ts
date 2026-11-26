// Builds every sketch into one static site: dist/<slug>/ per sketch, dist/feed.json and dist/index.html.
// Usage: node scripts/build-site.ts   (env SKETCH_SITE_URL, default http://localhost:4173;
//        ALLOW_MISSING_THUMBNAILS=1 lets a sketch without thumbnail.jpg through, for the thumbnail script)
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateSketchMeta, type SketchMeta } from '../packages/stage/src/meta.ts'
import { buildFeed, SITE_TITLE, type Feed } from './feed.ts'

export const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)))
const DEFAULT_SITE_URL = 'http://localhost:4173'

/** Sketch folders: `sketches/NNN-…` directories, in name order. */
export function listSketchDirs(root: string): string[] {
  const dir = join(root, 'sketches')
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((name) => /^\d{3}-/.test(name) && statSync(join(dir, name)).isDirectory())
    .sort()
    .map((name) => join(dir, name))
}

/** Reads and validates every sketch.json. Throws once, listing every problem in every sketch. */
export function loadSketches(root: string): Array<{ dir: string; meta: SketchMeta }> {
  const problems: string[] = []
  const sketches: Array<{ dir: string; meta: SketchMeta }> = []
  for (const dir of listSketchDirs(root)) {
    const name = basename(dir)
    let json: unknown
    try {
      json = JSON.parse(readFileSync(join(dir, 'sketch.json'), 'utf8'))
    } catch (e) {
      problems.push(`${name}: sketch.json is missing or not valid JSON (${(e as Error).message})`)
      continue
    }
    const result = validateSketchMeta(json)
    if (!result.ok) {
      problems.push(...result.errors.map((err) => `${name}: ${err}`))
      continue
    }
    if (result.meta.slug !== name) problems.push(`${name}: folder name must equal the slug (${result.meta.slug})`)
    else sketches.push({ dir, meta: result.meta })
  }
  if (problems.length) throw new Error(`Invalid sketches:\n  ${problems.join('\n  ')}`)
  return sketches
}

const escape = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

function indexHtml(feed: Feed): string {
  const items = feed.sketches
    .map(
      (s) =>
        `<li><a href="./${s.slug}/"><span>${String(s.number).padStart(3, '0')}</span> <strong>${escape(s.title)}</strong></a><p>${escape(s.question)}</p></li>`,
    )
    .join('\n      ')
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" href="data:," />
    <title>${SITE_TITLE}</title>
    <style>
      body { margin: 0; padding: 8vh 6vw; background: #17171a; color: #ece9e4; font: 15px/1.5 ui-monospace, SFMono-Regular, Consolas, monospace; }
      h1 { font-size: 15px; letter-spacing: .08em; margin: 0 0 2rem; }
      ol { list-style: none; padding: 0; margin: 0; max-width: 40rem; }
      li { border-top: 1px solid #ffffff22; padding: 1rem 0; }
      a { color: inherit; text-decoration: none; }
      a:hover strong, a:focus-visible strong { text-decoration: underline; }
      a:focus-visible { outline: 2px solid #ffb02e; outline-offset: 4px; }
      span { color: #a7a39c; }
      p { margin: .25rem 0 0; color: #a7a39c; }
    </style>
  </head>
  <body>
    <h1>${SITE_TITLE.toUpperCase()}</h1>
    <ol>
      ${items}
    </ol>
  </body>
</html>
`
}

export async function buildSite(opts: { root?: string; siteUrl?: string; allowMissingThumbnails?: boolean } = {}): Promise<Feed> {
  const root = opts.root ?? ROOT
  const siteUrl = opts.siteUrl ?? process.env.SKETCH_SITE_URL ?? DEFAULT_SITE_URL
  const allowMissing = opts.allowMissingThumbnails ?? process.env.ALLOW_MISSING_THUMBNAILS === '1'
  const sketches = loadSketches(root)
  if (!allowMissing) {
    const missing = sketches.filter((s) => !existsSync(join(s.dir, 'thumbnail.jpg'))).map((s) => s.meta.slug)
    if (missing.length) throw new Error(`Missing thumbnail.jpg (run pnpm thumbnails): ${missing.join(', ')}`)
  }

  const { build } = await import('vite')
  const dist = join(root, 'dist')
  rmSync(dist, { recursive: true, force: true })
  mkdirSync(dist, { recursive: true })
  for (const { dir, meta } of sketches) {
    // Rapier's compat build embeds its wasm (~4.3 MB); it is a separate chunk loaded only by physics sketches.
    await build({
      root: dir,
      base: `/${meta.slug}/`,
      logLevel: 'warn',
      build: { outDir: join(dist, meta.slug), emptyOutDir: true, target: 'es2022', chunkSizeWarningLimit: 5000 },
    })
    const thumb = join(dir, 'thumbnail.jpg')
    if (existsSync(thumb)) copyFileSync(thumb, join(dist, meta.slug, 'thumbnail.jpg'))
  }
  const feed = buildFeed(
    sketches.map((s) => s.meta),
    siteUrl,
  )
  writeFileSync(join(dist, 'feed.json'), `${JSON.stringify(feed, null, 2)}\n`)
  writeFileSync(join(dist, 'index.html'), indexHtml(feed))
  return feed
}

if (import.meta.main) {
  buildSite()
    .then((feed) => console.log(`Built ${feed.sketches.length} sketch(es) into dist/ for ${feed.site.url}`))
    .catch((e) => {
      console.error((e as Error).message)
      process.exit(1)
    })
}
