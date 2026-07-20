// 冒烟：验证 usePlanner/useHealth 迁移后的 API 序列（与 composable 实际请求体一致）
// 运行：node scripts/smoke-planner-health.mjs（需后端 8787 在跑；自动注册临时用户并清理数据）
const B = process.env.API_BASE || 'http://127.0.0.1:8787'
let pass = 0, fail = 0, pendingV2 = []

function ok(name, cond, detail = '') {
  if (cond) { pass++; console.log(`  PASS  ${name}${detail ? '  ' + detail : ''}`) }
  else { fail++; console.log(`  FAIL  ${name}${detail ? '  ' + detail : ''}`) }
}

async function req(method, path, token, body) {
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers['Authorization'] = `Bearer ${token}`
  const r = await fetch(B + path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined })
  let json = null
  try { json = await r.json() } catch { /* 非 JSON（如 404 page not found） */ }
  return { status: r.status, json }
}

const today = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` })()

console.log(`smoke @ ${B}  today=${today}`)

// ---- 1. 注册临时用户 ----
const email = `smoke_ph_${Date.now()}@test.local`
let r = await req('POST', '/api/auth/register', null, { email, password: 'smoke12345', nickname: '冒烟规划' })
ok('注册临时用户', r.status === 201 && r.json?.token, `(${email})`)
const tok = r.json.token

// ---- 2. createGoal 等价 ----
r = await req('POST', '/api/planner/goals', tok, { title: '冒烟目标：迁移验证', goal_type: 'skill', deadline: '2026-12-31', description: '由冒烟脚本创建' })
ok('创建目标 POST /api/planner/goals', r.status === 201 && r.json?.id)
const goalId = r.json.id

// fetchGoals 等价（含 milestones 数组断言）
r = await req('GET', '/api/planner/goals', tok)
const myGoal = (r.json?.goals || []).find(g => g.id === goalId)
ok('拉取目标 GET /api/planner/goals', r.status === 200 && !!myGoal && Array.isArray(myGoal.milestones))

// ---- 3. createTask 等价 ----
r = await req('POST', '/api/planner/tasks', tok, {
  goal_id: goalId, milestone_id: null, title: '冒烟任务A', description: '推日程用',
  estimated_minutes: 45, difficulty: 4, due_date: today, source: 'manual', sort_order: 0, status: 'pending',
})
ok('创建任务 POST /api/planner/tasks', r.status === 201 && r.json?.id)
const task = r.json

// createQuickTask 等价（goal_id: null）
r = await req('POST', '/api/planner/tasks', tok, { goal_id: null, title: '冒烟快捷任务', due_date: today, difficulty: 2, source: 'manual', status: 'pending' })
ok('创建快捷任务（goal_id=null）', r.status === 201 && r.json?.goal_id === null)
const quickTaskId = r.json.id

// fetchTodayTasks 等价：status=pending&due_before=today
r = await req('GET', `/api/planner/tasks?status=pending&due_before=${today}`, tok)
const todayIds = (r.json?.tasks || []).map(t => t.id)
ok('今日任务查询 status=pending&due_before', r.status === 200 && todayIds.includes(task.id) && todayIds.includes(quickTaskId))

// ---- 4. pushTaskToSchedule 等价序列 ----
const start = new Date(`${task.due_date}T09:00:00`)
const end = new Date(start.getTime() + (task.estimated_minutes || 60) * 60000)
r = await req('POST', '/api/schedule/events', tok, {
  title: `\u{1F4CB} ${task.title}`, description: task.description || '',
  start_time: start.toISOString(), end_time: end.toISOString(),
  event_type: 'task', status: 'active', priority: task.difficulty >= 4 ? 1 : 0,
})
ok('推日程 POST /api/schedule/events', r.status === 201 && r.json?.id && r.json.title.includes(task.title))
const eventId = r.json.id
// 后端 RFC3339 不带毫秒，按时间戳等值比较
ok('日程标题带 \u{1F4CB} 前缀 / 09:00 起始', r.json.title.startsWith('\u{1F4CB}') && Date.parse(r.json.start_time) === start.getTime() && Date.parse(r.json.end_time) === end.getTime())

r = await req('PATCH', `/api/planner/tasks/${task.id}`, tok, { schedule_event_id: eventId })
ok('写回 schedule_event_id PATCH /api/planner/tasks/:id', r.status === 200 && r.json?.schedule_event_id === eventId)

// ---- 5. completeTask 等价 ----
r = await req('PATCH', `/api/planner/tasks/${task.id}`, tok, { is_completed: true, status: 'completed', completion_note: '冒烟完成' })
ok('完成任务 PATCH（is_completed+note）', r.status === 200 && r.json?.is_completed === true && r.json?.completed_at)
r = await req('PATCH', `/api/schedule/events/${eventId}`, tok, { status: 'completed' })
ok('日程状态同步 completed', r.status === 200 && r.json?.status === 'completed')

// cancelTask 的 schedule_event_id 置空写法（空串 → NULL）
r = await req('PATCH', `/api/planner/tasks/${quickTaskId}`, tok, { status: 'cancelled', schedule_event_id: '' })
ok('取消任务（schedule_event_id 空串置 NULL）', r.status === 200 && r.json?.status === 'cancelled' && r.json?.schedule_event_id === null)

// ---- 6. shareGoalToWall 等价 ----
r = await req('POST', '/api/wall/posts', tok, { content: '\u{1F3A8} 我完成了目标「冒烟目标：迁移验证」！\n\n#星火规划 #目标达成', category: 'share', tags: ['星火规划', '目标达成'] })
ok("分享广场 POST /api/wall/posts (category='share')", r.status === 201 && r.json?.category === 'share')
const postId = r.json?.id

// ---- 7. health checkin upsert → 查回（buildCheckinBody 同款双字段请求体） ----
const checkinBody = {
  date: today, checkin_date: today,
  meals: { breakfast: { done: true, name: '包子' }, lunch: { done: true }, dinner: { done: false } },
  sleep_start: `${today}T23:00:00`, sleep_end: `${today}T07:30:00`, sleep_quality: 4, sleep_hours: 8.5,
  exercise_type: '跑步', exercise_minutes: 35, exercise_intensity: 'moderate', exercise_image_url: null,
  water_intake: 1500, water_cups: 6, is_public: false, share_text: null, share_tags: null, ai_comment: null,
}
r = await req('POST', '/api/health/checkins', tok, checkinBody)
ok('打卡 upsert POST /api/health/checkins', r.status === 200 && r.json?.id)

// 再次 upsert（改水量）验证按天幂等
r = await req('POST', '/api/health/checkins', tok, { ...checkinBody, water_intake: 2000, water_cups: 8 })
ok('同日二次 upsert 不报冲突', r.status === 200)

// loadTodayCheckin 等价：GET ?from=today&to=today
r = await req('GET', `/api/health/checkins?from=${today}&to=${today}`, tok)
const row = (r.json?.checkins || [])[0]
const rowDate = row?.date || row?.checkin_date
const rowWater = row?.water_intake ?? (row?.water_cups ? row.water_cups * 250 : 0)
ok('查回今日打卡 GET /api/health/checkins?from=&to=', r.status === 200 && !!row && rowDate === today)
ok('字段映射（v1/v2 双兼容）水量=2000 运动=35', rowWater === 2000 && row?.exercise_minutes === 35, `(后端字段: ${row?.date ? 'v2:date' : 'v1:checkin_date'}/${row?.water_intake != null ? 'v2:water_intake' : 'v1:water_cups'})`)

// ---- 8. v2 端点现状探测（404 = 待 v2 后端，不算失败） ----
async function probeV2(name, method, path, body) {
  const res = await req(method, path, tok, body)
  if (res.status === 404) { pendingV2.push(name); console.log(`  WAIT  ${name} -> 404（待 v2 后端）`) }
  else ok(`${name}（v2 已上线）`, res.status < 300, `status=${res.status}`)
}
await probeV2('GET /api/planner/goals/:id/milestones', 'GET', `/api/planner/goals/${goalId}/milestones`)
await probeV2('POST /api/planner/goals/:id/milestones', 'POST', `/api/planner/goals/${goalId}/milestones`, { title: '冒烟里程碑', target_date: '2026-10-01', weight: 30, sort_order: 0 })
await probeV2('GET /api/planner/goals/:id/reviews', 'GET', `/api/planner/goals/${goalId}/reviews`)
await probeV2('POST /api/planner/goals/:id/reviews', 'POST', `/api/planner/goals/${goalId}/reviews`, { rating: 5, content: '冒烟复盘' })
await probeV2('GET /api/health/streak', 'GET', '/api/health/streak')
await probeV2('GET /api/health/challenges', 'GET', '/api/health/challenges?status=active')
await probeV2('POST /api/health/challenges', 'POST', '/api/health/challenges', { challenge_type: 'water', title: '8杯水计划', description: '连续14天每天喝够2000ml水', target_days: 14, reward_xp: 150 })

// ---- 9. 清理：deleteGoal 等价序列（任务→日程→目标）+ 帖子 ----
r = await req('GET', '/api/planner/tasks', tok)
for (const t of (r.json?.tasks || [])) {
  if (t.schedule_event_id) await req('DELETE', `/api/schedule/events/${t.schedule_event_id}`, tok)
  await req('DELETE', `/api/planner/tasks/${t.id}`, tok)
}
r = await req('DELETE', `/api/planner/goals/${goalId}`, tok)
ok('清理：删除目标', r.status === 200)
if (postId) { r = await req('DELETE', `/api/wall/posts/${postId}`, tok); ok('清理：删除帖子', r.status === 200) }
r = await req('GET', '/api/planner/tasks', tok)
ok('清理后任务为空', r.status === 200 && (r.json?.tasks || []).length === 0)

console.log(`\n结果：${pass} pass / ${fail} fail；待 v2 后端端点 ${pendingV2.length} 个：`)
for (const p of pendingV2) console.log(`  - ${p}`)
process.exit(fail > 0 ? 1 : 0)
