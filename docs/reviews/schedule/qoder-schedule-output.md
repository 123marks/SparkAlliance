## 架构建议

### MVP 5 组件评估：基本够用，但有 2 处遗漏

当前 MVP 精简结构（CalendarMonth / CalendarWeek / CalendarDay / EventModal / UpcomingSidebar）覆盖了核心日历展示和事件 CRUD，整体合理。但从实际代码看，存在以下缺口：

1. **UpcomingSidebar 未独立为组件** — 当前实现直接内联在 `Schedule.vue` 中（约 60 行模板 + 80 行样式）。虽然 MVP 可以接受，但它承载了"即将到来"、"类型筛选"、"本月概览"三个功能区，建议在代码量膨胀前抽离，避免主页面超过 600 行。

2. **缺少 EmptyState / Loading 骨架屏** — 设计文档提到骨架屏，但当前 `Schedule.vue` 没有 loading 状态处理（`useSchedule.ts` 暴露了 `loading` ref 但未在页面使用）。用户首次进入看到空白日历会困惑。**建议在 MVP 就加入简单的 loading spinner，骨架屏可以延后。**

3. **被遗漏的核心交互场景**：
   - 事件"标记完成"操作 — 设计稿详情弹窗有"完成"按钮，但 `EventModal` 中应确认是否实现了该功能
   - 跨天事件在月视图的显示 — 如果一个事件从周三持续到周五，月视图如何展示？设计文档未明确，建议 MVP 先简单处理（仅显示在 start_time 所在日期）

### composable vs store 职责划分

当前实现只有 `useSchedule.ts`（composable），设计文档还规划了 `scheduleStore.ts`（Pinia）。从现有代码看：

**建议的划分方式：**

| 层 | 文件 | 职责 |
|---|---|---|
| Store（Pinia） | `scheduleStore.ts` | 跨组件共享的**状态**：events 列表、selectedDate、currentView、activeTypes、loading |
| Composable | `useSchedule.ts` | **操作逻辑**：Supabase CRUD、日历计算（getMonthGrid / getWeekDays）、冲突检测 |
| Composable | `useCalendar.ts` | **纯计算**：日期格式化、月格计算、周次计算 — 无副作用，方便单元测试 |
| Composable | `useReminder.ts` | **提醒调度**：requestPermission、scheduleReminders、cancelReminders |

**核心问题**：当前 `useSchedule.ts` 自己内部持有 `events` ref，每个调用 `useSchedule()` 的组件会得到独立的实例，导致 CalendarMonth、CalendarWeek、UpcomingSidebar 之间的事件数据不同步。**必须将 `events` 提升到 Pinia store 或模块级单例。**

具体做法：将 `const events = ref<ScheduleEvent[]>([])` 移到文件顶层（模块作用域），使其成为单例。或者引入 Pinia store。考虑到项目已规划 Pinia，建议直接用 store。

### Supabase Realtime 评估

**MVP 不需要，V2 有价值。** 理由：

- 大学生日程几乎是个人使用，不存在多人协作编辑同一日程的场景
- 多端同步（手机 + 电脑）是有意义的，但 MVP 阶段用户基数小，每次切换视图时重新 fetch 即可
- Realtime 订阅会增加 Supabase 连接数消耗（免费版有限制）
- **V2 建议**：当实现"日程分享"或"校园墙关联日程"时引入 Realtime，此时多用户可能修改同一个共享事件

---

## 数据模型优化

### recurrence_days INT[] 方案评估

`recurrence_days INT[]` 存储重复星期几（如 `[1,3,5]` 表示周一三五）——**对 MVP 来说是合理的选择**，但有更优方案可以考虑：

| 方案 | 示例 | 优点 | 缺点 |
|---|---|---|---|
| INT[] 数组（当前） | `{1,3,5}` | 直觉清晰，Supabase 原生支持 | 无法表达"每月第2个周三"之类的复杂规则 |
| JSONB 规则对象 | `{"days":[1,3,5],"nth":null}` | 可扩展，未来支持复杂重复规则 | 查询不如数组方便 |
| iCal RRULE 字符串 | `FREQ=WEEKLY;BYDAY=MO,WE,FR` | 标准协议，可直接导出 .ics | 需要额外解析库，过度设计 |
| 位掩码 INT | `0b0101010` = 42 | 存储紧凑，位运算快 | 可读性差，调试困难 |

