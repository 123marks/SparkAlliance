# StarSpark Dashboard 组件蓝图 (Component Blueprints)

> 提取自 `DesingImage/starspark-dashboard/` 6.png（完整页面）+ 7.png（快捷中心）
> 现有代码：`frontend/src/pages/app/AppHome.vue`

---

## 组件树

```
AppHome.vue (主控台页面)
├── DashHero (Hero 主视觉区)
│   ├── HeroGreeting (问候 + 日期 + AI洞察)
│   ├── HeroCapsules (洞察胶囊 ×3)
│   ├── HeroActions (刷新主控台 + 去完成规划)
│   └── HeroPlanet (星球 + 星环 + 背景)
├── DashStatusCards (状态总览 6卡)
│   └── StatusCard ×6 (图标 + 大数字 + 描述)
├── DashWorkArea (核心工作区 - 三栏)
│   ├── PriorityTasks (今日优先处理)
│   ├── TodaySchedule (今日日程)
│   └── PlanProgress (规划推进)
├── DashEfficiency (辅助效率区 - 四栏)
│   ├── ShoppingDynamic (购物动态)
│   ├── QuickNote (快速笔记)
│   ├── WeeklyRate (本周执行率 - 圆环)
│   └── AiSuggestions (AI 今日建议)
├── DashGrowth (成长激励区 - 四栏)
│   ├── GrowthProgress (成长进度)
│   ├── AchievementBadges (成就徽章)
│   ├── DailyInspiration (每日灵感)
│   └── CampusHotRank (校园热榜)
├── DashExplore (探索更多 - 网格)
│   └── ExploreCard ×12 (模块入口卡)
├── DashFooter (底部品牌区)
└── StarQuickCenter (右下星芒快捷中心)
    ├── StarButton (悬浮按钮)
    └── QuickPanel (弹出面板)
        ├── PanelGreeting (问候卡)
        ├── QuickActions (快速动作 ×6)
        ├── TodayReminder (今日提醒)
        ├── RecentVisit (最近访问 ×4)
        └── InspirationFeedback (灵感与反馈 ×4)
```

---

## 核心组件蓝图

### 组件：DashHero

#### 所在设计图
`6.png` 顶部大横幅区域

#### 尺寸与布局
- 容器：100% 宽，高度 ~200px
- 内部：flex-row，左内容 60% + 右星球 40%
- 内边距：24px 32px
- 圆角：var(--dash-radius-xl)
- 溢出隐藏

#### 视觉样式
- 背景：var(--dash-bg-hero) + 半透明紫色星云叠加
- 边框：1px solid var(--dash-border-hero)
- 右侧星球：大型渐变球体 + 发光环 + 星尘粒子
- 左侧：大标题 24px/700 白 + 日期 12px muted + AI洞察 14px secondary
- 胶囊：3个 pill，背景各不同(绿/紫/橙)，12px 文字
- 按钮区右侧：「刷新主控台」线框 + 「去完成规划」紫色实心

#### 交互动效
- 入场：文案 stagger 50ms 上浮淡入，星球从右 20px 滑入
- 刷新按钮：图标旋转 360°
- 星球：缓慢 Y 轴漂浮(±5px, 6s周期)
- 星环：匀速旋转(60s一周)

#### 对应现有代码
- 现有 `.dash-hero` 区域
- 保留：问候逻辑、日期计算、AI洞察数据

---

### 组件：StatusCard (×6)

#### 所在设计图
`6.png` Hero 下方一排 6 张卡

#### 尺寸与布局
- 网格：6列等宽(桌面)，gap 16px
- 单卡：flex-col, padding 16px, min-height ~100px
- 圆角：var(--dash-radius-lg)

#### 视觉样式
- 背景：var(--dash-bg-card)
- 边框：1px solid var(--dash-border-card)
- 图标：左上 32px，使用 `主控台功能图标资产板.png` 风格（深色底板+紫蓝发光）
- 数字：28px/700 白色，右对齐或居中
- 描述：12px muted（待完成 5 项 / 进行中 3 个）
- 背景内有微弱功能色渐变(如任务=紫,商品=蓝,交流=粉)

#### 状态变化
- hover：translateY(-3px) + 边框亮 + 阴影加深 + 图标 glow 增强
- active：scale(0.98)
- loading：数字区 shimmer

#### 交互动效
- 入场：stagger 50ms, opacity 0→1 + Y(12→0)
- 数字：count-up 500ms ease-out
- hover：200ms transition

#### 对应现有代码
- 现有 `.status-cards` / `.stat-card`

---

### 组件：PriorityTasks (今日优先处理)

#### 所在设计图
`6.png` 核心工作区左栏

#### 尺寸与布局
- 容器：flex-col, padding 16px 20px
- 每条任务：flex-row, height ~48px, gap 12px
- 圆角：var(--dash-radius-lg)

#### 视觉样式
- 卡片背景：var(--dash-bg-card)
- 标题：16px/600 + 右侧「查看全部」链接
- 任务条：左色条(3px宽) + 图标 + 标题 + 时间 + 「去处理」按钮
- 优先级色条：高=橙红, 中=紫蓝, 低=青绿
- 空状态：星球插画 +「今天暂无紧急事项」

#### 对应现有代码
- 现有 `.priority-tasks` 区域

---

### 组件：WeeklyRate (本周执行率)

#### 所在设计图
`6.png` 辅助效率区第三列

#### 尺寸与布局
- 容器：正方形或 4:3，padding 16px
- 圆环：SVG 100×100, 居中

