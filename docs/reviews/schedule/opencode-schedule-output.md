# 智能日程模块 — OpenCode 深度评审与头脑风暴报告

**评审日期**: 2026-03-22  
**评审者**: OpenCode  
**版本**: 星火校园 v1.0 MVP 阶段  
**参考文档**: `docs/project/MODULE-SCHEDULE.md` (v1.1)、`docs/project/DATA-MODELS.md`、`docs/reviews/schedule/opencode-schedule.md`  

---

## 一、系统设计漏洞与修复建议

### 1.1 数据库 RLS 策略完整性

| 问题 | 严重程度 | 说明 |
|------|---------|------|
| **事件提醒表 RLS 缺失** | 🔴 高危 | `event_reminders` 表没有 RLS 策略，用户 A 可能通过 `event_id` 猜测删除/修改用户 B 的提醒记录 |
| **日历订阅表 RLS 缺失** | 🔴 高危 | `calendar_subscriptions` 没有 RLS 策略，任何登录用户可以枚举/修改他人订阅 |
| **用户时间偏好表 RLS 缺失** | 🟡 中危 | `user_time_preferences` 虽然 UNIQUE 但没有 RLS，未登录用户可能通过 API 直接访问 |
| **course_schedules RLS 描述有误** | 🟡 中危 | 设计文档中 RLS 策略写了 `auth.uid() = user_id`，但 Supabase schema 中 `course_schedules` 没有建表，只有 `schedule_events` 有 RLS |

**修复方案**：

```sql
-- event_reminders RLS
ALTER TABLE event_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own reminders" 
  ON event_reminders FOR ALL 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

-- calendar_subscriptions RLS
ALTER TABLE calendar_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own subscriptions"
  ON calendar_subscriptions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- user_time_preferences RLS
ALTER TABLE user_time_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own preferences"
  ON user_time_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- course_schedules（如果建表的话）
ALTER TABLE course_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own courses"
  ON course_schedules FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 注意：course_schedules 当前没有在 Supabase schema 中建立
-- 需要先创建表再执行 RLS
```

### 1.2 重复事件级联规则缺失

**问题**：删除父事件时，子实例没有级联删除逻辑。

当前设计 `parent_event_id` 的外键定义中使用了 `ON DELETE SET NULL`（隐式），这会导致：
1. 删除父事件后，所有子实例的 `parent_event_id` 被设为 NULL
2. 但子实例记录本身仍然存在，变成"孤儿事件"
3. 这些孤儿事件在月视图查询中不会被过滤（因为没有 `parent_event_id IS NOT NULL` 条件）

**修复方案 A（推荐）：级联删除**
```sql
-- 删除父事件时自动删除所有子实例
ALTER TABLE schedule_events 
  ADD CONSTRAINT fk_parent 
  FOREIGN KEY (parent_event_id) 
  REFERENCES schedule_events(id) 
  ON DELETE CASCADE;

-- 配合 RLS 策略，删除时需确保是本人事件
CREATE POLICY "Delete own parent events cascade"
  ON schedule_events FOR DELETE
  USING (auth.uid() = user_id);
```

**修复方案 B（软删除 + 过滤）**：
```typescript
// useSchedule.ts 的 fetchEvents 中增加过滤
.eq('parent_event_id', null)  // 只取父事件和独立事件
// 配合前端展开重复事件
```

**推荐采用方案 A（级联删除）**，因为：
- 孤儿事件会污染用户数据
- 前端展开逻辑可以纯粹在内存中处理，不需要特殊过滤
- 配合 RLS 确保用户只能删除自己的事件

### 1.3 提醒发送职责不明确

**问题**：`event_reminders` 表的 `is_sent` 字段由谁标记？设计文档没有明确。

当前 MVP 设计使用前端 `setTimeout` 调度，问题在于：
1. **页面关闭后无法触发**：用户创建提醒后关闭页面，浏览器中 `setTimeout` 随之失效
2. **标签页切换场景**：用户创建 30 分钟后的事件，30 分钟内多次切换标签页/网络断连，`setTimeout` 可能失效

**修复方案（V3 Edge Function 方案）**：

```typescript
// Supabase Edge Function: check_reminders.ts（定时触发）
// 部署为 cron job，每分钟执行一次
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

export async function scheduled(event: ScheduledEvent) {
  const now = new Date().toISOString()
  
  // 查询所有待发送且时间已到的提醒
  const { data: reminders } = await supabase
    .from('event_reminders')
    .select('*, schedule_events(title, location)')
    .eq('is_sent', false)
    .lte('remind_at', now)
    .limit(100)  // 防止超时，分批处理

  for (const reminder of reminders ?? []) {
    // 发送 Web Push / Email / SMS（按 remind_type）
    await sendNotification(reminder)
    
    // 标记为已发送
    await supabase
      .from('event_reminders')
      .update({ is_sent: true, sent_at: now })
      .eq('id', reminder.id)
  }
}
```

**MVP 临时方案**：前端仍用 `setTimeout`，但增加页面可见性监听：

```typescript
// useReminder.ts
export function useReminder() {
  const scheduleReminders = (events: ScheduleEvent[]) => {
    for (const event of events) {
      for (const reminder of event.reminders) {
        const remindAt = subMinutes(new Date(event.start_time), reminder.value)
        const msUntil = differenceInMilliseconds(remindAt, new Date())
        
        if (msUntil > 0 && msUntil < 24 * 60 * 60 * 1000) { // 24小时内才调度
          const timerId = setTimeout(() => {
            sendNotification(event, reminder)
          }, msUntil)
          
          // 页面隐藏后重新激活时检查是否已过期
          document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
              const newMs = differenceInMilliseconds(remindAt, new Date())
              if (newMs <= 0) {
                clearTimeout(timerId)
                sendNotification(event, reminder)
              }
            }
          })
        }
      }
    }
  }
  
  return { scheduleReminders }
}
```

