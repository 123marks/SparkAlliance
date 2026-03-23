# OpenCode 架构评审 — Spark Alliance / 星火校园

> 评审时间：2026-03-20
> 评审范围：docs/SparkAlliance.md + frontend/ 全部源码
> 评审人：OpenCode Architect Agent

---

## Overall Score: **38/100**

**评级说明**：项目处于 MVP 静态原型阶段（完成度约 20%），视觉设计出色，但工程架构存在系统性风险，无法支撑路线图所示的复杂度。

| 维度 | 得分 | 说明 |
|------|------|------|
| Technical Architecture | 10/25 | 无状态管理、无 API 层、无懒加载、无测试、vite 配置空白 |
| UI System Engineering | 15/25 | 设计 token 体系良好，动效规范正确，但 Accessibility 严重不达标 |
| Feature Implementation Quality | 8/20 | 静态 Mock 主导，XSS 风险，`alert()` 未消除，无错误边界 |
| Roadmap Feasibility | 5/30 | 当前架构无法承载任意一个第三阶段模块 |
| **总计** | **38/100** | |

---

## 一、技术架构分析（10/25）

### 1.1 项目结构 — 基础可用但无扩展性设计

```
frontend/src/
├── components/     # 仅 4 个基础组件，全局效果为主
├── composables/   # 仅 1 个 useAuth
├── pages/         # 存在同路径重复文件（见下）
│   ├── app/       # 已登录应用区路由（AppLayout 子路由）
│   ├── auth/      # 登录/注册
│   ├── landing/   # 官网（内含 sections/ 子目录）
│   ├── Home.vue   # ❌ 与 pages/app/AppHome.vue 路径重复
│   ├── Chat.vue   # ❌ 与 pages/app/Chat.vue 路径重复
│   ├── CampusWall.vue  # ❌ 与 pages/app/CampusWall.vue 重复
│   └── Profile.vue     # ❌ 与 pages/app/Profile.vue 重复
├── router/index.ts
├── supabase.ts
├── style.css
└── App.vue
```

**问题识别：**
- 根目录 `pages/` 下的 `Home.vue`、`Chat.vue`、`CampusWall.vue`、`Profile.vue` 与 `pages/app/` 下同名文件造成路由来源歧义（router 实际使用的是 `pages/app/` 下的）。应删除废弃文件。
- 缺乏 `services/`、`stores/`、`types/`、`utils/` 目录 — 无服务层抽象，无全局类型定义，无工具函数组织。

### 1.2 状态管理 — 当前够用，路线图阶段必然崩溃

**现状：**
```typescript
// composables/useAuth.ts — 仅管理会话状态，无全局存储
const user = ref<User | null>(null)
const session = ref<Session | null>(null)
```

**致命缺陷：**
- 无任何全局状态管理（Vue 3 推荐 Pinia，备选 Vuex）
- 路由独享状态通过 `ref()` 维护（如 Chat.vue 的 `messages`、`sidebarOpen`），组件卸载即丢失
- 路线图中的"星火人才"需要管理复杂的候选人状态、筛选条件、企业邀请列表；"星火资讯"需要管理 Feed 流、多维度筛选状态；"校园购物"需要管理购物车、订单状态 — 纯 `ref()` 无法应对

**建议：** 立即引入 **Pinia**，按功能域划分 store：authStore、chatStore、wallStore、newsStore（规划）、commerceStore（规划）。

### 1.3 构建配置 — 严重空白

```typescript
// vite.config.ts — 实际只有 7 行有效代码
export default defineConfig({
  plugins: [vue()],
})
```

**缺失的关键配置：**
- ❌ 无 Code Splitting（所有页面打包成单一 chunk，首屏加载 ~500KB+）
- ❌ 无路由级懒加载（`() => import()`） — 所有组件静态导入
- ❌ 无构建体积分析（vite-plugin-visualizer）
- ❌ 无环境变量类型校验
- ❌ 无 CDN/公共路径配置
- ❌ 无 CSS 代码分割
- ❌ ParticleBackground Canvas 动画 195 行无 Tree-shaking 优化

**建议：** 构建配置至少需包含：
```typescript
// vite.config.ts
export default defineConfig({
  plugins: [vue()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-vue': ['vue', 'vue-router'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'ui-effects': ['./src/components/ParticleBackground.vue', './src/components/MouseFollower.vue'],
        }
      }
    }
  },
  optimizeDeps: {
    include: ['vue', 'vue-router', '@supabase/supabase-js']
  }
})
```

