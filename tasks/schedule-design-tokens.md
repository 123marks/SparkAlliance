# StarSpark Schedule 设计令牌 (Design Tokens)

> 提取自 `DesingImage/starspark-schedule/` 目录
> 对应代码：`frontend/src/pages/app/SmartSchedule.vue` / `Schedule.vue` / `Planner.vue` / `Tarot.vue`

## 色板

```css
/* === 智能日程模块专属令牌 === */

/* 继承全局深空背景，此处仅列模块专属 */

/* ---- 事件类型色 ---- */
--sched-event-course: #3b82f6;         /* 课程 - 蓝色 */
--sched-event-course-bg: rgba(59, 130, 246, 0.12);
--sched-event-exam: #f97316;           /* 考试 - 橙色 */
--sched-event-exam-bg: rgba(249, 115, 22, 0.12);
--sched-event-task: #7c3aed;           /* 任务 - 紫色 */
--sched-event-task-bg: rgba(124, 58, 237, 0.12);
--sched-event-life: #10b981;           /* 生活 - 绿色 */
--sched-event-life-bg: rgba(16, 185, 129, 0.12);
--sched-event-remind: #f59e0b;         /* 提醒 - 黄色 */
--sched-event-remind-bg: rgba(245, 158, 11, 0.12);
--sched-event-holiday: #ec4899;        /* 节日 - 粉色 */
--sched-event-holiday-bg: rgba(236, 72, 153, 0.12);
--sched-event-custom: #6366f1;         /* 自定义 - 靛蓝 */

/* ---- 优先级色 ---- */
--sched-priority-low: #10b981;         /* 低 */
--sched-priority-normal: #3b82f6;      /* 普通 */
--sched-priority-high: #f97316;        /* 高 */
--sched-priority-urgent: #ef4444;      /* 紧急 */

/* ---- 时间轴色 ---- */
--sched-timeline-line: rgba(139, 92, 246, 0.2);  /* 时间线 */
--sched-timeline-now: #7c3aed;         /* 当前时间指示 */
--sched-timeline-hour: rgba(255, 255, 255, 0.4); /* 小时标签 */
--sched-timeline-dot: rgba(139, 92, 246, 0.5);   /* 时间点 */

/* ---- Hero 区 ---- */
--sched-hero-bg: linear-gradient(135deg, rgba(20, 15, 50, 0.7) 0%, rgba(60, 30, 120, 0.4) 100%);
--sched-hero-text: rgba(255, 255, 255, 0.95);
--sched-hero-sub: rgba(255, 255, 255, 0.6);

/* ---- 数据卡 ---- */
--sched-stat-today: #3b82f6;           /* 今日事项数字色 */
--sched-stat-focus: #10b981;           /* 专注时长 */
--sched-stat-free: #06b6d4;            /* 空闲时间 */
--sched-stat-conflict: #ef4444;        /* 冲突警告 */
--sched-stat-score: linear-gradient(135deg, #f97316, #f59e0b); /* 节奏得分圆环 */

/* ---- AI 智能排课 ---- */
--sched-ai-btn: linear-gradient(135deg, #7c3aed, #3b82f6);
--sched-ai-suggestion-bg: rgba(124, 58, 237, 0.08);
--sched-ai-suggestion-border: rgba(124, 58, 237, 0.2);

/* ---- 弹窗/表单 ---- */
--sched-modal-bg: rgba(12, 10, 28, 0.95);
--sched-modal-border: rgba(139, 92, 246, 0.15);
--sched-input-bg: rgba(16, 12, 40, 0.6);
--sched-input-border: rgba(139, 92, 246, 0.2);
--sched-input-focus-border: rgba(139, 92, 246, 0.5);
--sched-toggle-active: #7c3aed;
--sched-toggle-inactive: rgba(255, 255, 255, 0.15);
```

## 间距与圆角

```css
--sched-timeline-hour-height: 60px;   /* 时间轴每小时高度 */
--sched-event-min-height: 32px;       /* 事件最小高度 */
--sched-event-border-left: 3px;       /* 事件左色条宽度 */
--sched-sidebar-width: 300px;         /* 右侧栏宽度 */
--sched-modal-width: 520px;           /* 新建事件弹窗宽度 */
--sched-modal-radius: 20px;
--sched-event-radius: 8px;
--sched-type-chip-radius: 8px;
--sched-type-chip-size: 64px;         /* 事件类型选择器单元格 */
```

## 字体

```css
--sched-font-hero: 700 20px/1.3 'Inter', 'PingFang SC', sans-serif;
--sched-font-stat-number: 700 24px/1.1 'Inter', sans-serif;
--sched-font-event-title: 500 13px/1.4 'Inter', 'PingFang SC', sans-serif;
--sched-font-time-label: 400 12px/1.3 'Inter', sans-serif;
--sched-font-hour: 400 11px/1 'Inter', sans-serif;
```

## 动效

```css
--sched-view-switch: 250ms cubic-bezier(0.16, 1, 0.3, 1);  /* 日/周/月切换 */
--sched-event-pulse: 2s ease-in-out infinite;               /* 当前事件脉冲 */
--sched-drag-lift: 150ms ease-out;                          /* 拖动事件浮起 */
--sched-conflict-shake: 300ms;                              /* 冲突事件抖动 */
```