### 1.4 多设备同步

**问题**：同一用户手机和电脑同时打开日程，事件变更如何实时同步？

当前代码使用轮询（watch 切换月份时重新 fetch），没有实时订阅机制。

**修复方案**：使用 Supabase Realtime 订阅：

```typescript
// useSchedule.ts
let subscription: RealtimeChannel | null = null

const subscribeToChanges = () => {
  subscription = supabase
    .channel('schedule_events_changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'schedule_events',
      filter: `user_id=eq.${userId}`
    }, (payload) => {
      if (payload.eventType === 'INSERT') {
        events.value.push(payload.new as ScheduleEvent)
      } else if (payload.eventType === 'UPDATE') {
        const idx = events.value.findIndex(e => e.id === payload.new.id)
        if (idx !== -1) events.value[idx] = payload.new as ScheduleEvent
      } else if (payload.eventType === 'DELETE') {
        events.value = events.value.filter(e => e.id !== payload.old.id)
      }
    })
    .subscribe()
}

const unsubscribe = () => {
  subscription?.unsubscribe()
}

// 在 useSchedule composable 初始化时调用
// 在组件 unmounted 时取消订阅
```

---

## 二、安全性问题

### 2.1 course_schedules 学校级别只读共享

**问题**：课程表数据是否需要学校级别的只读共享？

当前所有表都使用 `auth.uid() = user_id` 的 RLS 策略，这意味着：
- 课表数据只能被创建者本人访问
- 但实际上，同一学校的同学可能希望**共享课程表**（例如查看某门课的上课地点变更）

**分析**：对于校园应用，有两种场景：
1. **个人课程表**（当前设计）：每个学生独立管理自己的课程表 ✅
2. **公共课程表**（缺失）：学校/班级统一的课程表，供所有学生只读访问

**推荐方案**（V2 实现）：
```sql
-- 新增公开课表表（不需要用户ID限制）
CREATE TABLE public_course_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL,  -- 学校ID
  semester VARCHAR(20) NOT NULL,
  course_name VARCHAR(200) NOT NULL,
  teacher VARCHAR(100),
  location VARCHAR(200),
  week_day INT,
  start_week INT,
  end_week INT,
  start_time TIME,
  end_time TIME,
  -- 所有人均可读
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE POLICY "Anyone can read public course schedules"
  ON public_course_schedules FOR SELECT
  USING (true);

CREATE POLICY "Only school admins can manage public course schedules"
  ON public_course_schedules FOR ALL
  USING (auth.uid() IN (SELECT admin_id FROM school_admins WHERE id = school_id));
```

### 2.2 calendar_subscriptions SSRF 风险

**问题**：`calendar_url` 如果是恶意链接，可能造成 SSRF（服务端请求伪造）攻击。

Supabase Edge Function 在同步日历订阅时，会通过 `calendar_url` 下载 iCal 文件：
```typescript
// 恶意日历 URL 示例
const maliciousUrl = 'http://169.254.169.254/latest/meta-data/' // AWS 元数据
const maliciousUrl2 = 'file:///etc/passwd'  // 本地文件
```

**修复方案**：
```typescript
// Edge Function: sync_calendar.ts
import { got } from 'got'

// URL 验证：只允许 https，排除内网地址
const ALLOWED_PROTOCOLS = ['https:']
const BLOCKED_HOSTS = [
  'localhost', '127.0.0.1', '0.0.0.0',
  '169.254.169.254',  // AWS 元数据
  'metadata.google.internal',  // GCP 元数据
  // 添加更多内网 IP 段...
]

function validateCalendarUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    
    if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
      return false  // 只允许 HTTPS
    }
    
    const hostname = parsed.hostname.toLowerCase()
    if (BLOCKED_HOSTS.some(blocked => hostname === blocked || hostname.endsWith(`.${blocked}`))) {
      return false
    }
    
    // 检查是否为内网 IP
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/
    if (ipPattern.test(hostname)) {
      const parts = hostname.split('.').map(Number)
      // 排除 10.x.x.x, 172.16-31.x.x, 192.168.x.x
      if (parts[0] === 10) return false
      if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return false
      if (parts[0] === 192 && parts[1] === 168) return false
    }
    
    return true
  } catch {
    return false
  }
}

export async function syncCalendar(subscriptionId: string) {
  const { data: sub } = await supabase
    .from('calendar_subscriptions')
    .select('*')
    .eq('id', subscriptionId)
    .single()
  
  if (!validateCalendarUrl(sub.calendar_url)) {
    throw new Error('Invalid calendar URL: SSRF protection triggered')
  }
  
  // 使用带超时和 IP 黑名单限制的 HTTP 客户端
  const response = await got(sub.calendar_url, {
    timeout: { request: 10000 },
    retry: { limit: 0 },
    hooks: {
      beforeRedirect: [
        (options) => {
          if (!validateCalendarUrl(options.url.toString())) {
            throw new Error('SSRF: Redirect blocked')
          }
        }
      ]
    }
  })
  
  // 解析 iCal 并入库...
}
```

### 2.3 过去时间提醒处理

