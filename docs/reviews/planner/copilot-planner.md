# Copilot CLI — 星火规划模块头脑风暴指令

## 任务背景

星火校园（Spark Alliance）技术栈为 Vue 3 + TypeScript + Vite + Supabase。
项目根目录：`c:\Users\whw\Desktop\Spark-Alliance`
现有模块参考：`frontend/src/pages/app/`（了解代码风格）

**新模块：星火规划（目标与任务）**
游戏化成长模块，核心数据链路：创建目标 → AI拆解任务 → 每日打卡 → 进度可视化 → 成就解锁。
注意：已有 `api_usage_logs` 表管理AI调用配额（`uuid_generate_v4()` + `auth.users(id)` 规范）。

---

## 你的任务

从**TypeScript实现与数据库设计**角度进行头脑风暴：

### 1. 数据模型设计（完整 SQL）

设计以下数据表，给出完整建表SQL（统一使用 `uuid_generate_v4()`，用户外键引用 `auth.users(id)`）：

**核心表：**
- `goals` —— 目标表（用户ID、标题、类型、截止日期、状态、总进度、创建时间）
- `tasks` —— 任务表（关联目标ID、标题、预计时长、截止日期、是否完成、完成时间）
- `habits` —— 习惯表（用户ID、名称、频率类型daily/weekly、目标天数、当前连续天数）
- `habit_logs` —— 习惯打卡记录（习惯ID、打卡日期、备注）
- `achievements` —— 成就表（成就名、描述、图标、解锁条件类型）
- `user_achievements` —— 用户已解锁成就（用户ID、成就ID、解锁时间）

每张表都需要配套 RLS 策略（用户只能读写自己的数据）。

另外，是否需要 `goal_milestones` 里程碑表？请给出建议和SQL。

### 2. AI规划 Edge Function

设计 `supabase/functions/ai-goal-planner/index.ts`：
- 接收：goalTitle（目标标题）、goalType（目标类型）、deadline（截止日期）、userId
- 复用 `api_usage_logs` 表，feature='goal_planning'，每日限制3次
- 调用 AI，Prompt 设计要点：
  - 输入：目标名称 + 剩余天数 + 目标类型
  - 输出：结构化JSON，包含里程碑列表（含时间节点）和每日任务建议
  - 结果要可直接入库到 `tasks` 表
- 给出完整的 Edge Function 代码

### 3. 游戏化数据结构

- 用户经验值和等级存在哪里？（扩展 `profiles` 表？还是独立 `user_stats` 表？）
- 星空领域积分如何计算？（每完成1个任务+多少分？习惯打卡+多少分？）
- 成就解锁是用数据库触发器自动检测，还是前端完成后调用服务端接口检测？
- 设计一个完成任务时的积分计算函数：

```typescript
function calculateXP(task: Task, habit?: HabitLog): number {
  // 考虑：任务难度、是否准时完成、连续打卡bonus
}
```

### 4. 核心组件设计

设计以下 Vue 3 组件的代码骨架：

**GoalCard.vue**：
- 展示目标名称、进度条（动画）、截止日期倒计时
- 点击展开显示子任务列表
- 进度条颜色根据完成率变化（绿/黄/红）

**HabitTracker.vue**：
- 显示本周7天打卡格子（类似GitHub contribution grid）
- 今日未打卡格子可点击，点击后乐观更新
- 连续打卡天数角标显示

**StarMap.vue（星空领域）**：
- Canvas 或 SVG 渲染星空背景
- 星星亮度/大小随用户积分变化
- 达到里程碑时星座连线动画

### 5. 状态管理方案

- 规划模块数据量大（目标+任务+习惯+成就），是否需要 Pinia store？
- 如何做乐观更新？（打卡时立刻更新UI，失败再回滚）
- 实时订阅：好友打卡后如何实时显示在我的界面上？（Supabase Realtime？）

### 6. 与日程模块联动接口

- 规划模块创建任务后，如何"推送到日程"？
  ```typescript
  // 设计接口：把规划任务转化为日程事件
  function pushTaskToSchedule(task: PlannerTask): ScheduleEvent
  ```
- 两个模块的数据是否共享，还是各自独立再通过接口同步？

## 输出格式

```
## 完整数据库SQL（所有表 + RLS + 索引建议）
## AI Goal Planner Edge Function 完整代码
## 游戏化积分系统设计
## 核心组件代码骨架
## 状态管理方案
## 与日程联动接口设计
## 代码实现风险点
```

输出保存到：`docs/reviews/planner/copilot-planner-output.md`
