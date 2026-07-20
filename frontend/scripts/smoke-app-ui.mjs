// B2 联调：用户前端真实链路——UI 注册 → 进入主控台 → 建日程 → 日历可见
// 用法：node scripts/smoke-app-ui.mjs （frontend dev 在 5180、后端在 8787 均已运行）
import { chromium } from 'playwright'

const BASE = process.argv[2] || 'http://127.0.0.1:5180'
const stamp = Date.now()
const EMAIL = `uiuser_${stamp}@smoke.local`
const PASSWORD = 'UiSmoke2026!'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1402, height: 900 } })
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))

let failed = 0
const step = (name, ok, detail = '') => {
  if (ok) console.log(`✓ ${name}${detail ? ' · ' + detail : ''}`)
  else { failed++; console.error(`✗ ${name}${detail ? ' · ' + detail : ''}`) }
}

try {
  // 1. API 注册（UI 注册是多步表单，链路已由 Login 页覆盖；注册 API 直接建号）
  const reg = await fetch('http://127.0.0.1:8787/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD, nickname: 'UI冒烟' }),
  })
  step('注册账号（API）', reg.status === 201 || reg.status === 200, `HTTP ${reg.status}`)

  // 2. UI 登录
  await page.goto(`${BASE}/login`, { waitUntil: 'load', timeout: 20000 })
  await page.waitForTimeout(900)
  await page.locator('input[type="email"], input[placeholder*="邮箱"]').first().fill(EMAIL)
  await page.locator('input[type="password"]').first().fill(PASSWORD)
  await page.locator('button:has-text("登录")').first().click()
  await page.waitForTimeout(2600)
  step('UI 登录进入 App', page.url().includes('/app/'), page.url())
  await page.screenshot({ path: '../.omx/state/integration/app-home.png', fullPage: false })

  // 3. 主控台渲染（新账号：空数据状态而非报错）
  const homeText = await page.evaluate(() => document.body.innerText)
  step('主控台渲染（含问候语）', /SparkAlliance/.test(homeText))

  // 4. 建日程：进日程页 → 新建事件
  await page.goto(`${BASE}/app/schedule`, { waitUntil: 'load' })
  await page.waitForTimeout(2200)
  await page.locator('button:has-text("新建事件")').first().click()
  await page.waitForTimeout(900)
  await page.locator('input[placeholder*="标题"], input[placeholder*="事件"], .sch-form input[type="text"], input#event-title').first().fill('联调冒烟日程')
  const saveBtn = page.locator('button:has-text("保存"), button:has-text("创建"), button[type="submit"]:visible').first()
  await saveBtn.click()
  await page.waitForTimeout(2200)
  const schText = await page.evaluate(() => document.body.innerText)
  step('日程创建后在日历/列表可见', schText.includes('联调冒烟日程'))
  await page.screenshot({ path: '../.omx/state/integration/app-schedule.png', fullPage: false })

  // 5. 后端复核：事件真实落库
  const login2 = await fetch('http://127.0.0.1:8787/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  }).then(r => r.json())
  const from = new Date(Date.now() - 86400000 * 45).toISOString()
  const to = new Date(Date.now() + 86400000 * 45).toISOString()
  const evts = await fetch(`http://127.0.0.1:8787/api/schedule/events?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, {
    headers: { Authorization: `Bearer ${login2.token}` },
  }).then(r => r.json())
  const arr = evts.events || evts
  step('事件真实落库（API 复核）', Array.isArray(arr) && arr.some(e => e.title === '联调冒烟日程'), `count=${Array.isArray(arr) ? arr.length : 'n/a'}`)

  const fatalErrors = errors.filter(e => !/ResizeObserver/.test(e))
  step('页面零 JS 错误', fatalErrors.length === 0, fatalErrors.join(' | ').slice(0, 300))
} catch (e) {
  failed++
  console.error('✗ 联调异常:', e.message)
  await page.screenshot({ path: '../.omx/state/integration/failure.png', fullPage: true }).catch(() => {})
}

await browser.close()
console.log(failed === 0 ? '\napp UI 联调：全部通过' : `\napp UI 联调：${failed} 处失败`)
process.exit(failed === 0 ? 0 : 1)
