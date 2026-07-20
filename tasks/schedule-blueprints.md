# StarSpark Schedule 组件蓝图 (Component Blueprints)

> 提取自 `DesingImage/starspark-schedule/` 目录
> 现有代码：`SmartSchedule.vue` / `Schedule.vue` / `Planner.vue` / `Tarot.vue`

---

## 组件树

```
SmartSchedule.vue (模块整合层)
├── ScheduleView (智能日程 - 默认主视图)
│   ├── SchedHero (Hero 横幅)
│   │   ├── HeroTitle (问候 + 副标题)
│   │   ├── HeroStats (4 数据卡: 今日事项/专注时长/空闲时间/冲突警告)
│   │   └── RhythmRing (节奏得分圆环)
│   ├── SchedTopBar (日期导航 + 视图切换 + AI按钮)
│   ├── SchedTimeline (时间轴主区)
│   │   ├── TimelineHours (左侧小时标签)
│   │   ├── TimelineNowLine (当前时间红线)
│   │   └── EventBlock ×N (事件色块)
│   ├── SchedPendingList (待安排事项)
│   │   └── PendingItem ×N
│   ├── SchedRightRail (右侧信息栏)
│   │   ├── TodayRhythm (今日节奏时间轴)
│   │   ├── AiReminder (AI 提醒)
│   │   ├── EnterPlanner (进入星火规划入口)
│   │   └── EnterTarot (进入星火卡罗牌入口)
│   ├── SchedBottomCards (底部功能卡)
│   │   ├── ReviewCard (今日复盘)
│   │   ├── HabitCard (习惯打卡)
│   │   ├── LearnCard (学习资源推荐)
│   │   └── FocusCard (专注模式)
│   ├── AiScheduleBtn (AI 一键排程悬浮按钮)
│   └── EventModal (新建/编辑事件弹窗)
│       ├── ModalTitle (标题输入)
│       ├── ModalTypeGrid (类型选择 7 格)
│       ├── ModalTime (全天/开始/结束时间)
│       ├── ModalLocation (AI 识别 + 手动搜索)
│       ├── ModalRepeatRemind (重复 + 提醒 + 优先级)
│       ├── ModalTags (标签输入)
│       ├── ModalNote (备注)
│       ├── ModalSmartOptions (同步规划 + 加入专注)
│       ├── ModalAiSuggestion (AI 建议条)
│       └── ModalActions (取消 + 创建事件)
├── PlannerPanel (星火规划 - 右侧滑面板)
│   ├── PlannerHero (规划 Hero)
│   ├── PlannerStats (数据卡)
│   ├── GoalMap (目标地图)
│   ├── MilestoneTimeline (阶段里程碑)
│   ├── WeeklyPlan (本周规划)
│   ├── AiPlanSuggestion (AI 规划建议)
│   └── PlannerActions (底部操作入口)
└── TarotView (星火卡罗牌 - 独立主视图)
    ├── TarotHero (Hero 横幅)
    ├── TarotCardDeck (中央卡组)
    ├── TarotInput (问题输入)
    ├── TarotInsight (系统综合洞察)
    ├── TarotEnergy (右侧能量栏)
    └── TarotHistory (最近解读记录)
```

---

## 核心组件蓝图

### 组件：SchedHero

#### 所在设计图
`1.png` 顶部横幅区域

#### 尺寸与布局
- 容器：100% 宽，高度 ~140px
- 内部：左侧标题/副标题 + 右侧 4 数据卡 + 最右圆环
- 内边距：20px 24px
- 圆角：16px
- 背景有渐变紫色星云

#### 视觉样式
- 背景：var(--sched-hero-bg) + 半透明星球插画
- 标题：20px/700「今天，按更轻松但更高效的方式推进」白色
- 副标题：13px/400 secondary
- 数据卡(4个)：数字 24px/700 + 标签 12px/muted，各有功能色(蓝/绿/青/红)
- 节奏圆环：56px 直径，渐变橙黄 stroke，中心数字 22px

#### 对应现有代码
- 现有 Schedule.vue 或 SmartSchedule.vue 顶部 Hero 区域

---

### 组件：SchedTimeline (时间轴)

#### 所在设计图
`1.png` 左侧主区域

#### 尺寸与布局
- 容器：flex-1 占中间区，overflow-y auto
- 左侧小时列：宽 50px，每行 60px 高
- 事件区：flex-1
- 当前时间线：红色/紫色水平线 + 左圆点

#### 视觉样式
- 小时标签：11px muted，居右对齐
- 水平网格线：1px var(--dash-border-subtle)
- 事件块：左侧 3px 色条 + 背景色(事件类型对应) + 标题 13px/500 + 时长 12px/muted
- 当前时间线：2px var(--sched-timeline-now) + 左圆点 8px

#### 子元素清单
1. TimelineHours：06:00~22:00 每小时标签
2. TimelineGrid：水平虚线网格
3. TimelineNowLine：红/紫实线 + 圆点
4. EventBlock：色条 + 标题 + 时间 + 类型图标

#### 状态变化
- 事件 hover：背景提亮 + 边框出现
- 当前进行事件：左色条脉冲动画
- 拖动事件：浮起 + 透明度 0.8 + 虚线占位

#### 对应现有代码
- `CalendarDay` 组件或 Schedule.vue 内日视图

---

### 组件：EventModal (新建事件弹窗)

#### 所在设计图
`4.png` 整页

