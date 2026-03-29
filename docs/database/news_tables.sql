-- ============================================
-- 星火资讯模块 — 数据库建表脚本
-- 创建时间: 2026-03-29
-- 产品定位: 打破信息茧房的多源信息聚合平台
-- 参考: MediaCrawler 架构 + RSS聚合最佳实践
-- ============================================

-- ====== 1. 信息源表 ======
-- 参考MediaCrawler的多平台架构，每个平台是一个信息源
CREATE TABLE IF NOT EXISTS news_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,                      -- 源名称（如：知乎热榜、B站热门）
  platform VARCHAR(50) NOT NULL,                   -- 平台标识
  icon VARCHAR(10) DEFAULT '📰',                   -- 图标
  color VARCHAR(20) DEFAULT '#4f8ef7',             -- 品牌色
  source_url TEXT,                                 -- 源URL
  api_endpoint TEXT,                               -- API端点（后端爬取用）
  fetch_method VARCHAR(30) DEFAULT 'api',          -- api/rss/crawler/manual
  fetch_interval INT DEFAULT 3600,                 -- 抓取间隔（秒）
  region VARCHAR(10) DEFAULT 'cn',                 -- cn(国内)/intl(国际)
  category VARCHAR(30) DEFAULT 'general',          -- tech/finance/social/video/news/general
  is_active BOOLEAN DEFAULT TRUE,
  last_fetched_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 预置信息源（国内15+ / 国际5+）
INSERT INTO news_sources (name, platform, icon, color, source_url, region, category) VALUES
  -- 国内
  ('知乎热榜', 'zhihu', '🔵', '#0066ff', 'https://www.zhihu.com/hot', 'cn', 'general'),
  ('微博热搜', 'weibo', '🔴', '#ff6b00', 'https://s.weibo.com/top/summary', 'cn', 'social'),
  ('B站热门', 'bilibili', '🩵', '#00a1d6', 'https://www.bilibili.com/v/popular', 'cn', 'video'),
  ('抖音热点', 'douyin', '🎵', '#000000', 'https://www.douyin.com', 'cn', 'video'),
  ('小红书', 'xiaohongshu', '📕', '#ff2442', 'https://www.xiaohongshu.com', 'cn', 'social'),
  ('36氪', '36kr', '🟦', '#0084ff', 'https://36kr.com', 'cn', 'tech'),
  ('少数派', 'sspai', '🟩', '#d71a18', 'https://sspai.com', 'cn', 'tech'),
  ('虎嗅网', 'huxiu', '🐯', '#ff6600', 'https://www.huxiu.com', 'cn', 'tech'),
  ('IT之家', 'ithome', '💻', '#d62d20', 'https://www.ithome.com', 'cn', 'tech'),
  ('澎湃新闻', 'thepaper', '📰', '#e60012', 'https://www.thepaper.cn', 'cn', 'news'),
  ('界面新闻', 'jiemian', '📄', '#333333', 'https://www.jiemian.com', 'cn', 'news'),
  ('快手热榜', 'kuaishou', '🎬', '#ff5000', 'https://www.kuaishou.com', 'cn', 'video'),
  ('百度贴吧', 'tieba', '📋', '#4e6ef2', 'https://tieba.baidu.com', 'cn', 'social'),
  ('掘金前端', 'juejin', '⛏️', '#1e80ff', 'https://juejin.cn', 'cn', 'tech'),
  ('V2EX', 'v2ex', '💬', '#333333', 'https://www.v2ex.com', 'cn', 'tech'),
  -- 国际
  ('YouTube趋势', 'youtube', '🔴', '#ff0000', 'https://www.youtube.com/feed/trending', 'intl', 'video'),
  ('Hacker News', 'hackernews', '🟧', '#ff6600', 'https://news.ycombinator.com', 'intl', 'tech'),
  ('Reddit热帖', 'reddit', '🟠', '#ff4500', 'https://www.reddit.com/r/popular', 'intl', 'social'),
  ('Product Hunt', 'producthunt', '🐱', '#da552f', 'https://www.producthunt.com', 'intl', 'tech'),
  ('TechCrunch', 'techcrunch', '🟢', '#0a9e01', 'https://techcrunch.com', 'intl', 'tech'),
  ('X(Twitter)趋势', 'twitter', '🐦', '#1da1f2', 'https://twitter.com', 'intl', 'social')
ON CONFLICT DO NOTHING;

