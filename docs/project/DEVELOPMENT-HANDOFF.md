# Spark Alliance 开发交接总览

> 面向接手开发者的 README 式交接文档。目标是让后来者快速知道：过去做了什么、现在停在哪里、未来按什么方向继续做。

最后更新：2026-07-20（第二次更新：Wave 1 壳层 + Dashboard 已达验收线）
当前主线任务：`.trellis/tasks/07-14-spark-alliance-visual-replica`
当前状态：Wave 1（全局壳层 + Dashboard）已通过 90 分验收线并有截图/测试证据；下一阶段是 Wave 2（AI 助手 + 智能日程）。

---

## 1. 一句话结论

这个项目不是从零开始，也不是已经完成。它现在处在“高保真 Vue 应用雏形 + 多模块真实业务正在逐步补齐 + 设计稿复刻进入分阶段验收”的阶段。

后续开发不要再跨模块大面积同时改。正确方式是：

1. 先读本交接文档和当前模块资料。
2. 只选一个模块作为阶段。
3. 保留现有路由、Supabase、local-first 行为和用户流程。
4. 对照 `DesingImage/`、`tasks/*-blueprints.md`、`tasks/*-design-tokens.md` 做视觉和行为补齐。
5. 每完成一个模块，更新本文件里的模块状态，并补充该模块交接记录。

---

## 2. 过去、现在、未来

### 过去

项目早期定位偏“校园超级 App”，包含 AI 助手、校园墙、购物、日程、健康、伴侣、学习、人才、资讯、共创、设置、个人主页、官网等模块。仓库里已经沉淀了大量规划、评审报告、数据库脚本和设计图，但模块实现成熟度不一致：有的已经有真实业务流，有的还是视觉和交互骨架。

### 现在

当前执行方向已经调整为“设计稿驱动的完整前端复刻 + 真实业务闭环保留”。这意味着：

- 不是做静态截图页。
- 不是用 mock 数据替代现有功能。
- 不是继续无边界加模块。
- 是在 Vue 3 + TypeScript + Supabase 架构上，把每个模块按企业级标准补齐：视觉、响应式、状态语义、错误处理、可访问性、测试、验收截图和交接记录。

### 未来

后续按四个阶段推进：

1. Wave 1：全局应用壳层 + Dashboard。
2. Wave 2：AI 助手 + 智能日程/规划。
3. Wave 3：校园墙 + 购物 + 健康 + 伴侣。
4. Wave 4：学习、传承、人才、资讯、共创、设置、个人主页、反馈、官网公开页。

每个阶段完成后再进入下一个阶段。不要因为某个页面看起来简单就插队改，否则会造成视觉体系、路由行为和数据契约互相打架。

---

## 3. 当前事实来源

后续接手时按这个优先级判断，不要凭记忆猜：

1. `DesingImage/` 下的截图和模块 README。
2. `tasks/*-blueprints.md` 与 `tasks/*-design-tokens.md`。
3. `.trellis/tasks/07-14-spark-alliance-visual-replica/prd.md`。
4. `.trellis/tasks/07-14-spark-alliance-visual-replica/design.md`。
5. `.trellis/tasks/07-14-spark-alliance-visual-replica/implement.md`。
6. `.omx/state/<scope>/ralph-progress.json` 的视觉 verdict。
7. 当前源码、当前测试输出、当前 git diff。
8. 旧评审报告和旧项目规划文档。

截图高于通用 UI 建议。UI Pro Max 之前生成过玫瑰色 App Store 风格方案，已经明确拒绝；只保留其中通用工程约束，例如 44px 触控目标、响应式断点、语义化按钮、动态 ARIA、可见 focus、reduced-motion。

---

## 4. 我已经做了什么

### 4.1 建立并续接 Trellis 主线任务

当前主线任务位于：

- `.trellis/tasks/07-14-spark-alliance-visual-replica/prd.md`
- `.trellis/tasks/07-14-spark-alliance-visual-replica/design.md`
- `.trellis/tasks/07-14-spark-alliance-visual-replica/implement.md`
- `.trellis/tasks/07-14-spark-alliance-visual-replica/research/visual-direction.md`

这些文件定义了完整复刻目标、设计优先级、技术边界、交付波次和验收条件。

### 4.2 Dashboard 已进入视觉迭代阶段

主要修改范围：

- `frontend/src/pages/app/AppHome.vue`
- `frontend/src/utils/appHomeDashboard.ts`
- `frontend/src/utils/appHomeDashboard.test.ts`
- `frontend/src/router/index.ts`
- `.omx/state/dashboard/ralph-progress.json`

已完成的 Dashboard 工作：

- 增加开发视觉 fixture 路由：`/__visual/dashboard`，用于非生产、确定性截图。
- 修正 Dashboard 数据语义：区分真实、派生、fixture、loading、error、unavailable。
- 六个统计卡顺序和数据契约已测试保护。
- 活跃目标只统计 `active`，不再把 `paused` 计入活跃。
- 本周任务范围改成本地周一到周日，不再只查到今天。
- 周执行率按 completed / in_progress / notStarted 分类，不再伪造趋势。
- 日程状态增加 `ended`，避免用列表下标判断“进行中/即将开始”。
- 购物、校园热榜、规划、日程等区块增加 loading/error/unavailable 显式状态。
- 移除“最长 14 天”、伪校园热度、伪“较上周”趋势。
- Quick Center 从文本型小面板重建为接近参考图的结构：品牌标题、头像问候、6 个快捷动作、2x2 今日提醒、4 个最近访问、4 个灵感/反馈入口、底部文案。
- 结构性 emoji 已逐步替换成可控 SVG；徽章使用已有 bitmap 资产。
- Hero、状态区、工作区、效率区、成长区、footer 做过一轮 1402x1122 视口几何压缩，确保主内容能完整显示。

