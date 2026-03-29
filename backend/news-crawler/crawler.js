/**
 * 星火资讯 — 多平台爬虫服务
 *
 * 架构参考：MediaCrawler 多平台采集思路
 * 实现方式：Node.js + 公开API/RSS + Supabase写入
 *
 * 支持平台：
 *   国内：知乎热榜、微博热搜、B站热门、36氪、少数派、虎嗅、IT之家、掘金、V2EX
 *   国际：Hacker News、Reddit、Product Hunt、TechCrunch
 *
 * 启动方式：
 *   npm run crawl        → 持续运行（每小时抓取一次）
 *   npm run crawl:once   → 抓取一次后退出
 */

import { createClient } from '@supabase/supabase-js'

// ====== 配置 ======

// 从环境变量读取 Supabase 配置（必须设置！）
const SUPABASE_URL = process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '' // 使用 service_role key，绕过RLS

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ 请设置环境变量：')
    console.error('   SUPABASE_URL=https://your-project.supabase.co')
    console.error('   SUPABASE_SERVICE_KEY=eyJhbGciOi...')
    process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// 抓取间隔（毫秒）
const CRAWL_INTERVAL = 60 * 60 * 1000 // 1小时

// ====== 工具函数 ======

/** 安全的HTTP请求 */
async function safeFetch(url, options = {}) {
    try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 15000) // 15秒超时

        const res = await fetch(url, {
            ...options,
            signal: controller.signal,
            headers: {
                'User-Agent': 'SparkAlliance-NewsCrawler/1.0',
                ...options.headers,
            },
        })
        clearTimeout(timeout)

        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return await res.json()
    } catch (err) {
        console.warn(`   ⚠️ 请求失败: ${url} → ${err.message}`)
        return null
    }
}

/** 获取信息源ID映射 */
async function getSourceMap() {
    const { data } = await supabase.from('news_sources').select('id, platform')
    const map = {}
        ; (data || []).forEach(s => { map[s.platform] = s.id })
    return map
}

/** 批量写入文章（自动去重） */
async function upsertArticles(articles) {
    if (!articles.length) return 0

    let inserted = 0
    for (const art of articles) {
        // 通过 original_url 去重
        const { data: existing } = await supabase.from('news_articles')
            .select('id').eq('original_url', art.original_url).maybeSingle()

        if (!existing) {
            const { error } = await supabase.from('news_articles').insert(art)
            if (!error) inserted++
        }
    }
    return inserted
}

/** 更新信息源最后抓取时间 */
async function updateLastFetched(sourceId) {
    await supabase.from('news_sources')
        .update({ last_fetched_at: new Date().toISOString() })
        .eq('id', sourceId)
}

// ====================================================================
//     各平台抓取器（参考 MediaCrawler 的多平台分离架构）
// ====================================================================

/**
 * Hacker News — 公开API，无需认证
 * https://github.com/HackerNews/API
 */
async function crawlHackerNews(sourceId) {
    console.log('   📥 抓取 Hacker News...')
    const topIds = await safeFetch('https://hacker-news.firebaseio.com/v0/topstories.json')
    if (!topIds) return []

    const articles = []
    // 取前30条
    for (const id of topIds.slice(0, 30)) {
        const item = await safeFetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`)
        if (!item || !item.title || item.type !== 'story') continue

        articles.push({
            source_id: sourceId,
            title: item.title,
            summary: item.text ? item.text.slice(0, 300) : null,
            original_url: item.url || `https://news.ycombinator.com/item?id=${item.id}`,
            author: item.by || null,
            hot_score: item.score || 0,
            external_metrics: { comments: item.descendants || 0 },
            language: 'en',
            category: 'tech',
            published_at: new Date(item.time * 1000).toISOString(),
        })
    }
    return articles
}

/**
 * Reddit 热帖 — 公开JSON接口
 */
