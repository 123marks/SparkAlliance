# StarSpark Wall 设计令牌 (Design Tokens)

> 提取自 `DesingImage/starspark-wall/1.png` 和 `2.png`
> 对应代码：`frontend/src/pages/app/CampusWall.vue`

## 色板 (Color Palette)

```css
/* === StarSpark Wall 设计令牌 === */

/* ---- 背景层 ---- */
--wall-bg-page: #0b0a1a;                          /* 页面最底层，深蓝黑 */
--wall-bg-page-gradient: linear-gradient(180deg, #0b0a1a 0%, #0f0d24 50%, #0a0918 100%);
--wall-bg-sidebar: rgba(12, 10, 30, 0.85);        /* 左/右侧栏背景 */
--wall-bg-card: rgba(18, 14, 45, 0.65);           /* 卡片/区块背景 */
--wall-bg-card-hover: rgba(22, 18, 55, 0.75);     /* 卡片 hover 态 */
--wall-bg-input: rgba(20, 16, 48, 0.5);           /* 输入框/搜索框背景 */
--wall-bg-compose: rgba(25, 20, 55, 0.6);         /* 发布入口背景 */
--wall-bg-post: rgba(16, 12, 40, 0.7);            /* 帖子卡片背景 */
--wall-bg-modal-overlay: rgba(0, 0, 0, 0.6);      /* 弹窗遮罩 */

/* ---- 边框 ---- */
--wall-border-card: rgba(139, 92, 246, 0.15);     /* 卡片默认边框 */
--wall-border-card-hover: rgba(139, 92, 246, 0.35); /* 卡片 hover 边框 */
--wall-border-active: rgba(124, 58, 237, 0.6);    /* 选中/活跃态边框 */
--wall-border-subtle: rgba(255, 255, 255, 0.06);  /* 极淡分隔线 */
--wall-border-input: rgba(139, 92, 246, 0.2);     /* 输入框边框 */
--wall-border-input-focus: rgba(139, 92, 246, 0.5); /* 输入框聚焦边框 */

/* ---- 主色 ---- */
--wall-accent-purple: #7c3aed;                    /* 主紫色 - 主 CTA、活跃态 */
--wall-accent-purple-light: #a78bfa;              /* 浅紫 - 副文本、图标 */
--wall-accent-purple-dark: #5b21b6;               /* 深紫 - 按钮 pressed */
--wall-accent-blue: #3b82f6;                      /* 蓝色 - 链接、次要 CTA */
--wall-accent-blue-light: #60a5fa;                /* 浅蓝 - hover 态 */
--wall-accent-indigo: #6366f1;                    /* 靛蓝 - 机器人/装饰 */

/* ---- 功能色 ---- */
--wall-color-hot: #f97316;                        /* 热门/火 - 橙色 */
--wall-color-hot-bg: rgba(249, 115, 22, 0.12);   /* 热门背景色 */
--wall-color-success: #10b981;                    /* 成功/完成/在线 */
--wall-color-warning: #f59e0b;                    /* 警告/活动 */
--wall-color-danger: #ef4444;                     /* 危险/删除/置顶标记 */
--wall-color-gold: #f5c55e;                       /* 金色 - 徽章/等级 */
--wall-color-liked: #ec4899;                      /* 已点赞 - 粉红 */

/* ---- 标签色 ---- */
--wall-tag-official: rgba(234, 88, 12, 0.8);     /* 官方认证 - 深橙 */
--wall-tag-pinned: rgba(239, 68, 68, 0.8);       /* 置顶 - 红色 */
--wall-tag-event: rgba(59, 130, 246, 0.8);       /* 活动招募 - 蓝色 */
--wall-tag-vote: rgba(16, 185, 129, 0.7);        /* 投票 - 绿色 */
--wall-tag-help: rgba(245, 158, 11, 0.8);        /* 求助 - 黄色 */
--wall-tag-confession: rgba(139, 92, 246, 0.7);  /* 树洞 - 紫色 */

/* ---- 文字 ---- */
--wall-text-primary: rgba(255, 255, 255, 0.93);  /* 标题、主内容 */
--wall-text-secondary: rgba(255, 255, 255, 0.6); /* 副文本、描述 */
--wall-text-muted: rgba(255, 255, 255, 0.35);    /* 时间戳、备注 */
--wall-text-link: #60a5fa;                        /* 链接文字 */
--wall-text-tag: rgba(167, 139, 250, 0.9);       /* 话题标签文字 */

/* ---- 发光/阴影 ---- */
--wall-glow-purple: 0 0 20px rgba(139, 92, 246, 0.25);
--wall-glow-purple-strong: 0 0 30px rgba(139, 92, 246, 0.4);
--wall-glow-blue: 0 0 20px rgba(59, 130, 246, 0.2);
--wall-glow-hot: 0 0 12px rgba(249, 115, 22, 0.3);
--wall-shadow-card: 0 4px 24px rgba(0, 0, 0, 0.3);
--wall-shadow-card-hover: 0 8px 32px rgba(0, 0, 0, 0.4);
--wall-shadow-elevated: 0 12px 40px rgba(0, 0, 0, 0.5);

/* ---- 星云/装饰渐变 ---- */
--wall-nebula-1: radial-gradient(ellipse at 85% 15%, rgba(124, 58, 237, 0.12) 0%, transparent 60%);
--wall-nebula-2: radial-gradient(ellipse at 10% 80%, rgba(59, 130, 246, 0.08) 0%, transparent 50%);
--wall-glass-gradient: linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(59, 130, 246, 0.04) 100%);
```

