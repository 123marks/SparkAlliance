# 星火助手 v11 · 部署 & 安全 & 配置一本通

本文一次讲清楚星火助手模块的三件事：
1. **架构与安全** —— 密钥在哪、传输怎么加密、为什么前端不持有 API Key
2. **一键配置 API** —— NVIDIA_API_KEY 如何通过脚本安全推到 Supabase Secrets
3. **4 种模式 + 长上下文 + 记忆继承** —— 用户体验上的三大升级

---

## 一、架构与安全

### 1.1 请求链路（全链路加密）

```
┌────────────┐  HTTPS(TLS 1.3)  ┌──────────────────────┐  HTTPS  ┌──────────────┐
│  浏览器     │ ───────────────> │ Supabase Edge Func   │ ──────> │  NVIDIA NIM  │
│  Chat.vue   │  JWT + messages   │ assistant-chat       │         │  (Kimi/GLM/  │
│  (前端)    │ <─────────────── │ (Deno + 服务端 Key)  │ <────── │   MiniMax)   │
└────────────┘  流式 SSE        └──────────────────────┘         └──────────────┘
```

- 浏览器 ↔ Edge Function：HTTPS + Supabase JWT 鉴权
- Edge Function ↔ NVIDIA：HTTPS + `Authorization: Bearer ${NVIDIA_API_KEY}`
- 响应：流式 Server-Sent Events，前端渐进渲染
- 前端**永远不持有** NVIDIA API Key，DevTools 里扒不到

### 1.2 密钥存储位置（必看）

| Key | 位置 | 前端可见？ |
|---|---|---|
| `NVIDIA_API_KEY` | Supabase Dashboard → Project Settings → Edge Functions → **Secrets** | ❌ 不可见 |
| `SUPABASE_SERVICE_ROLE_KEY` | 同上（Supabase 自动注入） | ❌ 不可见 |
| 用户 JWT `access_token` | 浏览器 localStorage（HttpOnly 不适用 SPA） | ✅ 本机可见，但**跨站无法读取** |

> ⚠️ **绝对不要**把 NVIDIA_API_KEY 粘进 `.env`、`frontend/.env.local` 或任何源码文件。
> 一旦放进前端构建产物，任何打开网站的人都能打开 DevTools Network 面板扒走它。

### 1.3 零信任验证

```powershell
# 确认前端构建产物不包含任何 Key
cd frontend
pnpm build
Select-String -Path dist/assets/*.js -Pattern "nvapi-|sk-|service_role" -SimpleMatch
# 应无输出；若有输出，立刻检查是否有代码把 Key 硬编码进前端
```

### 1.4 内容安全

1. **前端预过滤**（`frontend/src/utils/contentSafety.ts`）：XSS、敏感词、AI 身份暴露
2. **Edge Function 输入安全**（`checkInputSafety`）：敏感词直接拦截回友好话术
3. **Edge Function 输出脱敏**（`sanitizeOutput`）：底层模型名（Kimi/GLM/MiniMax/Gemma/DeepSeek 等）全部替换为「星火」
4. **Edge Function 输出规范化**（`normalizeMarkdown`）：修复模型常见的 `** 粗体 **`（星号两边带空格）等 Markdown 格式 bug，防止前端渲染不出粗体

---

## 二、一键配置 NVIDIA_API_KEY

### 2.1 前置条件

- 已注册 Supabase 项目（https://supabase.com）
- 已安装 Supabase CLI：
  - Windows: `scoop install supabase` 或 `npm install -g supabase`
  - macOS:   `brew install supabase/tap/supabase`
  - Linux:   `npm install -g supabase`
- 已在 https://build.nvidia.com 拿到一个 NVIDIA API Key（以 `nvapi-` 开头）

### 2.2 一键执行

**Windows (PowerShell)**：

```powershell
.\scripts\setup-ai-secrets.ps1
# 按提示粘贴你的 nvapi-xxxxx Key（输入时不回显，安全）
```

**Linux / macOS**：

```bash
bash scripts/setup-ai-secrets.sh
```

脚本会自动：
1. 检测 Supabase CLI
2. 如未链接项目，引导你 `supabase link --project-ref xxx`
3. 用 `supabase secrets set` 把 Key 加密推送到 Supabase Edge Function Secrets
4. 一并推送模型映射环境变量（均衡/深度思考/极速/标准）
5. 重新部署 `assistant-chat` Edge Function，让新 Key 立即生效

### 2.3 纯手动（不想用脚本）

Supabase Dashboard → Project Settings → Edge Functions → **Secrets** → Add new secret：

| Key | Value |
|---|---|
| `NVIDIA_API_KEY` | `nvapi-你的key` |
| `NVIDIA_BASE_URL` | `https://integrate.api.nvidia.com/v1`（可选，默认已配） |
| `SPARK_MODEL_DEFAULT` | `moonshotai/kimi-k2.5`（可选） |
| `SPARK_MODEL_THINKING` | `z-ai/glm-5.1`（可选） |
| `SPARK_MODEL_FAST` | `minimaxai/minimax-m2.5`（可选） |
| `SPARK_MODEL_STANDARD` | `google/gemma-3-27b-it`（可选） |

然后本地 `supabase functions deploy assistant-chat` 重新部署。

### 2.4 验证

```bash
# 前端启动
cd frontend && pnpm dev

# 打开 http://localhost:5173/app/chat
# 登录 → 发一句 "你好" → 应该流式回复
# 切换顶部工具栏的 "均衡 / 深度思考 / 极速 / 标准" 四档 → 每档都应能回答
```

---

## 三、v11 新特性

### 3.1 四种模式

