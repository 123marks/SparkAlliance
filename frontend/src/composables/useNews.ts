/**
 * useNews.ts — 星火资讯数据层
 *
 * 职责：信息源管理、文章聚合搜索、订阅管理、阅读历史、AI摘要、每日简报
 * 架构灵感：MediaCrawler多平台爬虫 + RSS聚合 + AI增强
 */
import { ref, computed } from 'vue'
import { supabase } from '../supabase'

// ====== 类型定义 ======

/** 信息源地域 */
export type SourceRegion = 'cn' | 'intl'

/** 信息源分类 */
export type SourceCategory = 'tech' | 'finance' | 'social' | 'video' | 'news' | 'general'

/** 信息源 */
export interface NewsSource {
    id: string
    name: string
    platform: string
    icon: string
    color: string
    source_url: string | null
    region: SourceRegion
    category: SourceCategory
    is_active: boolean
    last_fetched_at: string | null
    // 用户订阅状态
    is_subscribed?: boolean
}

/** 资讯文章 */
export interface NewsArticle {
    id: string
    source_id: string
    title: string
    summary: string | null
    content: string | null
    cover_image: string | null
    original_url: string
    author: string | null
    ai_summary: string | null
    ai_tags: string[]
    ai_sentiment: string | null
    ai_perspectives: string | null
    hot_score: number
    external_metrics: { likes?: number; comments?: number; shares?: number }
    language: string
    category: string | null
    published_at: string | null
    fetched_at: string
    // 联表
    source_name?: string
    source_icon?: string
    source_color?: string
    source_platform?: string
    // 用户状态
    is_bookmarked?: boolean
    is_liked?: boolean
    is_read?: boolean
}

/** 每日简报 */
export interface DailyBriefing {
    id: string
    user_id: string
    briefing_date: string
    title: string
    content: string
    article_ids: string[]
    created_at: string
}

// ====== 常量 ======

export const SOURCE_CATEGORIES: Record<SourceCategory, { label: string; icon: string }> = {
    tech: { label: '科技', icon: '💻' },
    finance: { label: '财经', icon: '💰' },
    social: { label: '社交', icon: '💬' },
    video: { label: '视频', icon: '🎬' },
    news: { label: '新闻', icon: '📰' },
    general: { label: '综合', icon: '🌐' },
}

export const REGION_MAP: Record<SourceRegion, { label: string; icon: string }> = {
    cn: { label: '国内', icon: '🇨🇳' },
    intl: { label: '国际', icon: '🌍' },
}

// ====== 模块级单例状态 ======

const sources = ref<NewsSource[]>([])
const articles = ref<NewsArticle[]>([])
const bookmarkedArticles = ref<NewsArticle[]>([])
const subscribedSources = ref<NewsSource[]>([])
const keywordSubscriptions = ref<string[]>([])
const todayBriefing = ref<DailyBriefing | null>(null)
const loading = ref(false)
const hasMore = ref(true)
const totalCount = ref(0)

// ====== Composable ======

