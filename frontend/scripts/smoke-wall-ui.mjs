// 星火墙迁移冒烟：API 注册 → UI 登录 → /app/wall → 发带标签帖 → 列表出现 →
// 点赞 +1 → 打开详情 → 发评论 → 评论出现 → 推荐 tab 出现 reason chip → 零 JS 错误
// 用法：node scripts/smoke-wall-ui.mjs （frontend dev 在 5180、后端在 8787 均已运行）
import { chromium } from 'playwright'

const BASE = process.argv[2] || 'http://127.0.0.1:5180'
const API = 'http://127.0.0.1:8787'
const stamp = Date.now()
const EMAIL = `walluser_${stamp}@smoke.local`
const PASSWORD = 'WallSmoke2026!'
const POST_TEXT = `冒烟发帖 ${stamp}：星火墙已切自建后端`
const TAG_TEXT = '冒烟标签'
const COMMENT_TEXT = `冒烟评论 ${stamp}：评论链路 OK`
const SHOT_DIR = '../.omx/state/wall'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))

let failed = 0
const step = (name, ok, detail = '') => {
  if (ok) console.log(`✓ ${name}${detail ? ' · ' + detail : ''}`)
  else { failed++; console.error(`✗ ${name}${detail ? ' · ' + detail : ''}`) }
}

try {
  // 1. API 注册临时用户
  const reg = await fetch(`${API}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD, nickname: '墙冒烟' }),
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

  // 3. 进入星火墙
  await page.goto(`${BASE}/app/wall`, { waitUntil: 'load' })
  await page.waitForTimeout(2600)
  const wallCards = await page.locator('.post-card').count()
  step('星火墙列表渲染（造数帖可见）', wallCards > 0, `cards=${wallCards}`)

  // 4. 发一条带标签的帖子
  await page.locator('.qa-btn.qa-primary').first().click()
  await page.waitForTimeout(700)
  await page.locator('.composer-modal .tag-input').fill(TAG_TEXT)
  await page.locator('.composer-modal .tag-input').press('Enter')
  await page.locator('.composer-modal textarea.c-textarea').fill(POST_TEXT)
  await page.locator('.composer-modal .c-submit').click()
  await page.waitForTimeout(2400)
  const toastText = await page.locator('.toast').textContent().catch(() => '')
  step('发布提交（toast 反馈）', (toastText || '').includes('发布成功'), (toastText || '').trim())

  // 5. 「圈子」tab（全量列表按时间）验证新帖出现
  await page.locator('.nav-item:has-text("圈子")').first().click()
  await page.waitForTimeout(1200)
  const myCard = page.locator('.post-card', { hasText: POST_TEXT }).first()
  const cardVisible = await myCard.isVisible().catch(() => false)
  step('新帖出现在列表', cardVisible)
  const hasTag = await myCard.locator(`.p-tag:has-text("${TAG_TEXT}")`).isVisible().catch(() => false)
  step('帖子携带标签 chip', hasTag, `#${TAG_TEXT}`)
  await page.screenshot({ path: `${SHOT_DIR}/wall-list.png`, fullPage: false })

  // 6. 点赞 +1（乐观更新 + 服务端计数校正）
  const likeBtn = myCard.locator('.action-btn').first()
  const likesBefore = parseInt((await likeBtn.textContent() || '0').trim(), 10) || 0
  await likeBtn.click()
  await page.waitForTimeout(1400)
  const likesAfter = parseInt((await likeBtn.textContent() || '0').trim(), 10) || 0
  step('点赞数 +1', likesAfter === likesBefore + 1, `${likesBefore} → ${likesAfter}`)

  // 7. 打开详情（post-card padding 区触发 click.self）
  await myCard.click({ position: { x: 11, y: 11 } })
  await page.waitForTimeout(1600)
  const detailVisible = await page.locator('.detail-layout').isVisible().catch(() => false)
  step('打开帖子详情视图', detailVisible)

  // 8. 详情页发评论 → 评论出现
  await page.locator('.cs-textarea').fill(COMMENT_TEXT)
  await page.locator('.cs-send').click()
  await page.waitForTimeout(2200)
  const commentVisible = await page.locator('.cc-text', { hasText: COMMENT_TEXT }).first().isVisible().catch(() => false)
  step('评论提交后出现在评论区', commentVisible)
  await page.screenshot({ path: `${SHOT_DIR}/wall-detail.png`, fullPage: false })

  // 9. 返回列表 → 推荐 tab 有内容且出现 reason chip
  await page.locator('.bc-link').first().click()
  await page.waitForTimeout(900)
  await page.locator('.nav-item:has-text("推荐")').first().click()
  await page.waitForTimeout(2000)
  const recCards = await page.locator('.post-card').count()
  step('推荐 tab 有内容', recCards > 0, `cards=${recCards}`)
  const reasonChips = await page.locator('.reason-chip').count()
  const reasonSample = reasonChips > 0 ? (await page.locator('.reason-chip').first().textContent() || '').trim() : ''
  step('推荐理由 reason chip 可见', reasonChips > 0, `chips=${reasonChips} · ${reasonSample}`)
  await page.screenshot({ path: `${SHOT_DIR}/wall-recommended.png`, fullPage: false })

  // 10. 后端复核：帖子/点赞/评论真实落库
  const login2 = await fetch(`${API}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  }).then(r => r.json())
  const list = await fetch(`${API}/api/wall/posts?limit=50&offset=0`, {
    headers: { Authorization: `Bearer ${login2.token}` },
  }).then(r => r.json())
  const mine = (list.posts || []).find(p => p.content === POST_TEXT)
  step('帖子真实落库（API 复核）', !!mine, mine ? `likes=${mine.likes_count} comments=${mine.comments_count} liked=${mine.liked}` : 'not found')
  step('点赞/评论计数落库', !!mine && mine.likes_count === 1 && mine.comments_count === 1 && mine.liked === true)

  const fatalErrors = errors.filter(e => !/ResizeObserver/.test(e))
  step('页面零 JS 错误', fatalErrors.length === 0, fatalErrors.join(' | ').slice(0, 300))
} catch (e) {
  failed++
  console.error('✗ 冒烟异常:', e.message)
  await page.screenshot({ path: `${SHOT_DIR}/failure.png`, fullPage: true }).catch(() => {})
}

await browser.close()
console.log(failed === 0 ? '\n星火墙 UI 冒烟：全部通过' : `\n星火墙 UI 冒烟：${failed} 处失败`)
process.exit(failed === 0 ? 0 : 1)
