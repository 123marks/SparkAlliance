# 🚀 星火资讯爬虫服务

## 架构

```
┌─────────────────────────────────────────────┐
│            Spark News Crawler               │
│                                             │
│  ┌─────────┐ ┌────────┐ ┌───────────────┐  │
│  │ Hacker  │ │ Reddit │ │ Product Hunt  │  │
│  │ News    │ │        │ │               │  │
│  └────┬────┘ └───┬────┘ └──────┬────────┘  │
│       │          │             │            │
│  ┌────┴────┐ ┌───┴────┐ ┌─────┴──────┐    │
│  │ V2EX    │ │ 掘金   │ │ 36氪       │    │
│  └────┬────┘ └───┬────┘ └─────┬──────┘    │
│       │          │             │            │
│  ┌────┴──────────┴─────────────┴──────┐    │
│  │         写入 Supabase 数据库         │    │
│  │       news_articles 表              │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  抓取方式：公开API / RSS / JSON接口          │
│  去重策略：按 original_url 去重              │
│  运行模式：单次 / 持续（每小时）              │
└─────────────────────────────────────────────┘
```

## 快速启动

### 1. 安装依赖

```bash
cd backend/news-crawler
npm install
```

### 2. 设置环境变量

**方法 A：命令行设置（推荐测试用）**

Windows PowerShell：
```powershell
$env:SUPABASE_URL = "https://your-project.supabase.co"
$env:SUPABASE_SERVICE_KEY = "eyJhbGciOi..."
```

Linux/Mac：
```bash
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_KEY="eyJhbGciOi..."
```

**方法 B：`.env` 文件**

复制 `.env.example` 为 `.env`，填入你的 Supabase 配置。

### 3. 确保数据库已建表

在 Supabase SQL Editor 中执行 `docs/database/news_tables.sql`。

### 4. 运行

**抓取一次后退出：**
```bash
npm run crawl:once
```

**持续运行（每小时抓取）：**
```bash
npm run crawl
```

## 当前支持的平台

| 平台 | 方式 | 说明 |
|------|------|------|
| Hacker News | API | Firebase 公开API |
| Reddit | JSON | 公开 .json 接口 |
| Product Hunt | GraphQL | 需要API Token |
| V2EX | API | 公开API |
| 掘金 | API | 推荐Feed接口 |
| 36氪 | API | 热榜接口 |
| IT之家 | RSS | RSS订阅源 |

## 扩展新平台

在 `crawler.js` 中：

1. 实现抓取函数：
```javascript
async function crawlNewPlatform(sourceId) {
  const data = await safeFetch('https://api.example.com/hot')
  return data.map(item => ({
    source_id: sourceId,
    title: item.title,
    summary: item.desc,
    original_url: item.url,
    hot_score: item.score,
    language: 'zh',
    category: 'tech',
    published_at: new Date().toISOString(),
  }))
}
```

2. 注册到 `CRAWLER_REGISTRY`：
```javascript
const CRAWLER_REGISTRY = {
  // ...现有平台
  newplatform: crawlNewPlatform,
}
```

3. 确保 `news_sources` 表中有对应的 `platform` 记录。

## ⚠️ 重要说明

- 使用 `service_role` key（不是 `anon` key），因为爬虫需要绕过RLS直接写入
- 对于需要登录的平台（微博、抖音、小红书等），后续需要接入 Playwright 浏览器自动化
- 本工具仅抓取公开信息，请遵守各平台 robots.txt 和使用协议
