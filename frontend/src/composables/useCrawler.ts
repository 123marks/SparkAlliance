/**
 * useCrawler.ts — 星火资讯前端爬取引擎
 *
 * 核心设计：
 * 1. 用户点击「获取最新」按钮 → 触发抓取
 * 2. 增量抓取 — 检查 news_sources.last_fetched_at，跳过最近1小时内已抓取的源
 * 3. 并行抓取 — Promise.allSettled 同时抓取多个API，不相互阻塞
 * 4. 智能去重 — 用 original_url 去重，避免重复写入
 * 5. CORS友好 — 仅抓取允许跨域的公开API
 *
 * 参考架构：MediaCrawler 的平台→抓取器分离注册模式
 */
import { ref } from 'vue'
import { supabase } from '../supabase'

// ====== 状态 ======
const crawling = ref(false)
const crawlProgress = ref('')
const crawlResults = ref<{ platform: string; fetched: number; inserted: number }[]>([])

// ====== 通用工具 ======

/** 带超时的安全请求（15秒超时） */
async function safeFetch(url: string, options: RequestInit = {}): Promise<unknown> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)
    try {
        const res = await fetch(url, { ...options, signal: controller.signal })
        clearTimeout(timeout)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return await res.json()
    } catch {
        return null
    }
}

/** 获取信息源映射 { platform → { id, last_fetched_at } } */
async function getSourceMap(): Promise<Record<string, { id: string; last_fetched_at: string | null }>> {
    const { data } = await supabase.from('news_sources').select('id, platform, last_fetched_at')
    const map: Record<string, { id: string; last_fetched_at: string | null }> = {}
        ; (data || []).forEach((s: { id: string; platform: string; last_fetched_at: string | null }) => {
            map[s.platform] = { id: s.id, last_fetched_at: s.last_fetched_at }
        })
    return map
}

/** 检查是否需要抓取（增量策略：1小时内已抓取则跳过） */
function shouldFetch(lastFetched: string | null): boolean {
    if (!lastFetched) return true
    const diff = Date.now() - new Date(lastFetched).getTime()
    return diff > 60 * 60 * 1000 // 超过1小时才重新抓取
}

/** 标准化文章数据 */
interface RawArticle {
    source_id: string
    title: string
    summary?: string | null
    content?: string | null
    cover_image?: string | null
    original_url: string
    author?: string | null
    hot_score?: number
    external_metrics?: Record<string, number>
    language?: string
    category?: string
    published_at?: string
}

/** 批量写入并去重（按 original_url 看是否已存在） */
async function upsertArticles(articles: RawArticle[]): Promise<number> {
    if (!articles.length) return 0

    // 先拿到所有url判断是否已存在（一次查询，性能优化）
    const urls = articles.map(a => a.original_url)
    const { data: existing } = await supabase.from('news_articles')
        .select('original_url').in('original_url', urls)

    const existingUrls = new Set((existing || []).map((e: { original_url: string }) => e.original_url))

    // 只插入不存在的
    const newArticles = articles.filter(a => !existingUrls.has(a.original_url))
    if (!newArticles.length) return 0

    const { error } = await supabase.from('news_articles').insert(newArticles)
    return error ? 0 : newArticles.length
}

/** 更新信息源的最后抓取时间 */
async function updateLastFetched(sourceId: string): Promise<void> {
    await supabase.from('news_sources')
        .update({ last_fetched_at: new Date().toISOString() })
        .eq('id', sourceId)
}

// ====================================================================
//   各平台抓取器（MediaCrawler风格的平台分离架构）
//   只保留CORS友好的公开API
// ====================================================================

/** Hacker News — Firebase公开API，CORS友好 ✅ */
async function crawlHackerNews(sourceId: string): Promise<RawArticle[]> {
    const topIds = await safeFetch('https://hacker-news.firebaseio.com/v0/topstories.json') as number[] | null
    if (!topIds) return []

    // 并行获取前20条详情（性能优化：Promise.allSettled）
    const detailPromises = topIds.slice(0, 20).map(id =>
        safeFetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`)
    )
    const results = await Promise.allSettled(detailPromises)

    const articles: RawArticle[] = []
    for (const result of results) {
        if (result.status !== 'fulfilled' || !result.value) continue
        const item = result.value as { title?: string; type?: string; url?: string; id: number; by?: string; score?: number; descendants?: number; time?: number; text?: string }
        if (!item.title || item.type !== 'story') continue

        articles.push({
            source_id: sourceId,
            title: item.title,
            summary: item.text ? String(item.text).slice(0, 300) : null,
            original_url: item.url || `https://news.ycombinator.com/item?id=${item.id}`,
            author: item.by || null,
            hot_score: item.score || 0,
            external_metrics: { comments: item.descendants || 0 },
            language: 'en',
            category: 'tech',
            published_at: new Date((item.time || 0) * 1000).toISOString(),
        })
    }
    return articles
}