## 间距 (Spacing)

```css
/* 基线 4px */
--wall-spacing-2xs: 2px;
--wall-spacing-xs: 4px;
--wall-spacing-sm: 8px;
--wall-spacing-md: 12px;
--wall-spacing-base: 16px;
--wall-spacing-lg: 20px;
--wall-spacing-xl: 24px;
--wall-spacing-2xl: 32px;
--wall-spacing-3xl: 40px;
--wall-spacing-4xl: 48px;

/* 布局间距 */
--wall-layout-gap: 20px;              /* 三栏之间间距 */
--wall-section-gap: 16px;             /* 右侧栏区块之间 */
--wall-card-gap: 12px;                /* Feed 中帖子卡片之间 */
--wall-card-padding: 16px;            /* 卡片内边距 */
--wall-sidebar-padding: 16px;         /* 侧栏内边距 */
```

## 圆角 (Border Radius)

```css
--wall-radius-xs: 4px;                /* 小标签、状态点 */
--wall-radius-sm: 8px;                /* 按钮、输入框、chip */
--wall-radius-md: 12px;               /* 普通卡片、区块 */
--wall-radius-lg: 16px;               /* 大卡片、帖子详情 */
--wall-radius-xl: 20px;               /* 弹窗、模态 */
--wall-radius-full: 999px;            /* 胶囊按钮、头像 */
```

## 字体 (Typography)

```css
/* 标题 */
--wall-font-h1: 700 20px/1.3 'Inter', 'PingFang SC', sans-serif;      /* 页面标题 "星火墙" */
--wall-font-h2: 600 16px/1.4 'Inter', 'PingFang SC', sans-serif;      /* 区块标题 "今日热榜" */
--wall-font-h3: 600 15px/1.4 'Inter', 'PingFang SC', sans-serif;      /* 帖子标题 */
--wall-font-h4: 500 14px/1.4 'Inter', 'PingFang SC', sans-serif;      /* 子标题/作者名 */

/* 正文 */
--wall-font-body: 400 14px/1.6 'Inter', 'PingFang SC', sans-serif;    /* 帖子正文 */
--wall-font-body-sm: 400 13px/1.5 'Inter', 'PingFang SC', sans-serif; /* 评论/描述 */

/* 辅助 */
--wall-font-caption: 400 12px/1.4 'Inter', 'PingFang SC', sans-serif; /* 时间、标签计数 */
--wall-font-tiny: 400 11px/1.3 'Inter', 'PingFang SC', sans-serif;    /* 徽章内文字 */

/* 数据 */
--wall-font-number-lg: 700 22px/1.2 'Inter', sans-serif;              /* 大数字（热度值等） */
--wall-font-number-md: 600 16px/1.2 'Inter', sans-serif;              /* 中数字（活跃指数） */
--wall-font-number-sm: 500 13px/1.2 'Inter', sans-serif;              /* 小数字（点赞数） */
```

