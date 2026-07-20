# StarSpark Dashboard 设计令牌 (Design Tokens)

> 提取自 `DesingImage/starspark-dashboard/` 目录（1-7.png + 图标资产板）
> 对应代码：`frontend/src/pages/app/AppHome.vue`

## 色板 (Color Palette)

```css
/* === StarSpark Dashboard 设计令牌 === */

/* ---- 背景层 ---- */
--dash-bg-page: #080714;                           /* 最深层页面背景 */
--dash-bg-page-gradient: linear-gradient(180deg, #080714 0%, #0d0b1e 40%, #0a0818 100%);
--dash-bg-sidebar: rgba(10, 8, 24, 0.92);         /* 侧边栏 */
--dash-bg-topbar: rgba(10, 8, 24, 0.85);          /* 顶部栏 */
--dash-bg-card: rgba(15, 12, 38, 0.65);           /* 通用卡片 */
--dash-bg-card-hover: rgba(20, 16, 48, 0.75);     /* 卡片 hover */
--dash-bg-hero: linear-gradient(135deg, rgba(20, 15, 50, 0.8) 0%, rgba(10, 8, 30, 0.9) 100%);
--dash-bg-input: rgba(16, 12, 36, 0.6);           /* 输入框/搜索框 */
--dash-bg-quickcenter: rgba(12, 10, 28, 0.95);    /* 星芒快捷中心 */

/* ---- 边框 ---- */
--dash-border-card: rgba(139, 92, 246, 0.12);     /* 卡片边框 */
--dash-border-card-hover: rgba(139, 92, 246, 0.3); /* hover 态边框 */
--dash-border-sidebar-active: rgba(124, 58, 237, 0.5); /* 侧栏选中边框 */
--dash-border-subtle: rgba(255, 255, 255, 0.05);  /* 极淡分隔线 */
--dash-border-hero: rgba(139, 92, 246, 0.2);      /* Hero 卡片边框 */

/* ---- 主色 ---- */
--dash-accent-purple: #7c3aed;                    /* 主紫 - CTA、选中 */
--dash-accent-purple-light: #a78bfa;              /* 浅紫 - 图标、副文 */
--dash-accent-purple-dark: #5b21b6;               /* 深紫 - pressed */
--dash-accent-blue: #3b82f6;                      /* 蓝 - 链接、次要操作 */
--dash-accent-blue-light: #60a5fa;                /* 浅蓝 - hover */
--dash-accent-indigo: #6366f1;                    /* 靛蓝 - 图标底色 */
--dash-accent-cyan: #06b6d4;                      /* 青色 - 信息/进度 */

/* ---- 功能色 ---- */
--dash-color-success: #10b981;                    /* 完成/在线 */
--dash-color-warning: #f59e0b;                    /* 警告/即将到期 */
--dash-color-danger: #ef4444;                     /* 逾期/高优先级 */
--dash-color-hot: #f97316;                        /* 热榜/火焰 */
--dash-color-gold: #f5c55e;                       /* 金色 - 徽章 */
--dash-color-pink: #ec4899;                       /* 粉 - 社交 */
--dash-color-badge-red: #ef4444;                  /* 通知红点 */

/* ---- 优先级色 ---- */
--dash-priority-high: linear-gradient(135deg, #f97316, #ef4444); /* 高优先-橙红 */
--dash-priority-medium: linear-gradient(135deg, #7c3aed, #3b82f6); /* 中优先-紫蓝 */
--dash-priority-low: linear-gradient(135deg, #06b6d4, #10b981);    /* 低优先-青绿 */

/* ---- 文字 ---- */
--dash-text-primary: rgba(255, 255, 255, 0.93);  /* 标题/数字 */
--dash-text-secondary: rgba(255, 255, 255, 0.6); /* 副标题/描述 */
--dash-text-muted: rgba(255, 255, 255, 0.35);    /* 时间/提示 */
--dash-text-link: #60a5fa;                        /* 链接 */
--dash-text-number: rgba(255, 255, 255, 0.97);   /* 大数字-纯白 */

/* ---- 发光/阴影 ---- */
--dash-glow-purple: 0 0 20px rgba(139, 92, 246, 0.25);
--dash-glow-purple-strong: 0 0 40px rgba(139, 92, 246, 0.4);
--dash-glow-blue: 0 0 20px rgba(59, 130, 246, 0.2);
--dash-glow-icon: 0 0 12px rgba(167, 139, 250, 0.4);  /* 图标外发光 */
--dash-shadow-card: 0 4px 20px rgba(0, 0, 0, 0.25);
--dash-shadow-card-hover: 0 8px 32px rgba(0, 0, 0, 0.4);
--dash-shadow-elevated: 0 16px 48px rgba(0, 0, 0, 0.5);

/* ---- 图标底色 ---- */
--dash-icon-bg-purple: linear-gradient(135deg, #312e81, #4c1d95);
--dash-icon-bg-blue: linear-gradient(135deg, #1e3a5f, #1e40af);
--dash-icon-bg-cyan: linear-gradient(135deg, #134e4a, #0e7490);
--dash-icon-glow: 0 0 8px rgba(139, 92, 246, 0.3);

/* ---- Hero 特殊 ---- */
--dash-hero-planet-glow: radial-gradient(ellipse, rgba(251, 146, 60, 0.3) 0%, transparent 60%);
--dash-hero-ring-color: rgba(167, 139, 250, 0.25);
--dash-hero-aurora: linear-gradient(90deg, rgba(124, 58, 237, 0.1), rgba(59, 130, 246, 0.1), rgba(6, 182, 212, 0.08));
```

