# 星火校园项目结构

## 📁 实际项目目录（当前）

`
Spark-Alliance/
├── docs/                         # 项目文档（核心）
│   ├── SparkAlliance.md          # 项目骨架文档（v3.2，所有模块设计）
│   ├── AGENTS.md                 # 开发进度追踪（v1.2）
│   ├── PROJECT-RULES.md          # 全局开发规则
│   ├── PROJECT-IMPROVEMENTS.md   # 项目改进方案（同步SparkAlliance）
│   ├── PROJECT-STRUCTURE.md      # 本文档，项目结构说明
│   ├── COLLABORATION-GUIDE.md    # 多CLI协作系统指南
│   └── FILE-LIST.md              # Skills/MCP文件清单
│
├── frontend/                     # 前端代码（Vue 3 + Vite + TS）
│   ├── src/
│   │   ├── components/
│   │   │   ├── GlassCard.vue         # 玻璃拟态卡片
│   │   │   ├── MouseFollower.vue     # 鼠标跟随效果
│   │   │   └── ParticleBackground.vue # 粒子星空背景
│   │   ├── pages/
│   │   │   ├── Home.vue              # 应用首页（临时，待重构为Landing）
│   │   │   ├── Chat.vue              # AI伴侣聊天页
│   │   │   ├── CampusWall.vue        # 校园墙
│   │   │   └── Profile.vue           # 个人中心
│   │   ├── router/index.ts           # 路由配置（待加路由守卫）
│   │   ├── App.vue
│   │   └── main.ts
│   ├── public/
│   ├── dist/                         # 构建产物
│   ├── package.json
│   └── vite.config.ts
│
├── backend/                      # 后端代码（待开发）
│
├── .agents/                      # Skills & MCP 配置中心
│   ├── .agents/skills/           # 93个已安装Skills
│   ├── mcp-services/             # MCP服务配置
│   ├── global-config.json        # 全局配置
│   └── skills-lock.json          # Skills版本锁定
│
├── services/                     # 微服务目录（待建立）
│   └── mcp-services/             # MCP服务配置备份
│
└── PROJECT-RULES.md              # 根目录规则文件（与docs同步）
`

---

## 📋 核心文档说明

| 文档 | 用途 | 当前版本 |
|------|------|----------|
| SparkAlliance.md | 项目骨架，所有模块完整设计 | v3.2 |
| AGENTS.md | 开发进度追踪，待办清单，决策记录 | v1.2 |
| PROJECT-RULES.md | 文件管理规则，开发规范 | v1.0 |
| PROJECT-IMPROVEMENTS.md | 改进方案，与SparkAlliance保持同步 | v3.2 |
| COLLABORATION-GUIDE.md | 多CLI协作工具使用指南 | - |
| FILE-LIST.md | Skills和MCP文件清单 | - |

---

## 🧩 当前功能模块规划（13大模块）

### 原七大模块
1. AI伴侣（DeepSeek/豆包本地授权）
2. 社交伴侣（好友/群聊/动态）
3. 校园购物（C2C二手交易）
4. 智能日程
5. 目标与任务（游戏化）
6. 校园墙（半匿名公共空间）
7. 个人中心

### 新增扩展模块
8. **星火人才双向匹配（Spark Talent）** — 青年能力名片 + 企业主动寻访，颠覆传统招聘
9. **星火资讯（热点爬虫聚合）** — 全网热点聚合 + AI摘要 + 个性化推荐
10. **AI选课助手** — 课程评价 + AI智能推荐 + 学长经验分享 + 课程对比
11. **学长推荐系统** — 学长认证 + 经验分享 + 一对一咨询 + 内容库
12. **AI学习助手** — 智能答疑 + 学习计划 + 知识梳理 + 模拟考试
13. **学习资源中心** — 资源分类 + 上传分享 + 智能搜索

---

## 🏗️ 架构分层规划

### 官网层（Landing Page，未登录可访问）
`
/               → 官网首页（Hero + 功能展示 + 数据统计 + CTA）
/login          → 登录
/register       → 注册
/docs           → 文档（占位）
/community      → 社区（占位）
`

### 应用层（需登录，路由守卫保护）
`
/app/home       → 仪表盘
/app/chat       → AI伴侣
/app/wall       → 校园墙
/app/talent     → Spark Talent（人才匹配）
/app/news       → 星火资讯
/app/course     → AI选课助手
/app/senior     → 学长推荐系统
/app/learning   → AI学习助手
/app/resources  → 学习资源中心
/app/profile    → 个人中心
`

---

## 🚀 快速开始

### 启动前端开发服务器
`ash
cd frontend
npm run dev
`

### 使用CLI工具开发（推荐流程）
`
Gemini → 初版实现
Qoder CLI / Copilot / iflow / OpenCode → 并行评审打分
Codex → 综合仲裁，输出优化清单
Gemini → 按优先级迭代优化
`

---

## 📊 项目状态（2026-03-16）

| 模块 | 状态 |
|------|------|
| 项目规划文档 | ✅ 完成（v3.2）|
| 开发工具配置（Skills/MCP）| ✅ 完成 |
| 前端MVP骨架（静态页面）| ✅ 完成 |
| 官网Landing Page | 🔲 待开发 |
| 路由守卫 + 双层分离 | 🔲 待开发 |
| 用户认证系统 | 🔲 待开发 |
| AI伴侣（真实接口）| 🔲 待开发 |
| 校园墙（真实接口）| 🔲 待开发 |
| Spark Talent | 🔲 待规划 |
| 星火资讯爬虫 | 🔲 待规划 |
| AI选课助手 | 🔲 待规划 |
| 学长推荐系统 | 🔲 待规划 |
| AI学习助手 | 🔲 待规划 |
| 学习资源中心 | 🔲 待规划 |
| 后端服务 | 🔲 待开发 |

---

**更新时间**: 2026-03-16 | 随项目进展持续维护