# 反重力开发指令 - 星火校园项目

## 🚀 启动指令（复制到反重力）

```
请深度学习并理解星火校园项目，然后开始开发。

## 第一步：阅读核心文档
1. 阅读 PROJECT-RULES.md - 了解完整开发规则体系
2. 阅读 SparkAlliance.md - 了解项目骨架和七大功能模块
3. 阅读 AGENTS.md - 了解当前开发进度
4. 阅读 GIT-GUIDE.md - 了解Git使用规范

## 第二步：理解项目结构
项目目录：
- .agents/ - 全局配置（93个Skills + MCP服务）
- codex-control/ - Codex协作系统
- frontend/ - 前端代码
- backend/ - 后端代码
- pua/ - PUA激励引擎

## 第三步：加载必要Skills
根据开发任务加载相应Skills：
- UI/UX设计 → 加载 ui-ux-pro-max
- 代码调试 → 加载 systematic-debugging
- 测试开发 → 加载 test-driven-development
- Vue开发 → 加载 vue
- Nuxt开发 → 加载 nuxt
- 学习改进 → 加载 self-improvement

## 第四步：遵守开发规则
必须遵守 PROJECT-RULES.md 中的所有规则：
1. 文件管理规则 - 同性质文件直接覆盖，不创建新文件
2. 协作机制规则 - 开发完成后等待审查评分
3. Git管理规则 - 每个阶段完成后提交，评分低于7分回滚
4. Skills和MCP调用规则 - 根据任务类型调用相应工具
5. 开发流程规则 - 开发前检查、开发中规范、开发后总结
6. 代码质量规则 - 必须注释、必须测试、必须优化
7. 错误处理规则 - 记录错误、分析原因、实施修复

## 第五步：开始开发
当前开发阶段：MVP准备阶段
首要任务：前端设计

请先确认已理解所有规则，然后开始开发。
```

---

## 📋 分阶段开发指令

### 阶段1：前端设计指令
```
开始前端设计阶段。

## 任务目标
设计星火校园前端界面，包括：
1. AI聊天界面
2. 校园墙界面
3. 主页界面
4. 个人中心界面

## 设计要求
- 玻璃拟态UI（Glassmorphism）
- 弹簧阻尼物理感
- 自定义鼠标跟随
- 粒子动感效果

## 必须加载Skills
/skill ui-ux-pro-max

## 必须遵守规则
1. 文件管理：直接覆盖原文件，不创建新文件
2. 代码质量：必须有注释，必须考虑性能
3. Git提交：完成后提交，消息格式 "feat: 前端设计 - {时间戳}"

## 输出目录
frontend/src/components/
frontend/src/pages/

## 完成后
1. 更新 AGENTS.md 记录进度
2. Git提交代码
3. 等待其他CLI审查评分
```

---

### 阶段2：核心功能开发指令
```
开始核心功能开发阶段。

## 任务目标
开发核心功能，包括：
1. 用户认证系统（注册/登录/多群体身份）
2. AI聊天API（DeepSeek/豆包本地授权）
3. 数据库设计（Supabase）

## 技术栈
- 后端：Node.js + Express
- 数据库：Supabase (PostgreSQL)
- 认证：JWT

## 必须加载Skills
/skill systematic-debugging
/skill test-driven-development

## 必须遵守规则
1. 代码质量：必须有注释，必须有单元测试
2. 安全性：输入验证、错误处理、日志记录
3. Git提交：完成后提交，消息格式 "feat: 核心功能开发 - {时间戳}"

## 输出目录
backend/src/controllers/
backend/src/models/
backend/src/routes/
backend/src/services/

## 完成后
1. 更新 AGENTS.md 记录进度
2. Git提交代码
3. 等待其他CLI审查评分
```

---

### 阶段3：辅助功能开发指令
```
开始辅助功能开发阶段。

## 任务目标
开发辅助功能，包括：
1. 校园墙功能（发布动态、点赞评论、内容分类）
2. 健康打卡功能（吃饭/睡眠打卡）
3. 生日祝福功能

## 技术栈
- 前端：React Native
- 后端：Node.js + Express
- 数据库：Supabase

## 必须加载Skills
/skill vue
/skill test-driven-development

## 必须遵守规则
1. 用户体验：流畅动画、响应式设计
2. 代码质量：必须有注释，必须有测试
3. Git提交：完成后提交，消息格式 "feat: 辅助功能开发 - {时间戳}"

## 输出目录
frontend/src/pages/CampusWall/
backend/src/controllers/campusWallController.js

## 完成后
1. 更新 AGENTS.md 记录进度
2. Git提交代码
3. 等待其他CLI审查评分
```