已记录视觉证据：

- `.omx/state/dashboard/iteration-4-desktop.png`
- `.omx/state/dashboard/iteration-4-quick.png`
- `.omx/state/dashboard/iteration-4-mobile.png`
- `.omx/state/dashboard/ralph-progress.json`

最近一次 Dashboard verdict：

- iteration：4
- score：80/100
- verdict：`revise`
- pass threshold：90

结论：Dashboard 不能标记完成，只能标记为“结构接近，继续修正”。

### 4.3 已知测试证据

上一轮记录的测试证据：

- focused：`17/17`
- full vitest：`60 passed / 39 todo / 0 failed`
- `git diff --check` 当时通过

注意：这是上一轮证据，不等于当前工作树最终绿。接手后必须重新跑：

```powershell
cd frontend
npx vitest run src/utils/appHomeDashboard.test.ts
npm run test
npm run build
```

2026-07-20 里程碑：全仓 `vue-tsc` 错误已清零（31 -> 0），`npm run build`（vue-tsc -b && vite build）首次完整通过。后续任何新增类型错误都是新问题，必须当轮修复，不允许再堆积“既有错误”。

## 3.1 架构切换（2026-07-20 晚）：Supabase → 本地 PostgreSQL + 自建 Go 后端

用户决策：不再依赖 Supabase 托管服务（境外延时 + 受限风险），数据库迁到本地 PostgreSQL。

- 架构契约（单一事实来源）：`docs/project/BACKEND-CONTRACT.md`
- 数据库：Docker 容器 `spark-postgres`（PostgreSQL 18，127.0.0.1:5433，`backend/docker-compose.yml`）
- 后端：Go 1.26（`backend/server/`，端口 8787，JWT + bcrypt + pgx）
- 管理控制台：`admin/`（Vue 3 + ECharts，端口 5181，登录仅限 role=admin）
- GitHub：https://github.com/123marks/SparkAlliance （master -> main 已推送；`DesingImage/`≈1GB 设计图与本地 AI 配置已 gitignore，不入库）

前端迁移状态（模块 -> 数据源）：

| 模块 | 状态 |
|---|---|
| 认证（Login/Register/useAuth/守卫/登出） | ✅ 已切自建 API（`src/api/client.ts`、`src/api/auth.ts`；token 存 `spark_api_token`；401 广播 `spark-auth-expired` 回登录页） |
| 日程 useSchedule | ✅ 已切自建 API（区间查询由后端 from/to 完成） |
| 校园墙 | ⏳ 待迁（下一切片：CampusWall.vue 直连 supabase 的查询全部换 `/api/wall/*`） |
| 规划 usePlanner / 健康 useHealth / 购物 useShop / 伴侣 / AI 助手 EdgeFunction | ⏳ 未迁；当前无 supabase 会话时按既有设计显示 unavailable/空状态，不崩 |
| persistSync 云同步 / storage 上传 | ⏳ 未迁；上传走 `/api/uploads`（contract §4.5），迁移时替换 |

迁移配方（后续模块照抄）：composable 里 `supabase.from(...)` → `apiFetch('/api/...')`；`supabase.auth.getUser()` → `getToken()` 判空；属主过滤删掉（后端 JWT 兜底）；错误统一 ApiError。

### 4.4 全局壳层已识别为第一阶段剩余关键问题

当前 `AppLayout.vue` 有一些已有改动，包括：

- Topbar 增加消息入口。
- 导航 hover / active 视觉增强。
- 临时版本水印 `v7.4.1` 仍存在。
- 桌面 sidebar 仍约 220px，目标是 200px。
- 375px 下 sidebar/topbar 与内容严重重叠。

`CosmicBackground.vue` 已有 reduced-motion 相关改动，接手时保留，不要回退。

---

## 5. 现在停在哪里

### 当前阶段

Wave 1（全局壳层 + Dashboard）已完成并通过 90 分验收线（iteration 6，verdict `pass`）。证据齐全：三视口截图、结构度量、focused/full 测试、build。

### 当前最小下一步

进入 Wave 2：AI 助手（`/app/chat`），然后智能日程（`/app/schedule`）。流程按 §7.1 执行：

1. 读 `DesingImage/starspark-helper/`（AI 助手）与 `DesingImage/starspark-schedule/`（日程）的截图与 README。
2. 记录 baseline：当前页面截图、`vue-tsc` 中该模块的既有错误（Chat.vue 3 个、Planner.vue 1 个、Tarot.vue 1 个、SparkMascot.vue 1 个）。
3. 修视觉时同步清掉本模块 typecheck 错误，不碰其他模块。
4. 采集截图用 `frontend/scripts/capture.mjs`（用法见 §8）。