#### 视觉样式
- 圆环：stroke 紫蓝渐变，背景 stroke 暗灰，width 8px
- 中心数字：22px/700「78%」白色
- 下方：「较上周 +12%」绿色文字
- 图例：已完成/进行中/未开始，小圆点+文字

#### 交互动效
- 进入视口：圆环从 0° 动画到目标角度，600ms ease-out
- 数字同步 count-up

---

### 组件：StarQuickCenter (星芒快捷中心)

#### 所在设计图
`7.png` 整页

#### 尺寸与布局
- 入口按钮：56px 圆形，fixed 右下 24px
- 弹出面板：320px 宽，max-height 80vh，圆角 20px
- 面板内各区块：padding 16px, gap 16px

#### 视觉样式
- 按钮：紫蓝渐变圆形 + 中心白色星芒 + 外圈光环
- 面板背景：var(--dash-bg-quickcenter)，backdrop-filter blur(20px)
- 边框：1px solid rgba(139,92,246,0.2)
- 分区标题：带编号圆圈(① ② ③ ④)

#### 子元素清单
1. 问候卡：头像 + 问候语
2. 快速动作：6 个圆形图标(AI对话/添加日程/开始专注/发动态/发布商品/进入自习室)
3. 今日提醒：4 条，图标+文字，分两列
4. 最近访问：4 个图标按钮
5. 灵感与反馈：4 个图标按钮(今日灵感/提建议/切换主题/返回顶部)

#### 交互动效
- 打开：transform-origin: bottom right, scale(0.8→1) + opacity(0→1), 250ms
- 关闭：反向 180ms
- 内容 stagger：各区块 40ms 延迟淡入
- 入口按钮：常态呼吸光(3s周期)，hover 光增强+上浮

#### 对应现有代码
- 新增组件

---

## 图标系统规范

### 侧栏图标（from 1.png）
| 图标 | 描述 | 风格 |
|------|------|------|
| SparkAlliance | 四角星 | 紫蓝发光，无底板 |
| 主控台 | 六边形+房屋 | 深蓝底+亮蓝线 |
| AI 助手 | 气泡+机器人脸 | 蓝紫渐变底+白描线 |
| 星火墙 | 盾牌+火焰 | 深蓝底+暖色火焰 |
| 智能日程 | 日历+星点 | 紫底+亮线 |
| 星火规划 | 剪贴板+勾 | 紫底+青色勾 |
| 星火购物 | 购物车+星 | 深紫底+亮线 |
| 学习资源 | 书+播放 | 深蓝底+紫色播放 |
| 星火共创 | 六边形+人群 | 深紫底+亮人形 |
| 设置中心 | 齿轮+星 | 紫底+紫发光 |
| 一键专注 | 瞄准框+星 | 紫底+白线 |
| 今日能量值 | 闪电 | 蓝色渐变，无底板 |

### 操作图标（from 2.png）
- 搜索：放大镜，纯线性，紫蓝发光
- 通知：铃铛 + 红色数字 badge
- 消息：气泡 + 红色数字 badge
- 校区选择器：学校建筑 + 旗帜
- 刷新：圆形箭头，蓝色渐变
- 去完成规划：圆角矩形 + 右箭头，紫色实心
- 快速发布：圆角方形 + 加号
- 操作更多：圆角方形 + 三点

---

## 与现有代码差异对照

| 区域 | 设计图要求 | 可能的现有差距 | 修改方向 |
|------|-----------|--------------|----------|
| 侧栏图标 | 精修发光图标（1.png风格） | 可能使用 emoji 或简单 SVG | 替换为设计图标资产 |
| 状态卡 | 深色底+发光图标+大数字 | 密度/间距/图标可能不一致 | 调整卡片样式+图标 |
| Hero | 星球+星环+极光+胶囊 | 可能缺少星球动态元素 | 增加星球/星环/胶囊 |
| 卡片边框 | 1px紫蓝描边+hover发光 | 可能无边框或描边不对 | 统一 border 变量 |
| 圆角 | 14-20px统一 | 可能不一致 | 统一使用 token |
| 数字入场 | count-up动画 | 可能静态 | 增加 IntersectionObserver + anime |
| 快捷中心 | 右下悬浮+弹层（7.png） | 可能尚未实现 | 新增组件 |
| 执行率 | SVG圆环+动画 | 可能是静态或不同实现 | 统一为 SVG 动画 |
| 探索更多 | 发光网格卡 | 可能样式偏平 | 增加发光+底板 |

---

## 响应式断点

| 断点 | 状态卡 | 工作区 | 效率区 | 成长区 | 探索 |
|------|--------|--------|--------|--------|------|
| ≥1400px | 6列 | 3列 | 4列 | 4列 | 6列 |
| 1100-1399px | 3×2 | 2列 | 2×2 | 2×2 | 4列 |
| 768-1099px | 2×3 | 1列 | 2×2 | 2×2 | 3列 |
| <768px | 2×3 | 1列 | 1列 | 1列 | 2列 |

---

## 实现优先级

### P0 - 立即对齐
1. 侧栏选中态（紫蓝渐变+发光边框）
2. 状态卡样式（深色玻璃+图标+大数字）
3. Hero 布局与星球
4. 所有卡片统一圆角/边框/hover

### P1 - 关键功能
5. 核心工作区三栏（优先处理/日程/规划）
6. 效率区四栏（购物/笔记/圆环/AI建议）
7. 成长区四栏（进度/徽章/灵感/热榜）
8. 数字 count-up 动画

### P2 - 增强体验
9. 星芒快捷中心（7.png）
10. 探索更多网格
11. Hero 星球动态（漂浮/星环旋转）
12. 图标替换为设计图资产