**问题**：用户将 `remind_at` 设置为过去的时间，系统如何处理？

当前 `scheduleReminders` 中的 `setTimeout` 对负数 delay 有处理：
```typescript
if (delay > 0) {
  setTimeout(() => { sendNotification(event, reminder) }, delay)
}
// delay <= 0 的情况被忽略了
```

**修复方案**：
```typescript
// 检测并处理过去时间的提醒
if (msUntil <= 0) {
  // 立即发送通知，提示用户
  sendNotification(event, reminder, {
    subtitle: '⚠️ 这是一个过期的提醒',
    isDelayed: true
  })
  return
}
```

同时在 `event_reminders` 表增加约束：
```sql
-- 限制提醒时间不能早于当前时间
ALTER TABLE event_reminders
  ADD CONSTRAINT no_past_reminders
  CHECK (remind_at >= NOW() - INTERVAL '1 minute');
```

---

## 三、数据模型改进建议

### 3.1 event_reminders 表结构改进

**问题 1**：`reminders` 字段存在两处——`schedule_events` 表中是 JSONB 数组，`event_reminders` 表中是独立记录。这造成了数据不一致的风险。

**建议**：只在 `event_reminders` 表存储实际的提醒记录，`schedule_events.reminders` 作为模板配置。

```sql
-- event_reminders 表改进
CREATE TABLE event_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES schedule_events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- 提醒时间（精确到秒）
  remind_at TIMESTAMPTZ NOT NULL,
  remind_offset INT NOT NULL,  -- 提前多少分钟
  
  -- 提醒内容模板
  title_template VARCHAR(200),  -- 如 "{事件标题}"
  content_template TEXT,
  
  -- 发送状态（关键字段）
  is_sent BOOLEAN DEFAULT FALSE NOT NULL,
  sent_at TIMESTAMPTZ,
  send_error TEXT,  -- 最后错误信息
  
  -- 多渠道支持
  channels TEXT[] DEFAULT ARRAY['notification'],  -- notification, email, sms, push
  
  -- 重试机制
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 3,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 复合索引：查询待发送提醒
  CONSTRAINT valid_remind_time CHECK (remind_at >= NOW() - INTERVAL '1 minute')
);

CREATE INDEX idx_reminders_pending 
  ON event_reminders(remind_at) 
  WHERE is_sent = FALSE;

CREATE INDEX idx_reminders_event 
  ON event_reminders(event_id);
```

**问题 2**：`reminders` JSONB 字段与 `event_reminders` 表并存，造成数据冗余。

### 3.2 schedule_events 补充索引

```sql
-- 补充缺失索引
CREATE INDEX idx_schedule_events_user_status 
  ON schedule_events(user_id, status)
  WHERE status = 'active';

-- 复合索引覆盖"用户活跃事件+按时间排序"查询
CREATE INDEX idx_schedule_events_user_active_time 
  ON schedule_events(user_id, start_time)
  WHERE status = 'active';

-- 重复事件查询（找所有子实例）
CREATE INDEX idx_schedule_events_parent 
  ON schedule_events(parent_event_id)
  WHERE parent_event_id IS NOT NULL;
```

### 3.3 事件类型可扩展性方案

**问题**：`event_type VARCHAR(20)` 限制了未来自定义类型。

**方案 A（JSONB 元数据，可扩展）**：
```typescript
// 前端接口调整
interface ScheduleEvent {
  event_type: string  // 保留预设类型作为快速查询
  event_metadata: {
    customTypeName?: string  // 自定义类型名
    customColor?: string
    customIcon?: string
    [key: string]: any  // 未来可扩展字段
  }
}

// 数据库
ALTER TABLE schedule_events 
  ADD COLUMN event_metadata JSONB DEFAULT '{}';
```

**方案 B（枚举表，支持用户自定义）**：
```sql
CREATE TABLE event_type_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type_key VARCHAR(20) NOT NULL UNIQUE,  -- course, exam, custom_xxx
  label VARCHAR(50) NOT NULL,
  icon VARCHAR(10),
  color VARCHAR(20),
  is_system BOOLEAN DEFAULT FALSE,  -- 系统类型不可删除
  created_by UUID REFERENCES auth.users(id),  -- 自定义类型属于用户
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 预置数据
INSERT INTO event_type_definitions (type_key, label, icon, color, is_system) VALUES
  ('course', '课程', '📚', '#4f8ef7', TRUE),
  ('exam', '考试', '📝', '#ef4444', TRUE),
  ('task', '任务', '🎯', '#f97316', TRUE),
  ('life', '生活', '🏃', '#10b981', TRUE),
  ('reminder', '提醒', '⏰', '#8b5cf6', TRUE),
  ('holiday', '节日', '🎉', '#fbbf24', TRUE);
```

**推荐方案 A（JSONB 元数据）**，因为：
- 无需额外表和 JOIN
- 前端展示完全由前端控制
- 颜色/图标可即时覆盖

---

## 四、模块整合接口设计

### 4.1 AppHome 今日日程卡片

**需求**：首页展示"今日日程"卡片

**接口设计**：
```typescript
// GET /rest/v1/rpc/get_today_events
// 或直接 Supabase 查询

const fetchTodayEvents = async (userId: string) => {
  const today = new Date()
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString()
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString()
  
  const { data, error } = await supabase
    .from('schedule_events')
    .select('id, title, start_time, end_time, event_type, location, priority')
    .eq('user_id', userId)
    .eq('status', 'active')
    .gte('start_time', startOfDay)
    .lt('start_time', endOfDay)
    .order('priority', { ascending: false })
    .order('start_time', { ascending: true })
    .limit(5)
  
  return data
}
```