| 模式 | 图标 | 真实模型 | 场景 | 默认 temperature / max_tokens |
|---|---|---|---|---|
| 均衡 | ⚡ | `moonshotai/kimi-k2.5` | **默认**，日常问答 / 写作 / 写代码 | 0.75 / 4096 |
| 深度思考 | 🧠 | `z-ai/glm-5.1` | 复杂题、多步推理、深度分析 | 0.6  / 8192 |
| 极速 | 🚀 | `minimaxai/minimax-m2.5` | 闲聊、秒回、小问题 | 0.8  / 2048 |
| 标准 | 🛡️ | `google/gemma-3-27b-it` | 稳定兜底，不走新模型 | 0.7  / 4096 |

所有模式都有 fallback 链（见 `supabase/functions/assistant-chat/index.ts#resolveModelConfig`）：
某个模型临时不可用时自动降级，永远不会"AI 服务不可用"。

### 3.2 长上下文 + 自动摘要

- 前端 `useSparkAI` 现在保留 **80 条消息**（此前 60）
- 当非 system 消息数 > 50 时，**后台自动**触发一次摘要：调 `action=summarize` 压缩早期对话为一段 system 摘要，然后把旧消息删除，保留最近 12 条原文 + 摘要
- UI 顶部的"记忆 X/80"条指示：
  - < 80%：正常色
  - 80-100%：黄色警告
  - 已满或正在压缩：紫色脉冲动画

### 3.3 新开对话 · 继承记忆（🧠 续聊）

顶部新增 **"🧠 续聊"** 按钮：

1. 点击后调用 `inheritMemoryToNewConversation()`
2. 内部用 `action=summarize` 把当前会话压成摘要
3. 新建一个会话，把摘要作为 `role=system` 消息塞进开头
4. 切到新会话，AI 还"记得"之前聊过什么

适用场景：已聊了很久，上下文要满了，但主题要继续 / 要开新的方向但想保留之前的设定。

### 3.4 输出格式规范化（修复 `** **` 未渲染 bug）

- **后端**：`sanitizeOutput` 在返回给前端前做 `normalizeMarkdown`，修正 `** 粗体 **`、孤儿星号、奇数星号等
- **前端**：`renderMd` 也兜底做一次 normalize，双保险
- **system prompt** 明确告诉模型：粗体必须紧贴内容，严禁 `** 空格 **` 写法

---

## 四、常见问题

### Q1: 切到某个模式后报 "AI 服务暂时不可用"
检查 Supabase Edge Function Logs：可能是 NVIDIA 那边这个模型暂时下线。默认有 fallback 链，如果全部 fallback 都挂了，换另一个模式试试（深度思考 → 均衡 → 标准）。

### Q2: 前端显示 "登录状态已过期" 但我明明登录了
v9 已修复：`useSparkAI.getValidSession()` 主动检查 `expires_at - now < 90s` 提前 refresh。若仍遇到，确认浏览器没把 Supabase session 给清了（检查 `localStorage` 的 `spark-auth-token`）。

### Q3: 我看到 AI 回复里有 `** 文字 **` 没渲染成粗体
v11 已修复：服务端 `normalizeMarkdown` + 前端 `renderMd` 双重 normalize。如果依然出现，说明是罕见变体，把回复截图反馈给我。

### Q4: 想换模型，不想改代码
直接在 Supabase Secrets 里改环境变量即可（不用重新部署 Edge Function，重启后自动读取）：
- `SPARK_MODEL_DEFAULT=你的模型 slug`
- `SPARK_FALLBACK_DEFAULT=逗号分隔的兜底模型 slug 列表`
- 同理有 `_THINKING` / `_FAST` / `_STANDARD` 版本

### Q5: 想禁用某个模式
前端 `frontend/src/composables/useSparkAI.ts` 的 `MODEL_OPTIONS` 里删掉对应条目即可。

---

## 五、v11 核心文件速查

| 文件 | 作用 |
|---|---|
| `supabase/functions/assistant-chat/index.ts` | Edge Function · 代理到 NVIDIA、Markdown 规范化、摘要 action |
| `frontend/src/composables/useSparkAI.ts` | 前端核心：会话/收藏/反应/摘要/记忆继承 |
| `frontend/src/pages/app/Chat.vue` | 星火助手 UI（v11 已移除本地/云端切换，加上续聊） |
| `frontend/src/pages/app/SmartChat.vue` | Chat + Companion 的主模块容器 |
| `frontend/src/utils/sparkCache.ts` | 响应 LRU 缓存（提问重复时秒回） |
| `frontend/src/utils/contentSafety.ts` | 前端内容安全过滤 |
| `frontend/src/utils/sparkKnowledge.ts` | RAG 三层检索（静态 + DB 全文 + pgvector） |
| `scripts/setup-ai-secrets.ps1` / `.sh` | 一键推送 NVIDIA_API_KEY 到 Supabase Secrets |

---

## 六、变更日志（v11 核心）

- ✅ 重新映射模型：默认 Gemma3 → **Kimi K2.5**；深度 DeepSeek R1 → **GLM 5.1**；极速 Llama 3.1 8B → **MiniMax M2.5**；新增「标准 Gemma3」作为稳定兜底
- ✅ 移除前端的 "自动/云端/本地" 切换 UI，统一走 Edge Function（代码更简单、密钥更安全）
- ✅ 修复 `** **` 未渲染 bug（双端 `normalizeMarkdown`）
- ✅ 加长上下文：80 条消息 + 50 条触发自动摘要
- ✅ 新开对话继承记忆（🧠 续聊按钮）
- ✅ system prompt 加强输出格式规范，代码块/公式/列表渲染更稳
- ✅ 新增 `scripts/setup-ai-secrets.ps1/.sh` 一键密钥推送脚本