**建议：MVP 保持 INT[]，V2 如需支持 iCal 导入导出再考虑 RRULE。** 数组方案在 PostgreSQL 中查询方便（`@>` 操作符），对大学课表场景（每周固定几天）完全够用。

### 重复事件展开：前端 vs 后端

| 维度 | 前端展开 | 后端预生成 |
|---|---|---|
| 存储 | 只存1条模板事件，节省空间 | 每个实例都是独立行，18周课每门课约36条记录 |
| 修改单次 | 需要"例外"机制，复杂度高 | 直接改那一行，简单 |
| 批量删除 | 删模板即可 | 需删所有关联实例 |
| 查询性能 | 每次渲染需计算，但数据量小 | 直接 SQL range 查询，简单 |
| 离线支持 | 好，不依赖后端 | 差，必须有网络 |

**大学生场景推荐：后端预生成（课表场景）+ 前端展开（普通重复事件）混合策略。**

理由：
- 课表是一次性批量导入，预生成所有实例到 `schedule_events` 表最简单
- 普通重复事件（如"每周三跑步"）在前端按需展开更灵活
- 预估数据量：一学期约 20 门课 x 18 周 x 2 节/周 = 720 条记录，完全在 Supabase 免费版承受范围内

### event_reminders 表是否必要？

**MVP 阶段不必要，用 localStorage 更务实。**

当前设计已经在 `schedule_events.reminders` 字段用 JSONB 存储提醒配置。`event_reminders` 表的价值在于：
- 记录提醒发送状态（is_sent）
- 支持后端推送（email/微信）
- 重试机制

这些都是 V3+ 功能。MVP 使用 Web Notification + setTimeout 即可，提醒配置存在事件表的 JSONB 字段中，已发送状态用 localStorage 或 sessionStorage 记录（key = `reminder_sent_{eventId}_{offset}`），避免重复提醒。

**建议：MVP 删除 `event_reminders` 表，V3 实现后端推送时再创建。** 减少建表工作和维护成本。

### 已有 SQL 与设计文档的差异

对比 `docs/database/schedule_tables.sql`（实际建表）和设计文档，实际 SQL 做了合理精简：
- 去掉了 `timezone`、`icon`、`recurrence_interval`、`recurrence_count`、`parent_event_id`、`visibility`、`related_*` 等字段
- 去掉了 `course_schedules`、`event_reminders`、`calendar_subscriptions`、`user_time_preferences` 四张表

**这个精简方向是正确的。** MVP 只需 `schedule_events` 一张表。但需注意：

- `recurrence_interval` 被删掉意味着无法支持"每2周"等间隔重复，如果 `recurrence_type = 'biweekly'` 是硬编码的，就无问题
- `parent_event_id` 被删掉意味着无法追踪重复事件的单次修改例外，V2 需要时再加

---

## 交互设计亮点

### 事件重叠布局方案

周视图/日视图中同一时间段多个事件重叠时，推荐 **Google Calendar 式的列布局算法**：

```
算法思路：
1. 将同一时间段的重叠事件分组（connected component）
2. 计算每组中的最大并行数 N
3. 每个事件分配 1/N 的宽度
4. 按开始时间排序分配列位置

示例：3 个事件重叠
┌──────┐
│ 事件A │┌──────┐
│      ││ 事件B │┌──────┐
└──────┘│      ││ 事件C │
        └──────┘│      │
                └──────┘
```

实现要点：
- 每个事件卡片用 `position: absolute`，`top` 和 `height` 由时间决定，`left` 和 `width` 由列位置决定
- 当重叠事件 > 3 个时（大学生场景罕见），显示 "+N more" 折叠
- 悬停时将当前事件提升 z-index 并恢复全宽，方便点击

### 日期时间选择器

**建议 MVP 用原生 `<input type="date">` + `<input type="time">`，不用 `datetime-local`。**

理由：
- `datetime-local` 在不同浏览器表现差异大，且无法单独选日期或时间
- 分开选日期和时间更符合用户心智模型（"我先选哪天，再选几点"）
- 原生控件在移动端体验好（调起系统日期选择器）
- 当前 `EventModal.vue` 如果已经分开处理，保持即可
- V2 如果需要更精细的控制（如 15 分钟粒度快捷选），再考虑自定义组件

### 拖拽调整的移动端兼容（V2）