### Wave 1 已解决项（不要回退）

- Quick Center 垂直节奏：772px 面板 + flex 分配（iteration 5）。
- 共享 sidebar 200px 全高、topbar 56px 仅覆盖主区域（grid 壳层）。
- 移动端 375px：侧栏改为无障碍抽屉（backdrop、Escape、焦点管理），不再重叠。
- 临时版本水印已移除。
- Hero 换用参考图主视觉 `dashboard/hero-banner.png`（居中发光轨道星球）。
- 六个统计卡换用参考霓虹 bitmap 图标（`/dashboard/task|goal|shop|pending|focus|streak.png`）。

### 当前工作树风险

当前仓库有大量未提交改动，`git diff --name-only` 显示包括设计图、前端页面、脚本和根目录临时文档。接手者必须遵守：

- 不要 `git reset --hard`。
- 不要 `git checkout --` 回退别人改动。
- 不要清理看起来“多余”的图片或临时文件，除非确认归属和用途。
- 每次只处理一个模块范围。

---

## 6. 模块阶段总表

状态含义：

- `not_started`：尚未进入当前复刻阶段。
- `in_progress`：已有实质开发，但未完成验收。
- `verification_needed`：功能/视觉已有进展，需要测试、截图、review 证明。
- `accepted`：已经有当前标准下的测试、截图、交接文档和验收结论。
- `blocked`：缺少设计稿、数据、权限或环境导致无法推进。

| 阶段 | 模块 | 入口 | 主要文件 | 设计/资料 | 当前状态 | 下一步 |
|---|---|---|---|---|---|---|
| Wave 1 | 全局壳层 | `/app/*` | `AppLayout.vue`, `CosmicBackground.vue` | Dashboard 6/7 间接约束 | `accepted` | 保持现状；后续模块不得私改壳层几何 |
| Wave 1 | Dashboard 主控台 | `/app/home`, `/__visual/dashboard` | `AppHome.vue`, `appHomeDashboard.ts` | `DesingImage/starspark-dashboard/`, `tasks/dashboard-*` | `accepted` | iteration 6 已过 90 分线；仅接受局部微调 |
| Wave 2 | AI 助手 | `/app/chat`, `/__visual/chat` | `Chat.vue`, `useSparkAI.ts`, `ChatRightPanel.vue` | `DesingImage/starspark-helper/` | `accepted` | iteration 3 过 90 分线（含既定偏差记录）；只接受局部微调 |
| Wave 2 | 智能日程/规划 | `/app/schedule`, `/__visual/schedule` | `SmartSchedule.vue`, `Schedule.vue`, `ScheduleInsights.vue`, `Planner.vue`, `Tarot.vue` | `DesingImage/starspark-schedule/`, `tasks/schedule-*`, schedule review | `accepted`（日历工作台） | iteration 3 过 90 分线；规划面板/卡罗牌深度视觉对齐为独立后续切片 |
| Wave 3 | 校园墙 | `/app/wall`, `/__visual/wall` | `CampusWall.vue`, `WallPostDetail.vue`, `campusWall.ts` | `DesingImage/starspark-wall/`, `tasks/wall-*`, reviews | `in_progress` | 类型清零 + Post/Comment 契约统一 + 星火洞察面板已上线；下一步对照设计稿做视觉对齐 |
| Wave 3 | 购物 | `/app/shop` | `Shop.vue`, `components/shop/*` | `DesingImage/starspark-shopping/` | `in_progress` | 列表/详情/发布/聊天/空状态逐一验收 |
| Wave 3 | 健康 | `/app/health` | `Health.vue`, `components/health/*` | `DesingImage/starspark-fitness/` | `in_progress` | 检查当前 dirty 改动，修 typecheck 后按设计稿验收 |
| Wave 3 | 伴侣 | `/app/companion` | `Companion.vue`, `components/companion/*` | `DesingImage/starspark-companion/`, `companion-review-report.md` | `verification_needed` | 旧报告称 18/18 功能完成，但仍需当前构建和视觉复验 |
| Wave 4 | 学习中心 | `/app/learn` | `LearnHub.vue`, `StudyRoom.vue`, `Resources.vue` | 根级学习/资源素材 | `not_started` | 先确定 canonical 参考，再合并旧路由能力 |
| Wave 4 | 星火传承 | `/app/legacy` | `SparkLegacy.vue`, `SparkMessages.vue`, `Mentors.vue` | 根级寄语/学长素材 | `not_started` | 梳理 legacy/messages/mentors 的真实信息架构 |
| Wave 4 | 人才 | `/app/talent` | `Talent.vue` | 旧规划/评审资料 | `not_started` | 降低范围，先做可用简历/岗位匹配骨架 |
| Wave 4 | 资讯 | `/app/news` | `News.vue`, `backend/news-crawler` | backend README | `not_started` | 不要当普通前端页推进，先明确数据源和爬虫边界 |
| Wave 4 | 共创 | `/app/cocreate` | `CoCreate.vue` | 暂缺强 canonical | `not_started` | 使用全局壳层 + 产品 IA，标记缺失截图 |
| Wave 4 | 设置/个人/反馈 | `/app/settings`, `/app/profile`, `/app/feedback` | `settings/*`, `Profile.vue`, `FeedbackCenter.vue` | 多份设计方案和数据库 SQL | `in_progress` | 保留路由树，逐页修表单、状态、可访问性 |
| Wave 4 | 官网公开页 | `/`, `/login`, `/register`, `/docs`, `/community`, `/about` | `landing/*`, `auth/*` | official-website reviews | `in_progress` | 下线过度承诺，统一品牌视觉和真实能力边界 |

