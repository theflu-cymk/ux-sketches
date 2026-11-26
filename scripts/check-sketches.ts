// Browser checks for every built sketch. Run after pnpm build. Prints PASS/FAIL per check; exits 1 on any FAIL.
// Usage: node scripts/check-sketches.ts
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { loadSketches, ROOT } from './build-site.ts'
import { launch, servePreview, waitReady, type Page } from './browser.ts'

const results: Array<{ sketch: string; check: string; ok: boolean; detail?: string }> = []
const record = (sketch: string, check: string, ok: boolean, detail?: string) => {
  results.push({ sketch, check, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${sketch}  ${check}${detail ? `  (${detail})` : ''}`)
}

function collectErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('console', (m: { type(): string; text(): string }) => m.type() === 'error' && errors.push(m.text()))
  page.on('pageerror', (e: Error) => errors.push(String(e)))
  return errors
}

const checksDir = join(ROOT, 'checks')
mkdirSync(checksDir, { recursive: true })
const server = await servePreview()
const browser = await launch()
const noWebGL = await launch(['--disable-webgl', '--disable-3d-apis'])

try {
  for (const { meta } of loadSketches(ROOT)) {
    const url = `${server.url}/${meta.slug}/`
    const s = meta.slug

    for (const [w, h] of [[1440, 900], [360, 780]] as const) {
      const page = await browser.newPage({ viewport: { width: w, height: h }, hasTouch: w < 500 })
      const errors = collectErrors(page)
      const started = Date.now()
      await page.goto(url)
      let ready = true
      try {
        await waitReady(page, 8000)
      } catch {
        ready = false
      }
      const ms = Date.now() - started
      record(s, `ready within 4 s at ${w}×${h}`, ready && ms <= 4000, `${ms} ms`)

      if (w === 360) {
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
        record(s, 'no horizontal overflow at 360 px', !overflow)
        await page.waitForTimeout(400)
        await page.screenshot({ path: join(checksDir, `${s}-360.png`) })
      } else {
        // Keyboard: every visible control is reachable by Tab and shows a focus outline.
        const visible: string[] = await page.$$eval('.uxs-controls button:not([hidden])', (els: HTMLElement[]) => els.map((e) => e.textContent ?? ''))
        const reached: string[] = []
        let outlined = true
        for (let i = 0; i < visible.length + 2; i++) {
          await page.keyboard.press('Tab')
          const info = await page.evaluate(() => {
            const el = document.activeElement as HTMLElement | null
            if (!el || !el.classList.contains('uxs-button')) return null
            return { text: el.textContent ?? '', outline: getComputedStyle(el).outlineStyle }
          })
          if (info && !reached.includes(info.text)) {
            reached.push(info.text)
            if (info.outline === 'none') outlined = false
          }
        }
        record(s, 'controls reachable by Tab', visible.every((v) => reached.includes(v)), reached.join(', '))
        record(s, 'focus outline visible', outlined)
        const sound = await page.$('.uxs-sound:not([hidden])')
        if (sound) record(s, 'sound starts off', (await sound.getAttribute('aria-pressed')) === 'false')

        // Drag across the middle of the stage, Reset from the keyboard mid-drag, then drag again.
        const drag = async () => {
          await page.mouse.move(w / 2, h * 0.38)
          await page.mouse.down()
          for (let i = 1; i <= 12; i++) await page.mouse.move(w / 2 + i * 14, h * 0.38 + i * 6)
        }
        await drag()
        await page.focus('.uxs-reset')
        await page.keyboard.press('Enter')
        await page.mouse.up()
        const cursor = await page.evaluate(() => document.querySelector('canvas')?.style.cursor ?? '')
        record(s, 'reset mid-drag releases the drag', cursor !== 'grabbing', `cursor "${cursor}"`)
        await drag()
        await page.mouse.up()
        await page.waitForTimeout(600)
      }
      record(s, `no console errors at ${w}×${h}`, errors.length === 0, errors.slice(0, 2).join(' | '))
      await page.close()
    }

    const reduced = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
    const reducedErrors = collectErrors(reduced)
    await reduced.goto(url)
    let reducedReady = true
    try {
      await waitReady(reduced, 8000)
    } catch {
      reducedReady = false
    }
    record(s, 'reduced motion loads and reaches ready', reducedReady && reducedErrors.length === 0, reducedErrors.slice(0, 2).join(' | '))
    await reduced.close()

    const plain = await noWebGL.newPage({ viewport: { width: 1440, height: 900 } })
    await plain.goto(url)
    let fallback = false
    try {
      await waitReady(plain, 8000)
      fallback = await plain.isVisible('text=This sketch needs WebGL')
    } catch {
      fallback = false
    }
    record(s, 'no-WebGL message shows', fallback)
    await plain.close()
  }
} finally {
  await browser.close()
  await noWebGL.close()
  await server.close()
}

const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} checks passed. 360 px screenshots are in checks/.`)
process.exit(failed.length ? 1 : 0)
