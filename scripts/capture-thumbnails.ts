// Captures sketches/<slug>/thumbnail.jpg (1600×1200) for every sketch from a fresh build in thumbnail mode.
// Usage: node scripts/capture-thumbnails.ts
import { join } from 'node:path'
import { buildSite, loadSketches, ROOT } from './build-site.ts'
import { launch, servePreview, waitReady } from './browser.ts'

const feed = await buildSite({ allowMissingThumbnails: true })
const server = await servePreview()
const browser = await launch()
try {
  for (const { dir, meta } of loadSketches(ROOT)) {
    const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } })
    await page.goto(`${server.url}/${meta.slug}/?thumbnail=1`)
    await waitReady(page)
    await page.waitForTimeout(500)
    await page.screenshot({ path: join(dir, 'thumbnail.jpg'), type: 'jpeg', quality: 82 })
    console.log(`thumbnail: ${meta.slug}`)
    await page.close()
  }
} finally {
  await browser.close()
  await server.close()
}
console.log(`Captured ${feed.sketches.length} thumbnail(s). Run pnpm build to include them.`)
