# 数据持久化方案与审计（2026-04-17 更新）

## 现状总览

### 本地存储（localStorage）主要使用者

| 模块 | Key 前缀 | 数据规模 | 远端同步状态 |
|---|---|---|---|
| **useCompanion** | `spark_companion_*`、`spark_chat_<friend_id>` | **大**（好友/群/动态/收藏/聊天记录/标签/黑名单/权限） | ✅ 通过 `spark_user_state` 通用 KV 同步 |
| useSparkAI | `spark_ai_conversations` | 中（AI对话历史前50条） | ✅ 通过 `spark_user_state` 同步 |
| useSemester | `spark_semester_config` | 小（学期配置） | ✅ 通过 `spark_user_state` 同步 |
| useSettings | `spark_appearance` | 小（主题/外观） | ✅ 通过 `spark_user_state` 同步 |
| Profile/ProfileSettings | `spark-bg-*`、`spark-profile-*` | 小 | ✅ 通过前缀匹配同步 |

### 已接入 Supabase 的模块

`useResources`, `useMentor`, `useTalent`, `useCoCreate`, `useNews`, `useHealth`, `useHabit`, `usePlanner`, `useShop`, `useCrawler`, `useStudyRoom`, `useCalendar`, `useSchedule`, `useAchievements`, `Tarot` 等绝大多数功能模块已直接 `supabase.from(...)`。

## 风险清单与解决进度

1. ✅ **配额爆掉** —— `persist.ts` 已捕获 `QuotaExceededError`，自动清理最老 20% 聊天缓存，降级为内存存储。
2. ✅ **跨设备不同步** —— 新增 `persistSync.ts` + `spark_user_state` 表，登录即 full-sync（双向 last-write-wins）。
3. ✅ **多标签页冲突** —— `storage` 事件监听 + `subscribePersist` 自动刷新 Vue ref。
4. ✅ **频繁 I/O** —— 200ms 防抖合并写入；私聊额外使用内存缓存层避免反复 JSON.parse。

## 已实施的持久化层（2026-04-17）

### 第一阶段：本地稳健化（已完成）

**`frontend/src/utils/persist.ts`**

统一封装 `loadPersist` / `savePersist` / `removePersist` / `subscribePersist`，提供：

- **配额保护**：捕获 `QuotaExceededError`，自动清理最老的 20% 聊天缓存，降级为内存存储。
- **防抖写入**：200ms 内的相同 key 高频写入合并为 1 次。
- **跨标签页同步**：`storage` 事件监听自动通知订阅者。
- **版本号兼容**：支持 `{__v, data}` 包装。
- **可插拔远端同步适配器**：`registerSyncAdapter(key, fn)` 注册后，写入自动触发云端同步（失败不影响本地）。
- **updated_at 侧车**（2026-04-17 新增）：每次写入同步更新 `__meta:<key>` 下的 `updated_at` 时间戳，支撑远端 last-write-wins 比较。
- **writeLocalFromRemote**（2026-04-17 新增）：供同步层把远端数据写回本地而不触发反向 adapter，避免回灌循环。
- **页面卸载 flush**：`beforeunload`/`pagehide` 强制落盘 pending 数据。

**`frontend/src/composables/useCompanion.ts`**

- 所有 `saveData`/`loadData` 走 `savePersist`/`loadPersist`，12 个 `STORAGE_KEYS` 以及 `spark_chat_*` 动态 key 零调用点改动即获得上述全部增强。
- 在 `init()` 之后 `subscribeRemoteUpdates()` 对所有关键 key 调用 `subscribePersist`，一旦 full-sync 把远端数据写回本地，Vue ref 自动刷新，UI 实时更新。

### 第二阶段：Supabase 跨设备同步（已完成）

**数据库迁移** `docs/database/persistence_phase2.sql`

新增单表 `spark_user_state`（通用 JSONB KV）：