async function crawlReddit(sourceId) {
    console.log('   📥 抓取 Reddit 热帖...')
    const data = await safeFetch('https://www.reddit.com/r/popular.json?limit=30', {
        headers: { 'User-Agent': 'SparkAlliance:v1.0 (by /u/sparkbot)' }
    })
    if (!data?.data?.children) return []

    return data.data.children
        .filter(c => c.data && c.data.title)
        .map(c => {
            const d = c.data
            return {
                source_id: sourceId,
                title: d.title,
                summary: d.selftext ? d.selftext.slice(0, 300) : null,
                cover_image: d.thumbnail?.startsWith('http') ? d.thumbnail : null,
                original_url: `https://www.reddit.com${d.permalink}`,
                author: d.author || null,
                hot_score: d.score || 0,
                external_metrics: { comments: d.num_comments || 0, likes: d.ups || 0 },
                language: 'en',
                category: 'social',
                published_at: new Date(d.created_utc * 1000).toISOString(),
            }
        })
}

/**
 * Product Hunt — 公开首页
 */
async function crawlProductHunt(sourceId) {
    console.log('   📥 抓取 Product Hunt...')
    // PH的公开API较复杂需OAuth，用前端today feed的JSON
    const data = await safeFetch('https://www.producthunt.com/frontend/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            query: `{ homefeed(first:20) { edges { node { ... on Post { id name tagline url votesCount commentsCount createdAt thumbnail { url } } } } } }`
        })
    })

    // PH可能需要认证，如果失败则跳过
    if (!data?.data?.homefeed?.edges) {
        console.warn('   ⚠️ Product Hunt 需要认证，跳过')
        return []
    }

    return data.data.homefeed.edges.map(e => {
        const n = e.node
        return {
            source_id: sourceId,
            title: n.name,
            summary: n.tagline,
            cover_image: n.thumbnail?.url || null,
            original_url: n.url || `https://www.producthunt.com`,
            hot_score: n.votesCount || 0,
            external_metrics: { comments: n.commentsCount || 0, likes: n.votesCount || 0 },
            language: 'en',
            category: 'tech',
            published_at: n.createdAt,
        }
    })
}

/**
 * V2EX 热门 — 公开API
 */
async function crawlV2EX(sourceId) {
    console.log('   📥 抓取 V2EX 热门...')
    const data = await safeFetch('https://www.v2ex.com/api/topics/hot.json')
    if (!data) return []

    return data.map(t => ({
        source_id: sourceId,
        title: t.title,
        summary: t.content ? t.content.slice(0, 300) : null,
        original_url: t.url || `https://www.v2ex.com/t/${t.id}`,
        author: t.member?.username || null,
        hot_score: t.replies || 0,
        external_metrics: { comments: t.replies || 0 },
        language: 'zh',
        category: 'tech',
        published_at: new Date(t.created * 1000).toISOString(),
    }))
}

/**
 * 掘金前端 — 公开API
 */
async function crawlJuejin(sourceId) {
    console.log('   📥 抓取 掘金前端...')
    const data = await safeFetch('https://api.juejin.cn/recommend_api/v1/article/recommend_all_feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            id_type: 2,
            sort_type: 200, // 热门
            cursor: '0',
            limit: 20,
        })
    })

    if (!data?.data) return []

    return data.data
        .filter(d => d.article_info)
        .map(d => {
            const a = d.article_info
            const u = d.author_user_info
            return {
                source_id: sourceId,
                title: a.title,
                summary: a.brief_content || null,
                cover_image: a.cover_image || null,
                original_url: `https://juejin.cn/post/${a.article_id}`,
                author: u?.user_name || null,
                hot_score: a.digg_count || 0,
                external_metrics: {
                    likes: a.digg_count || 0,
                    comments: a.comment_count || 0,
                    shares: a.collect_count || 0,
                },
                language: 'zh',
                category: 'tech',
                published_at: new Date(Number(a.ctime) * 1000).toISOString(),
            }
        })
}

/**
 * 36氪 — 公开API
 */
async function crawl36Kr(sourceId) {
    console.log('   📥 抓取 36氪...')
    const data = await safeFetch('https://gateway.36kr.com/api/mis/nav/home/nav/rank/hot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partner_id: 'wap', param: { siteId: 1, platformId: 2 } })
    })

    if (!data?.data?.hotRankList) return []

    return data.data.hotRankList.slice(0, 20).map(item => ({
        source_id: sourceId,
        title: item.templateMaterial?.widgetTitle || item.templateMaterial?.title || '无标题',
        summary: item.templateMaterial?.summary || null,
        cover_image: item.templateMaterial?.widgetImage || null,
        original_url: `https://36kr.com/p/${item.itemId}`,
        author: item.templateMaterial?.authorName || null,
        hot_score: item.templateMaterial?.statRead || 0,
        language: 'zh',
        category: 'tech',
        published_at: item.publishTime ? new Date(item.publishTime).toISOString() : new Date().toISOString(),
    }))
}