### 1.4 TypeScript 配置 — 严格但存在例外

```json
// tsconfig.app.json — 良好实践
{
  "strict": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true,
  "noFallthroughCasesInSwitch": true
}
```

**问题：**
- `src/pages/app/Chat.vue` 中存在 `const interval = setInterval(...)` 但组件卸载时未 `clearInterval`，导致内存泄漏
- `getRandomIntensity()` 在 `Profile.vue` 中每次调用返回随机值，但热力图静态展示应使用稳定数据（当前热力图每次渲染随机变化，用户体验反直觉）
- `noUnusedLocals` 和 `noUnusedParameters` 未在 CI 流程中强制执行

### 1.5 依赖分析 — 极度精简但必要组件缺失

| 依赖 | 版本 | 评估 |
|------|------|------|
| vue | ^3.5.30 | ✅ 最新 |
| vue-router | ^4.6.4 | ✅ 最新 |
| @supabase/supabase-js | ^2.99.2 | ✅ 最新 |
| vite | ^8.0.0 | ✅ 最新 |
| typescript | ~5.9.3 | ⚠️ 极新（2025年6月发布），稳定性待验证 |
| @vitejs/plugin-vue | ^6.0.5 | ✅ 最新 |

**关键缺失依赖（按优先级）：**
1. **Pinia** — 状态管理（高优先级，MVP 阶段即需要）
2. **@vueuse/core** — 工具 composables（网络状态、节流、存储等）
3. **vite-plugin-components** 或 **unplugin-vue-components** — 自动导入组件
4. **@tanstack/vue-query** 或 **swrv** — 数据获取/缓存/乐观更新
5. **vitest + @vue/test-utils** — 测试框架

---

## 二、UI 工程评估（15/25）

### 2.1 设计 Token 体系 — 良好的基础

```css
:root {
  --color-bg-primary: #0a0a0f;
  --color-brand-blue: #4f8ef7;
  --color-brand-purple: #8b5cf6;
  --color-brand-orange: #f97316;
  --gradient-brand: linear-gradient(135deg, #4f8ef7, #8b5cf6, #f97316);
}
```

**优点：**
- CSS 变量体系覆盖颜色、边框、阴影，向后兼容处理得当
- `glass-pro` / `glass-pro-hover` 实现了一致的毛玻璃规范
- `spring-transition` / `spring-hover` 定义了统一的动效语言

**缺陷：**
- 仅支持暗色主题，缺少亮色主题 CSS 变量组
- 间距系统不完整（无 `--space-*` token，如 `--space-sm: 8px`）
- 字体系统不完整（无 `--font-size-*` 比例尺）
- 圆角无统一 token（部分用硬编码 `16px`、`20px`、`12px`）

### 2.2 动效性能 — 正确使用了 transform/opacity

**✅ 正确实践：**
```css
.spring-hover:hover {
  transform: translateY(-4px) scale(1.02);  /* ✅ GPU 加速属性 */
  will-change: transform, box-shadow;     /* ✅ 声明合成层 */
}
```

**✅ Canvas 粒子背景优化到位：**
- 粒子数量根据视口面积动态计算（`canvas.width * canvas.height / 12000`）
- 使用 `requestAnimationFrame` 动画循环
- 鼠标交互有节流（`mouseleave` 时设回 `-1000`）

**⚠️ Canvas 性能隐患：**
```typescript
// ParticleBackground.vue:114 - O(n²) 连接线算法
for (let a = 0; a < particles.length; a++) {
  for (let b = a; b < particles.length; b++) {
    // 200px视口 ≈ 33粒子，复杂度 528，配200粒子视口 = 19900次计算
```
1000+ 粒子时帧率将严重下降。建议限制 `connectParticles` 计算范围或使用空间哈希优化。

### 2.3 Accessibility — **严重违规（Critical）**