**前端集成**：
```typescript
// AppHome.vue 中使用
const { data: todayEvents } = await supabase.rpc('get_today_summary', {
  p_user_id: user.value.id,
  p_date: new Date().toISOString().split('T')[0]
})
```

### 4.2 Profile 本周安排

**需求**：个人中心展示"本周课程安排摘要"

**接口设计**：
```typescript
// 使用 Supabase RPC 函数（一次性查询本周所有事件）
const fetchWeekSummary = async (userId: string, weekStart: Date) => {
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 7)
  
  const { data } = await supabase
    .from('schedule_events')
    .select('event_type, start_time, end_time')
    .eq('user_id', userId)
    .eq('status', 'active')
    .gte('start_time', weekStart.toISOString())
    .lt('start_time', weekEnd.toISOString())
  
  // 前端聚合统计
  const summary = data.reduce((acc, e) => {
    acc[e.event_type] = (acc[e.event_type] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  return summary
}
```

### 4.3 Chat AI 助手自然语言创建日程

**需求**：用户说"帮我明天下午3点设个提醒"，AI 解析并调用日程接口

**接口设计（Chat → Schedule API）**：

```typescript
// AI 助手解析后调用以下接口之一

// 方案 1：直接 Supabase 插入
const createEventFromAI = async (userId: string, eventData: {
  title: string
  start_time: string
  end_time?: string
  event_type: string
  reminders?: { type: string; value: number }[]
}) => {
  const { data, error } = await supabase
    .from('schedule_events')
    .insert({
      user_id: userId,
      ...eventData,
      status: 'active'
    })
    .select()
    .single()
  
  if (error) throw error
  return data
}

// 方案 2：Edge Function 校验 + 插入
// POST /functions/v1/ai-create-event
interface AICreateEventRequest {
  natural_text: string  // "帮我明天下午3点设个提醒"
  user_id: string
}

interface AICreateEventResponse {
  success: boolean
  event_id?: string
  message: string
  event?: ScheduleEvent
}
```

**前端集成（Chat.vue）**：
```typescript
// Chat.vue 消息处理中增加日程意图识别
const handleMessage = async (text: string) => {
  const scheduleIntent = detectScheduleIntent(text)  // NLP 解析
  
  if (scheduleIntent) {
    // 询问用户确认
    const confirmed = await askUserConfirm(scheduleIntent)
    if (confirmed) {
      await createEventFromAI(user.value.id, scheduleIntent)
      addMessage({
        role: 'ai',
        content: `✅ 已为你创建事件「${scheduleIntent.title}」，时间是 ${formatDateTime(scheduleIntent.start_time)}`
      })
    }
  }
}

// 意图识别示例（简化版，正则匹配）
function detectScheduleIntent(text: string) {
  // "帮我明天下午3点设个提醒"
  const patterns = [
    /^(帮我|我想|帮我)?(.+?)(下午|上午|晚上|早上|中午)?(\d{1,2})[点时](.+)/,
  ]
  
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      return {
        title: match[5] || '提醒',
        start_time: parseTime(text),  // 解析具体时间
        event_type: 'reminder',
        reminders: [{ type: 'minute', value: 30 }]
      }
    }
  }
  return null
}
```

### 4.4 CampusWall 帖子关联日程

**需求**：发帖时可关联活动日程

**posts 表新增字段**：
```sql
ALTER TABLE posts ADD COLUMN related_schedule_event_id UUID;
ALTER TABLE posts 
  ADD CONSTRAINT fk_schedule_event 
  FOREIGN KEY (related_schedule_event_id) 
  REFERENCES schedule_events(id) ON DELETE SET NULL;

-- RLS：用户只能修改自己的帖子关联
CREATE POLICY "Users can update own post event link"
  ON posts FOR UPDATE
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

-- 阅读时不需要关联检查（帖子本身已有 RLS）
```

**前端 CampusWall.vue 集成**：
```typescript
// 发帖表单增加"关联日程"选项
const relatedEvent = ref<ScheduleEvent | null>(null)

// 选择日程弹窗
const showEventPicker = () => {
  // 复用 Schedule 的日程选择逻辑
}

// 提交时
const submitPost = async () => {
  await supabase.from('posts').insert({
    content: newPostContent.value,
    author_id: user.value.id,
    related_schedule_event_id: relatedEvent.value?.id || null
  })
}
```

---

## 五、性能优化建议

### 5.1 索引覆盖分析

**现有索引审查**：

| 索引 | 覆盖查询 | 评估 |
|------|---------|------|
| `idx_schedule_events_user` | `WHERE user_id = ?` | ✅ 基础 OK |
| `idx_schedule_events_start` | `WHERE start_time >= ?` | ✅ OK |
| `idx_schedule_events_end` | `WHERE end_time <= ?` | ⚠️ 不够精确 |
| `idx_schedule_events_user_time` | `WHERE user_id = ? AND start_time BETWEEN ? AND ?` | ✅ 核心查询 |
| `idx_schedule_events_type` | `WHERE event_type = ?` | ✅ OK |
| `idx_schedule_events_status` | `WHERE status = ?` | ✅ OK |
| `idx_schedule_events_parent` | `WHERE parent_event_id = ?` | ✅ OK |