export function useNews() {
    const getUser = async () => {
        const { data } = await supabase.auth.getUser()
        return data.user
    }

    // ========================
    //     1. 信息源管理
    // ========================

    /** 加载所有信息源 */
    async function fetchSources(): Promise<NewsSource[]> {
        const { data } = await supabase.from('news_sources')
            .select('*').eq('is_active', true).order('name')
        sources.value = (data || []) as NewsSource[]

        // 填充订阅状态
        const user = await getUser()
        if (user) {
            const { data: subs } = await supabase.from('news_subscriptions')
                .select('source_id').eq('user_id', user.id)
            const subSet = new Set((subs || []).map(s => s.source_id))
            sources.value.forEach(s => { s.is_subscribed = subSet.has(s.id) })
        }

        return sources.value
    }

    /** 切换订阅 */
    async function toggleSubscription(sourceId: string): Promise<boolean> {
        const user = await getUser()
        if (!user) return false

        const { data: existing } = await supabase.from('news_subscriptions')
            .select('id').eq('user_id', user.id).eq('source_id', sourceId).maybeSingle()

        if (existing) {
            await supabase.from('news_subscriptions').delete().eq('id', existing.id)
            const s = sources.value.find(s => s.id === sourceId)
            if (s) s.is_subscribed = false
            return false
        } else {
            await supabase.from('news_subscriptions').insert({ user_id: user.id, source_id: sourceId })
            const s = sources.value.find(s => s.id === sourceId)
            if (s) s.is_subscribed = true
            return true
        }
    }

    /** 获取已订阅源 */
    async function fetchSubscribedSources(): Promise<NewsSource[]> {
        subscribedSources.value = sources.value.filter(s => s.is_subscribed)
        return subscribedSources.value
    }

    // ========================
    //     2. 文章聚合搜索
    // ========================

    /** 搜索/浏览文章 */
    async function searchArticles(params?: {
        keyword?: string
        sourceId?: string
        category?: SourceCategory
        region?: SourceRegion
        sortBy?: 'latest' | 'hot'
        language?: string
        page?: number
        pageSize?: number
    }): Promise<NewsArticle[]> {
        loading.value = true
        try {
            const page = params?.page || 1
            const pageSize = params?.pageSize || 20
            const from = (page - 1) * pageSize
            const to = from + pageSize - 1

            let query = supabase.from('news_articles')
                .select('*', { count: 'exact' })
                .eq('status', 'active')

            if (params?.keyword?.trim()) {
                query = query.or(`title.ilike.%${params.keyword}%,summary.ilike.%${params.keyword}%,ai_summary.ilike.%${params.keyword}%`)
            }
            if (params?.sourceId) query = query.eq('source_id', params.sourceId)
            if (params?.language) query = query.eq('language', params.language)
            if (params?.category) {
                // 按分类关联源
                const catSourceIds = sources.value
                    .filter(s => s.category === params.category)
                    .map(s => s.id)
                if (catSourceIds.length) query = query.in('source_id', catSourceIds)
            }
            if (params?.region) {
                const regionSourceIds = sources.value
                    .filter(s => s.region === params.region)
                    .map(s => s.id)
                if (regionSourceIds.length) query = query.in('source_id', regionSourceIds)
            }

            if (params?.sortBy === 'hot') {
                query = query.order('hot_score', { ascending: false })
            } else {
                query = query.order('published_at', { ascending: false })
            }

            query = query.range(from, to)

            const { data, count } = await query
            const items = (data || []) as NewsArticle[]
            totalCount.value = count || 0
            hasMore.value = items.length >= pageSize

            // 联表信息源
            enrichSourceInfo(items)
            // 用户阅读状态
            await enrichReadStatus(items)

            if (page === 1) {
                articles.value = items
            } else {
                articles.value = [...articles.value, ...items]
            }

            return items
        } finally {
            loading.value = false
        }
    }

    /** 获取订阅源的文章 */
    async function fetchSubscribedArticles(): Promise<NewsArticle[]> {
        const subSourceIds = sources.value.filter(s => s.is_subscribed).map(s => s.id)
        if (!subSourceIds.length) return []

        const { data } = await supabase.from('news_articles')
            .select('*').eq('status', 'active')
            .in('source_id', subSourceIds)
            .order('published_at', { ascending: false })
            .limit(50)

        const items = (data || []) as NewsArticle[]
        enrichSourceInfo(items)
        await enrichReadStatus(items)
        return items
    }

    // ========================
    //     3. 阅读与收藏
    // ========================

    /** 标记已读 */
    async function markAsRead(articleId: string): Promise<void> {
        const user = await getUser()
        if (!user) return

        const { data: existing } = await supabase.from('news_reading_history')
            .select('id').eq('user_id', user.id).eq('article_id', articleId).maybeSingle()

        if (!existing) {
            await supabase.from('news_reading_history').insert({
                user_id: user.id, article_id: articleId
            })
        }

        const a = articles.value.find(a => a.id === articleId)
        if (a) a.is_read = true
    }

    /** 收藏/取消 */
    async function toggleBookmark(articleId: string): Promise<boolean> {
        const user = await getUser()
        if (!user) return false

        const { data: existing } = await supabase.from('news_reading_history')
            .select('id, is_bookmarked').eq('user_id', user.id).eq('article_id', articleId).maybeSingle()

        if (existing) {
            const newVal = !existing.is_bookmarked
            await supabase.from('news_reading_history')
                .update({ is_bookmarked: newVal }).eq('id', existing.id)
            const a = articles.value.find(a => a.id === articleId)
            if (a) a.is_bookmarked = newVal
            return newVal
        } else {
            await supabase.from('news_reading_history').insert({
                user_id: user.id, article_id: articleId, is_bookmarked: true
            })
            const a = articles.value.find(a => a.id === articleId)
            if (a) a.is_bookmarked = true
            return true
        }
    }

    /** 点赞/取消 */
    async function toggleLike(articleId: string): Promise<boolean> {
        const user = await getUser()
        if (!user) return false

        const { data: existing } = await supabase.from('news_reading_history')
            .select('id, is_liked').eq('user_id', user.id).eq('article_id', articleId).maybeSingle()

        if (existing) {
            const newVal = !existing.is_liked
            await supabase.from('news_reading_history')
                .update({ is_liked: newVal }).eq('id', existing.id)
            const a = articles.value.find(a => a.id === articleId)
            if (a) a.is_liked = newVal
            return newVal
        } else {
            await supabase.from('news_reading_history').insert({
                user_id: user.id, article_id: articleId, is_liked: true
            })
            const a = articles.value.find(a => a.id === articleId)
            if (a) a.is_liked = true
            return true
        }
    }

    /** 获取收藏列表 */
    async function fetchBookmarks(): Promise<NewsArticle[]> {
        const user = await getUser()
        if (!user) return []

        const { data: history } = await supabase.from('news_reading_history')
            .select('article_id').eq('user_id', user.id).eq('is_bookmarked', true)
            .order('read_at', { ascending: false })

        if (!history?.length) { bookmarkedArticles.value = []; return [] }

        const ids = history.map(h => h.article_id)
        const { data } = await supabase.from('news_articles')
            .select('*').in('id', ids)

        const items = (data || []) as NewsArticle[]
        items.forEach(a => { a.is_bookmarked = true })
        enrichSourceInfo(items)
        bookmarkedArticles.value = items
        return items
    }

    // ========================
    //     4. 关键词订阅
    // ========================

    /** 获取我的关键词订阅 */
    async function fetchKeywordSubscriptions(): Promise<string[]> {
        const user = await getUser()
        if (!user) return []

        const { data } = await supabase.from('news_keyword_subscriptions')
            .select('keyword').eq('user_id', user.id).eq('is_active', true)

        keywordSubscriptions.value = (data || []).map(d => d.keyword)
        return keywordSubscriptions.value
    }

    /** 添加关键词 */
    async function addKeyword(keyword: string): Promise<boolean> {
        const user = await getUser()
        if (!user) return false

        const { error } = await supabase.from('news_keyword_subscriptions')
            .insert({ user_id: user.id, keyword })

        if (!error) keywordSubscriptions.value.push(keyword)
        return !error
    }

    /** 删除关键词 */
    async function removeKeyword(keyword: string): Promise<boolean> {
        const user = await getUser()
        if (!user) return false

        const { error } = await supabase.from('news_keyword_subscriptions')
            .delete().eq('user_id', user.id).eq('keyword', keyword)

        if (!error) {
            keywordSubscriptions.value = keywordSubscriptions.value.filter(k => k !== keyword)
        }
        return !error
    }

    // ========================
    //     5. 每日简报
    // ========================

    /** 获取今日简报 */
    async function fetchTodayBriefing(): Promise<DailyBriefing | null> {
        const user = await getUser()
        if (!user) return null

        const today = new Date().toISOString().slice(0, 10)
        const { data } = await supabase.from('news_daily_briefings')
            .select('*').eq('user_id', user.id).eq('briefing_date', today).maybeSingle()

        todayBriefing.value = (data as DailyBriefing) || null
        return todayBriefing.value
    }

    // ========================
    //     辅助函数
    // ========================

    /** 填充信息源信息 */
    function enrichSourceInfo(items: NewsArticle[]): void {
        const sourceMap = new Map(sources.value.map(s => [s.id, s]))
        items.forEach(a => {
            const s = sourceMap.get(a.source_id)
            if (s) {
                a.source_name = s.name
                a.source_icon = s.icon
                a.source_color = s.color
                a.source_platform = s.platform
            }
        })
    }

    /** 填充阅读状态 */
    async function enrichReadStatus(items: NewsArticle[]): Promise<void> {
        const user = await getUser()
        if (!user || !items.length) return

        const ids = items.map(a => a.id)
        const { data } = await supabase.from('news_reading_history')
            .select('article_id, is_bookmarked, is_liked')
            .eq('user_id', user.id).in('article_id', ids)

        if (data) {
            const hm = new Map(data.map(d => [d.article_id, d]))
            items.forEach(a => {
                const h = hm.get(a.id)
                if (h) {
                    a.is_read = true
                    a.is_bookmarked = h.is_bookmarked
                    a.is_liked = h.is_liked
                }
            })
        }
    }

    /** 格式化时间 */
    function formatTimeAgo(dateStr: string | null): string {
        if (!dateStr) return ''
        const diff = Date.now() - new Date(dateStr).getTime()
        const m = Math.floor(diff / 60000)
        if (m < 1) return '刚刚'
        if (m < 60) return `${m}分钟前`
        const h = Math.floor(m / 60)
        if (h < 24) return `${h}小时前`
        const d = Math.floor(h / 24)
        if (d < 7) return `${d}天前`
        return `${Math.floor(d / 7)}周前`
    }

    /** 国内源 */
    const cnSources = computed(() => sources.value.filter(s => s.region === 'cn'))
    /** 国际源 */
    const intlSources = computed(() => sources.value.filter(s => s.region === 'intl'))
    /** 已订阅数 */
    const subscribedCount = computed(() => sources.value.filter(s => s.is_subscribed).length)

    return {
        // 状态
        sources,
        articles,
        bookmarkedArticles,
        subscribedSources,
        keywordSubscriptions,
        todayBriefing,
        loading,
        hasMore,
        totalCount,
        cnSources,
        intlSources,
        subscribedCount,

        // 信息源
        fetchSources,
        toggleSubscription,
        fetchSubscribedSources,

        // 文章
        searchArticles,
        fetchSubscribedArticles,

        // 阅读
        markAsRead,
        toggleBookmark,
        toggleLike,
        fetchBookmarks,

        // 关键词
        fetchKeywordSubscriptions,
        addKeyword,
        removeKeyword,

        // 简报
        fetchTodayBriefing,

        // 工具
        formatTimeAgo,

        // 常量
        SOURCE_CATEGORIES,
        REGION_MAP,
    }
}