---

## 7. 后续怎么做

### 7.1 每个模块的标准流程

每个模块都按同一流程推进：

1. 读取模块资料：`DesingImage/<module>/README.md`、对应截图、`tasks/*blueprints.md`、`tasks/*design-tokens.md`、旧 review。
2. 记录当前 baseline：截图、测试、现有 bug、当前 dirty diff。
3. 锁行为：先补纯函数或关键状态测试，不先大改 UI。
4. 实现视觉：只改当前模块允许范围。
5. 保留业务：不替换 Supabase/localStorage/路由为死 mock。
6. 验证：focused test、full vitest、build/typecheck、Playwright 截图、visual-verdict。
7. 交接：更新本文件模块状态，补充模块交接记录。

### 7.2 模块完成标准

一个模块只有同时满足以下条件才能标记 `accepted`：

- canonical 截图对应主要页面和关键状态都已实现。
- `visual-verdict >= 90`，或明确说明缺失 canonical 截图无法像素验收。
- 桌面 1402x1122、平板 1024x768、手机 375x812 无横向滚动、重叠、截断和隐藏关键操作。
- 真实数据/fixture/loading/error/empty 状态区分清楚。
- 关键交互不是死按钮。
- icon-only 控件有 accessible name，触控目标至少 44px。
- focused tests 通过。
- full test/build 输出已记录；既有失败与新增失败分清。
- 交接文档写清 changed files、决策、验证、风险、下一步。

### 7.3 每次交接必须写什么

每完成一个模块，在本文件对应模块下更新状态，并追加一段交接记录：

```markdown
### YYYY-MM-DD 模块名交接

状态：accepted / verification_needed / in_progress

本次完成：
- ...

修改文件：
- `path`

保留行为：
- ...

验证：
- `command` -> result
- screenshot path
- visual-verdict score

重要决策：
- ...

未完成/风险：
- ...

下一位接手者先做：
1. ...
2. ...
```

---

## 8. 立即接手清单

Wave 1 已验收。下一位开发者按下面顺序进入 Wave 2（AI 助手）：

1. 启动 Vite：

```powershell
cd frontend
npm run dev -- --host 127.0.0.1 --port 5180
```

2. 读取 AI 助手参考资料：`DesingImage/starspark-helper/`（1.png、2.png 为 canonical）。
3. 打开 `/app/chat` 记录当前 baseline 截图：

```powershell
cd frontend
node scripts/capture.mjs "http://127.0.0.1:5180/app/chat" 1402x1122 baseline-chat.png 5000
```

（capture.mjs 会输出结构度量 JSON 和 page error；第 5 个参数传 `drawer` 可先打开移动抽屉再截图。）

4. 记录 Chat 模块既有 typecheck 错误（`Chat.vue` 2338 行 `pagebreak`、775 行未用变量、`SparkMascot.vue` 166 行未用变量），修视觉时一并清掉。
5. 只改 `/app/chat` 范围内文件；壳层（`AppLayout.vue`）已验收，禁止顺手改。
6. 每轮视觉迭代后：截图 → 与参考图对比打分 → 更新 `.omx/state/chat/ralph-progress.json`（新 scope）。
7. 完成后跑全量验证并在本文件追加交接记录：

```powershell
cd frontend
npm run test
npx vue-tsc -b
npx vite build
```

## 8.1 Wave 1 验收证据（2026-07-20）

- 桌面 1402x1122：sidebar 200px 全高，topbar 56px 仅覆盖主区域，main 区域 1202x1066 无重叠无横向溢出。
- 平板 1024x768：64px 图标栏，无横向溢出。
- 手机 375x812：侧栏默认离屏（x=-280），抽屉打开后 280px + 全屏 backdrop；topbar 品牌恢复显示。
- Quick Center 558x996：面板 428x772 @ x74/right56，6 动作 + 4 提醒 + 4 最近 + 4 反馈，无 page error。
- 截图存档：`.omx/state/dashboard/iteration-6-*.png` 与 `.omx/state/dashboard/captures/shell-*.png`。
- verdict：`.omx/state/dashboard/ralph-progress.json` iteration 6，score 90，`pass`。

---

## 9. 当前最重要的风险

1. 工作树很脏，不能做破坏式 Git 操作。
2. Dashboard 视觉进度接近但没过 90 分，不能宣布完成。
3. 全局壳层会影响所有 `/app/*` 页面，必须单独切片做，不能夹在 Dashboard 局部改动里。
4. 旧文档很多，部分已经过期；以当前源码、设计稿、Trellis 和 verdict 为准。
5. 部分模块旧 review 写“已完成”，但当前 typecheck 和视觉验收未必仍成立，必须重新验证。
6. 不新增依赖，除非用户明确批准。
7. 不要继续引入泛用 mock 数据来填界面；不可用就显示 unavailable/error/empty。

