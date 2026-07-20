# StarSpark Wall 组件蓝图 (Component Blueprints)

> 提取自 `DesingImage/starspark-wall/1.png`（信息流主页）和 `2.png`（帖子详情页）
> 现有代码：`frontend/src/pages/app/CampusWall.vue`

---

## 组件树

```
CampusWall.vue (页面根)
├── WallLeftSidebar (左侧栏)
│   ├── LeftBrand (Logo + 标题)
│   ├── LeftNav (垂直导航 Tab)
│   ├── QuickFilterRow (快速筛选胶囊)
│   ├── ProfileCard (用户档案卡)
│   │   ├── ProfileHeader (头像 + 昵称 + 等级)
│   │   ├── ProfileStats (活跃指数 + 连续活跃 + 发帖)
│   │   ├── StreakTracker (连续活跃进度 + 7日星轨)
│   │   └── MiniCalendar (活跃日历)
│   └── DailyTasks (今日任务列表)
├── WallMainFeed (中间主区)
│   ├── ComposeEntry (发布入口)
│   ├── QuickActions (快捷动作按钮行)
│   ├── TrendingTags (热门标签横条)
│   ├── FeedList (帖子流容器)
│   │   ├── PostCard × N (帖子卡片)
│   │   │   ├── PostHeader (作者 + 认证 + 标签 + 时间)
│   │   │   ├── PostContent (正文 + 折叠展开)
│   │   │   ├── PostMedia (图片/视频网格)
│   │   │   ├── PostTags (话题标签)
│   │   │   ├── PostReactions (表情回应)
│   │   │   └── PostActions (点赞/评论/收藏/分享)
│   │   └── SkeletonCard × 3 (骨架屏)
│   └── EmptyState (空状态)
├── WallRightRail (右侧信息栏)
│   ├── RightPublishBtn (发布动态按钮)
│   ├── HotRankSection (今日热榜)
│   ├── RecommendCircles (推荐圈子)
│   ├── WeeklyCalendar (本周活动日历)
│   ├── HotSearchChips (校园热搜)
│   ├── RealtimeStats (实时动态 + 曲线图)
│   ├── AiTopicHelper (AI 话题助手)
│   └── TrustSafety (校园信任与安全)
└── WallPostDetail (帖子详情页 - 路由或状态切换)
    ├── DetailBreadcrumb (面包屑导航)
    ├── DetailTopBar (返回 + 分享 + 收藏 + 举报 + 更多)
    ├── DetailPostCard (主帖大卡)
    │   ├── DetailAuthor (作者 + 认证 + 编辑状态)
    │   ├── DetailContent (标题 + 正文 + 标签)
    │   ├── DetailMedia (大图网格)
    │   └── DetailInteractions (互动数据栏)
    ├── CommentSection (评论区)
    │   ├── CommentSortTabs (最热/最新/AI总结)
    │   ├── CommentCard × N (评论卡片)
    │   │   ├── AiComment (AI 助手评论 - 带特殊标识)
    │   │   └── ReplyThread (楼中楼回复)
    │   └── CommentInput (底部固定输入条)
    └── DetailRightRail (详情右侧栏)
        ├── RelatedTopics (相关话题)
        ├── SimilarPosts (相似动态)
        ├── AiSummary (AI 总结)
        └── ShareCollect (分享与收藏)
```

---

## 组件蓝图

---

### 组件：WallLeftSidebar

#### 所在设计图
`1.png` 左侧约 240px 宽区域

#### 尺寸与布局
- 容器：宽度 240px，高度 100vh - topbar
- 内部布局：flex-col
- 内边距：16px
- position: sticky; top: 80px
- overflow-y: auto（自定义滚动条隐藏）

#### 视觉样式
- 背景：var(--wall-bg-sidebar)
- 边框右侧：1px solid var(--wall-border-subtle)
- 圆角：0（与页面边缘贴合）
- backdrop-filter: var(--wall-glass-blur)

#### 对应现有代码
- 文件：`frontend/src/pages/app/CampusWall.vue`
- 类名：`.wall-left`、`.left-inner`
- 需要保留的逻辑：tab 切换、用户数据绑定、任务列表刷新

---

### 组件：LeftNav (垂直导航)

#### 所在设计图
`1.png` 左侧栏，Logo 下方垂直列表

#### 尺寸与布局
- 容器：宽度 100%，高度 auto
- 内部布局：flex-col, gap: 4px
- 每个 nav-item 高度：36-40px
- 内边距：8px 12px

