// Generic visual-capture helper for module acceptance screenshots.
// Usage: node scripts/capture.mjs <url> <WxH> <output.png> [waitMs] [action]
//   action: 'drawer' clicks the sidebar toggle before capturing (mobile nav check)
import { chromium } from 'playwright'

const [, , url, size, out, waitMsArg, action] = process.argv
if (!url || !size || !out) {
  console.error('Usage: node scripts/capture.mjs <url> <WxH> <output.png> [waitMs] [action]')
  process.exit(1)
}
const [width, height] = size.split('x').map(Number)
const waitMs = Number(waitMsArg || 1400)

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 })
const errors = []
page.on('pageerror', (e) => errors.push(`pageerror: ${e}`))
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(`console.error: ${m.text()}`)
})

await page.goto(url, { waitUntil: 'load', timeout: 30000 })
await page.waitForTimeout(waitMs)

if (action === 'drawer') {
  await page.click('.sidebar-toggle')
  await page.waitForTimeout(600)
}

const metrics = await page.evaluate(() => {
  const doc = document.scrollingElement
  const result = {
    horizontalOverflow: doc ? doc.scrollWidth - window.innerWidth : 0,
    viewport: { width: window.innerWidth, height: window.innerHeight },
  }
  const rect = (sel) => {
    const el = document.querySelector(sel)
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) }
  }
  result.shell = {
    sidebar: rect('.sidebar'),
    topbar: rect('.topbar'),
    main: rect('.main-content'),
    watermark: rect('.version-watermark'),
    backdrop: rect('.mobile-nav-backdrop'),
  }
  const panel = document.querySelector('.qc-panel')
  if (panel) {
    const r = panel.getBoundingClientRect()
    result.quickCenter = {
      x: Math.round(r.x),
      y: Math.round(r.y),
      width: Math.round(r.width),
      height: Math.round(r.height),
      right: Math.round(window.innerWidth - r.right),
      bottom: Math.round(window.innerHeight - r.bottom),
      scrollable: panel.scrollHeight - panel.clientHeight,
      actions: document.querySelectorAll('.qc-act').length,
      reminders: document.querySelectorAll('.qc-remind').length,
      recent: document.querySelectorAll('.qc-recent-item').length,
      feedback: document.querySelectorAll('.qc-feedback-item').length,
    }
  }
  return result
})

await page.screenshot({ path: out })
console.log('METRICS:' + JSON.stringify(metrics))
console.log(errors.length ? 'PAGE_ERRORS:\n' + errors.join('\n') : 'NO_PAGE_ERRORS')
await browser.close()