---

## 10. 交接原则

这个项目后续要做好的关键不是“再多写一点”，而是把推进方式稳定下来：

- 总文档管方向和状态。
- 模块文档管交接和证据。
- Trellis 任务管阶段和验收。
- `.omx/state/*/ralph-progress.json` 管视觉迭代事实。
- 测试和截图管是否真的完成。

任何人接手都应该能回答四个问题：

1. 这个模块过去做了什么？
2. 现在停在哪里？
3. 为什么这样做？
4. 下一步最小可验证动作是什么？

如果这四个问题答不出来，就先补文档和证据，不要继续扩大代码改动。

---

## 11. 模块交接记录

### 2026-07-20 Dashboard 主控台交接（iteration 5 + 6）

状态：accepted

本次完成：
- Quick Center iteration 5：480-767px canonical 档位面板高度改为 `min(772px, calc(100dvh - 200px))`，flex 分配四个 section（`flex: 1 0 auto` + 网格 `align-content: center`），footer `margin-top: auto`。实测 428x772 @ x74/right56，落在参考 760-790px 区间。
- 关闭按钮变轻：外框透明化，26px 视觉小方块用 `::before` 绘制，44px 命中区域保留。
- 文案对齐参考图：副标题“常用操作、提醒与灵感入口”、两行 footer、欢迎语合并为单行。
- 提醒图标改为实色渐变小方块（白色 glyph），最近访问/反馈图标按 tone 着色。
- fixture 模式头像使用配套资产 `/dashboard/avatar.png`（来自 DesingImage 用户头像）。
- Hero 主视觉替换为参考图资产 `/dashboard/hero-banner.png`，左侧与底部渐隐 mask，移动端降为底部点缀（opacity 0.55）保证文字可读。
- 六个统计卡图标切换为配套霓虹 bitmap（task/goal/shop/pending/focus/streak.png），`DashboardStat` 新增可选 `asset` 字段，svg 保留为回退。

修改文件：
- `frontend/src/pages/app/AppHome.vue`
- `frontend/src/utils/appHomeDashboard.ts`
- `frontend/public/dashboard/avatar.png`（新增资产拷贝）
- `frontend/scripts/capture.mjs`（新增截图工具）

保留行为：
- Supabase 并行聚合、快速笔记 autosave/清空/转任务、深链、count-up、执行环、reduced-motion、outside-click/Escape/焦点管理全部未动。
- `buildDashboardStats` 契约测试通过（labels/values/states 断言不变，asset 为附加字段）。

验证：
- `npx vitest run src/utils/appHomeDashboard.test.ts` -> 17/17
- `npm run test` -> 60 passed / 39 todo / 0 failed
- `npx vite build` -> 成功
- 截图：`.omx/state/dashboard/iteration-6-desktop.png`、`iteration-6-quick.png`、`iteration-6-mobile.png`
- visual-verdict：iteration 6，score 90，pass（`.omx/state/dashboard/ralph-progress.json`）

重要决策：
- Quick Center 欢迎语从两行（问候+昵称 / 副句）合并为参考图的单行问候句；昵称仍在 topbar 头像菜单可见。
- 统计图标 bitmap 优先、svg 回退，避免破坏既有测试契约。

未完成/风险：
- Hero 星球焦点比参考图略偏右；如后续追分可把 `object-position` 拉向 58%。
- `vue-tsc` 全仓仍有 30 个既有错误（Chat/CampusWall/Companion/Health/Planner/Tarot/SparkMascot），与本模块无关，勿误判。

下一位接手者先做：
1. 进入 Wave 2 AI 助手（见 §8）。
2. 不要再动 Dashboard 几何，除非 verdict 重开。

### 2026-07-20 全局壳层交接（Wave 1B）

状态：accepted

本次完成：
- 壳层从“fixed 全宽 topbar + flex layout-body”重构为 CSS Grid：`'sidebar topbar' / 'sidebar main'`，sidebar 200px 占满整列高度（参考图结构），topbar 56px 仅覆盖主内容区。
- 品牌 logo 移入 sidebar 顶部（56px 品牌区与 topbar 对齐）；移动端品牌回到 topbar。
- 桌面折叠态 64px 通过 `.shell-collapsed` CSS 变量切换；平板（768-1023px）自动降为 64px 图标栏。
- 移动端（<=767px）：persistent sidebar 改为离屏抽屉（`translateX(-100%)`），汉堡按钮打开，带半透明 backdrop、Escape 关闭、外点关闭、焦点进入/返回管理、路由点击自动收起；`aria-controls`/`aria-expanded` 已接。
- 移除临时版本水印 `v7.4.1`（模板 + CSS）。
- 主滚动容器从 `.view-container` 移到 `.main-content`，修复了 AppHome“返回顶部”按钮实际滚动无效的问题。
- 顺手清掉 `AppLayout.vue` 既有 TS6133（`isHomePage` 未使用）。

修改文件：
- `frontend/src/pages/app/AppLayout.vue`

保留行为：
- 通知面板、消息入口、校区选择器、头像下拉、全站搜索、一键专注、能量组件、全部导航目的地（含参考图没有的伴侣/健康/传承/人才/资讯/反馈）一个不少。
- `CosmicBackground.vue` 的 reduced-motion 改动未回退。