#### 视觉样式
- 默认：透明背景，文字 var(--wall-text-secondary)
- Active：背景 linear-gradient(90deg, rgba(124,58,237,0.2), transparent)，左侧 3px 紫色竖条，文字 var(--wall-text-primary)
- Hover：背景 rgba(139, 92, 246, 0.08)
- 图标 + 文字水平排列，图标 18px，文字 14px
- 圆角：var(--wall-radius-sm)

#### 子元素清单
1. nav-icon：span，16-18px 图标/emoji
2. nav-label：span，14px 400 weight

#### 状态变化
- default：透明，文字 0.6 opacity
- hover：微亮背景
- active：紫色渐变 + 左竖条
- 指示器：active 项右侧可能有小圆点通知

#### 交互动效
- hover：背景色 150ms ease-out
- click：active 态立即切换，内容区 fade 过渡

#### 对应现有代码
- 类名：`.left-nav`、`.nav-item`、`.nav-icon`、`.nav-label`

---

### 组件：ProfileCard (用户档案卡)

#### 所在设计图
`1.png` 左侧栏中下部，带头像、等级、XP 进度的卡片

#### 尺寸与布局
- 容器：宽度 100%，高度 auto
- 内部布局：flex-col, gap: 12px
- 内边距：16px
- 圆角：var(--wall-radius-md)

#### 视觉样式
- 背景：var(--wall-bg-card)
- 边框：1px solid var(--wall-border-card)
- 阴影：var(--wall-shadow-card)
- backdrop-filter: var(--wall-glass-blur)

#### 子元素清单
1. 头像区：50px 圆形头像 + 发光环（紫色 glow ring）
2. 昵称行：14px 600 weight + 等级 badge（⚡ Lv.12 星火守护者）
3. XP 进度条：高度 4px，紫色填充，背景暗灰，圆角 full
4. 统计行：3 列 flex（活跃指数 / 连续活跃天 / 发帖数），数字 16px 700 白色，标签 11px muted
5. 连续活跃：🔥 图标 + 文字 + 7 天节点星轨
6. 迷你日历：7 个圆点，active 为紫色实心，inactive 为暗色空心

#### 状态变化
- 数据 loading：数字区域 shimmer
- 等级变化：等级 badge 短暂放大 + glow

#### 对应现有代码
- 类名：`.profile-card`、`.pc-header`、`.pc-avatar-ring`、`.pc-stats`、`.streak-row`、`.mini-calendar`

---

### 组件：ComposeEntry (发布入口)

#### 所在设计图
`1.png` 中间区顶部，头像 + 输入框占位

#### 尺寸与布局
- 容器：宽度 100%，高度 48px
- 内部布局：flex-row, align-center, gap: 12px
- 内边距：12px 16px
- 圆角：var(--wall-radius-lg)

#### 视觉样式
- 背景：var(--wall-bg-compose)
- 边框：1px solid var(--wall-border-card)
- 头像：32px 圆形
- 占位文字：var(--wall-text-muted), 14px

#### 状态变化
- default：静态
- hover：边框微亮 → var(--wall-border-card-hover)
- click：展开发布弹窗

#### 对应现有代码
- 类名：`.compose-entry`、`.compose-avatar`、`.compose-placeholder`

---

### 组件：QuickActions (快捷动作行)

#### 所在设计图
`1.png` 发布入口下方，一排彩色按钮

#### 尺寸与布局
- 容器：宽度 100%，高度 auto
- 内部布局：flex-row, gap: 8px, flex-wrap: wrap
- 每个按钮高度：32-36px
- 内边距：6px 14px

#### 视觉样式
- 按钮背景：各功能不同底色
  - 发动态（主）：var(--wall-accent-purple) 实心填充
  - 发活动：rgba(59, 130, 246, 0.15) 蓝色半透明
  - 发投票：rgba(16, 185, 129, 0.15) 绿色半透明
  - 匿名树洞：rgba(139, 92, 246, 0.15) 紫色半透明
  - 求助：rgba(245, 158, 11, 0.15) 黄色半透明
  - 图片/视频：rgba(59, 130, 246, 0.15) 蓝色半透明
- 文字：13px 500，与按钮底色同色系但更亮
- 圆角：var(--wall-radius-full) 胶囊
- emoji 图标在文字左侧

#### 状态变化
- hover：opacity 0.85，轻微上浮
- pressed：scale(0.97)

#### 对应现有代码
- 类名：`.quick-actions`、`.qa-btn`、`.qa-primary`

---

### 组件：PostCard (帖子卡片)

