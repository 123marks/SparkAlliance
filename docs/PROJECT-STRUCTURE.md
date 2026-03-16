# 星火校园项目结构

## 📁 项目目录

```
Spark-Alliance/
├── SparkAlliance.md          # 项目骨架文档（核心）
├── AGENTS.md                 # 开发进度追踪
├── PROJECT-RULES.md          # 全局开发规则
├── PROJECT-IMPROVEMENTS.md   # 项目改进方案
├── COLLABORATION-GUIDE.md    # 协作系统使用指南
├── package.json              # 项目配置
│
├── codex-control/            # Codex协作系统
│   ├── codex-collaboration.js    # 智能协作脚本
│   ├── cli-controller.js         # CLI控制器
│   ├── process-manager.js        # 进程管理器
│   └── collaborate.bat           # 启动脚本
│
├── frontend/                 # 前端代码
│   └── src/
│       ├── components/       # React组件
│       │   ├── SparkAllianceChat.jsx  # AI聊天界面
│       │   └── CampusWall.jsx         # 校园墙界面
│       └── pages/
│           └── Home.jsx               # 主页
│
├── backend/                  # 后端代码
│
├── skills/                   # Skills配置
│
├── mcp-services/             # MCP服务配置
│
└── pua/                      # PUA激励引擎
```

---

## 📋 核心文件说明

### 文档文件
1. **SparkAlliance.md** - 项目骨架，包含所有模块设计
2. **AGENTS.md** - 开发进度追踪，记录已完成工作
3. **PROJECT-RULES.md** - 全局开发规则
4. **PROJECT-IMPROVEMENTS.md** - 项目改进方案
5. **COLLABORATION-GUIDE.md** - 协作系统使用指南

### 配置文件
1. **package.json** - 项目依赖配置

### 代码目录
1. **codex-control/** - Codex智能协作系统
2. **frontend/** - 前端React代码
3. **backend/** - 后端Node.js代码
4. **skills/** - Skills技能配置
5. **mcp-services/** - MCP服务配置
6. **pua/** - PUA激励引擎

---

## 🚀 快速开始

### 1. 启动协作系统
```bash
cd codex-control
collaborate.bat
```

### 2. 在CLI中开发
- **Copilot CLI**: 前端设计
- **Qoder CLI**: 核心开发
- **OpenCode CLI**: 辅助开发
- **iFlow CLI**: 测试文档

---

## 📊 项目状态

- ✅ 项目结构已整理
- ✅ 协作系统已就绪
- ✅ 前端组件已创建
- ✅ Git仓库已初始化
- ✅ 开发规则已定义

---

**项目结构清晰，可以开始开发了！**
