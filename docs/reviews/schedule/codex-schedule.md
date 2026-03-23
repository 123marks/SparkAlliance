# Codex — 智能日程模块终审汇总指令

## 任务背景

星火校园（Spark Alliance）智能日程模块经过四个智能体（Qoder、Copilot、iflow、OpenCode）的独立头脑风暴后，现在需要你作为**终审官**进行汇总、去重、裁决与最终交付物生成。

## 输入文件（请先阅读）

1. `docs/MODULE-SCHEDULE.md` — 原始设计文档
2. `docs/reviews/schedule/qoder-schedule-output.md` — Qoder 的架构与产品建议
3. `docs/reviews/schedule/copilot-schedule-output.md` — Copilot 的代码实现建议
4. `docs/reviews/schedule/iflow-schedule-output.md` — iflow 的用户体验建议
5. `docs/reviews/schedule/opencode-schedule-output.md` — OpenCode 的系统设计建议

## 你的任务

### 1. 分歧裁决

找出四个智能体之间有分歧的观点，给出你的裁决和理由。
重点关注：
- 重复事件前端展开 vs 后端预生成（如有分歧）
- event_reminders 表是否必要（如有分歧）
- 组件拆分粒度（如有分歧）
- 视图模式存 store 还是 URL（如有分歧）

### 2. 共识整合

提炼四个智能体的共同建议，形成"强烈推荐实施"清单。

### 3. 设计文档补丁

基于四个智能体的建议，列出需要更新到 `docs/MODULE-SCHEDULE.md` 的具体内容（不需要实际修改，只列出 diff 说明）。

### 4. 开发交付物

生成给**反重力（开发智能体）**的最终开发指令，包含：

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【前置步骤】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. npm install date-fns @vueuse/core
2. Supabase SQL Editor 按顺序执行建表
3. 在 router/index.ts 替换 schedule 路由

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【MVP 开发顺序（Day 1-5）】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[具体任务列表]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【关键实现细节（来自各智能体建议）】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[提炼的关键点]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【已知风险点（开发时注意）】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[风险列表]
```

### 5. 综合评分

对 `docs/MODULE-SCHEDULE.md` 原始设计文档进行综合评分：

| 维度 | 满分 | 得分 | 说明 |
|------|------|------|------|
| 架构设计 | 20 | ? | |
| 数据模型 | 20 | ? | |
| 交互设计 | 20 | ? | |
| 校园场景适配 | 20 | ? | |
| 可扩展性 | 20 | ? | |
| **总分** | **100** | **?** | |

## 输出

将完整汇总报告保存到：`docs/reviews/schedule/codex-final-report.md`

该报告将作为反重力开发的**最终权威参考**，请确保准确、完整、可直接执行。