#### 所在设计图
`1.png` 中间 Feed 列表中的每一个帖子

#### 尺寸与布局
- 容器：宽度 100%，高度 auto
- 内部布局：flex-col, gap: 10px
- 内边距：16px
- 外间距：bottom 12px（Feed 卡片间隙）
- 圆角：var(--wall-radius-md)

#### 视觉样式
- 背景：var(--wall-bg-post)
- 边框：1px solid var(--wall-border-card)
- 阴影：var(--wall-shadow-card)
- backdrop-filter: var(--wall-glass-blur)

#### 子元素清单
1. **PostHeader**：头像(36px) + 昵称(14px/600) + 认证标签(官方/校方) + 学校 badge + 分类标签 + 时间(12px/muted) + 更多按钮
2. **PostContent**：正文文字 14px/1.6，超 200 字折叠，展开按钮紫色
3. **PostMedia**：图片网格（1图满宽，2图 1:1 双列，3图 1大+2小），最后一张 +N 遮罩
4. **PostTags**：话题标签 `#xxx`，紫色 12px，点击可筛选
5. **PostReactions**：表情回应 chip 行
6. **PostActions**：点赞❤️ + 评论💬 + 收藏⭐ + 分享↗️，图标 18px + 计数

#### 状态变化
- default：静态卡片
- hover：translateY(-2px) + border 变亮 + shadow 加深
- 点赞 active：❤️ 变粉红实心 + 星点爆发动画
- 收藏 active：⭐ 变实心金色

#### 交互动效
- 入场：stagger 40ms，opacity 0→1 + translateY(12px→0)
- hover：200ms ease transition
- 点赞：600ms burst particles
- 媒体 hover：scale(1.03) 150ms

#### 对应现有代码
- 类名：`.post-card`、`.post-header`、`.post-content`、`.post-media`、`.post-tags`、`.post-actions`
- 保留逻辑：toggleLike、openComments、长文折叠

---

### 组件：HotRankSection (今日热榜)

#### 所在设计图
`1.png` 右侧栏第一个区块

#### 尺寸与布局
- 容器：宽度 100%，高度 auto
- 内部布局：flex-col
- 内边距：12px
- 每个热榜项高度：28-32px

#### 视觉样式
- 区块背景：var(--wall-bg-card)
- 边框：1px solid var(--wall-border-card)
- 圆角：var(--wall-radius-md)
- 标题：🔥 今日热榜，16px/600
- 排名数字：
  - Top 1-3：橙红色圆形底，白色数字
  - 4+：灰色数字
- 标题文字：13px 400，白色 0.85
- 热度 badge：小火焰 + 数字，橙色 12px
- 右侧数字（12.8w）：12px muted

#### 状态变化
- Top 3 item：有微弱暖色脉冲光（呼吸动画）
- hover：背景微亮 + 文字提亮

#### 对应现有代码
- 类名：`.right-section`、`.hot-list`、`.hot-item`、`.hot-rank`

---

### 组件：RecommendCircles (推荐圈子)

#### 所在设计图
`1.png` 右侧栏，热榜下方

#### 尺寸与布局
- 容器：宽度 100%
- 每个圈子项：flex-row, gap: 10px, height: 44px
- 内边距：12px

#### 视觉样式
- 圈子头像：32px 圆形，各有不同渐变色底
- 名称：13px 500 白色
- 成员数：12px muted + 人物图标
- 加入按钮：胶囊型，紫色描边，hover 填充

#### 子元素清单
1. circle-avatar：32px 圆形 + 内部 emoji/图标
2. circle-info：名称 + 成员数
3. circle-join：加入按钮 24px 高，圆角 full

#### 对应现有代码
- 类名：`.circle-list`、`.circle-item`、`.circle-join`

---

### 组件：RealtimeStats (实时动态)

#### 所在设计图
`1.png` 右侧栏下部，含折线图

#### 尺寸与布局
- 容器：宽度 100%，高度 ~120px
- 图表区：SVG，viewBox 240×60
- 标签行：flex-row justify-between

#### 视觉样式
- 在线指示：绿色圆点 + "在线 2,845 人"
- 今日统计：muted 文字
- 折线：stroke #8b5cf6，2px，linecap round
- 面积填充：渐变 #8b5cf6 35% → 透明
- 时间标签：12px muted，0:00/6:00/12:00/18:00/24:00
- 当前数据点：发光圆点

#### 交互动效
- 进入视口时折线从左到右绘制（stroke-dashoffset 动画）
- 当前点有呼吸脉冲