**补充索引（关键）**：
```sql
-- 覆盖 AppHome 今日事件查询
CREATE INDEX idx_schedule_events_today
  ON schedule_events(user_id, start_time)
  WHERE status = 'active';

-- 覆盖即将到来查询（按 priority + start_time 排序）
CREATE INDEX idx_schedule_events_upcoming
  ON schedule_events(user_id, start_time, priority DESC)
  WHERE status = 'active';
```

### 5.2 重复事件前端展开性能

**问题**：假设一个用户有 500 条重复事件实例（每周课程 × 16 周），展开月视图时每次都重新展开所有重复事件。

**当前实现分析**：
```typescript
// useSchedule.ts 中没有 expandRecurrence 的实现
// CalendarMonth.vue 直接过滤 getEventsForDate(date)
const getEventsForDate = (date: Date): ScheduleEvent[] =>
  props.events.filter(e => isSameDay(new Date(e.start_time), date))
// 这意味着只有已展开的具体事件实例才会显示
// 重复事件在 DB 中作为独立记录存储，每次 fetch 都返回所有实例
```

**如果采用 parent_event_id 模式展开，性能分析**：
- 500 个实例展开 → 月视图只显示该月 30 天的（约 60-80 个）→ 前端过滤 O(n)
- n=500 时前端过滤是 O(n)，每月 4-6 次 fetch = 3000 次/月的过滤操作

**优化方案：展开在服务端做**

```typescript
// 修改 fetchEvents，返回已展开的事件
const fetchEvents = async (startDate: Date, endDate: Date) => {
  // 1. 先获取该用户所有重复父事件（减少传输量）
  const { data: recurringEvents } = await supabase
    .from('schedule_events')
    .select('*')
    .eq('user_id', userId)
    .neq('recurrence_type', 'none')
    .eq('status', 'active')
  
  // 2. 获取该时间段的独立事件
  const { data: standaloneEvents } = await supabase
    .from('schedule_events')
    .select('*')
    .eq('user_id', userId)
    .is('parent_event_id', null)
    .eq('recurrence_type', 'none')
    .eq('status', 'active')
    .gte('start_time', startDate.toISOString())
    .lt('start_time', endDate.toISOString())
  
  // 3. 前端只展开当前视图时间段内的实例
  const expandedInstances = recurringEvents
    .flatMap(e => expandRecurrence(e, startDate, endDate))
    .filter(e => e.start_time >= startDate && e.start_time < endDate)
  
  events.value = [...standaloneEvents, ...expandedInstances]
}
```

**前端虚拟化（月视图）**：
当一个日期有超过 5 个事件时，使用 CSS `max-height` + 滚动，当前已实现。进一步优化：

```typescript
// CalendarMonth.vue 中，事件列表超过 3 个时显示 "+N more"
const MAX_VISIBLE_EVENTS = 3

const visibleEvents = computed(() => {
  const all = getEventsForDate(date)
  return all.slice(0, MAX_VISIBLE_EVENTS)
})

const hiddenCount = computed(() => 
  Math.max(0, getEventsForDate(date).length - MAX_VISIBLE_EVENTS)
)
```

### 5.3 缓存策略

**问题**：每次切换视图都重新 fetch，如何减少请求？

**方案：本地缓存 + 乐观更新**

```typescript
// useSchedule.ts 改进
const CACHE_KEY = 'schedule_cache'
const CACHE_TTL = 5 * 60 * 1000  // 5 分钟

interface CacheEntry {
  events: ScheduleEvent[]
  fetchedAt: number
}

const getCachedEvents = (start: Date, end: Date): ScheduleEvent[] | null => {
  const cached = localStorage.getItem(CACHE_KEY)
  if (!cached) return null
  
  const entry: CacheEntry = JSON.parse(cached)
  const isExpired = Date.now() - entry.fetchedAt > CACHE_TTL
  if (isExpired) return null
  
  // 过滤出在时间范围内的缓存事件
  return entry.events.filter(e => {
    const startTime = new Date(e.start_time)
    return startTime >= start && startTime < end
  })
}

const setCachedEvents = (events: ScheduleEvent[]) => {
  const entry: CacheEntry = { events, fetchedAt: Date.now() }
  localStorage.setItem(CACHE_KEY, JSON.stringify(entry))
}

// 使用
const fetchEvents = async (startDate: Date, endDate: Date) => {
  const cached = getCachedEvents(startDate, endDate)
  if (cached) {
    events.value = cached
    // 后台静默刷新
    await refreshFromServer(startDate, endDate)
    return
  }
  
  // 正常 fetch...
}
```

---

## 六、开发质量标准

### 6.1 错误处理标准

**现有代码审查**：`useSchedule.ts` 中的错误处理过于简单：
```typescript
// 当前：只检查 error 对象，没有错误分类
const fetchEvents = async (startDate: Date, endDate: Date) => {
  loading.value = true
  try {
    const { data, error } = await supabase.from('schedule_events').select('*')
    if (!error && data) {
      events.value = data
    }
  } finally {
    loading.value = false  // 没有 error 处理
  }
}
```

**标准化方案**：