/** V2EX 热门 — 公开API，CORS友好 ✅ */
async function crawlV2EX(sourceId: string): Promise<RawArticle[]> {
    const data = await safeFetch('https://www.v2ex.com/api/topics/hot.json') as Array<{
        title: string; content?: string; url?: string; id: number;
        member?: { username: string }; replies: number; created: number
    }> | null
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

/** 掘金 — 推荐Feed API ✅ */
async function crawlJuejin(sourceId: string): Promise<RawArticle[]> {
    const data = await safeFetch('https://api.juejin.cn/recommend_api/v1/article/recommend_all_feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_type: 2, sort_type: 200, cursor: '0', limit: 20 }),
    }) as { data?: Array<{ article_info: Record<string, string | number>; author_user_info?: { user_name?: string } }> } | null

    if (!data?.data) return []

    return data.data
        .filter(d => d.article_info?.title)
        .map(d => {
            const a = d.article_info
            return {
                source_id: sourceId,
                title: String(a.title),
                summary: a.brief_content ? String(a.brief_content) : null,
                cover_image: a.cover_image ? String(a.cover_image) : null,
                original_url: `https://juejin.cn/post/${a.article_id}`,
                author: d.author_user_info?.user_name || null,
                hot_score: Number(a.digg_count) || 0,
                external_metrics: {
                    likes: Number(a.digg_count) || 0,
                    comments: Number(a.comment_count) || 0,
                    shares: Number(a.collect_count) || 0,
                },
                language: 'zh',
                category: 'tech',
                published_at: new Date(Number(a.ctime) * 1000).toISOString(),
            }
        })
}

// ====== 爬虫注册表（MediaCrawler风格：平台→抓取器映射） ======
// 只注册CORS友好的API，后续可按需扩展

type CrawlerFn = (sourceId: string) => Promise<RawArticle[]>

const CRAWLER_REGISTRY: Record<string, CrawlerFn> = {
    hackernews: crawlHackerNews,
    v2ex: crawlV2EX,
    juejin: crawlJuejin,
}

// ====== 主流程 ======

export function useCrawler() {
    /**
     * 执行一次爬取周期
     * 核心优化：
     *   1. 增量抓取 — 跳过1小时内已抓取的源
     *   2. 并行执行 — Promise.allSettled同时抓取多个平台
     *   3. 批量去重 — 一次查询判断去重，避免N+1
     */
    async function runCrawl(force = false): Promise<void> {
        if (crawling.value) return
        crawling.value = true
        crawlResults.value = []
        crawlProgress.value = '🔍 检查信息源状态...'

        try {
            const sourceMap = await getSourceMap()

            // 筛选需要抓取的平台
            const tasks: { platform: string; sourceId: string; fn: CrawlerFn }[] = []
            for (const [platform, fn] of Object.entries(CRAWLER_REGISTRY)) {
                const source = sourceMap[platform]
                if (!source) continue
                if (!force && !shouldFetch(source.last_fetched_at)) {
                    crawlResults.value.push({ platform, fetched: 0, inserted: 0 })
                    continue // 增量跳过
                }
                tasks.push({ platform, sourceId: source.id, fn })
            }

            if (tasks.length === 0) {
                crawlProgress.value = '✅ 所有源都是最新的，无需抓取'
                return
            }

            crawlProgress.value = `📡 正在并行抓取 ${tasks.length} 个平台...`

            // 并行抓取所有平台（核心性能优化）
            const crawlPromises = tasks.map(async (task) => {
                try {
                    const articles = await task.fn(task.sourceId)
                    const inserted = await upsertArticles(articles)
                    await updateLastFetched(task.sourceId)
                    return { platform: task.platform, fetched: articles.length, inserted }
                } catch {
                    return { platform: task.platform, fetched: 0, inserted: 0 }
                }
            })

            const results = await Promise.allSettled(crawlPromises)
            let totalInserted = 0

            for (const r of results) {
                if (r.status === 'fulfilled') {
                    crawlResults.value.push(r.value)
                    totalInserted += r.value.inserted
                }
            }

            crawlProgress.value = `✅ 完成！新增 ${totalInserted} 条资讯`
        } catch {
            crawlProgress.value = '❌ 抓取出错，请稍后重试'
        } finally {
            crawling.value = false
        }
    }

    /** 支持的平台列表 */
    const supportedPlatforms = Object.keys(CRAWLER_REGISTRY)

    return {
        crawling,
        crawlProgress,
        crawlResults,
        runCrawl,
        supportedPlatforms,
    }
}