-- ====== 2. 资讯文章表（爬取/聚合结果） ======
CREATE TABLE IF NOT EXISTS news_articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id UUID REFERENCES news_sources(id) ON DELETE CASCADE,

  -- 基本信息
  title VARCHAR(500) NOT NULL,                     -- 标题
  summary TEXT,                                    -- 原始摘要
  content TEXT,                                    -- 正文内容（部分源可获取）
  cover_image TEXT,                                -- 封面图
  original_url TEXT NOT NULL,                      -- 原文链接
  author VARCHAR(100),                             -- 原作者

  -- AI增强
  ai_summary TEXT,                                 -- AI一句话摘要
  ai_tags TEXT[] DEFAULT '{}',                     -- AI自动打标
  ai_sentiment VARCHAR(20),                        -- positive/negative/neutral
  ai_perspectives TEXT,                            -- AI多角度解读

  -- 元数据
  hot_score INT DEFAULT 0,                         -- 热度分
  external_metrics JSONB DEFAULT '{}',             -- {"likes":0,"comments":0,"shares":0}
  language VARCHAR(10) DEFAULT 'zh',               -- zh/en/ja
  category VARCHAR(30),                            -- tech/finance/social/entertainment/education

  -- 状态
  status VARCHAR(20) DEFAULT 'active',             -- active/hidden/archived
  published_at TIMESTAMP WITH TIME ZONE,           -- 原文发布时间
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- 抓取时间
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_articles_source ON news_articles(source_id);
CREATE INDEX IF NOT EXISTS idx_articles_published ON news_articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_hot ON news_articles(hot_score DESC);
CREATE INDEX IF NOT EXISTS idx_articles_status ON news_articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_category ON news_articles(category);
CREATE INDEX IF NOT EXISTS idx_articles_language ON news_articles(language);
CREATE INDEX IF NOT EXISTS idx_articles_url ON news_articles(original_url);
-- 全文搜索
CREATE INDEX IF NOT EXISTS idx_articles_search ON news_articles
  USING gin(to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(summary,'') || ' ' || coalesce(ai_summary,'')));

-- ====== 3. 用户订阅表 ======
CREATE TABLE IF NOT EXISTS news_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  source_id UUID REFERENCES news_sources(id) ON DELETE CASCADE,
  is_muted BOOLEAN DEFAULT FALSE,                  -- 是否静音（订阅但不推送）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, source_id)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON news_subscriptions(user_id);

-- ====== 4. 关键词订阅表（防信息茧房核心） ======
CREATE TABLE IF NOT EXISTS news_keyword_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  keyword VARCHAR(100) NOT NULL,                   -- 订阅关键词
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, keyword)
);

CREATE INDEX IF NOT EXISTS idx_keyword_subs_user ON news_keyword_subscriptions(user_id);

-- ====== 5. 阅读历史表 ======
CREATE TABLE IF NOT EXISTS news_reading_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  article_id UUID REFERENCES news_articles(id) ON DELETE CASCADE,
  is_bookmarked BOOLEAN DEFAULT FALSE,             -- 是否收藏
  is_liked BOOLEAN DEFAULT FALSE,                  -- 是否点赞
  read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, article_id)
);

CREATE INDEX IF NOT EXISTS idx_reading_user ON news_reading_history(user_id);
CREATE INDEX IF NOT EXISTS idx_reading_bookmarked ON news_reading_history(user_id, is_bookmarked) WHERE is_bookmarked = TRUE;

-- ====== 6. 每日简报表 ======
CREATE TABLE IF NOT EXISTS news_daily_briefings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  briefing_date DATE NOT NULL,                     -- 简报日期
  title VARCHAR(200) DEFAULT '今日简报',
  content TEXT NOT NULL,                           -- AI生成的简报内容
  article_ids UUID[] DEFAULT '{}',                 -- 引用的文章ID
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, briefing_date)
);

CREATE INDEX IF NOT EXISTS idx_briefings_user ON news_daily_briefings(user_id);

-- ====== RLS 策略 ======

ALTER TABLE news_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_keyword_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_reading_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_daily_briefings ENABLE ROW LEVEL SECURITY;

-- 信息源：所有人可读，登录用户可更新抓取时间
DROP POLICY IF EXISTS "sources_read" ON news_sources;
CREATE POLICY "sources_read" ON news_sources FOR SELECT USING (true);
DROP POLICY IF EXISTS "sources_update" ON news_sources;
CREATE POLICY "sources_update" ON news_sources FOR UPDATE USING (auth.uid() IS NOT NULL);

-- 文章：所有人可读，登录用户可插入（前端爬取引擎写入）
DROP POLICY IF EXISTS "articles_read" ON news_articles;
CREATE POLICY "articles_read" ON news_articles FOR SELECT USING (status = 'active');
DROP POLICY IF EXISTS "articles_insert" ON news_articles;
CREATE POLICY "articles_insert" ON news_articles FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 订阅/阅读/简报：仅本人
DROP POLICY IF EXISTS "subscriptions_all" ON news_subscriptions;
CREATE POLICY "subscriptions_all" ON news_subscriptions FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "keyword_subs_all" ON news_keyword_subscriptions;
CREATE POLICY "keyword_subs_all" ON news_keyword_subscriptions FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "reading_all" ON news_reading_history;
CREATE POLICY "reading_all" ON news_reading_history FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "briefings_all" ON news_daily_briefings;
CREATE POLICY "briefings_all" ON news_daily_briefings FOR ALL USING (auth.uid() = user_id);
