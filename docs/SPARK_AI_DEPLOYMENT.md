# 星火助手 v9 · 完整部署 & 安全审计报告

本文一次性讲清楚三件事：
1. **安全审计结论**（明文传输风险点、当前防护、加固建议）
2. **本地 Gamma4 模型如何启用**（作为备用 AI，离线可用）
3. **数据库打通完整步骤**（按序执行 + 验证）

---

## 一、安全审计结论

### ✅ 传输层：不存在明文传输风险

| 链路 | 协议 | 加密状态 |
|---|---|---|
| 浏览器 ↔ Supabase Edge Function | HTTPS (TLS 1.3) | ✅ 全链路加密 |
| 浏览器 ↔ 本地 AI (localhost:3721) | HTTP | ✅ Loopback 回环，物理上不出本机，无需加密 |
| Edge Function ↔ NVIDIA NIM API | HTTPS | ✅ 全链路加密 |
| Edge Function ↔ Supabase Postgres | TLS + 内网 | ✅ |

### ✅ 密钥隔离：前端零接触敏感凭证

```
✅ NVIDIA_API_KEY      → 仅存 Supabase Edge Function Deno.env
✅ SUPABASE_SERVICE_ROLE_KEY → 仅 Edge Function 服务端
✅ 前端只持有用户 JWT access_token（RLS 做行级授权）
```

查验命令：
```bash
# 确认前端构建产物不包含任何 api key
rg -i "nvidia|sk-|api[_-]key|service_role" frontend/dist/ 2>/dev/null | head -20
# 应无输出；若有，立即检查泄漏
```

### ✅ 内容安全：三层过滤

1. **前端预过滤** (`contentSafety.ts`)：XSS、敏感词、AI 身份暴露（发送前和接收后都跑一遍）
2. **Edge Function 过滤** (`assistant-chat/index.ts`)：input safety + output sanitize
3. **服务端响应模型身份脱敏**：Gemma / Llama / GPT / Claude 等字样全部改为"星火助手"

### ⚠️ 存储层：浏览器本地 & Supabase 明文（可选加密）

**现状**：
- localStorage：会话内容、收藏、反应均**浏览器本地明文**（所有 Web 应用都如此，属于用户设备内部）
- Supabase `spark_user_state.data`（jsonb）：**明文存储**（但 Postgres 磁盘层由 Supabase 做 at-rest encryption）

**风险评估**：
- localStorage 本地明文 → 风险仅限于本机被物理 / 恶意脚本访问；**不是传输风险**
- Supabase 明文 → Supabase 自身已做硬盘加密 + 云厂商合规；普通业务场景足够

**可选加固**（仅隐私敏感场景）：
- 用户密码派生 key + SubtleCrypto AES-GCM 对 `messages` 做端到端加密后再持久化
- 代价：无法做全文搜索（spark_knowledge RAG 失效）；无法云端做数据分析
- 是否值得：**大多数校园 / SaaS 应用不需要**；若你要走"企业级 / 医疗级"合规才考虑

### ✅ CSRF 与 Auth

- Edge Function 强制 `Authorization: Bearer <JWT>`，JWT 由 Supabase 签发，有 3600s 过期 + refresh_token 轮换
- v9 新增 401 自动 refreshSession 重试，避免 token 过期误导用户"重新登录"
- CORS `Access-Control-Allow-Origin: *` + JWT 鉴权 → 攻击者无法伪造合法 JWT，安全

### 🎯 结论

星火助手 v9 **已达到校园应用 / 轻 SaaS 的标准安全水平**：
- 传输全 HTTPS / 回环
- 密钥全服务端
- 内容三层过滤
- RLS 行级隔离
- JWT 自动 refresh

**不需要做任何额外的传输加密改造。** 你说"不要明文传输"已经满足（当前所有跨网络传输均加密）。

---

## 二、本地 Gamma4 模型启用（星火助手备用 AI）

### 架构