#### 对应现有代码
- 类名：`.rt-stats-row`、`.rt-chart`、`.rt-chart-svg`

---

### 组件：AiTopicHelper (AI 话题助手)

#### 所在设计图
`1.png` 右侧栏，🤖 标题区块

#### 尺寸与布局
- 容器：宽度 100%
- 每个建议项：flex-row, gap: 8px, height: 36px
- 内边距：12px

#### 视觉样式
- 背景：var(--wall-bg-card) + 微弱渐变边框
- 标题带 🤖 图标
- 建议项：左 emoji + 文字 13px + 右箭头 ›
- hover：背景微亮，右箭头右移 2px

#### 子元素清单
1. ai-sug-icon：emoji 图标
2. ai-sug-text：13px 建议文字
3. ai-sug-arrow：› 箭头，muted

#### 对应现有代码
- 类名：`.ai-helper`、`.ai-suggestions-list`、`.ai-sug-item`

---

### 组件：WallPostDetail (帖子详情页)

#### 所在设计图
`2.png` 整页

#### 尺寸与布局
- 沿用三栏布局（左侧栏 + 主内容 + 右侧栏）
- 主内容区宽度：占中间列全宽
- 底部固定评论输入条：height 56px

#### 视觉样式
- 面包屑导航：`功能生态 / 星火墙 / 帖子详情`，12px muted，/ 分隔
- 整体与列表页保持一致的深空背景

#### 对应现有代码
- 当前为同页面状态切换或可拆为独立路由
- 现有代码中帖子详情通过弹窗/抽屉实现，设计图建议独立全页

---

### 组件：DetailTopBar (详情顶部操作栏)

#### 所在设计图
`2.png` 主内容区最顶部

#### 尺寸与布局
- 容器：宽度 100%，高度 40px
- 内部布局：flex-row, justify-between, align-center

#### 视觉样式
- 左侧：← 返回 按钮，文字链样式
- 右侧：分享 / 收藏 / 举报 / 设为置顶推荐 / •••
- 按钮样式：图标 + 文字，13px，muted 色，hover 变亮
- 间距：按钮间 16px

#### 状态变化
- 默认：muted 色
- hover：文字变 primary，图标变 accent
- 已收藏：⭐ 变实心金色
- 已置顶：显示红色「置顶」标签

---

### 组件：DetailPostCard (主帖大卡)

#### 所在设计图
`2.png` 中间大内容区

#### 尺寸与布局
- 容器：宽度 100%，内边距 20-24px
- 圆角：var(--wall-radius-lg)
- 内部布局：flex-col, gap: 16px

#### 视觉样式
- 背景：var(--wall-bg-post)
- 边框：1px solid var(--wall-border-card)
- 作者行：头像 40px + 昵称 15px/600 + 官方认证 badge + 学校 + 时间 + 已编辑
- 标题：18-20px/700 白色，加粗突出
- 正文：14px/1.6 行高
- 话题标签：紫色 #标签
- 图片区：大图横排网格，支持点击预览
- 互动数据行：点赞 256 | 评论 48 | 收藏 132 | 浏览 6,245

#### 子元素清单
1. 作者行：头像 + info + 认证 + 时间
2. 标签行：置顶/官方/校园资讯 chips
3. 标题：h2 级别
4. 正文段落
5. 图片网格：4-5 图横排，最后 +N
6. 互动数据栏：4 个 action-btn

#### 对应现有代码
- 可复用 `.post-card` 结构但放大尺寸

---

### 组件：CommentSection (评论区)

#### 所在设计图
`2.png` 主帖下方

#### 尺寸与布局
- 容器：宽度 100%
- 排序 Tab 高度：36px
- 每条评论：padding 12px，min-height 60px
- 底部输入条：fixed，高度 56px

#### 视觉样式
- 排序 Tab：最热 / 最新，active 下划线紫色
- 评论数：「全部评论 (48)」，16px/600
- 评论卡片：
  - 头像 32px + 昵称 13px + 身份标签 + 时间
  - 内容 14px
  - 操作：点赞 + 回复
- AI 评论：带 🤖 AI 标识 + 特殊底色（紫色极淡）
- 底部输入条：固定底部，输入框 + 表情 + emoji 快捷 + 发布按钮

#### 状态变化
- 输入框 focus：发光边框 + 上方弹出 emoji 栏
- 发布后：新评论从上方淡入

#### 交互动效
- 评论入场：opacity + Y 位移
- 输入框 focus：border glow 200ms
- 发布按钮 active：scale 0.97

