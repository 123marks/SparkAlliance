# Copilot CLI — 智能日程模块头脑风暴指令

## 任务背景

星火校园（Spark Alliance）是面向大学生的综合平台，技术栈为 Vue 3 + TypeScript + Vite + Supabase。
项目根目录：`c:\Users\whw\Desktop\Spark-Alliance`
设计文档：`docs/MODULE-SCHEDULE.md`（请完整阅读）
现有代码参考：`frontend/src/pages/app/CampusWall.vue`（已完成的模块，作为风格对齐参考）

## 你的任务

以 GitHub Copilot 的视角，从**代码实现可行性**和**TypeScript 最佳实践**角度进行头脑风暴：

### 1. TypeScript 类型设计
- 为 `ScheduleEvent`、`RecurrenceRule`、`Reminder` 设计完整的 TypeScript 接口
- 事件类型 `EventType` 用 union type 还是 enum？各有什么权衡？
- Supabase 查询结果的类型如何与自定义接口对齐（避免频繁类型断言）？

### 2. Composable 设计
- `useSchedule.ts` 应该暴露哪些响应式状态和方法？给出完整接口签名
- `useCalendar.ts` 中日历计算函数（getMonthGrid、getWeekDays）是否应该是纯函数？如何测试？
- `useReminder.ts` 如何在页面卸载时清理 setTimeout，避免内存泄漏？

### 3. Pinia Store 设计
- `scheduleStore` 需要哪些 state、getters、actions？
- 跨组件共享的"当前选中日期"、"当前视图模式"应该放 store 还是 URL query 参数？
- 如何处理 Supabase 查询的 loading/error 状态？

### 4. 组件实现要点
- `CalendarMonth.vue` 的月份网格用 CSS Grid 还是 Flexbox？给出具体实现方案
- `EventModal.vue` 中 `mode: 'create' | 'edit' | 'view'` 的 prop 设计，如何避免条件渲染地狱
- 周视图中事件块的绝对定位计算公式（根据 start_time 和 duration 计算 top/height）

### 5. 代码质量
- 扫描 `docs/MODULE-SCHEDULE.md` 中的算法代码，指出潜在 bug 或边界情况
- `expandRecurrence` 函数处理每周重复时，跨夏令时边界会有问题吗？
- `detectConflicts` 函数的时间复杂度是 O(n²)，事件量大时如何优化？

### 6. 与现有代码对齐
- 参考 `CampusWall.vue` 中的 Toast 通知、Loading 状态、Supabase 调用方式，日程模块如何保持一致？
- 项目已有 `src/supabase.ts`，日程模块直接复用即可，无需重新初始化

## 输出格式

```
## TypeScript 接口定义（完整代码）
[代码]

## Composable 接口签名
[代码]

## Store 设计
[代码]

## 关键算法 Bug 修复
[代码 + 说明]

## 实现风险点
[列表]

## 代码实现评分与建议
[评分 + 优先级]
```

输出保存到：`docs/reviews/schedule/copilot-schedule-output.md`