```typescript
// utils/scheduleErrors.ts
export class ScheduleError extends Error {
  constructor(
    message: string,
    public code: 'FETCH_FAILED' | 'CREATE_FAILED' | 'UPDATE_FAILED' | 'DELETE_FAILED' | 'CONFLICT',
    public originalError?: unknown
  ) {
    super(message)
    this.name = 'ScheduleError'
  }
}

// 错误消息映射（与 CampusWall 等模块保持一致）
export const SCHEDULE_ERROR_MESSAGES: Record<ScheduleError['code'], string> = {
  FETCH_FAILED: '加载日程失败，请检查网络后重试',
  CREATE_FAILED: '创建事件失败，请重试',
  UPDATE_FAILED: '更新事件失败，请重试',
  DELETE_FAILED: '删除事件失败，请重试',
  CONFLICT: '该时间段已有其他事件'
}

// useSchedule.ts 中使用
const fetchEvents = async (startDate: Date, endDate: Date) => {
  loading.value = true
  try {
    const { data, error } = await supabase
      .from('schedule_events')
      .select('*')
      .eq('user_id', userId)
      .gte('start_time', startDate.toISOString())
      .lte('start_time', endDate.toISOString())
    
    if (error) {
      throw new ScheduleError(
        SCHEDULE_ERROR_MESSAGES.FETCH_FAILED,
        'FETCH_FAILED',
        error
      )
    }
    
    events.value = data as ScheduleEvent[]
  } catch (err) {
    if (err instanceof ScheduleError) {
      console.error(`[Schedule] ${err.code}:`, err.originalError)
    }
    throw err  // 重新抛出，由组件处理 UI 反馈
  } finally {
    loading.value = false
  }
}
```

### 6.2 Loading 状态管理

**现有代码**：所有模块都使用 `const loading = ref(false)` 的方式。

**标准化方案（推荐使用 useLoading composable）**：

```typescript
// composables/useLoading.ts
export type LoadingState = 'idle' | 'loading' | 'success' | 'error'

export function useLoading<T = unknown>() {
  const state = ref<LoadingState>('idle')
  const error = ref<T | null>(null)
  
  const execute = async <R>(fn: () => Promise<R>): Promise<R | null> => {
    state.value = 'loading'
    error.value = null
    try {
      const result = await fn()
      state.value = 'success'
      return result
    } catch (e) {
      state.value = 'error'
      error.value = e as T
      return null
    }
  }
  
  return { state, error, execute }
}
```

**使用示例（Schedule.vue）**：
```typescript
const { state: fetchState, error: fetchError, execute: execFetch } = useLoading()

const fetchTodayEvents = async () => {
  const data = await execFetch(() => supabase
    .from('schedule_events')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active'))
  
  if (data) events.value = data
}
```

### 6.3 日期处理：date-fns vs 原生 Date

**使用规范**：

| 场景 | 推荐方案 | 原因 |
|------|---------|------|
| 格式化显示（`formatDateTime`） | `date-fns` `format()` | 一致性好，locale 支持 |
| 计算时间差（`differenceInMinutes`） | `date-fns` | 边界情况处理完善 |
| 日历网格计算（`getMonthGrid`） | 原生 Date 或 `date-fns` | 已有实现，不改 |
| 夏令时处理 | `date-fns` | `startOfDay`/`endOfDay` |
| ISO 字符串解析 | 原生 `new Date()` | 足够 |
| 时区感知 | `date-fns-tz` | MVP 统一用 `Asia/Shanghai`，V3 再处理多时区 |
| 比较日期是否相同 | `date-fns` `isSameDay()` | 比 `getTime()` 更语义化 |

**必须引入 date-fns 的场景**：
- `differenceInMinutes` — 计算提醒提前时间
- `addMinutes/addDays/addWeeks` — 重复事件展开中的日期递推
- `startOfDay/endOfDay` — 事件全天性判断
- `isWithinInterval` — 事件是否在查询范围内

**当前 useSchedule.ts 已实现的方法评估**：
- `getMonthGrid`：✅ 使用原生 Date，但和文档中 date-fns 版本不统一（存在两套实现）
- `getWeekDays`：✅ 逻辑正确
- `isSameDay`：✅ 可改为 `date-fns` 的 `isSameDay` 统一
- `formatTime`：✅ 简单字符串拼接，OK

**建议统一使用 date-fns**（MVP 阶段安装 `date-fns`），保持文档和代码的一致性。

---

## 七、测试策略

### 7.1 纯函数单元测试（Vitest）

```typescript
// composables/__tests__/useCalendar.test.ts
import { describe, it, expect } from 'vitest'
import { getMonthGrid, getWeekDays, isSameDay } from '../useSchedule'

describe('useCalendar - getMonthGrid', () => {
  it('2026年3月返回6周×7天网格', () => {
    const grid = getMonthGrid(2026, 3)
    expect(grid).toHaveLength(6)
    expect(grid[0]).toHaveLength(7)
  })

  it('网格第一格是周一（可能来自上月）', () => {
    const grid = getMonthGrid(2026, 3)
    const firstCell = grid[0][0]
    // 2026年3月1日是周日，第一格应该是2月23日
    expect(firstCell.getMonth()).toBe(1) // 2月
    expect(firstCell.getDate()).toBe(23)
  })

  it('网格最后一格是周六（可能来自下月）', () => {
    const grid = getMonthGrid(2026, 3)
    const lastCell = grid[5][6]
    // 3月31日是周二，最后一格应该是4月4日
    expect(lastCell.getMonth()).toBe(3) // 4月
    expect(lastCell.getDate()).toBe(4)
  })
})

describe('useCalendar - getWeekDays', () => {
  it('返回从周一开始的7天数组', () => {
    const thursday = new Date(2026, 2, 19) // 3月19日（周四）
    const days = getWeekDays(thursday)
    
    expect(days[0].getDay()).toBe(1) // 周一
    expect(days[0].getDate()).toBe(16) // 3月16日
    expect(days[6].getDay()).toBe(0) // 周日
    expect(days[6].getDate()).toBe(22) // 3月22日
  })
})

describe('useCalendar - isSameDay', () => {
  it('正确判断同一天', () => {
    const a = new Date(2026, 2, 18, 10, 30)
    const b = new Date(2026, 2, 18, 22, 45)
    expect(isSameDay(a, b)).toBe(true)
  })

  it('正确判断不同天', () => {
    const a = new Date(2026, 2, 18, 23, 59)
    const b = new Date(2026, 2, 19, 0, 0)
    expect(isSameDay(a, b)).toBe(false)
  })

  it('跨月边界', () => {
    const march = new Date(2026, 2, 31, 23, 59)
    const april = new Date(2026, 3, 1, 0, 0)
    expect(isSameDay(march, april)).toBe(false)
  })
})
```

