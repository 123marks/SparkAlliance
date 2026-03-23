# OpenCode CLI — 智能日程模块头脑风暴指令

## 任务背景

星火校园（Spark Alliance）是面向大学生的综合平台，技术栈为 Vue 3 + TypeScript + Vite + Supabase。
设计文档：`docs/MODULE-SCHEDULE.md`（请完整阅读）
现有模块参考：`frontend/src/pages/app/`（AppHome、CampusWall、Chat、Profile）

## 你的任务

以 OpenCode 的视角，从**系统设计完整性**和**可扩展性**角度进行全面评审与头脑风暴：

### 1. 系统设计完整性评审

逐一检查设计文档中的以下内容，指出遗漏或不完善的地方：
- [ ] 数据库 RLS 策略是否完整覆盖了所有 CRUD 操作？
- [ ] 重复事件删除/编辑的级联规则有没有设计？（删除父事件，子实例怎么处理？）
- [ ] `event_reminders` 表的 `is_sent` 字段，谁来负责标记为已发送？（前端 vs 后端 Edge Function）
- [ ] 多设备同步场景：同一用户在手机和电脑同时打开日程，事件变更如何实时同步？

### 2. 安全性审查
- Supabase RLS 策略中，用户只能读写自己的事件，但课表 `course_schedules` 是否需要学校级别的共享只读数据？
- `calendar_subscriptions` 中的 `calendar_url` 如果是恶意链接，如何防范 SSRF？
- 用户设置提醒时，`remind_at` 如果设置为过去的时间，系统应该如何处理？

### 3. 可扩展性设计
- 当前设计是单用户日程，未来如果要支持"团队/社团共享日程"，数据模型需要哪些改动？
- `event_type` 目前是 `VARCHAR(20)`，如果未来要支持用户自定义事件类型，如何扩展？
- 考虑到未来课表导入功能，`course_schedules` 表与 `schedule_events` 的关联是否足够清晰？

### 4. 性能设计
- `schedule_events` 表的索引设计：`idx_schedule_events_user_time` 复合索引是否能覆盖典型查询？
- 假设一个用户有500条重复事件实例，前端展开时的性能如何？是否需要分页或虚拟化？
- Supabase 查询时，前端每次切换视图都会重新 fetch，如何设计缓存策略减少请求？

### 5. 与现有模块整合评估
- **AppHome**：首页展示"今日日程"卡片，需要什么查询接口？
- **Profile**：个人中心展示"本周安排"，数据怎么聚合？
- **Chat（AI助手）**：用户说"帮我明天下午3点设个提醒"，AI如何解析并调用日程接口？给出接口设计
- **CampusWall**：帖子关联日程活动，需要在 posts 表新增什么字段？

### 6. 开发质量标准
- 日程模块的错误处理标准：Supabase 操作失败时，应该如何向用户提示，与其他模块保持一致？
- 组件的 loading 状态管理：建议用 `ref<boolean>` 还是统一的 loading state 枚举？
- 日期处理：`date-fns` vs 原生 `Date` API，什么场景下必须用 `date-fns`？

### 7. 测试策略
- `useCalendar.ts` 中的纯函数（getMonthGrid、isEventOnDate）如何用 Vitest 单元测试？
- 重复事件展开逻辑是核心算法，如何设计测试用例覆盖边界情况？
- E2E 测试：日程模块的最关键的 Happy Path 是什么？

## 输出格式

```
## 系统设计漏洞与修复建议
[列表 + 修复方案]

## 安全性问题
[列表 + 修复方案]

## 数据模型改进建议
[具体 SQL 或字段修改]

## 模块整合接口设计
[接口定义]

## 性能优化建议
[建议]

## 综合评分
[各维度评分 + 总评]

## 开发优先级调整建议
[基于风险评估的优先级排序]
```

输出保存到：`docs/reviews/schedule/opencode-schedule-output.md`