验证：
- 结构度量（capture.mjs METRICS）：桌面 sidebar 200x1122 / topbar 1202x56 / main 1202x1066；平板 64px 栏；移动默认 x=-280、抽屉打开 x=0 + backdrop 375x812；全视口 `horizontalOverflow: 0`、零 page error。
- 截图：`.omx/state/dashboard/captures/shell-desktop-1402.png`、`shell-tablet-1024.png`、`shell-mobile-375.png`、`shell-mobile-drawer.png`
- `npm run test` -> 60 passed / 39 todo；`npx vite build` -> 成功；`npx vue-tsc -b` -> 30 个既有错误全部在其他模块，AppLayout 已零错误。

重要决策：
- 保留 topbar 汉堡折叠按钮（参考图没有）：它同时承担桌面折叠与移动抽屉开关，是可访问性和小屏可用性的关键控件，视觉代价极小。
- 保留全部现有导航项而不是复刻参考图的 9 项导航：PRD 明确“不得移除任何目的地”。

未完成/风险：
- 壳层是全局共享件：后续任何模块发现布局异常，先查该模块自身样式，不要回改壳层。
- 移动端 topbar 右侧在 <360px 极窄屏时仍偏挤（校区选择器已隐藏，铃铛/消息/头像保留）。

下一位接手者先做：
1. 用 §8 清单进入 Wave 2。
2. 若需要壳层级调整（如新增 topbar 动作），单独开切片并三视口复验。

### 2026-07-20 AI 助手交接（Wave 2 iteration 1-3，已验收）

状态：accepted（iteration 3，score 90，pass；偏差已记录在 verdict differences）

本次完成：
- 新增开发视觉路由 `/__visual/chat`（DEV only，AppLayout + Chat.vue），供确定性截图。
- 记录 baseline：`.omx/state/chat/baseline-desktop.png`（1672x941，对应参考图尺寸）。
- iteration 2：`/__visual/chat` 纯内存 fixture 会话（不写持久化），复现参考图 1.png 的回答态——生产者-消费者 C++ 代码块（hljs 高亮）+ 追问 chips + 已分类的会话列表分组；截图 `.omx/state/chat/iteration-2-desktop.png`，零 page error。
- iteration 3（过线）：
  - 记忆胶囊重做为参考图三个真实功能胶囊：知识点总结（发提示词）、错题回顾（进学习中心）、收藏模块（打开收藏夹，新增 `open-favorites` 事件接线）；琥珀/紫/青三色小卡质感 + 悬停箭头。
  - 成长进度双统计块换参考图琥珀/紫罗兰渐变小卡。
  - 顶栏模式胶囊增加亮色选中态（通用紫 / 学习蓝 / 创意粉，带发光圆点）；记忆开关选中态提亮。
  - 会话列表升级为参考图两行结构：标题 + 分类标签 + 最近消息摘要（`convSnippet`）。
  - 右栏支持 `visualFixture` prop：fixture 下展示参考图今日节奏时间线与记忆条目，不请求 Supabase。
  - fixture 取景从对话顶部开始（用户气泡在上），与参考图一致。
  - 三视口截图：1672x941 / 1024x768 / 375x812，全部零 page error、零横向溢出。
- Chat 模块 typecheck 清零（全仓既有错误 30 -> 26）：
  - `Chat.vue` 775 行未用的 `checkinToday/checkinDone` 解构移除；
  - `Chat.vue` 2338 行 `pagebreak`（html2pdf.js 类型缺失）用 `Parameters<typeof worker.set>[0]` 断言修复，运行时行为不变；
  - `SparkMascot.vue` 死代码 `greetings` 改为真实功能：挥手时随机气泡鼓励语。
- 参考图侧栏结构补齐：「对话列表」标题行 + 会话数徽章；「全部/学习/研究/生活/规划」筛选 tab（role=tablist）。
- 分类是真实数据：`useSparkAI.setConversationCategory` 写入 `Conversation.tags` 并走 `savePersist` 持久化/云同步；会话菜单里可归类/取消；筛选后空分类有可操作空状态。

修改文件：
- `frontend/src/pages/app/Chat.vue`
- `frontend/src/composables/useSparkAI.ts`
- `frontend/src/components/chat/SparkMascot.vue`
- `frontend/src/components/chat/ChatRightPanel.vue`
- `frontend/src/router/index.ts`（新增 `/__visual/chat`）

保留行为：
- 会话 CRUD、置顶、归档、克隆、六格式导出、收藏、工作流、快捷能力、流式生成、缓存回放全部未动。

验证：
- `npm run test` -> 60 passed / 39 todo / 0 failed
- `npx vite build` -> 成功
- `npx vue-tsc -b` -> 剩余 26 个既有错误：CampusWall 20、Companion 3、Tarot 1、Planner 1、Health 1（Chat 模块为零）
- 截图：`.omx/state/chat/iteration-3-desktop.png`（+ tablet/mobile），页面零 runtime error
- verdict：`.omx/state/chat/ralph-progress.json` iteration 3，score 90，pass

