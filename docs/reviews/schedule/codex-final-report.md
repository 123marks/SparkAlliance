# 智能日程模块终审汇总报告

> 终审对象以实际仓库中的 `docs/project/MODULE-SCHEDULE.md` 为准。`codex-schedule.md` 中引用的 `docs/MODULE-SCHEDULE.md` 路径已过期。

## 一、终审结论

原始设计文档整体质量较高，方向正确，校园场景也抓得比较准，但存在三个会直接影响开发落地的硬问题：MVP 范围偏松、文档与仓库现状有脱节、状态与提醒方案没有真正收口。四份评审里，Qoder 对 MVP 取舍最务实，Copilot 对类型和状态架构最完整，iflow 对首屏体验与交互路径价值最高，OpenCode 对安全与后端边界提醒最及时。

本次终审的核心结论只有四条：

1. MVP 以“单表事件 + 前台提醒 + 三视图 + CRUD”收口，不把 V2/V3 能力提前做成半成品。
2. 重复事件采用混合策略：课表导入批量生成具体事件，普通手动重复事件按视图范围前端展开。
3. 运行时状态采用 `store` 承载，并同步到 URL query；这不是二选一。
4. `event_reminders` 不进入 MVP 正式 schema，等后台调度能力就绪后再引入。

## 二、仓库现状校验

终审不只基于文档，也基于当前仓库状态。以下事实已确认：

- 路由已经接好：`frontend/src/router/index.ts` 当前已指向 `../pages/app/Schedule.vue`，不再是 `Placeholder.vue`。
- 数据库 SQL 当前只有 `schedule_events` 一张表，见 `docs/database/schedule_tables.sql`。
- `frontend/package.json` 里目前没有 `pinia`、`date-fns`、`@vueuse/core`。
- `frontend/src/composables/useSchedule.ts` 当前自行创建了 Supabase client，且查询条件只按 `start_time` 过滤，会漏掉跨天/跨月事件。
- `frontend/src/pages/app/Schedule.vue` 已包含三视图与侧栏，但侧栏仍内联在页面中，loading/empty state 也没有收口。

这意味着原设计文档能指导开发，但不能原样当作“无差错开发蓝本”。

## 三、分歧裁决

### 1. 重复事件：前端展开 vs 后端预生成

**裁决：采用混合策略，且明确按场景分配。**

- 课表导入：预生成具体事件，直接写入 `schedule_events`
- 普通重复事件：保存重复规则，按当前视图窗口前端展开
- MVP 不支持“修改某一个实例但保留整组规则”的例外机制；该能力放到 V2，再引入 `parent_event_id` / exception model

**理由：**

- 课表是高确定性、一次性批量导入，预生成最简单，查询最直观。
- 普通重复事件需要灵活，前端按窗口展开可以避免无边界膨胀。
- 当前 SQL 已经偏向轻量实现，强行在 MVP 做完整父子实例体系，只会把复杂度提前。
- 四份意见里，Qoder 的“课表预生成 + 普通重复前端展开”最符合校园场景和现仓库基础；Copilot 与 OpenCode 的算法/边界提醒可以作为这一裁决的实现约束。

### 2. `event_reminders` 表是否必要

**裁决：MVP 不建。**

- MVP 只保留 `schedule_events.reminders` JSONB 作为提醒配置
- MVP 明确声明：提醒只保证前台页面打开时可触发
- V3 再引入 `event_reminders + Edge Function / cron` 做可靠投递、已发送状态、重试与多渠道通知

**理由：**

- 当前没有后台调度能力，先建 `event_reminders` 只会制造“双写 + 状态不一致”问题。
- Qoder 的判断是对的：MVP 做前台提醒更务实。
- OpenCode 对 `event_reminders` 的安全、RLS、发送职责问题提醒也对，这恰恰说明它不该半成品进入 MVP。

### 3. 组件拆分粒度

**裁决：保持“少而稳”的 UI 组件层，补足必要支撑组件，不回到 16 组件的过度拆分。**

MVP 推荐结构：

- 页面壳：`Schedule.vue`
- 核心视图组件：`CalendarMonth.vue`、`CalendarWeek.vue`、`CalendarDay.vue`
- 交互组件：`EventModal.vue`
- 支撑组件：`UpcomingSidebar.vue`、`EmptyState.vue`、`LoadingState.vue`
- 逻辑层：`useSchedule.ts`、`useCalendar.ts`、`useReminder.ts`、`scheduleStore.ts`

**理由：**

- Qoder 和 OpenCode 都认可“从 16 个组件收敛到 5 个核心组件”的方向。
- 但当前页面壳里混入了侧栏、空状态、加载状态，继续堆下去会让 `Schedule.vue` 失控。
- Copilot 对“UI 组件少拆，逻辑层细分”的建议最适合作为最终结构。

### 4. 视图模式存 store 还是 URL

**裁决：Store 为运行时主状态，URL query 为外部同步层。**

- `scheduleStore` 持有 `selectedDate`、`currentView`、filters 等响应式状态
- URL query 同步 `date`、`view`
- 以 store 作为组件内读写源，URL 只负责刷新恢复、分享链接、浏览器前进后退