### 7.2 重复事件边界测试用例

```typescript
describe('expandRecurrence', () => {
  // 边界1：跨月重复（周课表3月到4月）
  it('跨月重复事件只包含范围内的实例', () => {
    const event = createMockEvent({
      recurrence_type: 'weekly',
      recurrence_days: [1, 3, 5], // 周一三五
      start_time: '2026-03-02T09:00:00Z', // 第一个周一
    })
    
    // 查询范围：3月整月
    const instances = expandRecurrence(
      event,
      new Date(2026, 2, 1),
      new Date(2026, 3, 1)
    )
    
    // 3月有 5个周一(3/2,3/9,3/16,3/23,3/30) + 4个周三(3/4,3/11,3/18,3/25) + 4个周五(3/6,3/13,3/20,3/27)
    expect(instances.length).toBe(13)
    expect(instances.every(i => i.parent_event_id === event.id)).toBe(true)
  })

  // 边界2：recurrence_end 限制
  it('超过 recurrence_end 的实例不包含', () => {
    const event = createMockEvent({
      recurrence_type: 'weekly',
      recurrence_days: [1],
      recurrence_end: '2026-03-31',
      start_time: '2026-03-02T09:00:00Z',
    })
    
    const instances = expandRecurrence(
      event,
      new Date(2026, 2, 1),
      new Date(2026, 4, 1)
    )
    
    // 4月6日的实例应该被排除
    expect(instances.every(i => 
      new Date(i.start_time) <= new Date('2026-03-31')
    )).toBe(true)
  })

  // 边界3：recurrence_count 限制
  it('超过 recurrence_count 的实例不包含', () => {
    const event = createMockEvent({
      recurrence_type: 'daily',
      recurrence_count: 10, // 只重复10次
      start_time: '2026-03-01T09:00:00Z',
    })
    
    const instances = expandRecurrence(
      event,
      new Date(2026, 2, 1),
      new Date(2026, 3, 1)
    )
    
    expect(instances.length).toBeLessThanOrEqual(10)
  })

  // 边界4：biweekly 双周重复
  it('biweekly 只包含奇数周', () => {
    const event = createMockEvent({
      recurrence_type: 'biweekly',
      start_time: '2026-03-01T09:00:00Z', // 第1周
    })
    
    const instances = expandRecurrence(
      event,
      new Date(2026, 2, 1),
      new Date(2026, 3, 1)
    )
    
    // 3月1日(第1周) + 3月15日(第3周) + 3月29日(第5周) = 3个
    expect(instances.length).toBe(3)
  })
})
```

### 7.3 E2E Happy Path（Playwright）

```typescript
// e2e/schedule.spec.ts
import { test, expect } from '@playwright/test'

test.describe('智能日程 - E2E Happy Path', () => {
  test.beforeEach(async ({ page }) => {
    // 登录并进入日程页面
    await page.goto('/login')
    await page.fill('[data-testid=email]', 'test@example.com')
    await page.fill('[data-testid=password]', 'password123')
    await page.click('[data-testid=login-btn]')
    await page.goto('/app/schedule')
    await expect(page.locator('.sch-title')).toBeVisible()
  })

  test('创建并查看完整事件流程', async ({ page }) => {
    // 1. 点击新建按钮
    await page.click('.sch-create-btn')
    
    // 2. 填写表单
    await page.fill('.ev-input[placeholder="输入事件标题..."]', '测试课程：数据结构')
    await page.click('.ev-type-btn:has-text("课程")')
    
    // 3. 设置时间（今天）
    const today = new Date().toISOString().split('T')[0]
    await page.fill('input[type="date"]', today)
    
    // 4. 保存
    await page.click('.ev-btn-save')
    
    // 5. 验证 Toast
    await expect(page.locator('.sch-toast')).toContainText('事件已创建')
    
    // 6. 验证事件出现在月视图
    const todayCell = page.locator('.cm-today')
    await expect(todayCell.locator('.cm-event-label')).toContainText('测试课程')
  })

  test('视图切换', async ({ page }) => {
    // 默认月视图
    await expect(page.locator('.cm-grid')).toBeVisible()
    
    // 切换到周视图
    await page.click('.sch-view-tab:has-text("周")')
    await expect(page.locator('.cw-grid')).toBeVisible()
    
    // 切换到日视图
    await page.click('.sch-view-tab:has-text("日")')
    await expect(page.locator('.cd-timeline')).toBeVisible()
  })

  test('编辑事件', async ({ page }) => {
    // 已有事件的情况下
    await page.locator('.cm-event-dot').first().click()
    await page.locator('.ev-btn-edit').click()
    
    // 修改标题
    await page.fill('.ev-input', '修改后的标题')
    await page.click('.ev-btn-save')
    
    await expect(page.locator('.sch-toast')).toContainText('事件已更新')
  })

  test('删除事件', async ({ page }) => {
    // 打开一个事件详情
    await page.locator('.cm-event-dot').first().click()
    
    // dialog 确认
    page.on('dialog', dialog => dialog.accept())
    await page.locator('.ev-btn-danger').click()
    
    await expect(page.locator('.sch-toast')).toContainText('事件已删除')
  })

  test('类型筛选', async ({ page }) => {
    // 取消勾选课程类型
    const courseFilter = page.locator('.sch-filter-chip:has-text("课程")')
    await courseFilter.click()
    
    // 验证课程事件消失
    const courseEvents = page.locator('.cm-event-dot[style*="#4f8ef7"]')
    await expect(courseEvents).toHaveCount(0)
  })
})
```