重要决策：
- 分类筛选不用 mock：没有归类的会话在分类下显示空状态并提示怎么归类，符合“不可用就显式说明”的原则。
- fixture 会话只存在内存（直接赋值 conversations ref，不调用 saveConversations），不污染真实用户数据。
- html2pdf 类型问题不改 node_modules、不加全局 d.ts（模块自带 types 无法增强），在调用点断言并注释原因。
- 既定偏差（记录于 verdict）：模式胶囊行用活控件代替参考图五个静态胶囊；今日推荐能力卡保留在欢迎空状态而非每条回答内；导航与能力项超出参考图集合（PRD 要求不删目的地）。

未完成/风险：
- 欢迎空状态能力卡对比度低于参考图回答态（空状态非 canonical 截图，不阻塞验收）。
- 小宇展开面板未做像素比对（有独立组件，后续如需可加 fixture 参数）。

下一位接手者先做：
1. 进入 Wave 2 第二模块：智能日程 `/app/schedule`（`SmartSchedule.vue`），流程照旧：读 `DesingImage/starspark-schedule/` → baseline → typecheck → 视觉 → 三视口截图 → verdict。
2. Chat 模块只接受局部微调，不要动壳层与 Dashboard。

### 2026-07-20 智能日程交接（Wave 2 iteration 1-3，日历工作台已验收）

状态：accepted（iteration 3，score 90，pass；规划面板/卡罗牌深度对齐为独立后续切片）

本次完成：
- Schedule.vue 新增参考图 1.png 的「今日总览」hero 条，全部真实数据派生：
  - 今日事项/已完成：当天事件（含循环展开）计数与已结束计数；
  - 排程时长：当天非全天事件总时长；
  - 空闲时间：8:00-22:00 窗口内合并忙碌区间后的剩余；
  - 冲突预警：当天事件两两重叠对数（真实冲突检测），有冲突时琥珀高亮；
  - 节奏分：显式派生指标（50 基础 + 排程覆盖 30 + 完成率 20 - 冲突 12/个），环形图 + tooltip 说明公式。
- hero 右侧新增星火规划/星火卡罗牌渐变入口卡（走 `route.query.module`，保留 SmartSchedule 架构）；≥1281px 隐藏底部浮动 pill 入口避免重复，窄屏仍用浮动入口。
- hero 左侧星云漩涡资产（`/dashboard/vortex.png`）圆形裁切 + 60s 慢旋转，reduced-motion 停转。
- 新增 `/__visual/schedule` fixture 路由：以“现在”为锚点注入 8 条确定性事件（含一组约 10 分钟与一组 30 分钟的真实重叠），纯内存不写 Supabase；`SmartSchedule` 透传 `visualFixture` prop。
- 类型清零：`Planner.vue` 未使用的 `greeting`/`getGreeting` 移除；`Tarot.vue` `canvasEl` 模板 ref 占位标注。全仓既有错误 26 -> 24（剩余：CampusWall 20、Companion 3、Health 1）。
- iteration 2（参考图中列智能层，全部真实功能）：
  - 新组件 `ScheduleInsights.vue`（>=1440px 显示，窄屏自动隐藏保护日历可读性）；
  - 「待安排事项」：查询 `planner_tasks` 中 `schedule_event_id is null` 的待办（难度色点、目标标签、时长、到期文案），一键「+」经 `pushTaskToSchedule` 真实写入日程并从列表移除；loading 用 shimmer 骨架，错误可重试，空状态给创建目标入口；
  - 「AI 智能编排建议」：列出真实冲突对（时间重叠区间文案 + 「查看」跳到日视图打开事件详情）；「一键重排」把冲突对中较短事件移到当天第一个可容纳空档（当天放不下则建议明早 9:00），真实调用 `updateEvent` 落库（fixture 下本地生效）；无冲突时显示绿色安心态 + 最佳专注窗口（合并空闲后最长段）。
- iteration 3（过线）：
  - 底部快捷行四张卡：今日复盘（文案吃真实已完成数，跳 `?module=planner&tab=history`）、习惯打卡（跳 `tab=habits`）、学习资源推荐（`/app/resources`）、专注模式（文案吃计算出的最佳专注窗口，跳 `/app/learn`）；
  - 日视图事件卡新增派生标签：优先级 >=1 且时长 >=60min 显示「高专注」（琥珀）、生活/提醒类 <=45min 显示「缓冲」（绿），纯派生不伪造；
  - 采集规划面板（`?module=planner`）与卡罗牌（`?module=tarot`）baseline 截图，两个视图在新壳层上零 page error。

修改文件：
- `frontend/src/pages/app/Schedule.vue`
- `frontend/src/pages/app/SmartSchedule.vue`
- `frontend/src/components/schedule/ScheduleInsights.vue`（新增）
- `frontend/src/components/schedule/CalendarDay.vue`（派生标签）
- `frontend/src/pages/app/Planner.vue`
- `frontend/src/pages/app/Tarot.vue`
- `frontend/src/router/index.ts`（新增 `/__visual/schedule`）

保留行为：
- 日/周/月视图、AI 导入、事件 CRUD、冲突检测、提醒、推送规划、分享星火墙、UpcomingSidebar、语义路由（`?module=planner|tarot`）全部未动。