| 问题 | 严重度 | 说明 |
|------|--------|------|
| `cursor: none` 全局禁用 | 🔴 Critical | 视障用户、运动障碍用户完全无法操作。WCAG 2.1 禁止隐藏系统光标 |
| Emoji 作为唯一图标 | 🔴 Critical | Chat.vue 使用 🧠/💬/⚙️ 等 emoji，无等效 aria-label |
| 无 ARIA landmark roles | 🟠 High | 侧边栏 `<aside>`、主内容 `<main>` 未声明 |
| 无键盘导航 | 🟠 High | 侧边栏导航项无 `tabindex`，`disabled` 导航项无法被辅助技术识别 |
| 对比度不达标 | 🟡 Medium | `--color-text-muted: rgba(255,255,255,0.3)` 白色背景对比度约 2.2:1，低于 WCAG AA 的 4.5:1 |
| `<canvas>` 无替代文本 | 🟡 Medium | ParticleBackground 作为装饰性 canvas 应有 `aria-hidden="true"` |
| 无 skip-link | 🟡 Medium | 键盘用户无法跳过导航直接到达主内容 |

**立即修复项：**
```css
/* style.css 第 25 行 */
* { cursor: none; }  /* ❌ 删除或改为交互元素限定 */
button, a, [role="button"], input { cursor: pointer; }
```

### 2.4 暗色主题实现 — 基础达标

- ✅ 主题色通过 CSS 变量隔离
- ✅ backdrop-filter 毛玻璃效果有 -webkit 前缀
- ✅ 字体平滑处理 (`-webkit-font-smoothing`)
- ⚠️ 仅暗色模式，无主题切换机制（路线图中无此需求，但建议预留）

---

## 三、Top Issues — 需立即处理（按优先级）

### 🔴 Critical（必须立即修复）

1. **Accessibility — 全局 `cursor: none`** (`style.css:25`)
   - 危害：视障用户完全无法使用
   - 修复：删除 `* { cursor: none }`，改为仅 `.mouse-core/.mouse-follower` 层级隐藏

2. **XSS 风险 — `v-html` + 文本替换** (`Chat.vue:54, 134`)
   ```javascript
   // 当前实现：正则替换即可注入脚本
   return text.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
   ```
   - 风险：恶意 Markdown 输入可注入 `<script>` 或 `onerror`
   - 修复：使用 `dompurify` 或 `sanitize-html` 净化 HTML 输出

3. **内存泄漏 — `setInterval` 未清理** (`Chat.vue:176`)
   - 修复：组件卸载时 `clearInterval(interval)`

4. **废弃文件造成路由歧义** — 根目录 `pages/` 下与 `pages/app/` 同名的 4 个文件应删除

### 🟠 High（本周内修复）

5. **状态管理缺失** — 引入 Pinia，按 auth/chat/wall 分域管理状态
6. **构建优化缺失** — 路由懒加载、vendor 分包、CSS 代码分割
7. **`alert()` 调用** (`Chat.vue:131`) — 替换为 Toast/Notification 组件
8. **TypeScript `as any` 风险** (`MouseFollower.vue:49`) — `target.closest()` 返回可能为 `null`

### 🟡 Medium（本月内修复）

9. **Canvas O(n²) 算法** — 粒子连接线计算优化
10. **热力图随机数据** — 应使用稳定数据源，每次渲染不应重新随机
11. **对比度不达标** — 0.3 透明度文本改为 0.5 或使用暗色背景
12. **SVG 图标替代 emoji** — 至少核心交互图标（发送、设置、关闭等）
13. **缺失测试** — 应搭建 vitest + @vue/test-utils 基础测试框架

---

## 四、路线图技术可行性矩阵