#### 尺寸与布局
- 宽度：520px
- 高度：auto（scrollable）
- 圆角：20px
- 内边距：24px 28px
- 居中弹出 + 背景遮罩

#### 视觉样式
- 背景：var(--sched-modal-bg)
- 边框：1px solid var(--sched-modal-border)
- backdrop-filter: blur(20px)
- 阴影：var(--dash-shadow-elevated)

#### 子元素清单
1. **标题输入**：全宽输入框，placeholder「输入事件标题，如：高等数学期中复习」
2. **类型选择网格**：7 格（课程/考试/任务/生活/提醒/节日/自定义），选中发光 + 紫色边框
3. **全天事件 Toggle**：开关按钮
4. **开始/结束时间**：日期 + 时间选择器，各带日历图标
5. **地点**：双卡（AI 自动识别 + 手动搜索），各带图标
6. **重复/提醒/优先级**：三列 select + 胶囊按钮(低=绿 普通=蓝 高=橙 紧急=红)
7. **标签**：输入框 + 标签图标
8. **备注**：textarea，字数限制 0/200
9. **智能选项**：两个 toggle（同步到星火规划 / 加入一键专注）
10. **AI 建议**：底部紫色背景条 + 建议文案 + 「采纳建议」按钮
11. **操作按钮**：取消(线框) + 创建事件(紫色实心)

#### 状态变化
- 类型选中：卡片边框变紫色 + 背景微亮 + 图标发光
- 优先级选中：按钮填充对应颜色
- AI 建议 hover：「采纳建议」按钮变亮
- 创建按钮 disabled：表单未填满时灰色

#### 交互动效
- 弹窗入场：opacity + scale(0.95→1) + Y(8→0)，250ms
- 类型切换：选中动画 150ms
- AI 建议出现：底部滑入 200ms

#### 对应现有代码
- 现有 `EventModal` 组件
- 需保留：表单逻辑、AI 建议调用、冲突检测

---

### 组件：SchedRightRail (右侧信息栏)

#### 所在设计图
`1.png` 右侧区域

#### 尺寸与布局
- 宽度：300px
- 内部：flex-col, gap: 16px
- position: sticky, top: topbar

#### 视觉样式
- 各区块：独立卡片，深色玻璃底 + 紫蓝边框

#### 子元素清单
1. **今日节奏**：小时时间轴 + 彩色标注(专注高峰/课程/空闲/规划任务)
2. **AI 提醒**：紫色提示条，每条带图标 + 文案 + 「了解」按钮
3. **进入星火规划**：入口卡，含星球插画 + 简述 + 箭头
4. **进入星火卡罗牌**：入口卡，含卡牌背面插画 + 简述

#### 对应现有代码
- `UpcomingSidebar` 或右侧栏组件

---

### 组件：SchedBottomCards (底部功能卡)

#### 所在设计图
`1.png` 底部一排 4 张卡

#### 尺寸与布局
- 4 列等宽网格，gap: 16px
- 每张：padding 16px, min-height ~90px
- 圆角：12px

#### 子元素清单
1. **今日复盘**：📝 + 「回顾今天，记述达成」+ 「开始复盘」按钮
2. **习惯打卡**：✅ + 「已完成 3/8 已连续」+ 进度条 37%
3. **学习资源推荐**：📚 + 「为你推荐个性化学习内容」+ 「去探索」
4. **专注模式**：🎯 + 「开始任务时进入专注模式」+ 「立即开始」

#### 对应现有代码
- 可能为新增区域或 SmartSchedule.vue 底部

---

### 组件：AiScheduleBtn (AI 一键排程)

#### 所在设计图
`1.png` 右上角突出按钮

#### 尺寸与布局
- 位置：Hero 右上或页面右上固定
- 尺寸：~160px × 40px，胶囊型

#### 视觉样式
- 背景：var(--sched-ai-btn) 紫蓝渐变
- 文字：14px/500 白色 + ✨ 图标
- 发光：box-shadow 紫色外发光
- hover：亮度提升 + 外发光增强

#### 交互动效
- click：图标旋转 + 按钮 ripple + 弹出 AI 智能编排建议面板
- 生成中：流光边框动画

#### 对应现有代码
- 现有「AI 智能导入」按钮可升级

---

## 与现有代码对应关系

| 设计图组件 | 现有代码 | 操作建议 |
|-----------|----------|----------|
| SchedHero | SmartSchedule 顶部 | 升级视觉+数据卡 |
| SchedTimeline | CalendarDay | 保留逻辑，升级视觉 |
| EventModal | EventModal 组件 | 升级为 4.png 样式 |
| SchedRightRail | UpcomingSidebar | 重构内容+增加规划/卡罗牌入口 |
| SchedBottomCards | 新增 | 新组件 |
| AiScheduleBtn | AI 智能导入按钮 | 升级为渐变悬浮按钮 |
| PlannerPanel | Planner.vue(侧滑) | 保留架构，升级视觉 |
| TarotView | Tarot.vue | 保留架构，升级视觉 |

---

## 响应式断点

| 断点 | 时间轴 | 右侧栏 | 底部卡 | 弹窗 |
|------|--------|--------|--------|------|
| ≥1300px | 满宽 | 300px 固定 | 4列 | 520px 居中 |
| 1000-1299px | 满宽 | 隐藏/抽屉 | 2×2 | 520px |
| <1000px | 满宽单列 | 隐藏 | 2×2 | 全屏 |
| <768px | 简化 | 隐藏 | 1列 | 全屏 |