---

## 八、综合评分

| 维度 | 评分 | 满分 | 说明 |
|------|------|------|------|
| **功能设计完整性** | 8.5 | 10 | 核心功能齐全，但提醒系统多端同步、重复事件删除级联有缺口 |
| **数据模型严谨性** | 7.0 | 10 | 基础模型 OK，event_reminders 与 reminders JSONB 并存造成冗余，缺少 RLS 策略覆盖 |
| **安全性设计** | 5.5 | 10 | SSRF 风险未处理，course_schedules 共享场景缺失，过时提醒无校验 |
| **性能设计** | 7.0 | 10 | 索引基本够用，但重复事件展开在 DB 层缺失，缓存策略空白 |
| **可扩展性** | 7.0 | 10 | event_type VARCHAR(20) 限制了自定义类型，团队共享场景未设计 |
| **UI/UX 一致性** | 9.0 | 10 | 与现有 AppHome/CampusWall/Profile 风格高度一致，组件结构清晰 |
| **代码质量** | 8.0 | 10 | 纯函数易于测试，但错误处理薄弱，useLoading 未统一 |
| **测试覆盖** | 5.0 | 10 | 组件已实现但无测试，核心算法（expandRecurrence）边界条件多，无测试 |

**综合评分：7.1 / 10**

**评语**：设计文档非常详尽，MVP 阶段的组件实现质量高，UI 与现有模块风格统一。主要问题集中在：
1. **后端安全缺失**（RLS 策略不完整，SSRF 风险）
2. **提醒系统不健壮**（跨页面/多设备失效）
3. **数据模型冗余**（event_reminders vs reminders JSONB）
4. **测试覆盖率极低**

---

## 九、开发优先级调整建议

基于风险评估的优先级重新排序：

### 🔴 P0（必须修复/实现，上线前必须解决）

| 优先级 | 任务 | 风险 | 预计工时 |
|--------|------|------|----------|
| P0-1 | 补全所有表的 RLS 策略 | 🔴 数据安全泄露 | 1h |
| P0-2 | event_reminders 表独立实现 + 字段对齐 | 🔴 提醒不生效 | 2h |
| P0-3 | 过去时间提醒校验 | 🟡 用户体验问题 | 0.5h |
| P0-4 | AppHome 今日日程卡片集成 | 🟡 核心体验缺失 | 1h |
| P0-5 | Profile 本周安排集成 | 🟡 核心体验缺失 | 1h |

### 🟡 P1（重要改进，上线后 V2 优先级最高）

| 优先级 | 任务 | 风险 | 预计工时 |
|--------|------|------|----------|
| P1-1 | 重复事件父-子级联删除（方案 A） | 🟡 孤儿事件污染 | 2h |
| P1-2 | Supabase Realtime 订阅（多设备同步） | 🟡 实时性缺失 | 2h |
| P1-3 | CalendarWeek / CalendarDay 完善（周视图日视图交互细节） | 🟡 体验不完整 | 2h |
| P1-4 | date-fns 统一替换原生 Date | 🟡 边界 case 风险 | 1h |
| P1-5 | 纯函数 Vitest 单元测试 | 🟡 回归风险 | 2h |

### 🟢 P2（V2 阶段）

| 优先级 | 任务 | 风险 | 预计工时 |
|--------|------|------|----------|
| P2-1 | course_schedules 学校级只读共享 | 🟢 功能缺失 | 3h |
| P2-2 | 重复事件服务端展开 | 🟢 性能 | 2h |
| P2-3 | Chat AI 自然语言创建日程 | 🟢 功能亮点 | 4h |
| P2-4 | calendar_subscriptions SSRF 防护 | 🟢 安全 | 2h |
| P2-5 | 缓存策略实现 | 🟢 性能 | 2h |
| P2-6 | CampusWall 帖子关联日程 | 🟢 功能缺失 | 3h |

---

## 十、总结

这份设计文档整体质量很高，体现了对 Vue 3 + Supabase 全栈开发的深刻理解。主要亮点：

✅ **文档结构完善**：功能清单、页面设计、数据模型、组件结构、核心算法均有详细说明  
✅ **组件架构精简**（v1.1 审查意见）：从 16 个组件精简到 5 个，减少了组件间通信复杂度  
✅ **UI 与现有模块高度一致**：遵循了 `glass-pro`、`spring-hover` 等项目视觉规范  
✅ **核心算法完整**：重复事件展开、冲突检测、智能建议算法均有实现  

主要需要补足的是**后端安全**（RLS 策略、SSRF 防护）和**提醒系统的多设备可靠性**，这两点直接影响用户体验和数据安全，需要在 MVP 交付前完成。

---

*报告生成：OpenCode Agent*  
*评审完成度：100%*