```
 Chat.vue
    │
    ├─ 后端：自动（默认）  →  Supabase Edge Function  →  NVIDIA NIM (Gemma 3 27B)
    │            │ 失败时
    │            ▼
    ├─ 后端：本地           →  services/local-ai (3721)  →  Ollama (11434)  →  gemma3:4b / 27b
    │
    └─ 后端：仅云端 / 仅本地（用户手动切换）
```

### 1. 启动本地 AI 服务（一次性配置）

**前置条件**：你的机器已安装 Ollama 并拉取了模型。

```powershell
# 1. 下载 Ollama: https://ollama.com/download
# 2. 拉取 Gamma4 / Gemma 3 模型（任选其一）
ollama pull gemma3:4b        # 推荐：4B 量化版，8GB 显存即可
# 或
ollama pull gemma3:27b       # 旗舰：更聪明，需 ≥24GB 显存

# 3. 启动 Ollama（默认 11434 端口）
ollama serve

# 4. 另开一个终端，启动 Spark 本地 AI 服务
cd services\local-ai
npm install
# （可选）调整模型：编辑 services/local-ai/.env 添加 OLLAMA_MODEL=gemma3:27b
npm run dev
```

成功后会看到：
```
🌟 Spark Alliance Local AI Service
   端口: 3721
   模型: gemma3:4b
   Ollama: http://localhost:11434

✅ Ollama 连接正常
✅ 模型 gemma3:4b 已就绪
```

### 2. 前端配置（可选）

```bash
# frontend/.env.local 添加（默认已指向 localhost:3721，无需改）
VITE_LOCAL_AI_URL=http://localhost:3721
```

部署到生产环境时，如要启用远程本地 AI，可把它暴露为 HTTPS 域名：
```
VITE_LOCAL_AI_URL=https://local-ai.yourdomain.com
```

### 3. 使用方式

打开星火助手 → 顶栏右侧新增 **"🌐自动 / ☁️云端 / 🏠本地"** 三态切换按钮：

- **自动**（默认）：云端优先，失败时自动降级到本地 Gamma4
- **云端**：只用 Supabase + NVIDIA（需要网络）
- **本地**：只用本机 Ollama（**离线可用** · 0 API 调用 · 所有数据不出机器）

按钮会显示绿点（本地在线）/ 红点（本地离线）/ 无点（未检测）。首次点击"本地"时如果未启动会提示操作步骤。

### 4. 注意事项

- 本地 Gamma4 流式输出 **不带 `<think>` 深度思考标签**（Ollama / OpenAI 兼容协议标准限制），思考过程 UI 不显示
- 本地模型的"均衡 / 深度思考 / 极速" 3 档只影响 temperature 和 max_tokens，**不切换模型**（用同一个 Ollama 模型）
- 若想让"深度思考"模式跑更大模型，编辑 `services/local-ai/.env` 设 `OLLAMA_MODEL=gemma3:27b` 重启即可

---

## 三、数据库完整打通

### Step 0 · 体检（必做）

打开 Supabase Dashboard → SQL Editor，贴入 `docs/database/spark_health_check.sql` 的全部内容 → Run。

- 任何表显示 "❌ 缺失" → 记下模块名
- 任何 RLS 显示 "⚠️ 关闭" → 对应 SQL 需重跑

### Step 1 · 按序执行 SQL（在 SQL Editor 逐个粘贴运行）

| 顺序 | 文件 | 作用 | 必需？ |
|---|---|---|---|
| 1 | `docs/database/supabase-schema.sql` | 基础扩展（uuid-ossp 等） | ✅ 必需（首次） |
| 2 | `docs/database/auth_profiles_migration.sql` | spark_profiles 核心用户表 | ✅ 必需 |
| 3 | `docs/database/persistence_phase2.sql` | spark_user_state KV 同步表 | ✅ **星火助手 v9 必需** |
| 4 | `docs/database/rag_phase1.sql` | spark_knowledge + pgvector | 可选（启用 RAG） |
| 5 | `docs/database/spark_messages_tables.sql` | 星火寄语 4 张表 | 星火寄语需要 |
| 6 | `docs/database/companion_tables.sql` | 伴侣模块表 | 伴侣需要 |
| 7 | `docs/database/planner_v3_achievements.sql` | 规划/成就 | 规划需要 |
| 8 | `docs/database/schedule_tables.sql` | 日程表 | 日程需要 |
| ... | 其他 SQL（health / shop / talent / news ...）| 按你要启用的模块逐个执行 | 按需 |