## 间距

```css
--dash-spacing-xs: 4px;
--dash-spacing-sm: 8px;
--dash-spacing-md: 12px;
--dash-spacing-base: 16px;
--dash-spacing-lg: 20px;
--dash-spacing-xl: 24px;
--dash-spacing-2xl: 32px;
--dash-spacing-3xl: 40px;

--dash-sidebar-width: 200px;
--dash-topbar-height: 56px;
--dash-card-gap: 16px;
--dash-section-gap: 24px;
--dash-card-padding: 16px 20px;
```

## 圆角

```css
--dash-radius-xs: 4px;
--dash-radius-sm: 8px;
--dash-radius-md: 12px;
--dash-radius-lg: 16px;
--dash-radius-xl: 20px;
--dash-radius-2xl: 24px;
--dash-radius-full: 999px;
--dash-radius-icon: 14px;      /* 图标底板圆角 */
```

## 字体

```css
--dash-font-hero: 700 24px/1.3 'Inter', 'PingFang SC', sans-serif;  /* Hero 问候 */
--dash-font-h1: 700 20px/1.3 'Inter', 'PingFang SC', sans-serif;    /* 区块标题 */
--dash-font-h2: 600 16px/1.4 'Inter', 'PingFang SC', sans-serif;    /* 卡片标题 */
--dash-font-h3: 500 14px/1.4 'Inter', 'PingFang SC', sans-serif;    /* 子标题 */
--dash-font-body: 400 14px/1.6 'Inter', 'PingFang SC', sans-serif;  /* 正文 */
--dash-font-caption: 400 12px/1.4 'Inter', 'PingFang SC', sans-serif; /* 说明 */
--dash-font-number-xl: 700 28px/1.1 'Inter', sans-serif;            /* 状态卡大数 */
--dash-font-number-lg: 700 22px/1.2 'Inter', sans-serif;            /* 能量值等 */
--dash-font-number-md: 600 16px/1.2 'Inter', sans-serif;            /* 中等数字 */
```

## 动效

```css
--dash-transition-fast: 120ms cubic-bezier(0.4, 0, 0.2, 1);
--dash-transition-normal: 200ms cubic-bezier(0.4, 0, 0.2, 1);
--dash-transition-smooth: 300ms cubic-bezier(0.16, 1, 0.3, 1);
--dash-transition-hero: 500ms cubic-bezier(0.16, 1, 0.3, 1);

--dash-stagger-delay: 50ms;
--dash-countup-duration: 500ms;
--dash-progress-duration: 600ms;
--dash-breathe-duration: 3s;       /* 星芒/脉冲呼吸 */
--dash-nebula-drift: 20s;          /* 星云漂移 */

--dash-hover-lift: translateY(-3px);
--dash-press-scale: scale(0.98);
--dash-icon-hover-glow: 0 0 16px rgba(139, 92, 246, 0.5);
```

## 图标系统

```css
/* 图标风格：深色圆角底板 + 线性/轻拟物 + 紫蓝主光 + 外发光 */
--dash-icon-size-sidebar: 24px;
--dash-icon-size-card: 32px;
--dash-icon-size-badge: 40px;
--dash-icon-size-hero: 48px;
--dash-icon-plate-size: 40px;      /* 图标底板尺寸 */
--dash-icon-plate-radius: 14px;    /* 底板圆角 */
--dash-icon-plate-bg: linear-gradient(135deg, rgba(49, 46, 129, 0.8), rgba(76, 29, 149, 0.6));
--dash-icon-stroke-width: 1.5;
--dash-icon-glow-active: 0 0 12px rgba(167, 139, 250, 0.5);
```