/**
 * IT之家 — RSS解析
 */
async function crawlITHome(sourceId) {
    console.log('   📥 抓取 IT之家...')
    // IT之家有RSS源
    try {
        const res = await fetch('https://www.ithome.com/rss/', {
            headers: { 'User-Agent': 'SparkAlliance-NewsCrawler/1.0' },
            signal: AbortSignal.timeout(15000),
        })
        const text = await res.text()
        // 简单解析XML中的<item>
        const items = []
        const itemRegex = /<item>([\s\S]*?)<\/item>/g
        let match
        while ((match = itemRegex.exec(text)) !== null && items.length < 20) {
            const xml = match[1]
            const title = xml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1]
                || xml.match(/<title>(.*?)<\/title>/)?.[1]
            const link = xml.match(/<link>(.*?)<\/link>/)?.[1]
            const desc = xml.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1]
                || xml.match(/<description>(.*?)<\/description>/)?.[1]
            const pubDate = xml.match(/<pubDate>(.*?)<\/pubDate>/)?.[1]

            if (title && link) {
                items.push({
                    source_id: sourceId,
                    title: title.trim(),
                    summary: desc ? desc.replace(/<[^>]+>/g, '').slice(0, 300) : null,
                    original_url: link.trim(),
                    language: 'zh',
                    category: 'tech',
                    published_at: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
                })
            }
        }
        return items
    } catch (err) {
        console.warn(`   ⚠️ IT之家 RSS 抓取失败: ${err.message}`)
        return []
    }
}

// ====== 爬虫注册表（MediaCrawler风格的平台→抓取器映射） ======

const CRAWLER_REGISTRY = {
    hackernews: crawlHackerNews,
    reddit: crawlReddit,
    producthunt: crawlProductHunt,
    v2ex: crawlV2EX,
    juejin: crawlJuejin,
    '36kr': crawl36Kr,
    ithome: crawlITHome,
}

// ====== 主流程 ======

async function runCrawlCycle() {
    console.log('\n🔄 ========== 开始抓取周期 ==========')
    console.log(`⏰ 时间：${new Date().toLocaleString('zh-CN')}`)

    const sourceMap = await getSourceMap()
    let totalInserted = 0
    let totalPlatforms = 0

    for (const [platform, crawlFn] of Object.entries(CRAWLER_REGISTRY)) {
        const sourceId = sourceMap[platform]
        if (!sourceId) {
            console.warn(`   ⚠️ 跳过 ${platform}：数据库中无对应信息源`)
            continue
        }

        try {
            const articles = await crawlFn(sourceId)
            const inserted = await upsertArticles(articles)
            await updateLastFetched(sourceId)

            console.log(`   ✅ ${platform}: 获取 ${articles.length} 条，新增 ${inserted} 条`)
            totalInserted += inserted
            totalPlatforms++
        } catch (err) {
            console.error(`   ❌ ${platform} 抓取异常: ${err.message}`)
        }
    }

    console.log(`\n📊 本轮统计：${totalPlatforms} 个平台，新增 ${totalInserted} 条资讯`)
    console.log('✅ ========== 抓取周期完成 ==========\n')
}

// ====== 入口 ======

async function main() {
    console.log('🚀 星火资讯爬虫服务启动')
    console.log(`📡 Supabase: ${SUPABASE_URL}`)
    console.log(`📋 已注册平台: ${Object.keys(CRAWLER_REGISTRY).join(', ')}`)

    // 立即执行一次
    await runCrawlCycle()

    // 是否只运行一次
    if (process.argv.includes('--once')) {
        console.log('🏁 单次模式，退出')
        process.exit(0)
    }

    // 持续运行
    console.log(`⏰ 持续运行模式，每 ${CRAWL_INTERVAL / 60000} 分钟抓取一次`)
    console.log('   按 Ctrl+C 停止\n')

    setInterval(runCrawlCycle, CRAWL_INTERVAL)
}

main().catch(err => {
    console.error('💥 致命错误:', err)
    process.exit(1)
})
