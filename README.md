# 星火联盟 Spark Alliance

星火联盟是一个面向校园场景的 AI 驱动综合服务平台，核心目标是把学习、日程、校园社区、二手交易、健康打卡、AI 伴侣、人才匹配与资讯聚合等能力整合到一个统一入口中。当前项目以 Vue 3 + TypeScript + Vite 前端为主体，配合 Supabase 数据库/认证/Edge Functions、本地 Ollama AI 服务以及资讯爬虫服务完成主要功能原型。

## 项目组成

| 路径 | 作用 |
| --- | --- |
| `frontend/` | 前端主应用，包含官网页、登录注册、应用工作台以及各业务模块页面。 |
| `frontend/src/pages/app/` | 应用内页面：AI 聊天、校园墙、智能日程、购物、健康、伙伴、资讯、人才、共创、个人中心、设置等。 |
| `frontend/src/components/` | 通用组件和业务组件，例如聊天、日程、规划、健康、伙伴、购物等模块组件。 |
| `frontend/src/composables/` | Vue 组合式逻辑，封装认证、日程、规划、AI、社区、购物、健康等业务状态和 API 调用。 |
| `frontend/src/utils/` | 公共工具，包括内容安全、缓存、持久化、AI 协议、校园墙数据处理等。 |
| `supabase/functions/` | Supabase Edge Functions，包含 AI 聊天代理、RAG、通用 AI、塔罗解读、课表导入等服务端函数。 |
| `docs/database/` | Supabase/PostgreSQL 数据库建表和迁移脚本。 |
| `services/local-ai/` | 本地 AI 服务，基于 Express + Ollama，提供 OpenAI 兼容接口和模块化 AI 接口。 |
| `backend/news-crawler/` | 星火资讯爬虫服务，用于从公开来源抓取热点资讯并写入 Supabase。 |
| `docs/` | 项目说明、业务规划、数据库说明、评审报告、部署与安全文档。 |
| `tasks/` | 部分模块的设计蓝图和设计 token。 |
| `DesingImage/` | 项目设计图、模块截图、背景图和 UI 视觉资产。 |
| `official-website/` | 官网审查与增长改进方案。 |

## 技术栈

- 前端：Vue 3、TypeScript、Vite、Vue Router、Vitest
- 样式与交互：CSS、Tailwind/Vite 插件、模块化 Vue 组件
- 数据与后端：Supabase Auth、PostgreSQL、Storage、Realtime、Edge Functions
- AI：Supabase Edge Function 服务端代理、本地 Ollama 兼容服务
- 辅助服务：Node.js 爬虫、SQL 迁移脚本

## 快速启动

### 1. 启动前端

```bash
cd frontend
npm install
npm run dev
```

默认开发地址通常是 `http://localhost:5173`。如端口被占用，以 Vite 控制台输出为准。

### 2. 配置前端环境变量

复制示例文件：

```bash
cd frontend
copy .env.example .env.local
```

填写：

```env
VITE_SUPABASE_URL=你的 Supabase 项目地址
VITE_SUPABASE_ANON_KEY=你的 Supabase anon/publishable key
```

注意：前端只放公开 anon/publishable key，不要放 service role key、NVIDIA API Key、OpenAI Key 等服务端密钥。

### 3. 初始化数据库

在 Supabase SQL Editor 中按需要执行 `docs/database/` 下的 SQL。常用入口：

- `docs/database/supabase-schema.sql`：基础结构
- `docs/database/auth_profiles_migration.sql`：用户资料
- `docs/database/spark_messages_tables.sql`：聊天/消息
- `docs/database/schedule_tables.sql`：日程
- `docs/database/shop_tables.sql`：购物
- `docs/database/news_tables.sql`：资讯
- `docs/database/feedback_tables.sql`：反馈

### 4. 部署 Supabase Edge Functions

先安装并登录 Supabase CLI，然后在项目根目录执行：

```bash
supabase functions deploy assistant-chat
supabase functions deploy spark-ai-general
supabase functions deploy spark-rag
supabase functions deploy ai-schedule-import
supabase functions deploy tarot-reading
```

AI 服务密钥应配置到 Supabase Dashboard 的 Edge Function Secrets 中，不要写入源码。

### 5. 启动本地 AI 服务（可选）

本地 AI 服务依赖 Ollama：

```bash
cd services/local-ai
npm install
npm run setup
npm run dev
```

默认接口：

- 健康检查：`http://localhost:3721/health`
- OpenAI 兼容接口：`POST http://localhost:3721/v1/chat/completions`
- 模块接口：`POST http://localhost:3721/api/spark/{module}`

### 6. 启动资讯爬虫（可选）

```bash
cd backend/news-crawler
npm install
copy .env.example .env
npm run crawl:once
```

爬虫写库需要 Supabase URL 和 service role key。该 key 只能放在本地 `.env` 或服务器环境变量中，不要提交。

## 常用命令

```bash
# 前端开发
cd frontend
npm run dev

# 前端构建
cd frontend
npm run build

# 前端测试
cd frontend
npm run test

# 本地 AI 服务
cd services/local-ai
npm run dev

# 资讯爬虫单次运行
cd backend/news-crawler
npm run crawl:once
```

## 安全与提交说明

本项目的真实密钥文件不应进入比赛源码包，包括：

- `.env`
- `.env.local`
- `.env.*.local`
- Supabase service role key
- NVIDIA/OpenAI/DeepSeek 等 AI 平台 API Key
- GitHub、Brave、数据库、Redis、Stripe 等第三方 token
- `node_modules/`、`dist/`、`.git/`、IDE 配置、AI 工具配置和本地临时文件

仓库中只保留 `.env.example` 作为配置模板。评审或部署人员需要按上述说明自行创建本地环境变量。

## 项目入口

- 官网入口：`/`
- 登录：`/login`
- 注册：`/register`
- 应用首页：`/app/home`
- AI 伴侣：`/app/chat`
- 校园墙：`/app/wall`
- 智能日程：`/app/schedule`
- 校园购物：`/app/shop`
- 健康打卡：`/app/health`
- 学习中心：`/app/learn`
- 人才匹配：`/app/talent`
- 星火资讯：`/app/news`
- 共创空间：`/app/cocreate`
- 个人中心：`/app/profile`
- 设置中心：`/app/settings`

## 参赛说明

建议提交源码包时保留 `frontend/`、`supabase/functions/`、`docs/database/`、`services/local-ai/`、`backend/news-crawler/`、`docs/`、`tasks/` 和必要设计资产，排除所有本地密钥、依赖目录和构建产物。这样评审可以复现源码、查看数据库结构和服务端函数，同时不会接触任何真实敏感信息。