```
user_id UUID NOT NULL REFERENCES auth.users(id)
state_key TEXT NOT NULL
data JSONB NOT NULL
updated_at TIMESTAMPTZ NOT NULL
UNIQUE(user_id, state_key)
```

亮点：
- **RLS 全策略** (sel / ins / upd / del)：用户只能操作自己的行。
- **触发器 `trg_sus_touch`**：更新时自动刷新 `updated_at`（若客户端带入时间戳更早则忽略，确保单调递增）。
- **触发器 `trg_sus_guard`**：单行 `data` ≤ 256KB、单用户总和 ≤ 8MB，防止被滥用撑爆。
- **生成列 `size_bytes`**：方便配额审计。

**同步层** `frontend/src/utils/persistSync.ts`

- `SYNC_KEYS`：精确匹配的 14 个 key（涵盖 `spark_companion_*` + `spark_ai_conversations` + `spark_appearance` + `spark_semester_config` + `spark_profile_settings`）。
- `SYNC_PREFIXES`：前缀匹配 `spark_chat_*` / `spark-bg-*` / `spark-profile-*`。
- `upsertAdapter`：写入即 `upsert` 到 `spark_user_state`。
- `profileMirrorAdapter`：`spark_companion_profile` 额外镜像到结构化表 `spark_profiles`，供广场 / 搜索 / 其他模块使用。
- `fullSync()`：启动 / 登录 / 切换账号 / 页面可见性恢复时触发
  - 拉取该用户所有 `spark_user_state` 行
  - **远端 > 本地 `updated_at`** → `writeLocalFromRemote` + 通知 subscribers（Vue ref 自动刷新）
  - **本地 > 远端 `updated_at`** → `upsert` 回远端
- `initPersistSync()`：`main.ts` 启动时调用一次，注册 adapters + 监听 `supabase.auth.onAuthStateChange`。

**入口** `frontend/src/main.ts`

```ts
import { initPersistSync } from './utils/persistSync'
// ...
app.mount('#app')
initPersistSync()
```

## 合并策略说明

采用 **last-write-wins** 粒度 = 整个 key 的 JSON blob：

| 场景 | 行为 |
|---|---|
| 设备 A 登录，本地有数据，远端无 | 推送本地到远端 |
| 设备 B 新登录，本地无数据，远端有 | 拉取远端到本地，Vue ref 自动更新 |
| 同一账号在两台设备同时修改 | 最后写入的 `updated_at` 胜出；已被覆盖的一方在下次 visibilitychange/登录时得到新版本 |
| 网络异常 | upsert 失败被 `console.warn` 吞掉，本地数据仍然正常写入；恢复连接后下次写入/可见性切换触发同步 |

这种粒度**足够**覆盖本项目需求（好友列表、档案、标签等更新频率低）；对聊天记录虽然也能工作，但不是最优（每次发消息会整个数组 upsert）。

## 后续可选优化

### 更细粒度的聊天消息同步（方案 B）

当聊天消息量 > 几百条时，整 JSON upsert 的网络开销变大。可替换 `spark_chat_*` 的 upsertAdapter 为 INSERT-only 追加写入到 `companion_messages` 表 + Supabase Realtime 订阅，本地只保留最近 3 天。
相关表结构见 `docs/database/companion_tables.sql`。

### 冲突可视化

当前策略不区分字段级冲突。若未来需要跨设备合并同一条好友备注的编辑，可改为字段级 diff + 服务器端 merge function。

### 离线写队列

当前 adapter 失败即吞错。更严谨做法：失败写入推入 IndexedDB 队列，在 `online` 事件或下次同步时重放。

## 快速验证

在 SQL Editor 执行 `persistence_phase2.sql` 后，前端无需额外操作。可通过以下方式验证：

```sql
-- 登录后的用户应该能看到自己的 state
SELECT state_key, updated_at, size_bytes FROM spark_user_state WHERE user_id = auth.uid();
```

或在浏览器 DevTools Console：

```js
import('/src/utils/persistSync.ts').then(m => m.syncNow())
```