- 使用 `@vueuse/gesture` 或 `interact.js`（比 HTML5 Drag & Drop API 兼容性好）
- 移动端用 `touchstart/touchmove/touchend` 事件，加 `touch-action: none` CSS 属性
- 需要区分"滚动"和"拖拽"意图：长按 300ms 后进入拖拽模式，短触发为点击查看详情
- 拖拽中显示半透明"幽灵"预览和目标时间提示
- 建议 V2 先只支持桌面端拖拽，移动端通过弹窗编辑时间

---

## 校园场景解决方案

### 课表导入 MVP 最务实方案

高校教务系统千差万别，模拟登录在 MVP 阶段不可行（维护成本高、安全风险大、各校系统频繁改版）。

**MVP 推荐方案（优先级从高到低）：**

1. **手动录入（必做）**— 提供友好的课表录入表单：选星期几、选时间段（用学校常见的节次模板，如"第1-2节 08:00-09:35"）、填课程名和地点。支持批量复制（"这门课每周同一时间"），一次录入自动生成整学期事件。

2. **文本粘贴解析（推荐做）**— 学生从教务系统网页复制课表文本，粘贴到一个 textarea 中，前端用正则解析。很多教务系统的课表复制出来有固定格式（课程名-教师-教室-周次）。即使解析不完美，也比手动逐条输入快。

3. **ICS 文件导入（成本低，建议做）**— 很多日历应用支持导出 .ics 文件，实现一个 ICS 解析器成本很低（标准格式，有开源库）。

4. **OCR 拍照识别（V2）**— 拍摄纸质课表或截图。推荐使用 Tesseract.js（前端 OCR）或对接 AI 视觉 API（更准确）。

**不建议 MVP 做**：模拟登录教务系统、微信小程序抓取——安全风险和维护成本过高。

### 考试周与法定假日数据

**法定假日：**
- 当前 `Schedule.vue` 已硬编码了 `chineseHolidays` 对象，**这对 MVP 是合理的**
- 问题：清明、端午、中秋等农历节日每年日期不同，硬编码只对当前年份有效
- **建议**：将节日数据移到一个独立的 JSON/TS 文件（如 `src/data/holidays.ts`），按年组织。每年初更新一次。V2 可接入免费 API（如 `timor.tech/api/holiday` 或 GitHub 上的中国节假日开源数据）

**考试周：**
- 各校不同，没有通用 API
- MVP 方案：让用户在"学期设置"中手动标注考试周范围（如"第17-18周"），日历视图中高亮显示
- V2 方案：接入学校公告系统或由管理员发布校历数据

### "第 N 周"计算

**实现方式：**

```
学期周次 = floor((目标日期 - 学期开始日期) / 7) + 1
```

**用户配置方案：**
- 在日程模块设置中增加"学期设置"入口（不需要独立页面，一个小卡片即可）
- 字段：学期名称（如"2025-2026 春季学期"）、开始日期（学期第一周周一）、总周数（默认18）
- 存储位置：`localStorage`（MVP）或 `user_time_preferences` 表（V2）
- 日历视图的顶部 title 旁显示"第 N 周"标注
- 建议提供"常见学期开始日期"预设（如2月底、9月初），减少用户输入

---

## 风险点与注意事项

### 1. useSchedule 单例问题（高风险）

**现状**：`useSchedule()` 每次调用返回新的 `events` ref 实例。`Schedule.vue`、`CalendarMonth.vue`、`CalendarWeek.vue` 如果各自调用 `useSchedule()`，它们看到的事件数据是独立的副本。

**影响**：创建事件后只有主页面刷新了数据，子组件可能显示旧数据。

**修复方案**：将 `events`、`loading` 移到模块作用域（composable 文件顶部），或引入 Pinia store。**这是 MVP 上线前必须解决的问题。**

### 2. Supabase 客户端重复创建

`useSchedule.ts` 第 9-12 行自行创建了 `supabase` 客户端实例，而项目已有 `src/supabase.ts` 导出了统一实例。应改为 `import { supabase } from '../supabase'`，避免：
- 创建多个 WebSocket 连接
- Auth 状态不同步
- 连接数浪费

### 3. 节日数据硬编码的农历问题

`chineseHolidays` 中端午（06-07/06-08）、中秋（09-17）等农历节日的公历日期是 2026 年特定的。2027 年这些日期全部不对。需要在明显位置标注这是 2026 年数据，并在代码注释中提醒需要年度更新。

### 4. 时区处理