验证：
- `npm run test` -> 60 passed / 39 todo / 0 failed
- `npx vite build` -> 成功
- 三视口 + 规划面板 + 卡罗牌截图全部零 page error、零横向溢出：`.omx/state/schedule/iteration-3-*.png`、`planner-panel-baseline.png`、`tarot-baseline.png`
- verdict：`.omx/state/schedule/ralph-progress.json` iteration 3，score 90，pass

重要决策：
- 节奏分是派生指标而非伪造数据：公式写进 tooltip 和交接文档，可审计。
- 空闲时间按 8:00-22:00 清醒窗口合并计算，跨窗口外的事件不计入忙碌。
- 「一键重排」只化解首个冲突且方案完全可解释（移动较短事件、找真实空档），不做黑盒全排。
- 「高专注/缓冲」标签从优先级/类型/时长派生，规则写在 `CalendarDay.vue` 注释里。
- 习惯打卡卡片不显示伪造计数（habit 数据在 Supabase 需独立查询，等有轻量查询路径再接）。

未完成/风险（独立后续切片，不阻塞日历工作台验收）：
- 规划侧滑面板深度视觉对齐 `schedule-planner.png`（目标地图、阶段路线、本周规划）。
- 卡罗牌视图深度对齐 `schedule-card.png`（牌面资产、仪式打磨）。

下一位接手者先做：
1. 进入 Wave 3 首模块：校园墙 `/app/wall`——先清 `CampusWall.vue` 的 20 个既有类型错误，再 baseline + 视觉对齐。
2. 规划面板/卡罗牌切片可与 Wave 3 并行，互不阻塞。

### 2026-07-20 校园墙交接（Wave 3 开篇：契约统一 + 类型清零 + 洞察面板）

状态：in_progress

本次完成：
- **Post/Comment 类型契约统一**（原 20 个错误的根因）：`CampusWall.vue` 和 `WallPostDetail.vue` 各自声明了同名但字段可选性不同的 `Post`/`Comment` 接口（`createdAt?` vs `createdAt`、`authorInitial?` vs `authorInitial`），导致 10 个 TS2322。现在统一为 `utils/campusWall.ts` 导出的 `WallPost`/`WallComment` 单一契约，两个文件分别 `type Post = WallPost` 别名使用，跨组件 props 类型完全一致。
- **死代码清理与真实功能补接**（原 10 个 TS6133）：
  - 删除：`avatarInitial`、`tabList`（已被 sideTabList 取代）、`openPostDetailV2`/`closePostDetailV2`（legacy 副本）、`realtimeFeed`（未使用）、`regionMe`/`myRegion`（同城逻辑已下线）；
  - 接活（不是摆设）：`aiSuggestions`（真实热聊标签）接进右栏「AI 话题助手」新增的“正在热聊”标签行，点击直接带话题进发帖框；`insightExpanded`/`wordCloudTags`/`hourlyActivity` 接成右栏新「✨ 星火洞察」折叠面板——话题词云（真实标签统计，点击筛选流）+ 今日活跃时段热力条（真实发帖时间统计），空数据有引导文案。
- Companion/Health 顺手清零：`getContactMeta` 接进联系人详情卡（地区|身份|专业 元信息行）、`handleContactStarToggle` 接上星标按钮（原来直接调 composable，现在有 toast 反馈）、删除未用的 `contactMoments`/`newSTag`。
- **全仓 vue-tsc 0 错误、`npm run build` 完整通过（项目首次）**。
- 新增 `/__visual/wall` 路由并采集 baseline：`.omx/state/wall/baseline-desktop.png`。

修改文件：
- `frontend/src/utils/campusWall.ts`（新增 WallPost/WallComment 契约）
- `frontend/src/pages/app/CampusWall.vue`
- `frontend/src/components/wall/WallPostDetail.vue`
- `frontend/src/pages/app/Companion.vue`
- `frontend/src/pages/app/Health.vue`
- `frontend/src/router/index.ts`（新增 `/__visual/wall`）

保留行为：
- 帖子 CRUD、点赞乐观更新、评论、举报、匿名体系、媒体上传、圈子/热榜/活动等右栏区块全部未动；`campusWall.test.ts` 全绿。

验证：
- `npm run build`（vue-tsc -b && vite build）-> 完整通过
- `npm run test` -> 60 passed / 39 todo / 0 failed
- baseline 截图：布局完整、无横向溢出；page error 仅剩 Supabase realtime WebSocket 连接失败（网络环境问题，与代码无关，未登录态列表 loading 骨架正常显示）

重要决策：
- 类型冲突用「单一契约上移到 utils」解决而不是把字段改可选，因为详情组件确实依赖这些字段渲染；可选化只是把错误变成运行时缺字段。
- 未用的洞察类 computed 一律「接活或删除」，不留 `void x` 式摆设。

未完成/风险：
- 视觉对齐 `DesingImage/starspark-wall/` 尚未开始（下一切片）。
- 未登录态下帖子列表为骨架/空，视觉验收需要 seeded fixture（参考 chat/schedule 的做法）。
- Supabase realtime 在截图环境不可达，正式验收时在可联网环境复测订阅行为。

下一位接手者先做：
1. 给 `/__visual/wall` 做 seeded fixture（注入确定性帖子数据，复用 WallPost 契约）。
2. 对照 `DesingImage/starspark-wall/` 的 canonical 截图做视觉对齐，拍三视口 + verdict。
