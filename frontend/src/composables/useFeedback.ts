/**
 * useFeedback — 用户反馈系统核心 composable
 *
 * 功能：
 * - 提交反馈（Bug/建议/体验/举报/其他）
 * - 查询反馈列表（筛选/搜索/排序/分页）
 * - 投票/取消投票
 * - 自动采集浏览器环境信息
 * - 删除自己的反馈（仅 pending 状态）
 */

import { ref, reactive, computed } from 'vue'
import { supabase } from '../supabase'
import { useAuth } from './useAuth'

// ==================== 类型定义 ====================

/** 反馈类型 */
export type FeedbackType = 'bug' | 'feature' | 'experience' | 'report' | 'other'

/** 优先级 */
export type FeedbackPriority = 'critical' | 'high' | 'medium' | 'low'

/** 状态 */
export type FeedbackStatus = 'pending' | 'processing' | 'completed' | 'closed'

/** 排序方式 */
export type FeedbackSort = 'newest' | 'oldest' | 'most_voted' | 'priority'

/** 反馈表行 */
export interface FeedbackRow {
    id: string
    user_id: string
    type: FeedbackType
    title: string
    description: string
    priority: FeedbackPriority
    status: FeedbackStatus
    module: string | null
    tags: string[]
    bug_type: string | null
    severity: string | null
    steps: string[]
    importance: string | null
    use_case: string | null
    environment: Record<string, string>
    attachments: string[]
    contact_email: string | null
    vote_count: number
    is_public: boolean
    admin_reply: string | null
    created_at: string
    updated_at: string
}

/** 提交反馈参数 */
export interface SubmitFeedbackData {
    type: FeedbackType
    title: string
    description: string
    priority?: FeedbackPriority
    module?: string
    tags?: string[]
    // Bug 特有
    bug_type?: string
    severity?: string
    steps?: string[]
    // 建议特有
    importance?: string
    use_case?: string
    // 通用
    attachments?: string[]
    contact_email?: string
    is_public?: boolean
}

/** 查询筛选参数 */
export interface FeedbackFilters {
    type?: FeedbackType | ''
    status?: FeedbackStatus | ''
    priority?: FeedbackPriority | ''
    module?: string
    search?: string
    sort?: FeedbackSort
    mine?: boolean // true = 仅我的
}

// ==================== 环境信息采集 ====================

/** 自动采集浏览器 + 系统环境信息 */
function collectEnvironment(): Record<string, string> {
    const nav = navigator
    const screen = window.screen
    return {
        browser: nav.userAgent,
        platform: nav.platform || 'unknown',
        language: nav.language || 'zh-CN',
        resolution: `${screen.width}x${screen.height}`,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        page: window.location.pathname,
        timestamp: new Date().toISOString(),
        online: nav.onLine ? '在线' : '离线',
        // 推断操作系统
        os: (() => {
            const ua = nav.userAgent
            if (ua.includes('Windows')) return 'Windows'
            if (ua.includes('Mac OS')) return 'macOS'
            if (ua.includes('Linux')) return 'Linux'
            if (ua.includes('Android')) return 'Android'
            if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS'
            return 'Unknown'
        })(),
        // 推断浏览器
        browserName: (() => {
            const ua = nav.userAgent
            if (ua.includes('Firefox')) return 'Firefox'
            if (ua.includes('Edg')) return 'Edge'
            if (ua.includes('Chrome')) return 'Chrome'
            if (ua.includes('Safari')) return 'Safari'
            return 'Other'
        })(),
    }
}

// ==================== 模块列表 ====================

/** 可关联的功能模块列表 */
export const MODULE_LIST = [
    { value: '', label: '不指定模块' },
    { value: 'ai_chat', label: 'AI 助手' },
    { value: 'schedule', label: '智能日程' },
    { value: 'planner', label: '星火规划' },
    { value: 'wall', label: '星火墙' },
    { value: 'shop', label: '星火购物' },
    { value: 'companion', label: '星火伴侣' },
    { value: 'health', label: '健康生活' },
    { value: 'study_room', label: '星火自习室' },
    { value: 'tarot', label: '选择卡罗牌' },
    { value: 'mentors', label: '学长分享' },
    { value: 'resources', label: '学习资源' },
    { value: 'talent', label: '星火人才' },
    { value: 'news', label: '星火资讯' },
    { value: 'cocreate', label: '星火共创' },
    { value: 'messages', label: '星火寄语' },
    { value: 'settings', label: '设置中心' },
    { value: 'other', label: '其他' },
] as const

// ==================== composable ====================