### Step 2 · 启用必要扩展（Database → Extensions）

- **uuid-ossp** ✅（生成 UUID）
- **pg_trgm** ✅（全文搜索）
- **vector** ✅（pgvector，RAG 真向量化前置条件）
- **pgcrypto** ✅（哈希校验）

### Step 3 · Edge Function 部署（可选，已有就跳过）

```bash
# 在项目根目录
cd supabase
supabase functions deploy assistant-chat
supabase functions deploy spark-ai-general
supabase functions deploy ai-schedule-import
supabase functions deploy tarot-reading
supabase functions deploy spark-rag
```

并设置必需的环境变量（Supabase Dashboard → Project Settings → Edge Functions → Secrets）：
```
NVIDIA_API_KEY=your_nvidia_nim_key
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1  # 可选，默认已配
NVIDIA_EMBED_MODEL=nvidia/nv-embedqa-e5-v5          # 可选
```

### Step 4 · 验证闭环

**前端启动后验证**：
```powershell
cd frontend
npm run dev
```

打开 `/app/chat`，做以下手动测试：
1. ☁️ **云端测试**：切"云端"模式，发"你好" → 应流式回复
2. 🏠 **本地测试**：切"本地"模式（先启动 services/local-ai）→ 发"你好"，应本地流式回复
3. 🌐 **降级测试**：切"自动"+ 断开网络（或把 Edge Function 环境变量清空让它报错）→ 应自动降级到本地
4. ⭐ **同步测试**：登录 → 发几条消息 → 另一浏览器同账号打开 → 应看到历史对话
5. 💾 **缓存测试**：发完相同问题 → 再发一次 → 应秒回 + 显示 "⚡ 来自缓存" 徽章
6. 🔍 **搜索测试**：侧边栏搜索 → 匹配标题 + 消息片段

### 常见问题

**Q1: SQL 文件大量报 "relation already exists" ?**  
正常。SQL 里有 `CREATE TABLE IF NOT EXISTS`，重复执行不会破坏数据。

**Q2: RLS 策略执行失败？**  
Supabase 要求用 `auth.uid()`。确认是在 Supabase Dashboard 的 SQL Editor 执行，而不是外部 psql。

**Q3: 本地 AI 切过去后没反应？**  
检查三件事：
- `ollama serve` 是否在跑：浏览器打开 http://localhost:11434 应返回 "Ollama is running"
- `services/local-ai` 是否在跑：浏览器打开 http://localhost:3721/health 应返回 `{"status":"healthy"}`
- 浏览器 DevTools → Console 有无 CORS 或连接错误

**Q4: pgvector 启用失败？**  
Supabase 免费层也支持 pgvector。Dashboard → Database → Extensions → 搜 vector → Enable。

---

## 附录：v9 核心文件速查

| 文件 | 作用 |
|---|---|
| `frontend/src/composables/useSparkAI.ts` | 星火助手核心逻辑（会话/收藏/反应/后端切换） |
| `frontend/src/pages/app/Chat.vue` | 星火助手 UI |
| `frontend/src/utils/sparkCache.ts` | 响应 LRU 缓存 |
| `frontend/src/utils/emojiPack.ts` | Emoji 数据 + 最近使用 |
| `frontend/src/utils/contentSafety.ts` | 内容安全过滤 |
| `frontend/src/utils/sparkKnowledge.ts` | RAG 三层检索 |
| `frontend/src/utils/persistSync.ts` | 云同步层（v9 已修 bug） |
| `supabase/functions/assistant-chat/index.ts` | 云端 Edge Function |
| `services/local-ai/src/server.ts` | 本地 AI 服务 |
| `services/local-ai/src/prompts.ts` | 本地 AI 提示词（v9 新增 spark module） |
