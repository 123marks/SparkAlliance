# 星火校园项目 - 完整开发规则体系

## 📋 文档说明

**创建时间**: 2026-03-16  
**最后更新**: 2026-03-16  
**版本**: v2.0

**重要说明：**
- 本文档是项目的完整开发规则体系
- 所有开发行为必须遵守这些规则
- 包括文件管理、协作机制、Git管理、Skills和MCP调用

---

## 🎯 核心开发规则

### 规则1：文件管理规则

#### 1.1 文件更新原则
```
同一性质的文件更新时，直接覆盖原文件，不创建新文件
```

**具体规则：**
- ✅ 如果是同一主题的文档更新，直接覆盖原文件
- ✅ 不创建类似 `xxx-v2.md`、`xxx-new.md` 这样的文件
- ✅ 保持文件名简洁统一
- ✅ 使用Git管理历史版本，不手动创建备份

**示例：**
```
❌ 错误做法：
- CODEX-CORRECT-USAGE.md
- CODEX-MAIN-BRAIN.md
- CODEX-GUIDE.md（新建）

✅ 正确做法：
- CODEX-GUIDE.md（直接覆盖，合并内容）
- 删除旧的重复文件
```

#### 1.2 文件命名规范
**命名原则：**
- 简洁明了
- 一目了然
- 避免冗余

**标准命名：**
```
✅ SparkAlliance.md      - 项目骨架文档
✅ AGENTS.md             - 开发进度追踪
✅ PROJECT-RULES.md      - 项目全局规则
✅ COLLABORATION-GUIDE.md - 协作系统使用指南
```

**避免命名：**
```
❌ SparkAlliance-v2.md
❌ SparkAlliance-new.md
❌ SparkAlliance-final.md
❌ SparkAlliance-20260315.md
```

#### 1.3 文件夹层级管理
**标准结构：**
```
Spark-Alliance/
├── .agents/                    # 全局配置
│   ├── .agents/skills/         # Skills技能库
│   ├── mcp-services/           # MCP服务
│   └── global-config.json      # 全局配置
│
├── codex-control/              # Codex协作系统
│   ├── codex-collaboration.js
│   ├── cli-controller.js
│   ├── process-manager.js
│   └── collaborate.bat
│
├── frontend/                   # 前端代码
│   ├── src/
│   │   ├── components/         # 组件
│   │   ├── pages/              # 页面
│   │   ├── services/           # API服务
│   │   └── utils/              # 工具函数
│   └── public/
│
├── backend/                    # 后端代码
│   ├── src/
│   │   ├── controllers/        # 控制器
│   │   ├── models/             # 数据模型
│   │   ├── routes/             # 路由
│   │   └── services/           # 业务逻辑
│   └── tests/
│
├── docs/                       # 文档
│   ├── api/                    # API文档
│   ├── design/                 # 设计文档
│   └── user/                   # 用户文档
│
└── [根目录文档]
    ├── SparkAlliance.md
    ├── AGENTS.md
    ├── PROJECT-RULES.md
    └── COLLABORATION-GUIDE.md
```

---

### 规则2：协作机制规则

#### 2.1 角色分工
**开发角色：**
- **Copilot CLI** - 前端设计（UI/UX设计、界面开发）
- **Qoder CLI** - 主力开发（核心功能、数据库、API）
- **OpenCode CLI** - 辅助开发（校园墙、健康打卡等）
- **iFlow CLI** - 测试文档（测试用例、API文档）

**监督角色：**
- **Codex CLI** - 主脑监督（任务分配、质量审核、综合意见）

#### 2.2 协作流程
```
1. 开发者完成开发
    ↓
2. 审查者评估代码（评分+建议）
    ↓
3. Codex综合意见
    ↓
4. 开发者评估建议
    ↓
5. 决定是否采纳
    ↓
6. Git回滚优化（如需要）
    ↓
7. 最终提交
```

#### 2.3 评分标准
- **9-10分：** 代码质量优秀，无需优化
- **7-8分：** 代码质量良好，建议优化
- **5-6分：** 代码质量一般，必须优化
- **<5分：** 代码质量差，需要重写

#### 2.4 审查机制
**每个开发阶段完成后：**
1. 其他CLI角色审查代码
2. 给出评分和建议
3. Codex综合所有意见
4. 决定是否需要优化
5. 开发者根据意见修改

**示例：**
```
阶段：前端设计
开发者：Copilot CLI
审查者：Qoder CLI, OpenCode CLI

审查结果：
- Qoder CLI: 8/10，建议增加响应式设计
- OpenCode CLI: 7/10，建议优化动画性能

Codex综合意见：
- 平均分：7.5/10
- 决定：需要优化
- 建议：采纳两个建议，优化响应式和动画

Copilot CLI执行优化...
```

---

### 规则3：Git管理规则

#### 3.1 Git提交规则
**提交时机：**
- 每个开发阶段完成后
- 代码审查通过后
- 优化完成后

**提交消息格式：**
```
feat: {阶段名称} - {时间戳}

示例：
feat: 前端设计 - 2026-03-16T10:00:00Z
feat: 核心功能开发 - 2026-03-16T12:00:00Z
```

#### 3.2 Git回滚规则
**何时回滚：**
- 代码审查评分低于7分
- 发现严重bug
- 需要重新设计

**回滚流程：**
```
1. git log --oneline  # 查看提交历史
2. git reset --soft HEAD~1  # 回滚到上一个版本
3. 修改代码
4. git add .
5. git commit -m "fix: 优化代码"
```