export function useFeedback() {
    const { user } = useAuth()

    // 状态
    const feedbacks = ref<FeedbackRow[]>([])
    const isLoading = ref(false)
    const isSubmitting = ref(false)
    const error = ref<string | null>(null)
    const totalCount = ref(0)
    const currentPage = ref(1)
    const pageSize = 20

    // 筛选
    const filters = reactive<FeedbackFilters>({
        type: '',
        status: '',
        priority: '',
        module: '',
        search: '',
        sort: 'newest',
        mine: false,
    })

    // 我的投票记录（用于 UI 高亮）
    const myVotedIds = ref<Set<string>>(new Set())

    // ==================== 查询反馈列表 ====================

    async function loadFeedbacks(page = 1) {
        isLoading.value = true
        error.value = null
        currentPage.value = page

        try {
            let query = supabase
                .from('feedbacks')
                .select('*', { count: 'exact' })

            // 筛选
            if (filters.mine && user.value) {
                query = query.eq('user_id', user.value.id)
            }
            if (filters.type) query = query.eq('type', filters.type)
            if (filters.status) query = query.eq('status', filters.status)
            if (filters.priority) query = query.eq('priority', filters.priority)
            if (filters.module) query = query.eq('module', filters.module)
            if (filters.search) {
                query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
            }

            // 排序
            switch (filters.sort) {
                case 'oldest':
                    query = query.order('created_at', { ascending: true })
                    break
                case 'most_voted':
                    query = query.order('vote_count', { ascending: false })
                    break
                case 'priority':
                    // priority 自定义排序：critical > high > medium > low
                    query = query.order('created_at', { ascending: false })
                    break
                default: // newest
                    query = query.order('created_at', { ascending: false })
            }

            // 分页
            const from = (page - 1) * pageSize
            const to = from + pageSize - 1
            query = query.range(from, to)

            const { data, count, error: dbError } = await query

            if (dbError) throw dbError

            feedbacks.value = (data || []) as FeedbackRow[]
            totalCount.value = count || 0

            // 加载我的投票记录
            if (user.value) {
                await loadMyVotes()
            }
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e)
            error.value = `加载反馈失败: ${msg}`
            console.error('[useFeedback] loadFeedbacks:', e)
        } finally {
            isLoading.value = false
        }
    }

    // ==================== 加载我的投票记录 ====================

    async function loadMyVotes() {
        if (!user.value) return

        const feedbackIds = feedbacks.value.map(f => f.id)
        if (feedbackIds.length === 0) return

        const { data } = await supabase
            .from('feedback_votes')
            .select('feedback_id')
            .eq('user_id', user.value.id)
            .in('feedback_id', feedbackIds)

        myVotedIds.value = new Set((data || []).map(v => v.feedback_id))
    }

    // ==================== 提交反馈 ====================

    async function submitFeedback(data: SubmitFeedbackData): Promise<FeedbackRow | null> {
        if (!user.value) {
            error.value = '请先登录'
            return null
        }

        isSubmitting.value = true
        error.value = null

        try {
            const env = collectEnvironment()

            const row = {
                user_id: user.value.id,
                type: data.type,
                title: data.title.trim(),
                description: data.description.trim(),
                priority: data.priority || 'medium',
                module: data.module || null,
                tags: data.tags || [],
                bug_type: data.bug_type || null,
                severity: data.severity || null,
                steps: data.steps || [],
                importance: data.importance || null,
                use_case: data.use_case || null,
                environment: env,
                attachments: data.attachments || [],
                contact_email: data.contact_email || null,
                is_public: data.is_public !== false,
            }

            const { data: result, error: dbError } = await supabase
                .from('feedbacks')
                .insert(row)
                .select()
                .single()

            if (dbError) throw dbError

            return result as FeedbackRow
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e)
            error.value = `提交失败: ${msg}`
            console.error('[useFeedback] submitFeedback:', e)
            return null
        } finally {
            isSubmitting.value = false
        }
    }

    // ==================== 投票 / 取消投票 ====================

    async function toggleVote(feedbackId: string): Promise<boolean> {
        if (!user.value) {
            error.value = '请先登录'
            return false
        }

        const hasVoted = myVotedIds.value.has(feedbackId)

        try {
            if (hasVoted) {
                // 取消投票
                const { error: dbError } = await supabase
                    .from('feedback_votes')
                    .delete()
                    .eq('feedback_id', feedbackId)
                    .eq('user_id', user.value.id)

                if (dbError) throw dbError
                myVotedIds.value.delete(feedbackId)

                // 本地更新计数
                const fb = feedbacks.value.find(f => f.id === feedbackId)
                if (fb) fb.vote_count = Math.max(0, fb.vote_count - 1)
            } else {
                // 投票
                const { error: dbError } = await supabase
                    .from('feedback_votes')
                    .insert({ feedback_id: feedbackId, user_id: user.value.id })

                if (dbError) throw dbError
                myVotedIds.value.add(feedbackId)

                // 本地更新计数
                const fb = feedbacks.value.find(f => f.id === feedbackId)
                if (fb) fb.vote_count += 1
            }

            return true
        } catch (e: unknown) {
            console.error('[useFeedback] toggleVote:', e)
            return false
        }
    }

    // ==================== 删除反馈 ====================

    async function deleteFeedback(feedbackId: string): Promise<boolean> {
        if (!user.value) return false

        try {
            const { error: dbError } = await supabase
                .from('feedbacks')
                .delete()
                .eq('id', feedbackId)
                .eq('user_id', user.value.id)

            if (dbError) throw dbError

            feedbacks.value = feedbacks.value.filter(f => f.id !== feedbackId)
            totalCount.value = Math.max(0, totalCount.value - 1)
            return true
        } catch (e: unknown) {
            console.error('[useFeedback] deleteFeedback:', e)
            return false
        }
    }

    // ==================== 统计 ====================

    const stats = computed(() => {
        const all = feedbacks.value
        return {
            total: totalCount.value,
            pending: all.filter(f => f.status === 'pending').length,
            processing: all.filter(f => f.status === 'processing').length,
            completed: all.filter(f => f.status === 'completed').length,
        }
    })

    return {
        // 状态
        feedbacks,
        isLoading,
        isSubmitting,
        error,
        totalCount,
        currentPage,
        pageSize,
        filters,
        myVotedIds,
        stats,

        // 方法
        loadFeedbacks,
        submitFeedback,
        toggleVote,
        deleteFeedback,
        collectEnvironment,
    }
}