数据库使用 `TIMESTAMPTZ`（正确），但前端的 `toDateStr` 函数用 `d.toISOString().split('T')[0]` 获取日期字符串时，`toISOString()` 返回 UTC 时间。在 UTC+8 时区的用户，凌晨 0-8 点创建的事件日期会偏移一天。

**修复**：改用本地时间格式化：
```typescript
const toDateStr = (d: Date) => 
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
```

### 5. 事件查询的时间范围遗漏

`fetchEvents` 用 `.gte('start_time', ...)` 过滤，但如果一个事件的 `start_time` 在上个月但 `end_time` 在本月（跨月事件），会被漏掉。应该用 `start_time < rangeEnd AND (end_time >= rangeStart OR end_time IS NULL)` 的逻辑。

### 6. 性能相关

- **月视图不需要虚拟滚动**：大学生一个月最多 50-80 个事件，远低于虚拟滚动的必要阈值（通常 500+）。直接渲染即可。
- **当前时间红线定位**：推荐用 `top: ${(currentMinutes / totalMinutes) * 100}%` 百分比方式。如果每小时高度固定（如 60px），也可以用绝对像素 `top: ${hours * 60 + minutes}px`。**百分比方式更利于响应式**，但需要容器高度确定。建议用绝对像素 + CSS 变量控制 `--hour-height`，既精确又可调。
- **骨架屏设计**：使用与校园墙相同的 `pulse` 动画骨架条，颜色用 `rgba(255,255,255,0.03)` 和 `rgba(255,255,255,0.06)` 交替，与暗黑主题一致。

### 7. 安全注意事项

- `EventModal` 中用户输入的 title、description、location 需要防 XSS — Vue 的模板绑定默认转义 HTML，但如果使用 `v-html` 需特别注意
- 删除操作的 `deleteEvent` 没有验证 user_id 归属（依赖 RLS），确保 RLS 策略已正确启用
- `confirm()` 原生对话框在移动端体验差，建议替换为自定义确认弹窗

---

## 最终评分与开发优先级建议

### 设计文档评分

| 维度 | 评分(10分制) | 说明 |
|---|---|---|
| 功能完整性 | 9/10 | 从 MVP 到 V4 规划清晰，覆盖了大学生日程管理的核心场景 |
| 架构合理性 | 7/10 | MVP 精简方向正确，但 composable/store 职责未落地，存在单例隐患 |
| 数据模型 | 8/10 | 实际 SQL 比文档更精简务实，字段设计合理，但缺少迁移版本管理 |
| 交互设计 | 8/10 | 三种视图 + 侧边栏布局成熟，但缺少事件重叠布局、空状态、loading 的具体方案 |
| 校园适配 | 7/10 | 课表导入、周次显示等考虑到了，但方案偏理想化（模拟登录不现实） |
| 可实现性 | 8/10 | MVP 范围控制得当，5天时间紧凑但可行 |
| 代码质量 | 6/10 | 已有代码存在 supabase 实例重复创建、时区 bug、数据不同步等问题需修复 |

**综合评分：7.6 / 10** — 设计文档质量较高，但从设计到实现的落地存在几个需要立即修复的问题。

### 建议开发优先级

**第一步（立即修复，阻塞性问题）：**
1. 修复 `useSchedule.ts` 的 supabase 实例导入问题
2. 解决 events 数据单例/共享问题（引入 Pinia store 或模块级单例）
3. 修复 `toDateStr` 时区 bug
4. 修复 `fetchEvents` 跨月事件查询遗漏

**第二步（MVP 功能补全）：**
5. 加入 loading 状态处理（首屏加载）
6. 完善 EventModal 的"标记完成"功能
7. 将节日数据提取到独立文件
8. 加入"学期设置"功能（localStorage 存储学期开始日期）

**第三步（MVP 体验打磨）：**
9. 周/日视图的事件重叠布局算法
10. 当前时间红线实时更新（setInterval 每分钟更新）
11. 替换 confirm() 为自定义确认弹窗
12. 移动端响应式优化

**第四步（V2 功能启动）：**
13. 课表手动录入 + 文本粘贴解析
14. ICS 文件导入
15. 重复事件前端展开逻辑
16. 拖拽调整（桌面端优先）

**第五步（V2+ 联动）：**
17. Profile 页面"本周课程摘要" — 建议在 `useSchedule.ts` 中暴露 `getWeekSummary(userId)` 方法，返回本周事件按类型分组的摘要数据
18. 校园墙关联日程 — 在 posts 表增加 `related_event_id UUID` 可选外键，发帖时可选择关联一个日程事件