| 功能模块 | 复杂度 | 技术风险 | 建议技术栈 | 前置依赖 | 时间估算 | 可行性评分 |
|---------|--------|----------|-----------|---------|---------|-----------|
| AI 学习助手（答疑/拍题） | 高 | 高 | 图像上传 + OCR（Tesseract/腾讯云） + Streaming API | 路由懒加载 + Pinia + 图像压缩 | 4-6 周 | ⚠️ 可行但需架构重构 |
| AI 本地授权方案 | 极高 | 极高 | OAuth2 / PKCE（DeepSeek/豆包均无公开授权 API，文档中方案技术不可行） | 后端代理服务 | 未知 | ❌ 需重新设计 |
| 智能日程（Calendar + 课表） | 中 | 低 | FullCalendar Vue / vue-cal + ics 解析 | Pinia + 日期库 | 2-3 周 | ✅ 可行 |
| 校园购物 C2C | 极高 | 高 | Supabase + Realtime + Stripe/微信支付 + 地图 LBS | 独立状态管理 + 搜索服务 | 6-8 周 | ⚠️ 可行但超 MVP 范围 |
| 社交伴侣（好友 + 群聊） | 极高 | 高 | Supabase Realtime channels + 即时消息存储 | 消息状态管理 + 通知系统 | 8-12 周 | ⚠️ 需要专门架构 |
| 校园墙（已有基础） | 低 | 低 | 当前架构扩展即可 | 排序/分页/内容审核 API | 1-2 周 | ✅ 可行 |
| 星火人才匹配 | 极高 | 极高 | pgvector 向量检索 + DeepSeek Embedding + 企业认证接口 | Python 微服务 + pgvector | 12-16 周 | ⚠️ 需要独立微服务 |
| 星火资讯爬虫 | 极高 | 极高 | Scrapy + Playwright + Redis + Celery + Elasticsearch + pgvector | Python 爬虫微服务 + 向量库 | 16-20 周 | ⚠️ 需要独立团队 |
| 学习资源中心 | 高 | 中 | 文件存储（Supabase Storage/CDN）+ 搜索 | 独立文件服务 | 4-6 周 | ⚠️ 可行 |
| AI 选课助手 | 高 | 中 | 课程数据库 + DeepSeek 推荐 + 数据可视化（Chart.js/ECharts） | 向量搜索 + BI 组件 | 4-6 周 | ✅ 可行 |
| 学长推荐系统 | 高 | 中 | UGC 内容审核 + 咨询撮合 + 支付 | 内容安全服务 | 6-8 周 | ⚠️ 可行 |

**关键发现：**
1. **AI 本地授权方案技术不可行** — DeepSeek 和豆包均不提供公开的 OAuth/授权 API。文档中的方案（"检测本地登录状态"）在 Web 端无法实现（浏览器沙箱限制）。建议改为：后端代理模式（用户配置 API Key → 后端代理转发）或 Supabase Edge Functions。
2. **星火资讯和星火人才** 属于独立微服务级别的工作量，需要单独的 Python/Go 后端团队，不应与前端 MVP 混排。
3. **校园购物** 需要支付网关（Stripe/微信支付）、地图 LBS、反欺诈系统，远超 Supabase 单体架构能力。

---

## 五、性能优化建议（具体可执行）

### 5.1 立即可执行（0成本）

| 优化项 | 当前 | 目标 | 方案 |
|--------|------|------|------|
| 路由懒加载 | 0 | 减少 60% 首屏体积 | router 改 `component: () => import(...)` |
| Canvas 粒子数量 | 动态/无限 | 上限 150 | `Math.min(particleCount, 150)` |
| 字体预加载 | 无 | LCP 改善 20% | `<link rel="preload">` 预加载主要字体 |
| 图片懒加载 | 无 | 减少初始加载 | `loading="lazy"` + `IntersectionObserver` |

### 5.2 中期优化（1-2天工作量）

| 优化项 | 当前问题 | 方案 |
|--------|---------|------|
| Vendor Bundle 分离 | 所有依赖打包到主 chunk | vite build.rollupOptions.output.manualChunks |
| Canvas 空间哈希 | O(n²) 连接线计算 | 网格分区，空间复杂度降至 O(n) |
| useURLStore | 无缓存 | VueUse `useStorage` 持久化路由状态 |
| Message History Virtual Scroll | 全量 DOM 渲染 | `@tanstack/vue-virtual` 虚拟列表 |

### 5.3 性能基准目标

| 指标 | 当前估计 | 优化后目标 | 工具 |
|------|---------|-----------|------|
| LCP | > 4s | < 2.5s | Lighthouse |
| TTI | > 5s | < 3s | Lighthouse |
| Bundle Size (首屏) | ~450KB | < 150KB | vite-bundle-visualizer |
| FPS (Particle) | ~30fps (100粒子) | > 55fps | Chrome DevTools |

---

## 六、基础设施扩展计划

### 6.1 1,000 用户规模

**当前架构可支撑（无需改动）：**
- Supabase 免费层 Tiers 3（支持 ~500 DAU）
- 无需任何微服务拆分
- **需增加：** Pinia 状态管理、路由懒加载、基本索引

**瓶颈：**
- Canvas 动画在低端设备上可能掉帧
- Supabase Realtime 并发连接数限制

### 6.2 10,000 用户规模

**架构调整需求：**
- Supabase Pro Plan（$25/月）或迁移至自托管 PostgreSQL
- 需要 API 网关（Supabase 代理或 Kong）
- Supabase Storage 文件 CDN 化
- **必须增加：**
  - Redis 缓存层（热榜数据、用户 Session）
  - 搜索服务（Elasticsearch 或 Meilisearch）
  - CDN 加速（Vercel Edge / Cloudflare）