## 动效 (Animation & Transition)

```css
/* 过渡时长 */
--wall-transition-fast: 120ms cubic-bezier(0.4, 0, 0.2, 1);           /* 按钮反馈 */
--wall-transition-normal: 200ms cubic-bezier(0.4, 0, 0.2, 1);         /* 卡片 hover */
--wall-transition-smooth: 300ms cubic-bezier(0.4, 0, 0.2, 1);         /* 面板展开 */
--wall-transition-slow: 400ms cubic-bezier(0.16, 1, 0.3, 1);          /* 页面切换 */

/* Feed 入场 stagger */
--wall-stagger-delay: 40ms;           /* 每张卡片延迟 */
--wall-stagger-distance: 12px;        /* Y轴偏移量 */
--wall-stagger-duration: 350ms;       /* 单卡入场时长 */

/* 微交互 */
--wall-hover-lift: translateY(-2px);  /* 卡片悬浮 */
--wall-hover-scale: scale(1.03);      /* 图片悬浮 */
--wall-press-scale: scale(0.97);      /* 按钮按下 */
--wall-like-burst-duration: 600ms;    /* 点赞星点爆发 */

/* 加载 */
--wall-shimmer-duration: 1.5s;        /* 骨架屏闪烁周期 */
--wall-spinner-duration: 1s;          /* 旋转加载 */

/* 星云漂移 */
--wall-nebula-drift-duration: 20s;    /* 背景星云缓慢移动 */
--wall-particle-opacity-range: 0.3 - 0.7; /* 星点透明度范围 */
```

## 布局 (Layout)

```css
/* 三栏宽度 */
--wall-sidebar-left-width: 240px;     /* 左侧栏 */
--wall-sidebar-right-width: 280px;    /* 右侧栏 */
--wall-main-min-width: 480px;         /* 中间 Feed 最小宽度 */
--wall-main-max-width: 640px;         /* 中间 Feed 最大宽度 */

/* 断点 */
--wall-bp-desktop: 1300px;            /* 三栏全部展示 */
--wall-bp-tablet: 1100px;             /* 隐藏右栏，左栏缩窄 */
--wall-bp-mobile: 767px;              /* 单列，隐藏双侧栏 */

/* 高度 */
--wall-topbar-height: 56px;           /* 顶部导航栏高度 */
--wall-compose-height: 48px;          /* 发布入口高度 */
--wall-post-action-height: 36px;      /* 帖子操作栏高度 */
--wall-comment-input-height: 56px;    /* 详情页底部评论输入条 */
```

## Backdrop Filter (玻璃态)

```css
--wall-glass-blur: blur(12px);        /* 卡片毛玻璃 */
--wall-glass-blur-strong: blur(20px); /* 弹窗毛玻璃 */
--wall-glass-saturate: saturate(1.2); /* 增加饱和度 */
```

## 图标 (Icon)

```css
/* 风格：线性 (stroke)，统一 stroke-width: 1.5~2 */
--wall-icon-sm: 14px;                 /* 标签内图标 */
--wall-icon-md: 18px;                 /* 操作栏图标 */
--wall-icon-lg: 24px;                 /* 导航/重要图标 */
--wall-icon-color-default: rgba(255, 255, 255, 0.5);
--wall-icon-color-active: #a78bfa;
--wall-icon-color-interactive: #60a5fa;
```
