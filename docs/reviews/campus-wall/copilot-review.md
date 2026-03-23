# Copilot Review — Spark Alliance

## Overall Score: 71/100

## Score Breakdown Table

| Dimension | Score | Max | Notes |
| --- | ---: | ---: | --- |
| Code Architecture Quality | 17 | 25 | 路由分区和基础 Composition API 方向正确，但状态管理、类型边界、页面分层仍偏“页面内大脚本”。 |
| UI/UX Design Implementation | 22 | 30 | 视觉调性有潜力，动效丰富；但层级噪声偏高、可访问性与移动端交互一致性不足。 |
| Feature Completeness Assessment | 12 | 20 | 当前“已上线”功能多为 UI + mock，和产品规格中的真实闭环存在明显差距。 |
| Growth & Development Recommendations | 20 | 25 | 技术路线明确，可快速提升体验；需先还关键技术债，再推进新增模块。 |

## Critical UI Issues (with specific file:line references where possible)

1) 全局隐藏系统光标，影响可访问性与可用性。  
`frontend/src/style.css:25` 与 `:44-48` 将 `*`, `a`, `button` 统一设置 `cursor: none`。在低性能设备、触控笔、无障碍工具场景下风险较高。

2) 聊天气泡使用 `v-html` 渲染，存在 XSS 面风险。  
`frontend/src/pages/app/Chat.vue:54`, `134-136`。当前仅替换换行和粗体，但未来接真实模型后会直接扩大攻击面。

3) 移动端侧边栏状态语义反转，维护成本高。  
`frontend/src/pages/app/AppLayout.vue:190-203`。`collapsed` 在移动端被当作“打开”状态，后续开发者容易引入回归问题。

4) 视觉系统变量命名不统一，导致样式漂移。  
`frontend/src/components/GlassCard.vue:31` 使用 `--text-primary`，但全局定义是 `--color-text-primary`（`frontend/src/style.css:9`）。  
`frontend/src/pages/Home.vue:86,134` 也使用 `--text-secondary`，同类问题重复出现。

5) 页面重复造轮子，造成体验割裂。  
`frontend/src/pages/*.vue`（旧页面）与 `frontend/src/pages/app/*.vue`（新页面）并存；部分页面仍是静态模板且风格不同，增加后续认知负担。

6) 热力图强度随机生成，视图重渲染会“跳变”。  
`frontend/src/pages/app/Profile.vue:49-51`, `207-214`。数据表达不可信，影响用户对“成长数据”的信任。

7) 弹窗保存配置后直接 `alert`，与整体高级感不一致。  
`frontend/src/pages/app/Chat.vue:131`。会中断式打断交互流，不符合当前产品视觉目标。

## Code Quality Findings

- 优点：路由结构清晰，公共区/应用区分离合理（`frontend/src/router/index.ts`）。  
- 优点：`useAuth` 作为共享鉴权入口（`frontend/src/composables/useAuth.ts`）方向正确。  
- 问题：缺少统一的 API 层与仓储层；`app` 页面内混合“UI + mock 数据 + 业务逻辑”，测试难度高。  
- 问题：未引入测试框架与 lint（`frontend/package.json`），质量门禁缺失。  
- 问题：类型虽有基础接口（如 `Post`, `Message`），但缺少跨模块 DTO、错误类型、运行时校验。  
- 问题：路由守卫每次跳转都拉 session（`router.beforeEach`），未做缓存与错误分支处理。  
- 问题：设计 token 存在双体系（`--color-*` 与 `--text-*`/`--glass-*` 混用），可维护性下降。

## Top 5 Actionable UI Improvements

### 1) Problem → 光标策略过于激进，影响可访问性
Current State: 全局 `cursor: none` + 自定义光标组件常驻。  
Recommended Solution: 仅在精确指针设备启用；为触屏/辅助技术保留系统光标。  
Code Example:

```css [frontend/src/style.css]
@media (pointer: fine) {
  html.custom-cursor *,
  html.custom-cursor a,
  html.custom-cursor button {
    cursor: none;
  }
}
```

```ts [frontend/src/components/MouseFollower.vue]
onMounted(() => {
  if (window.matchMedia('(pointer: fine)').matches) {
    document.documentElement.classList.add('custom-cursor')
  }
})

onBeforeUnmount(() => {
  document.documentElement.classList.remove('custom-cursor')
})
```

### 2) Problem → 聊天渲染安全边界不足
Current State: `v-html` 直接渲染字符串。  
Recommended Solution: 默认纯文本渲染；若要富文本，接入白名单 sanitizer（如 DOMPurify）。  
Code Example:

