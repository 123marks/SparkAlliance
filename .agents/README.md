# 星火校园项目 - 全局配置说明

## 📁 项目结构

```
Spark-Alliance/
├── .agents/                    # 全局配置目录
│   ├── .agents/skills/         # Skills技能库（93个技能）
│   ├── mcp-services/           # MCP服务配置
│   └── global-config.json      # 全局配置文件
│
├── codex-control/              # Codex协作系统
│   ├── codex-collaboration.js  # 智能协作脚本
│   ├── cli-controller.js       # CLI控制器
│   ├── process-manager.js      # 进程管理器
│   └── collaborate.bat         # 启动脚本
│
├── frontend/                   # 前端代码
├── backend/                    # 后端代码
├── pua/                        # PUA激励引擎
│
├── SparkAlliance.md            # 项目骨架文档
├── AGENTS.md                   # 开发进度追踪
├── PROJECT-RULES.md            # 全局开发规则
├── PROJECT-IMPROVEMENTS.md     # 项目改进方案
└── COLLABORATION-GUIDE.md      # 协作系统使用指南
```

---

## 🎯 已安装的Skills（93个）

### AI助手类（66个）
来自 openakita/openakita：
- ✅ self-improvement - 自我改进
- ✅ systematic-debugging - 系统化调试
- ✅ test-driven-development - 测试驱动开发
- ✅ todoist-task - 任务管理
- ✅ xlsx - Excel处理
- ✅ youtube-summarizer - YouTube总结
- ✅ webapp-testing - Web应用测试
- ✅ theme-factory - 主题工厂
- ... 还有58个技能

### UI/UX设计类（7个）
来自 nextlevelbuilder/ui-ux-pro-max-skill：
- ✅ ui-ux-pro-max - 专业UI/UX设计
- ✅ ckm-design - 设计系统
- ✅ ckm-ui-styling - UI样式
- ✅ ckm-banner-design - Banner设计
- ✅ ckm-brand - 品牌设计
- ✅ ckm-design-system - 设计系统
- ✅ ckm-slides - 幻灯片设计

### 前端开发类（19个）
来自 onmax/nuxt-skills：
- ✅ vue - Vue.js开发
- ✅ nuxt - Nuxt.js开发
- ✅ vitest - 测试框架
- ✅ vueuse - Vue组合式API
- ✅ tailwindcss - CSS框架
- ✅ pinia - 状态管理
- ... 还有13个技能

### 自我改进类（1个）
来自 peterskoett/self-improving-agent：
- ✅ self-improvement - 持续学习和改进

---

## 🔧 全局配置文件

**位置：** `.agents/global-config.json`

**包含内容：**
1. **Skills配置** - 自动加载、分类管理
2. **MCP配置** - 文件系统、GitHub、搜索
3. **Agents配置** - 协作工作流
4. **Rules配置** - 文件管理、开发规范、Git提交

---

## 🚀 如何使用

### 1. 启动协作系统
```bash
cd codex-control
collaborate.bat
```

### 2. 在CLI中使用Skills
```bash
# 在任何CLI中
/skill ui-ux-pro-max
# 或
使用ui-ux-pro-max技能设计前端界面
```

### 3. 全局加载Skills
Skills已自动配置，所有CLI都可以使用：
- Codex CLI
- Qoder CLI
- Copilot CLI
- OpenCode CLI
- iFlow CLI

---

## 📊 Skills分类

### 按功能分类
- **AI助手**: self-improvement, systematic-debugging, test-driven-development
- **前端**: ui-ux-pro-max, ckm-design, vue, nuxt
- **后端**: systematic-debugging, test-driven-development
- **生产力**: todoist-task, xlsx

### 按优先级分类
- **高优先级**: ui-ux-pro-max, self-improvement, systematic-debugging
- **中优先级**: vue, nuxt, test-driven-development
- **低优先级**: todoist-task, xlsx

---

## 🔄 MCP服务

### 已配置的MCP服务
1. **filesystem** - 文件系统访问
2. **github** - GitHub集成
3. **brave-search** - 网络搜索

### 如何使用MCP
MCP服务已自动配置，CLI可以直接调用。

---

## 📝 开发规则

### 文件管理规则
- ✅ 同主题内容直接覆盖原文件
- ✅ 避免创建重复文件
- ✅ 定期清理临时文件

### 开发规范
- ✅ 代码必须有注释
- ✅ 关键功能必须有单元测试
- ✅ 遵循设计模式和最佳实践
- ✅ 性能优化

### Git提交规则
- ✅ 自动提交
- ✅ 提交消息格式：`feat: {phase} - {timestamp}`

---

## 🎯 下一步

1. **查看Skills列表**
   ```bash
   cd .agents/.agents/skills
   ls
   ```

2. **在CLI中使用Skills**
   - 打开任意CLI
   - 输入 `/skill <skill-name>`
   - 或直接描述任务

3. **启动协作开发**
   ```bash
   cd codex-control
   collaborate.bat
   ```

---

**所有Skills和MCP服务已配置完成，可以开始开发了！**