---

### 阶段4：测试与文档指令
```
开始测试与文档阶段。

## 任务目标
编写测试和文档，包括：
1. 单元测试（核心功能）
2. 集成测试（API接口）
3. API文档
4. 用户使用说明

## 必须加载Skills
/skill test-driven-development
/skill self-improvement

## 必须遵守规则
1. 测试覆盖：核心功能100%覆盖
2. 文档质量：清晰、完整、有示例
3. Git提交：完成后提交，消息格式 "feat: 测试与文档 - {时间戳}"

## 输出目录
backend/tests/
docs/api/
docs/user/

## 完成后
1. 更新 AGENTS.md 记录进度
2. Git提交代码
3. 等待其他CLI审查评分
```

---

## 🎯 快速启动指令（推荐）

### 完整版（适合首次开发）
```
请深度学习星火校园项目并开始开发。

第一步：阅读核心文档
- PROJECT-RULES.md（开发规则）
- SparkAlliance.md（项目骨架）
- AGENTS.md（开发进度）
- GIT-GUIDE.md（Git规范）

第二步：加载Skills
/skill ui-ux-pro-max
/skill systematic-debugging
/skill test-driven-development
/skill self-improvement

第三步：遵守规则
- 文件管理：同性质文件直接覆盖
- 协作机制：开发完等待审查评分
- Git管理：每阶段提交，评分<7回滚
- 代码质量：必须注释、必须测试

第四步：开始开发
当前阶段：MVP准备阶段
首要任务：前端设计（玻璃拟态UI、弹簧阻尼、鼠标跟随、粒子效果）

请确认理解后开始开发。
```

---

### 简洁版（适合快速开发）
```
学习星火校园项目并开始开发。

必读文档：
- PROJECT-RULES.md（规则）
- SparkAlliance.md（骨架）

必载Skills：
/skill ui-ux-pro-max

必守规则：
- 文件直接覆盖，不创建新文件
- 代码必须注释和测试
- Git每阶段提交

当前任务：前端设计（玻璃拟态UI）

开始开发。
```

---

## 📝 开发前检查清单

每次开发前复制此清单并确认：

```
## 开发前检查清单

### 文档阅读
- [ ] 已阅读 PROJECT-RULES.md
- [ ] 已阅读 SparkAlliance.md
- [ ] 已阅读 AGENTS.md
- [ ] 已阅读 GIT-GUIDE.md

### Skills加载
- [ ] 已加载 ui-ux-pro-max（UI设计）
- [ ] 已加载 systematic-debugging（调试）
- [ ] 已加载 test-driven-development（测试）
- [ ] 已加载 self-improvement（学习）

### 规则确认
- [ ] 理解文件管理规则
- [ ] 理解协作机制规则
- [ ] 理解Git管理规则
- [ ] 理解代码质量规则

### 准备就绪
- [ ] 已确认当前开发阶段
- [ ] 已确认首要任务
- [ ] 已确认输出目录
- [ ] 已确认Git提交格式

开始开发！
```

---

## 🔄 开发中提醒

### 遇到问题时
```
如果遇到问题：
1. 使用 /skill systematic-debugging 进行调试
2. 使用 /skill self-improvement 记录学习
3. 查阅 PROJECT-RULES.md 中的错误处理规则
4. Git回滚到上一个稳定版本
```

### 需要优化时
```
如果需要优化：
1. 查看审查评分和建议
2. 使用 /skill ui-ux-pro-max 优化UI
3. 使用 /skill test-driven-development 添加测试
4. Git提交优化后的代码
```

---

## 📊 开发后总结

### 完成后必须做
```
开发完成后：
1. 更新 AGENTS.md 记录进度
2. 检查代码注释完整性
3. 检查测试覆盖率
4. Git提交代码
5. 清理临时文件
6. 等待其他CLI审查评分
```

---

**使用这些指令可以确保模型深度理解项目并遵守所有规则！**