**理由：**

- 仅用 store，刷新会丢状态。
- 仅用 URL，会让组件内状态协调成本上升。
- Copilot 给出的 “Store + URL Query 双向同步” 是最佳裁决，Qoder 对共享状态必须单例化的提醒也与此一致。

## 四、强烈推荐实施清单

以下内容已经形成跨评审共识，建议直接纳入开发基线：

1. 统一复用 `frontend/src/supabase.ts`，禁止在 `useSchedule.ts` 内重复 `createClient()`。
2. 引入集中状态层，解决 `useSchedule()` 多实例导致的数据不同步问题。
3. 事件查询改为区间重叠查询，而不是只按 `start_time` 落在窗口内查询。
4. 所有日期字符串格式化禁止使用 `toISOString().split('T')[0]` 处理本地日期。
5. 重复事件展开必须限窗，只针对当前月/周/日视图范围计算实例。
6. 首屏必须补齐 loading、empty、error 三态，不能让用户看到“空白但不知道是不是加载中”。
7. 通知权限必须在“用户主动设置提醒时”再申请，不能在进入页面时硬弹。
8. 中国节假日数据必须从页面中抽离到独立数据文件，并标注年份。
9. 增加“学期设置”最小能力：学期开始日期、总周数、考试周范围，先用 `localStorage`。
10. 先补纯函数测试，再补 Happy Path E2E；重复事件与冲突检测必须有边界测试。

## 五、对原设计文档的补丁建议

以下为应更新到 `docs/project/MODULE-SCHEDULE.md` 的 diff 说明，不代表本次已修改原文档。

### A. 文档路径与项目接入说明

```diff
- 原文引用 docs/MODULE-SCHEDULE.md
+ 统一更正为 docs/project/MODULE-SCHEDULE.md

- router/index.ts 当前指向 Placeholder.vue，开发完成后替换为 Schedule.vue
+ 当前仓库已指向 frontend/src/pages/app/Schedule.vue
+ 接入说明改为“验证路由保持正确”，不再写成待办替换项
```

### B. MVP 范围收口

```diff
- MVP 阶段建 schedule_events / course_schedules / event_reminders / calendar_subscriptions / user_time_preferences 多张表
+ MVP 只落 schedule_events
+ course_schedules、calendar_subscriptions、user_time_preferences 放入 V2
+ event_reminders 放入 V3（有后台调度后再上）
```

### C. 重复事件策略

```diff
- 重复事件统一按完整模型设计，但未明确课表与普通重复的处理边界
+ 增补“混合策略”章节：
+ 1. 课表导入批量生成具体事件
+ 2. 普通重复事件保存 recurrence rule，前端按 view range 展开
+ 3. MVP 不支持单实例例外编辑/删除
+ 4. V2 再引入 parent_event_id / exception model
```

### D. 状态架构

```diff
- 视图状态仅描述为页面内部切换
+ 明确 scheduleStore 负责 selectedDate/currentView/filters/loading
+ 明确 URL query 同步 date/view
+ 明确 useSchedule / useCalendar / useReminder 的职责边界
```

### E. 数据查询与时区

```diff
- fetchEvents 语义未明确跨天事件查询规则
+ 查询规则改为：
+ start_time < rangeEnd
+ AND COALESCE(end_time, start_time) >= rangeStart
+ AND status = 'active'

- 日期格式化示例可隐含 UTC 偏移风险
+ 增补“所有本地日期展示必须按本地时区格式化”的约束
```

### F. 提醒系统

```diff
- MVP 同时描述前端 setTimeout 与 event_reminders 后端表
+ MVP 只保留前台提醒
+ 明确限制：浏览器关闭、标签页休眠时不保证送达
+ V3 再升级为后台调度与可靠投递
```

### G. 体验与可用性

```diff
- 页面结构描述完整，但缺少空状态/加载状态的必做定义
+ 新增 EmptyState / LoadingState 为 MVP 必做项
+ 新增上下文式通知授权
+ 新增冲突警告为“非阻断式提醒”
```

### H. 节假日与学期设置

```diff
- 节假日数据直接硬编码在页面层
+ 节假日改为独立 holidays.ts，并标注年份
+ 新增 localStorage 学期设置：semesterStart / totalWeeks / examWeeks
```

### I. 测试章节

```diff
- 测试要点偏清单化，未给出最小必测对象
+ 明确：
+ 1. useCalendar 纯函数单测
+ 2. recurrence / conflict 单测
+ 3. 创建-编辑-删除-视图切换 E2E
```

## 六、给反重力的最终开发指令

> 以下指令已按当前仓库现状修正，优先级高于 `codex-schedule.md` 中的旧模板。

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【前置步骤】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. 进入 frontend 目录后执行：
   npm install pinia date-fns @vueuse/core