```ts [frontend/src/pages/app/Chat.vue]
import DOMPurify from 'dompurify'

const formatMessage = (text: string) => {
  const html = text
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  return DOMPurify.sanitize(html, { ALLOWED_TAGS: ['br', 'strong'] })
}
```

### 3) Problem → 设计 token 不一致导致视觉不稳定
Current State: 多文件混用 `--text-secondary` 与 `--color-text-secondary`。  
Recommended Solution: 统一到 `--color-*`，并提供兼容别名过渡。  
Code Example:

```css [frontend/src/style.css]
:root {
  --color-text-primary: #fff;
  --color-text-secondary: rgba(255,255,255,0.6);
  --color-text-muted: rgba(255,255,255,0.3);
  --text-primary: var(--color-text-primary);
  --text-secondary: var(--color-text-secondary);
}
```

### 4) Problem → 移动端导航状态语义混乱
Current State: `isCollapsed` 在桌面是“收起”，在移动端是“展开”。  
Recommended Solution: 拆分为 `isDesktopCollapsed` 与 `isMobileDrawerOpen`。  
Code Example:

```ts [frontend/src/pages/app/AppLayout.vue]
const isDesktopCollapsed = ref(false)
const isMobileDrawerOpen = ref(false)
```

```vue [frontend/src/pages/app/AppLayout.vue]
<aside class="sidebar" :class="{ collapsed: isDesktopCollapsed, open: isMobileDrawerOpen }">
```

### 5) Problem → 数据可视化缺乏可信度（随机热力图）
Current State: 每次渲染随机强度。  
Recommended Solution: 使用固定窗口（近 168 小时）真实事件计数，空数据用 skeleton。  
Code Example:

```ts [frontend/src/pages/app/Profile.vue]
const heatmapValues = computed(() => buildWeeklyHeatmap(activityEvents.value))
// buildWeeklyHeatmap: 按天/小时聚合，输出 0-4 强度等级
```

## Feature Gap Analysis

### 已实现（可演示）
- 鉴权基本流程：注册、登录、登出（Supabase Auth）。
- 应用主框架：`/app/home`, `/app/chat`, `/app/wall`, `/app/profile`。
- 落地页与文档/社区/更新日志静态内容页。

### 部分实现（UI 先行）
- AI Chat：有交互和模拟流式输出，但未接真实模型服务链路。
- 校园墙：本地状态可发帖/点赞，未接后端持久化、审核、限流与举报体系。
- 个人中心：展示型模块丰富，但缺少真实数据源与编辑闭环。

### 未实现（与规格差距）
- Spark Talent 双向匹配（青年侧能力名片、企业认证、匹配引擎）。
- 星火资讯（爬虫聚合、去重、个性化推荐、AI解读）。
- 选课助手、学长推荐、学习资源中心、健康打卡等核心业务链。

### 关键边界缺口
- 错误处理：缺少统一错误提示组件与异常恢复流程。
- 数据层：无 API client 分层、无缓存策略、无请求重试策略。
- 质量保障：无测试、无 lint、无 CI 质量门禁。

## Feasible Growth Directions

### Now（0-4周）
- 建立基础工程护栏：ESLint + Vitest + 最小 CI。
- 抽离 API 层与 store（建议 Pinia）并替换页面内 mock。
- 完成聊天安全加固（sanitizer）、统一 toast、统一 loading/error 状态。
- 统一 design tokens 与基础组件（Button/Input/Card/Badge/Modal）。

### Next（1-2个版本）
- 交付“一个真实闭环功能”优先：建议先做校园墙真实化（发帖-审核-互动-举报）。
- 打通 Profile 真实数据（编辑资料、头像上传、活跃统计）。
- 引入埋点与漏斗分析（注册、首聊、首帖、次日留存）。
- 完成移动端导航与输入交互专项优化。

### Later（中长期）
- 启动 Spark Talent MVP：能力名片 + 企业认证 + 简单匹配搜索。
- 启动资讯微服务 MVP：先接 3-5 源 + 去重 + 摘要。
- 建立“模块化业务域”架构（chat/wall/profile/talent/news）和权限体系扩展。

## Final Recommendations

项目的视觉方向和产品野心是成立的，但当前工程状态仍是“高保真前端原型 + 局部真实鉴权”。建议先把“体验可信度”和“工程可持续性”补齐，再扩功能面。

优先顺序建议：  
1) 安全与质量门禁（XSS、lint、test、CI）  
2) 一个真实业务闭环（校园墙）  
3) 设计系统统一与移动端一致性  
4) 再进入 Talent/News 等重模块

如果按这个顺序推进，你们可以在不牺牲视觉特色的前提下，快速进入“可迭代、可上线、可增长”的正循环。
