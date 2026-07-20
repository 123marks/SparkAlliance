// B2 联调：admin 控制台真实登录 + 大盘渲染验证（依赖 frontend/node_modules 的 playwright）
// 用法：node scripts/smoke-admin-ui.mjs [adminBase] （默认 http://127.0.0.1:5181，后端须已在 8787 运行）
import { chromium } from 'playwright'

const BASE = process.argv[2] || 'http://127.0.0.1:5181'
const ADMIN_EMAIL = 'admin@spark.local'
const ADMIN_PASSWORD = process.env.ADMIN_INIT_PASSWORD || 'SparkAdmin2026!'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errors = []
page.on('pageerror', (e) => errors.push(`pageerror: ${e}`))

let failed = 0
const step = (name, ok, detail = '') => {
  if (ok) console.log(`✓ ${name}${detail ? ' · ' + detail : ''}`)
  else { failed++; console.error(`✗ ${name}${detail ? ' · ' + detail : ''}`) }
}

try {
  await page.goto(BASE, { waitUntil: 'load', timeout: 20000 })
  await page.waitForTimeout(800)
  step('未登录重定向到 /login', page.url().includes('/login'), page.url())

  await page.screenshot({ path: '../.omx/state/admin/login.png' })

  const emailInput = page.locator('input[type="email"], input[placeholder*="邮箱"]').first()
  const pwdInput = page.locator('input[type="password"]').first()
  await emailInput.fill(ADMIN_EMAIL)
  await pwdInput.fill(ADMIN_PASSWORD)
  await page.locator('button[type="submit"], button:has-text("登录")').first().click()
  await page.waitForTimeout(2500)
  step('admin 登录后进入总览', !page.url().includes('/login'), page.url())

  // 统计卡应渲染出数字（total_users >= 2：admin + 冒烟用户）
  await page.waitForTimeout(1500)
  const bodyText = await page.evaluate(() => document.body.innerText)
  const hasStats = /总用户|用户总数|total/i.test(bodyText)
  step('大盘统计区渲染', hasStats)
  const hasError = /无法连接|加载失败|重试/.test(bodyText)
  step('无连接错误提示', !hasError, hasError ? bodyText.slice(0, 200) : '')

  await page.screenshot({ path: '../.omx/state/admin/dashboard.png', fullPage: true })

  // 用户管理页
  await page.locator('a:has-text("用户")').first().click()
  await page.waitForTimeout(1800)
  const usersText = await page.evaluate(() => document.body.innerText)
  step('用户列表渲染 admin 账号', usersText.includes(ADMIN_EMAIL))
  await page.screenshot({ path: '../.omx/state/admin/users.png', fullPage: true })

  step('页面零 JS 错误', errors.length === 0, errors.join(' | ').slice(0, 200))
} catch (e) {
  failed++
  console.error('✗ 联调异常:', e.message)
  await page.screenshot({ path: '../.omx/state/admin/failure.png', fullPage: true }).catch(() => {})
}

await browser.close()
console.log(failed === 0 ? '\nadmin UI 联调：全部通过' : `\nadmin UI 联调：${failed} 处失败`)
process.exit(failed === 0 ? 0 : 1)