2. 在 Supabase SQL Editor 执行 docs/database/schedule_tables.sql
3. 验证 frontend/src/router/index.ts 中 /app/schedule 仍指向 ../pages/app/Schedule.vue
4. 全量复用 frontend/src/supabase.ts，删除 useSchedule.ts 内部 createClient()

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【MVP 开发顺序（Day 1-5）】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Day 1：状态与数据层收口
- 建立 scheduleStore，承接 selectedDate / currentView / filters / loading
- 拆出 useCalendar（纯计算）与 useReminder（提醒调度）
- 修复 fetchEvents 为区间重叠查询
- 修复本地日期格式化，避免 UTC 偏移

Day 2：月视图与页面骨架
- 保留 Schedule.vue 作为页面壳
- 抽离 UpcomingSidebar.vue
- 增加 EmptyState.vue 与 LoadingState.vue
- 完成月视图筛选、统计、空状态、错误提示

Day 3：周视图 / 日视图
- 完成 CalendarWeek / CalendarDay 的时间网格
- 加入当前时间线
- 实现基础重叠布局
- 视图切换时保持焦点日期

Day 4：事件 CRUD 与基础重复/提醒
- 完成 EventModal 的 create / view / edit
- 加入冲突检测的非阻断提示
- 实现普通重复事件的前端限窗展开
- 通知权限改为“点击添加提醒时再申请”

Day 5：联调、测试、文档修正
- 联调 schedule_events 的创建/更新/删除/筛选
- 增加 holidays.ts 与学期设置 localStorage
- 完成 Vitest：日期网格 / 重复事件 / 冲突检测
- 完成 E2E happy path：创建、编辑、删除、视图切换

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【关键实现细节（来自各智能体建议）】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. 课表导入生成具体事件；普通重复事件按视图范围展开，不全量展开。
2. Store 为内部主状态，URL query 同步 date/view；避免刷新丢失上下文。
3. 提醒配置先存在 schedule_events.reminders；MVP 不引入 event_reminders。
4. Notification 权限只在用户主动开启提醒时请求。
5. useSchedule 必须复用统一 supabase 实例，禁止重复建 client。
6. fetchEvents 不能只按 start_time 落窗，否则跨天事件会丢。
7. EmptyState / LoadingState 必做；首页不能出现“看起来像坏了”的空白页。
8. 节假日数据独立维护，且显式标注 2026 年数据。
9. useCalendar 纯函数化，方便测试闰年、跨月、周起始日等边界。
10. 冲突提示默认警告而非拦截，允许用户“仍然保存”。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【已知风险点（开发时注意）】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. `useSchedule()` 多实例状态不同步，是当前最高优先级风险。
2. 当前 `useSchedule.ts` 内部重复创建 Supabase client，会造成连接与鉴权状态分裂。
3. `toISOString()` 处理本地日期会导致 UTC+8 下日期偏移。
4. 纯前端 `setTimeout` 提醒在浏览器关闭、标签页休眠时不可靠，这是 MVP 已知限制。
5. 重复事件若不做限窗展开，会拖慢月/周切换。
6. 节假日若继续硬编码在页面层，次年必然失效。
7. Store 与 URL 双向同步要防循环 replace。
8. 当前 SQL 只有 `schedule_events`，不要在 MVP 偷偷接回多表复杂模型。
```

## 七、MVP 不做清单

为了防止范围失控，以下内容明确不进入本轮 MVP：

- `event_reminders` 独立表与后台发送状态
- Supabase Realtime 多设备实时同步
- 教务系统模拟登录导入
- OCR 拍照导入
- 日历订阅与 SSRF 防护
- 校园墙发帖关联日程
- Chat 自然语言创建日程
- 移动端拖拽改时间
- 单实例例外编辑/删除的完整重复事件模型

这些能力不是没价值，而是不该在当前 5 天 MVP 中掺进去。

## 八、综合评分

| 维度 | 满分 | 得分 | 说明 |
|------|------|------|------|
| 架构设计 | 20 | 16 | 页面结构、模块分层思路是对的，但状态单例、路由接入说明、MVP 收口还不够严谨 |
| 数据模型 | 20 | 15 | `schedule_events` 主表方向正确，但文档把多表能力写得过早，提醒模型也有重复定义 |
| 交互设计 | 20 | 17 | 月/周/日三视图与校园化交互设计成熟，但空状态、加载状态、冲突交互未被提升为强约束 |
| 校园场景适配 | 20 | 18 | 课表、周次、考试周、节假日这些关键校园场景抓得准，是文档亮点 |
| 可扩展性 | 20 | 16 | V2/V3 路线清楚，但个别能力前置到 MVP，导致扩展性和实施节奏有冲突 |
| **总分** | **100** | **82** | **高于可开发线，低于可直接无脑执行线。补齐本报告中的裁决后，可作为正式开发蓝本。** |

## 九、最终裁定

如果只保留一句话作为开发总原则，那就是：

**先把“一个人稳定地看日历、建事件、收提醒”做扎实，再去做共享、订阅、AI、后台调度。**

这份终审报告应作为反重力的最终执行基线。若后续实现与本报告冲突，以本报告为准；若仓库状态再发生变化，应优先修正文档中的“现状描述”，而不是继续沿用过期指令。