#### 对应现有代码
- 当前评论通过弹出浮层实现，设计图建议内嵌

---

### 组件：RelatedTopics (相关话题 - 详情右侧栏)

#### 所在设计图
`2.png` 右侧栏顶部

#### 尺寸与布局
- 容器：宽度 100%
- 话题 chip：inline-flex, gap: 8px
- 每个 chip 高度：28px

#### 视觉样式
- 话题 chip：# 前缀 + 话题名 + 讨论数
- 背景：rgba(139, 92, 246, 0.1)
- 圆角：var(--wall-radius-sm)
- 文字：12-13px，紫色
- 讨论数：muted，右侧

---

### 组件：AiSummary (AI 总结 - 详情右侧栏)

#### 所在设计图
`2.png` 右侧栏中下部

#### 尺寸与布局
- 容器：宽度 100%，padding 14px
- 圆角：var(--wall-radius-md)

#### 视觉样式
- 标题：「AI 总结」 + ⚡ 由星火AI生成
- 背景：var(--wall-bg-card) + 微弱紫色边框渐变
- 摘要文字：13px/1.5，var(--wall-text-secondary)
- 关键词 chips：小胶囊，不同颜色底（理程方向 / 申请时间 / 参与合作 / 国际交流）
- 底部：「查看完整总结」按钮，紫色文字链

#### 状态变化
- loading：打字机光标 / 流光 shimmer
- 生成完成：内容淡入
- hover 查看完整：文字变亮 + 箭头右移

#### 交互动效
- 生成时：文字逐字打出（typewriter 效果）
- 关键词 chips：hover scale(1.05)

---

### 组件：ShareCollect (分享与收藏 - 详情右侧栏)

#### 所在设计图
`2.png` 右侧栏底部

#### 尺寸与布局
- 容器：宽度 100%
- 操作项：flex-row wrap, gap: 8px
- 每个操作图标+文字

#### 视觉样式
- 四个操作：分享给朋友 / 分享收藏到群聊 / 添加到收藏夹 / 生成海报分享
- 图标：24px 圆形底色 + 内部 icon
- 文字：12px muted
- 海报分享区：缩略预览卡片 + 「生成海报分享」按钮

#### 子元素清单
1. 分享图标行：4个圆形图标按钮
2. 海报预览卡：缩略图 + 文字描述
3. 生成按钮：紫色渐变按钮

---

## 响应式行为

| 断点 | 左侧栏 | 中间 Feed | 右侧栏 |
|------|---------|-----------|---------|
| ≥1300px (Desktop) | 240px 固定 | 弹性填充 | 280px 固定 |
| 1100-1299px | 220px 缩窄 | 弹性填充 | 隐藏 |
| 768-1099px | 隐藏（抽屉） | 100% | 隐藏 |
| <768px (Mobile) | 隐藏 | 100%, 顶部 Tab | 隐藏 |

---

## 全局装饰与氛围

| 层级 | 实现方式 | 效果 |
|------|----------|------|
| 底层星空 | `CosmicBackground.vue` 或 `ParticleBackground.vue` | 低密度粒子星空 |
| 中层星云 | `::before` / `::after` 伪元素 + radial-gradient | 右上/左下紫蓝光斑，20s 周期漂移 |
| 内容装饰 | 卡片角落 CSS 星点 + border 流光 | hover 时增强 |
| 热榜脉冲 | box-shadow animation | Top 3 暖色呼吸光，3s 周期 |

---

## 与现有代码对应关系汇总

| 设计图组件 | 现有类名/区块 | 操作建议 |
|-----------|--------------|----------|
| WallLeftSidebar | `.wall-left` | 保留结构，升级视觉密度 |
| LeftNav | `.left-nav` + `.nav-item` | 增加 active 紫色渐变 |
| ProfileCard | `.profile-card` + `.pc-*` | 增加 glow ring、星轨动画 |
| ComposeEntry | `.compose-entry` | 保留逻辑 |
| QuickActions | `.quick-actions` + `.qa-btn` | 增加分类色彩 |
| PostCard | `.post-card` + `.post-*` | 核心保留，升级 hover/入场动效 |
| HotRankSection | `.right-section` + `.hot-*` | 增加 Top3 脉冲光 |
| RealtimeStats | `.rt-chart` + `.rt-*` | 增加绘制动画 |
| WallPostDetail | 新增 | 新组件/路由 |
| CommentSection | 现有浮层 → 内嵌 | 重构为页面内组件 |
| AiSummary | 新增 | 新组件 |
| ShareCollect | 新增 | 新组件 |