#### 3.3 Git分支管理
**分支策略：**
```
main           # 主分支（稳定版本）
├── develop    # 开发分支
│   ├── feature/frontend    # 前端功能
│   ├── feature/backend     # 后端功能
│   └── feature/test        # 测试功能
```

**分支命名：**
```
feature/{功能名称}
bugfix/{bug描述}
hotfix/{紧急修复}
```

#### 3.4 Git备份规则
**重要文件必须提交：**
- 所有源代码文件
- 配置文件（.json, .yaml, .toml）
- 文档文件（.md）
- Skills和MCP配置

**不提交的文件：**
- node_modules/
- .env（敏感信息）
- dist/、build/
- 日志文件

---

### 规则4：Skills和MCP调用规则

#### 4.1 Skills调用规则
**何时调用Skills：**
- UI/UX设计 → 调用 `ui-ux-pro-max`
- 代码调试 → 调用 `systematic-debugging`
- 编写测试 → 调用 `test-driven-development`
- Vue开发 → 调用 `vue`
- Nuxt开发 → 调用 `nuxt`
- 学习改进 → 调用 `self-improvement`

**调用方式：**
```bash
# 方式1：直接调用
/skill ui-ux-pro-max

# 方式2：描述任务
使用ui-ux-pro-max技能设计前端界面，要求玻璃拟态UI

# 方式3：在代码中引用
// @skill: ui-ux-pro-max
// 设计玻璃拟态UI界面
```

#### 4.2 MCP调用规则
**何时调用MCP：**
- 文件操作 → 调用 `filesystem`
- GitHub操作 → 调用 `github`
- 网络搜索 → 调用 `brave-search`

**调用方式：**
```bash
# 文件系统操作
使用filesystem MCP读取文件内容

# GitHub操作
使用github MCP创建Pull Request

# 网络搜索
使用brave-search MCP搜索最佳实践
```

#### 4.3 Skills优先级
**高优先级Skills：**
1. ui-ux-pro-max - UI/UX设计
2. self-improvement - 自我改进
3. systematic-debugging - 系统化调试

**中优先级Skills：**
1. test-driven-development - 测试驱动开发
2. vue - Vue.js开发
3. nuxt - Nuxt.js开发

**低优先级Skills：**
1. todoist-task - 任务管理
2. xlsx - Excel处理

---

### 规则5：开发流程规则

#### 5.1 开发前检查
**必须检查：**
- [ ] 阅读 `SparkAlliance.md` 了解项目
- [ ] 阅读 `AGENTS.md` 了解当前进度
- [ ] 阅读 `PROJECT-RULES.md` 了解规则
- [ ] 检查是否有现成的工具或方案
- [ ] 确认任务优先级

#### 5.2 开发中规范
**必须遵守：**
- [ ] 遵循高质量开发准则
- [ ] 代码必须有注释
- [ ] 关键功能必须有测试
- [ ] 使用Skills提升效率
- [ ] 遇到AI偷懒使用PUA引擎
- [ ] 实时更新AGENTS.md记录进度

#### 5.3 开发后总结
**必须完成：**
- [ ] 更新AGENTS.md记录完成情况
- [ ] 如有新内容，更新SparkAlliance.md
- [ ] 清理临时文件
- [ ] 检查是否有重复文件
- [ ] 确保文档结构清晰
- [ ] Git提交代码

---

### 规则6：代码质量规则

#### 6.1 代码注释规则
**必须注释：**
- 函数功能说明
- 复杂逻辑解释
- 重要变量说明
- API接口说明

**注释格式：**
```javascript
/**
 * 函数功能说明
 * @param {类型} 参数名 - 参数说明
 * @returns {类型} 返回值说明
 */
function functionName(param) {
  // 实现逻辑
}
```

#### 6.2 测试规则
**必须测试：**
- 核心功能
- API接口
- 用户交互
- 数据处理

**测试覆盖：**
- 单元测试：每个函数
- 集成测试：API接口
- E2E测试：用户流程

#### 6.3 性能优化规则
**必须优化：**
- 数据库查询
- API响应时间
- 前端渲染性能
- 内存使用

---

### 规则7：错误处理规则

#### 7.1 错误记录
**必须记录：**
- 错误类型
- 错误信息
- 错误时间
- 错误位置
- 解决方案

#### 7.2 错误恢复
**恢复流程：**
```
1. 记录错误信息
2. 分析错误原因
3. 查找解决方案
4. 实施修复
5. 测试验证
6. 更新文档
7. Git提交
```

---

## 🎯 规则执行检查清单

### 每次开发前检查：
- [ ] 文件管理规则
- [ ] 协作机制规则
- [ ] Git管理规则
- [ ] Skills和MCP调用规则
- [ ] 开发流程规则
- [ ] 代码质量规则
- [ ] 错误处理规则

### 每次开发后检查：
- [ ] 文件是否重复
- [ ] 文档是否更新
- [ ] 代码是否注释
- [ ] 测试是否完成
- [ ] Git是否提交
- [ ] 临时文件是否清理

---

## 📊 规则优先级

### P0（必须遵守）
- 文件管理规则
- Git管理规则
- 代码质量规则

### P1（应该遵守）
- 协作机制规则
- 开发流程规则
- Skills和MCP调用规则

### P2（建议遵守）
- 错误处理规则
- 性能优化规则

---

## 🔄 规则更新机制

**何时更新规则：**
- 发现新问题
- 技术栈变化
- 团队反馈
- 最佳实践更新

**如何更新规则：**
1. 提出修改建议
2. 团队讨论
3. 更新文档
4. Git提交
5. 通知所有成员

---

**本规则体系适用于整个项目开发过程，所有开发行为必须遵守！**
