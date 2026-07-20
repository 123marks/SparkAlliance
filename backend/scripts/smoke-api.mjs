// B2 联调冒烟：对自建 Go 后端跑完整 API 闭环（node backend/scripts/smoke-api.mjs）
// 退出码 0 = 全部通过；非 0 = 有失败（stderr 有明细）。幂等：每次用随机邮箱。
const BASE = process.env.API_BASE || 'http://127.0.0.1:8787'
const ADMIN_EMAIL = 'admin@spark.local'
const ADMIN_PASSWORD = process.env.ADMIN_INIT_PASSWORD || 'SparkAdmin2026!'

let passed = 0
let failed = 0
const fail = (name, detail) => { failed++; console.error(`✗ ${name}: ${detail}`) }
const ok = (name) => { passed++; console.log(`✓ ${name}`) }

async function req(method, path, { token, body, expect = 200 } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  let json = null
  try { json = await res.json() } catch { /* 204 等 */ }
  if (res.status !== expect) {
    throw new Error(`${method} ${path} -> HTTP ${res.status}（期望 ${expect}）: ${JSON.stringify(json)}`)
  }
  return json
}

async function main() {
  const stamp = Date.now()
  const email = `night_${stamp}@smoke.local`
  const password = 'SmokeTest2026!'

  // 1. 健康检查
  try { const h = await req('GET', '/healthz'); if (!h?.ok) throw new Error(JSON.stringify(h)); ok('healthz') }
  catch (e) { fail('healthz', e.message); console.error('后端未就绪，终止'); process.exit(1) }

  // 2. 注册 + me
  let token
  try {
    const r = await req('POST', '/api/auth/register', { body: { email, password, nickname: '夜跑冒烟' } })
    token = r.token
    if (!token || r.user?.email !== email) throw new Error('响应缺 token/user')
    ok('register')
  } catch (e) { fail('register', e.message); process.exit(1) }
  try { const me = await req('GET', '/api/auth/me', { token }); if (me.email !== email) throw new Error('me 不匹配'); ok('me') }
  catch (e) { fail('me', e.message) }

  // 3. 错误路径
  try { await req('POST', '/api/auth/login', { body: { email, password: 'wrong-pass' }, expect: 401 }); ok('login 错误密码 → 401') }
  catch (e) { fail('login 错误密码', e.message) }
  try { await req('GET', '/api/schedule/events?from=2026-01-01T00:00:00Z&to=2026-01-02T00:00:00Z', { expect: 401 }); ok('无 token → 401') }
  catch (e) { fail('无 token 401', e.message) }
  try { await req('GET', '/api/admin/users', { token, expect: 403 }); ok('普通用户访问 admin → 403') }
  catch (e) { fail('admin 403', e.message) }

  // 4. 日程 CRUD
  let eventId
  try {
    const now = new Date()
    const later = new Date(now.getTime() + 3600000)
    const created = await req('POST', '/api/schedule/events', { token, body: {
      title: '冒烟事件', description: null, location: null,
      start_time: now.toISOString(), end_time: later.toISOString(), all_day: false,
      event_type: 'task', event_subtype: null, color: null,
      recurrence_type: 'none', recurrence_days: null, recurrence_end: null,
      reminders: [], priority: 1,
    }, expect: 201 }).catch(async () => req('POST', '/api/schedule/events', { token, body: {
      title: '冒烟事件', start_time: now.toISOString(), end_time: later.toISOString(), all_day: false,
      event_type: 'task', recurrence_type: 'none', reminders: [], priority: 1,
    } }))
    eventId = created?.id || created?.event?.id
    const list = await req('GET', `/api/schedule/events?from=${encodeURIComponent(new Date(now.getTime() - 3600000).toISOString())}&to=${encodeURIComponent(new Date(now.getTime() + 7200000).toISOString())}`, { token })
    const events = list.events || list
    if (!Array.isArray(events) || !events.some(e => e.title === '冒烟事件')) throw new Error('区间查询未命中')
    if (!eventId) eventId = events.find(e => e.title === '冒烟事件')?.id
    ok('schedule 创建+区间查询')
    await req('PATCH', `/api/schedule/events/${eventId}`, { token, body: { title: '冒烟事件·改' } })
    ok('schedule 更新')
  } catch (e) { fail('schedule CRUD', e.message) }

  // 5. 规划
  try {
    const g = await req('POST', '/api/planner/goals', { token, body: { title: '冒烟目标', goal_type: 'academic', deadline: '2026-12-31' }, expect: 201 })
      .catch(() => req('POST', '/api/planner/goals', { token, body: { title: '冒烟目标', goal_type: 'academic', deadline: '2026-12-31' } }))
    const goalId = g?.id || g?.goal?.id
    await req('POST', '/api/planner/tasks', { token, body: { title: '冒烟任务', goal_id: goalId, difficulty: 2, due_date: '2026-07-21' }, expect: 201 })
      .catch(() => req('POST', '/api/planner/tasks', { token, body: { title: '冒烟任务', goal_id: goalId, difficulty: 2, due_date: '2026-07-21' } }))
    const tasks = await req('GET', '/api/planner/tasks?status=pending', { token })
    const arr = tasks.tasks || tasks
    if (!Array.isArray(arr) || !arr.some(t => t.title === '冒烟任务')) throw new Error('任务查询未命中')
    ok('planner goals+tasks')
  } catch (e) { fail('planner', e.message) }

  // 6. 校园墙
  let postId
  try {
    const p = await req('POST', '/api/wall/posts', { token, body: { content: '冒烟发帖 ' + stamp, category: 'help', tags: ['冒烟'], media_urls: [], is_anonymous: false }, expect: 201 })
      .catch(() => req('POST', '/api/wall/posts', { token, body: { content: '冒烟发帖 ' + stamp, category: 'help', tags: ['冒烟'], media_urls: [], is_anonymous: false } }))
    postId = p?.id || p?.post?.id
    const list = await req('GET', '/api/wall/posts?limit=10', { token })
    const posts = list.posts || list
    if (!posts.some(x => (x.content || '').includes(String(stamp)))) throw new Error('帖子列表未命中')
    if (!postId) postId = posts.find(x => (x.content || '').includes(String(stamp)))?.id
    const like = await req('POST', `/api/wall/posts/${postId}/like`, { token })
    if (like?.liked !== true) throw new Error('like 未生效: ' + JSON.stringify(like))
    await req('POST', `/api/wall/posts/${postId}/comments`, { token, body: { content: '冒烟评论', is_anonymous: false, media_urls: [] }, expect: 201 })
      .catch(() => req('POST', `/api/wall/posts/${postId}/comments`, { token, body: { content: '冒烟评论', is_anonymous: false, media_urls: [] } }))
    const comments = await req('GET', `/api/wall/posts/${postId}/comments`, { token })
    const cArr = comments.comments || comments
    if (!cArr.some(c => c.content === '冒烟评论')) throw new Error('评论未命中')
    ok('wall 发帖+点赞+评论')
  } catch (e) { fail('wall', e.message) }

  // 7. 健康打卡
  try {
    await req('POST', '/api/health/checkins', { token, body: { mood: 'good', sleep_hours: 7.5, water_cups: 6, exercise_minutes: 30, meals: { breakfast: { done: true } }, note: '冒烟' }, expect: 201 })
      .catch(() => req('POST', '/api/health/checkins', { token, body: { mood: 'good', sleep_hours: 7.5, water_cups: 6, exercise_minutes: 30, meals: { breakfast: { done: true } }, note: '冒烟' } }))
    ok('health checkin upsert')
  } catch (e) { fail('health', e.message) }

  // 8. admin 链路
  try {
    const a = await req('POST', '/api/auth/login', { body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } })
    const adminToken = a.token
    const overview = await req('GET', '/api/admin/stats/overview', { token: adminToken })
    if (typeof overview.total_users !== 'number' || overview.total_users < 1) throw new Error('overview 数据异常: ' + JSON.stringify(overview))
    const users = await req('GET', `/api/admin/users?search=${encodeURIComponent('night_' + stamp)}`, { token: adminToken })
    const uArr = users.users || users
    if (!uArr.some(u => u.email === email)) throw new Error('admin 用户搜索未命中')
    if (postId) {
      await req('PATCH', `/api/admin/posts/${postId}`, { token: adminToken, body: { status: 'hidden' } })
      const after = await req('GET', '/api/wall/posts?limit=20', { token })
      const posts2 = after.posts || after
      if (posts2.some(x => x.id === postId)) throw new Error('隐藏后帖子仍可见')
    }
    ok('admin 登录+大盘+搜索+审核隐藏')
  } catch (e) { fail('admin', e.message) }

  console.log(`\n结果：${passed} 通过 / ${failed} 失败`)
  process.exit(failed === 0 ? 0 : 1)
}

main().catch(e => { console.error('冒烟脚本异常:', e); process.exit(1) })
