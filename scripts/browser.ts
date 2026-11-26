// Shared by the thumbnail and check scripts: a local preview of dist/ and a Chrome driven by playwright-core.
import { createRequire } from 'node:module'
import { ROOT } from './build-site.ts'

/** playwright-core is not a dependency of this repo; it is borrowed from an existing install. */
const PLAYWRIGHT_FROM = process.env.PLAYWRIGHT_CORE_FROM ?? 'E:/Projects/animation/package.json'
const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Browser = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Page = any

export async function launch(extraArgs: string[] = []): Promise<Browser> {
  const { chromium } = createRequire(PLAYWRIGHT_FROM)('playwright-core')
  return chromium.launch({ executablePath: CHROME, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', ...extraArgs] })
}

/** Serves dist/ on a local port. Returns its base URL and a close function. */
export async function servePreview(port = 4173): Promise<{ url: string; close(): Promise<void> }> {
  const { preview } = await import('vite')
  const server = await preview({ root: ROOT, logLevel: 'warn', build: { outDir: 'dist' }, preview: { port, strictPort: true } })
  return {
    url: `http://localhost:${port}`,
    close: () => new Promise<void>((done) => server.httpServer.close(() => done())),
  }
}

export async function waitReady(page: Page, timeout = 15000) {
  await page.waitForSelector('body[data-ready="1"]', { state: 'attached', timeout })
}