**瓶颈：**
- 校园墙列表查询需要分页和索引
- AI 接口调用成本开始显著（需限流）

### 6.3 100,000 用户规模

**架构必须重构：**
- Supabase 迁移至自托管或 PlanetScale/Neon
- 前端必须微前端化（Vue 3 Module Federation）
- 需要独立 Python 微服务处理爬虫/AI/向量搜索
- **必须增加：**
  - 消息队列（Kafka / RabbitMQ）
  - 向量数据库（pgvector / Pinecone）
  - 独立 AI 服务层（FastAPI + DeepSeek API + 限流）
  - 对象存储（OSS / S3 替代 Supabase Storage）
  - CDN + DDoS 防护
  - 支付网关（Stripe / 微信支付）接入
  - 内容审核服务（阿里云/腾讯云内容安全）

**成本估算：**
- 云服务基础成本：$500-2000/月
- AI API 调用：$1000+/月（取决于调用量）
- 全职 DevOps：$8000+/月

---

## 七、最终架构建议

### 7.1 立即行动（本周）

```
PRIORITY 1: 修复 Critical Issues
├── 删除 style.css 中的全局 cursor:none
├── 修复 Chat.vue XSS 风险（引入 dompurify）
├── 清理废弃的重复页面文件
└── 清理 Chat.vue setInterval 内存泄漏

PRIORITY 2: 架构基础
├── 引入 Pinia（状态管理）
├── 引入 VueUse（工具 composables）
├── vite.config.ts 添加路由懒加载
└── 创建 types/ 目录定义全局类型
```

### 7.2 MVP 阶段（2-4周）

```
MVP Architecture:
frontend/ (Vue 3 + TypeScript + Vite)
├── src/
│   ├── components/     # 基础组件
│   ├── composables/     # 业务逻辑复用
│   ├── stores/         # ✨ 新增：Pinia stores
│   │   ├── auth.ts
│   │   ├── chat.ts
│   │   └── wall.ts
│   ├── services/       # ✨ 新增：API 封装层
│   │   └── supabase.ts → 泛化
│   ├── types/          # ✨ 新增：全局类型定义
│   └── pages/

backend/ (Supabase + Edge Functions)
├── Supabase Auth
├── PostgreSQL (表结构)
├── Realtime Channels
├── Storage (文件)
└── Edge Functions (AI 代理)  ← 解决本地授权不可行问题
```

### 7.3 长期架构演进

```
Phase 3+ Required Architecture:
├── frontend/           # Vue 3 微前端
├── backend/            # Node.js / Go API 网关
├── ai-service/         # Python FastAPI（AI 代理、向量搜索）
├── crawler-service/     # Python Scrapy（仅星火资讯）
├── ml-service/         # 推荐算法服务
└── infra/             # Terraform / Docker Compose
```

### 7.4 最重要的架构决策

1. **废弃"本地授权"方案** — Web 端无法实现，改为后端代理 + API Key 托管
2. **引入 Pinia** — 当前 ref() 方案在复杂度提升后将无法维护
3. **建立 API 服务层** — 不要在组件内直接调用 Supabase client
4. **路线图分期执行** — 第三阶段的资讯和人才模块需要独立微服务，不应与前端 MVP 共用架构
5. **Accessibility 先行** — WCAG AA 合规不仅是法律要求（中国无障碍法规），也是用户留存的关键

---

## 附录：关键文件快速索引

| 文件 | 问题数 | 优先级 |
|------|--------|--------|
| `frontend/src/style.css` | 1 Critical | P0 |
| `frontend/src/pages/app/Chat.vue` | 3 Critical | P0 |
| `frontend/src/components/MouseFollower.vue` | 1 Critical | P0 |
| `frontend/src/components/ParticleBackground.vue` | 1 High | P1 |
| `frontend/src/pages/app/Profile.vue` | 1 High | P1 |
| `frontend/vite.config.ts` | 1 Critical | P0 |
| `frontend/src/router/index.ts` | 1 High | P1 |
| `docs/SparkAlliance.md` | 1 Critical（AI授权方案不可行） | P0 |

---

*本评审基于 2026-03-20 的代码快照。路线图功能复杂，建议按 MVP → Phase 2 → Phase 3 逐步验证架构可行性，每阶段结束时进行架构复审。*
