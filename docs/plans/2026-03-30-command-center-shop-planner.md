# Command Center Shop Planner Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 把主控台从静态展示页升级成真实的业务中枢，修正星火购物/星火规划被误标为“即将上线”的错误，并补齐能提升留存的跨模块闭环。

**Architecture:** 以主控台为整合层，不重写购物和规划模块本身，而是抽出可测试的 dashboard 规则函数，主控台再基于 Supabase 真实数据加载日程、规划、购物摘要和下一步行动建议。保留现有视觉框架，优先修复状态失真、静态 mock 和转化断点。

**Tech Stack:** Vue 3, TypeScript, Vite, Vitest, Supabase

---

### Task 1: 固化需求与关键行为

**Files:**
- Create: `frontend/src/utils/appHomeDashboard.test.ts`

**Step 1: 写失败测试，定义主控台必须满足的规则**

- 快速入口中的 `星火购物` 和 `星火规划` 必须是已上线状态
- 主控台行动建议必须优先提醒：
  - 逾期/今日规划任务
  - 待处理购物交易
  - 可转化为任务的快速笔记
- 空状态下必须给出合理的启动建议，而不是“敬请期待”

**Step 2: 运行单测确认失败**

Run: `npm test -- src/utils/appHomeDashboard.test.ts`

Expected: FAIL，提示规则函数不存在或行为不符合预期

**Step 3: 再进入实现**

---

### Task 2: 抽出主控台规则函数

**Files:**
- Create: `frontend/src/utils/appHomeDashboard.ts`
- Test: `frontend/src/utils/appHomeDashboard.test.ts`

**Step 1: 实现最小可用规则函数**

- 生成快捷入口配置
- 生成“下一步行动”建议
- 生成统计卡片与周进度摘要

**Step 2: 运行单测直到通过**

Run: `npm test -- src/utils/appHomeDashboard.test.ts`

Expected: PASS

---

### Task 3: 主控台接入真实数据并修复错误状态

**Files:**
- Modify: `frontend/src/pages/app/AppHome.vue`

**Step 1: 替换静态状态失真的快捷入口**

- 去掉购物/规划的“即将上线”
- 去掉点击拦截和 `showComingSoon`

**Step 2: 接入真实摘要数据**

- 读取：
  - 今日/逾期规划任务
  - 活跃目标与本周完成率
  - 今日日程
  - 我的在售商品与待处理交易
  - 快速笔记本地内容
- 主控台展示真实行动项而不是 mock 文案

**Step 3: 增加留存玩法**

- “今日闭环”行动卡
- 快速笔记一键转今日任务
- 购物/规划联动提示

---

### Task 4: 回归验证与构建

**Files:**
- Modify as needed based on failures

**Step 1: 运行新增单测**

Run: `npm test -- src/utils/appHomeDashboard.test.ts`

Expected: PASS

**Step 2: 运行全量测试**

Run: `npm test`

Expected: PASS

**Step 3: 运行构建**

Run: `npm run build`

Expected: PASS

**Step 4: 修复构建或测试中发现的问题**

---

### Task 5: 交付审查结论

**Files:**
- Modify: `docs/plans/2026-03-30-command-center-shop-planner.md`

**Step 1: 在交付前补充执行结果**

- 修了哪些错误
- 新增了哪些闭环
- 剩余风险是什么

**Step 2: 用构建与测试结果作为最终证据**

---

## Execution Result

- 已修复主控台把 `星火购物` 和 `星火规划` 标成“即将上线”的错误状态。
- 已将主控台从静态 mock 看板改成真实数据驱动：
  - 读取规划任务、活跃目标、本周执行率
  - 读取今日日程
  - 读取在售商品、待处理交易、未读购物消息
  - 保留快速笔记，并新增“一键转今日任务”闭环
- 已新增 `frontend/src/utils/appHomeDashboard.ts` 和对应单测，固化主控台行动优先级规则。
- 为了让项目真正可交付，一并清理了现有构建阻塞项：
  - 多个未使用变量/导入
  - `useCompanion.ts` 中对 Supabase builder 错误调用 `.catch()`
  - 设置模块的类型问题与错误相对路径

## Verification Evidence

- `npm test -- src/utils/appHomeDashboard.test.ts`：通过，7 个测试全部通过
- `npm test`：通过，9 个测试文件、41 个测试全部通过
- `npm run build`：通过，`vue-tsc -b && vite build` 成功输出产物

## Residual Notes

- 主控台已具备真实业务闭环，但“校园热榜 / AI 最近对话”这类内容流仍有继续做成实时数据源的空间。
- 当前交付优先保障“已上线模块被正确表达”和“主控台能推动下一步行为”，而不是继续扩张新模块表面积。

## 2026-03-30 Follow-up Batch

- 主控台新增“校园热榜”模块，直接读取 `posts` / `likes` / `comments` 的真实数据，并回流到 `/app/wall`。
- 抽出并测试了社区热度规则，新增 `calculateCampusPostHeat` / `sortCampusPostsByHeat` / `buildCampusHotHighlights`。
- 重写 `AppHome.vue`，清理原有乱码文本，并把首页改成更稳定的真实数据主控台。
- 修复并重建设置模块关键文件，恢复 UTF-8 编码与可构建状态：`useSettings.ts`、`Settings.vue`、`SecuritySettings.vue`、`PrivacySettings.vue`、`NotificationSettings.vue`、`DataSettings.vue`、`FeatureSettings.vue`、`AboutSettings.vue`。
- 新增验证结果：
  - `npm test -- src/utils/campusWall.test.ts` 通过，15 个测试全部通过。
  - `npm test` 通过，9 个测试文件、44 个测试全部通过。
  - `npm run build` 通过，生产构建成功。
