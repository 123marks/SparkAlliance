/**
 * useResources.ts — 学习资源中心数据层
 *
 * 职责：资源CRUD、搜索筛选、收藏、评分、下载记录、分类管理
 * 架构：模块级单例状态 + composable 函数（与 useSchedule/useShop/useStudyRoom 一致）
 */
import { ref, computed } from 'vue'
import { supabase } from '../supabase'

// ====== 类型定义 ======

/** 资源类型 */
export type ResourceType = 'file' | 'link' | 'text'

/** 资源状态 */
export type ResourceStatus = 'active' | 'pending' | 'rejected' | 'archived'

/** 排序方式 */
export type SortBy = 'newest' | 'popular' | 'rating' | 'downloads'

/** 资源分类 */
export interface ResourceCategory {
    id: string
    name: string
    icon: string
    color: string
    sort_order: number
    parent_id: string | null
}

/** 学习资源 */
export interface LearningResource {
    id: string
    uploader_id: string
    title: string
    description: string | null
    category_id: string | null
    tags: string[]
    resource_type: ResourceType
    file_url: string | null
    file_name: string | null
    file_size: number
    file_type: string | null
    external_url: string | null
    content: string | null
    subject: string | null
    course_name: string | null
    teacher_name: string | null
    download_count: number
    view_count: number
    favorite_count: number
    avg_rating: number
    rating_count: number
    status: ResourceStatus
    is_pinned: boolean
    is_featured: boolean
    created_at: string
    updated_at: string
    // 联表
    uploader_nickname?: string
    uploader_avatar?: string
    // 当前用户状态
    is_favorited?: boolean
    my_rating?: number
}

/** 资源评分 */
export interface ResourceRating {
    id: string
    user_id: string
    resource_id: string
    rating: number
    comment: string | null
    created_at: string
    // 联表
    nickname?: string
    avatar?: string
}

/** 搜索参数 */
export interface ResourceSearchParams {
    keyword?: string
    categoryId?: string
    subject?: string
    sortBy?: SortBy
    tags?: string[]
    page?: number
    pageSize?: number
}

/** 上传表单 */
export interface ResourceUploadForm {
    title: string
    description: string
    categoryId: string
    tags: string[]
    resourceType: ResourceType
    subject: string
    courseName: string
    teacherName: string
    externalUrl: string
    content: string
    // 文件相关由上传流程单独处理
}

// ====== 常量 ======

/** 预设学科 */
export const SUBJECTS = [
    '计算机科学', '数学', '英语', '物理', '化学',
    '经济学', '管理学', '法学', '文学', '电子工程',
    '机械工程', '土木工程', '医学', '心理学', '其他',
]

/** 预设标签 */
export const POPULAR_TAGS = [
    '期末复习', '考研', '四六级', '真题', '笔记',
    '课件PPT', '实验报告', '编程', '面试', '考证',
]

/** 每页条数 */
const PAGE_SIZE = 20

// ====== 模块级单例状态 ======

const categories = ref<ResourceCategory[]>([])
const resources = ref<LearningResource[]>([])
const currentResource = ref<LearningResource | null>(null)
const resourceRatings = ref<ResourceRating[]>([])
const myFavorites = ref<LearningResource[]>([])
const myUploads = ref<LearningResource[]>([])
const loading = ref(false)
const totalCount = ref(0)
const hasMore = ref(true)

// ====== Composable ======

export function useResources() {
    /** 获取当前用户 */
    const getUser = async () => {
        const { data } = await supabase.auth.getUser()
        return data.user
    }

    // ========================
    //     1. 分类管理
    // ========================

    /** 加载所有分类 */
    async function fetchCategories(): Promise<ResourceCategory[]> {
        const { data } = await supabase.from('resource_categories')
            .select('*').order('sort_order', { ascending: true })
        categories.value = (data || []) as ResourceCategory[]
        return categories.value
    }

    // ========================
    //     2. 资源搜索与查询
    // ========================

    /** 搜索资源 */
    async function searchResources(params: ResourceSearchParams): Promise<LearningResource[]> {
        loading.value = true
        try {
            const page = params.page || 1
            const pageSize = params.pageSize || PAGE_SIZE
            const from = (page - 1) * pageSize
            const to = from + pageSize - 1

            let query = supabase.from('learning_resources')
                .select('*', { count: 'exact' })
                .eq('status', 'active')

            // 关键词搜索：优先用全文搜索 RPC，降级到 ilike
            if (params.keyword && params.keyword.trim()) {
                const kw = params.keyword.trim()
                const tsQuery = kw.split(/\s+/).filter(Boolean).join(' & ')
                const { data: ftsIds } = await supabase.rpc('search_resources_fts', {
                    query_text: tsQuery,
                }).select('id')
                const ftsArr = Array.isArray(ftsIds) ? ftsIds : ftsIds ? [ftsIds] : []
                if (ftsArr.length > 0) {
                    query = query.in('id', ftsArr.map((r: { id: string }) => r.id))
                } else {
                    query = query.or(
                        `title.ilike.%${kw}%,description.ilike.%${kw}%,course_name.ilike.%${kw}%,subject.ilike.%${kw}%`
                    )
                }
            }

            // 分类筛选
            if (params.categoryId) {
                query = query.eq('category_id', params.categoryId)
            }

            // 学科筛选
            if (params.subject) {
                query = query.eq('subject', params.subject)
            }

            // 标签筛选
            if (params.tags && params.tags.length > 0) {
                query = query.overlaps('tags', params.tags)
            }

            // 排序
            switch (params.sortBy) {
                case 'popular':
                    query = query.order('view_count', { ascending: false })
                    break
                case 'rating':
                    query = query.order('avg_rating', { ascending: false })
                    break
                case 'downloads':
                    query = query.order('download_count', { ascending: false })
                    break
                default: // newest
                    query = query.order('is_pinned', { ascending: false })
                    query = query.order('created_at', { ascending: false })
            }

            query = query.range(from, to)

            const { data, count, error } = await query
            if (error) throw error

            const items = (data || []) as LearningResource[]
            totalCount.value = count || 0
            hasMore.value = items.length >= pageSize

            // 联表上传者信息
            await enrichUploaderInfo(items)

            // 当前用户的收藏状态
            await enrichFavoriteStatus(items)

            if (page === 1) {
                resources.value = items
            } else {
                resources.value = [...resources.value, ...items]
            }

            return items
        } catch {
            return []
        } finally {
            loading.value = false
        }
    }

    /** 获取资源详情 */
    async function getResourceDetail(resourceId: string): Promise<LearningResource | null> {
        const { data } = await supabase.from('learning_resources')
            .select('*').eq('id', resourceId).single()
        if (!data) return null

        const resource = data as LearningResource
        await enrichUploaderInfo([resource])
        await enrichFavoriteStatus([resource])

        // 浏览量+1（原子）
        await supabase.rpc('increment_view_count', { resource_id_input: resourceId })
        resource.view_count++

        currentResource.value = resource

        // 加载评分
        await fetchRatings(resourceId)

        return resource
    }

    /** 获取推荐资源（精选+热门） */
    async function fetchFeaturedResources(): Promise<LearningResource[]> {
        const { data } = await supabase.from('learning_resources')
            .select('*')
            .eq('status', 'active')
            .order('is_featured', { ascending: false })
            .order('download_count', { ascending: false })
            .limit(10)

        const items = (data || []) as LearningResource[]
        await enrichUploaderInfo(items)
        return items
    }

    // ========================
    //     3. 资源上传
    // ========================

    /** 上传资源（纯文本/链接类型，不含文件上传） */
    async function createResource(form: ResourceUploadForm): Promise<string | null> {
        const user = await getUser()
        if (!user) return null

        const { data, error } = await supabase.from('learning_resources').insert({
            uploader_id: user.id,
            title: form.title,
            description: form.description || null,
            category_id: form.categoryId || null,
            tags: form.tags,
            resource_type: form.resourceType,
            external_url: form.externalUrl || null,
            content: form.content || null,
            subject: form.subject || null,
            course_name: form.courseName || null,
            teacher_name: form.teacherName || null,
            status: 'active', // MVP阶段直接发布
        }).select('id').single()

        if (error || !data) return null
        return data.id
    }

    /** 上传文件资源（含 Supabase Storage 上传） */
    async function uploadFileResource(form: ResourceUploadForm, file: File): Promise<string | null> {
        const user = await getUser()
        if (!user) return null

        // 1. 上传文件到 Storage
        const fileExt = file.name.split('.').pop()
        const filePath = `resources/${user.id}/${Date.now()}.${fileExt}`

        const { error: uploadError } = await supabase.storage
            .from('learning-resources')
            .upload(filePath, file, { cacheControl: '3600', upsert: false })

        if (uploadError) return null

        // 2. 获取公开URL
        const { data: urlData } = supabase.storage
            .from('learning-resources')
            .getPublicUrl(filePath)

        // 3. 创建资源记录
        const { data, error } = await supabase.from('learning_resources').insert({
            uploader_id: user.id,
            title: form.title,
            description: form.description || null,
            category_id: form.categoryId || null,
            tags: form.tags,
            resource_type: 'file',
            file_url: urlData.publicUrl,
            file_name: file.name,
            file_size: file.size,
            file_type: file.type,
            subject: form.subject || null,
            course_name: form.courseName || null,
            teacher_name: form.teacherName || null,
            status: 'active',
        }).select('id').single()

        if (error || !data) return null
        return data.id
    }

    /** 删除我的资源 */
    async function deleteResource(resourceId: string): Promise<boolean> {
        const { error } = await supabase.from('learning_resources')
            .delete().eq('id', resourceId)
        return !error
    }

    // ========================
    //     4. 收藏
    // ========================

    /** 切换收藏 */
    async function toggleFavorite(resourceId: string): Promise<boolean> {
        const user = await getUser()
        if (!user) return false

        // 检查是否已收藏
        const { data: existing } = await supabase.from('resource_favorites')
            .select('id').eq('user_id', user.id).eq('resource_id', resourceId).maybeSingle()

        if (existing) {
            // 取消收藏
            await supabase.from('resource_favorites').delete().eq('id', existing.id)
            await supabase.rpc('adjust_favorite_count', { resource_id_input: resourceId, delta: -1 })
            // 更新本地状态
            const r = resources.value.find(r => r.id === resourceId)
            if (r) { r.is_favorited = false; r.favorite_count = Math.max(0, r.favorite_count - 1) }
            if (currentResource.value?.id === resourceId) {
                currentResource.value.is_favorited = false
                currentResource.value.favorite_count = Math.max(0, currentResource.value.favorite_count - 1)
            }
            return false
        } else {
            // 添加收藏
            await supabase.from('resource_favorites').insert({ user_id: user.id, resource_id: resourceId })
            await supabase.rpc('adjust_favorite_count', { resource_id_input: resourceId, delta: 1 })
            const r = resources.value.find(r => r.id === resourceId)
            if (r) { r.is_favorited = true; r.favorite_count++ }
            if (currentResource.value?.id === resourceId) {
                currentResource.value.is_favorited = true
                currentResource.value.favorite_count++
            }
            return true
        }
    }

    /** 获取我的收藏列表 */
    async function fetchMyFavorites(): Promise<LearningResource[]> {
        const user = await getUser()
        if (!user) return []

        const { data: favs } = await supabase.from('resource_favorites')
            .select('resource_id').eq('user_id', user.id).order('created_at', { ascending: false })

        if (!favs || favs.length === 0) {
            myFavorites.value = []
            return []
        }

        const ids = favs.map(f => f.resource_id)
        const { data } = await supabase.from('learning_resources')
            .select('*').in('id', ids).eq('status', 'active')

        const items = (data || []) as LearningResource[]
        items.forEach(r => { r.is_favorited = true })
        await enrichUploaderInfo(items)
        myFavorites.value = items
        return items
    }

    // ========================
    //     5. 评分
    // ========================

    /** 提交评分 */
    async function submitRating(resourceId: string, rating: number, comment: string = ''): Promise<boolean> {
        const user = await getUser()
        if (!user) return false

        // upsert 评分
        const { data: existing } = await supabase.from('resource_ratings')
            .select('id').eq('user_id', user.id).eq('resource_id', resourceId).maybeSingle()

        if (existing) {
            await supabase.from('resource_ratings')
                .update({ rating, comment: comment || null })
                .eq('id', existing.id)
        } else {
            await supabase.from('resource_ratings').insert({
                user_id: user.id,
                resource_id: resourceId,
                rating,
                comment: comment || null,
            })
        }

        // 重新加载评分列表
        await fetchRatings(resourceId)
        // 重新加载资源详情以更新平均分
        await getResourceDetail(resourceId)
        return true
    }

    /** 获取资源的评分列表 */
    async function fetchRatings(resourceId: string): Promise<ResourceRating[]> {
        const { data } = await supabase.from('resource_ratings')
            .select('*').eq('resource_id', resourceId)
            .order('created_at', { ascending: false }).limit(50)

        const ratings = (data || []) as ResourceRating[]

        // 联表查昵称
        const userIds = [...new Set(ratings.map(r => r.user_id))]
        if (userIds.length) {
            const { data: profiles } = await supabase.from('spark_profiles')
                .select('user_id, nickname, avatar_url').in('user_id', userIds)
            if (profiles) {
                const pm = new Map(profiles.map(p => [p.user_id, p]))
                ratings.forEach(r => {
                    const p = pm.get(r.user_id)
                    if (p) { r.nickname = p.nickname; r.avatar = p.avatar_url }
                })
            }
        }

        resourceRatings.value = ratings
        return ratings
    }

    // ========================
    //     6. 下载
    // ========================

    /** 记录下载 */
    async function recordDownload(resourceId: string): Promise<void> {
        const user = await getUser()
        if (!user) return

        await supabase.from('resource_downloads').insert({
            user_id: user.id,
            resource_id: resourceId,
        })

        // 下载次数+1（原子）
        await supabase.rpc('increment_download_count', { resource_id_input: resourceId })
        const r = resources.value.find(r => r.id === resourceId)
        if (r) r.download_count++
        if (currentResource.value?.id === resourceId) {
            currentResource.value.download_count++
        }
    }

    // ========================
    //     7. 我的上传
    // ========================

    /** 获取我上传的资源 */
    async function fetchMyUploads(): Promise<LearningResource[]> {
        const user = await getUser()
        if (!user) return []

        const { data } = await supabase.from('learning_resources')
            .select('*').eq('uploader_id', user.id)
            .order('created_at', { ascending: false })

        myUploads.value = (data || []) as LearningResource[]
        return myUploads.value
    }

    // ========================
    //     辅助函数
    // ========================

    /** 填充上传者昵称头像 */
    async function enrichUploaderInfo(items: LearningResource[]): Promise<void> {
        const uploaderIds = [...new Set(items.map(r => r.uploader_id))]
        if (!uploaderIds.length) return

        const { data: profiles } = await supabase.from('spark_profiles')
            .select('user_id, nickname, avatar_url').in('user_id', uploaderIds)
        if (!profiles) return

        const pm = new Map(profiles.map(p => [p.user_id, p]))
        items.forEach(r => {
            const p = pm.get(r.uploader_id)
            if (p) { r.uploader_nickname = p.nickname; r.uploader_avatar = p.avatar_url }
        })
    }

    /** 填充当前用户收藏状态 */
    async function enrichFavoriteStatus(items: LearningResource[]): Promise<void> {
        const user = await getUser()
        if (!user || !items.length) return

        const resourceIds = items.map(r => r.id)
        const { data: favs } = await supabase.from('resource_favorites')
            .select('resource_id').eq('user_id', user.id).in('resource_id', resourceIds)

        const favSet = new Set((favs || []).map(f => f.resource_id))
        items.forEach(r => { r.is_favorited = favSet.has(r.id) })
    }

    /** 格式化文件大小 */
    function formatFileSize(bytes: number): string {
        if (bytes < 1024) return bytes + 'B'
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'KB'
        if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + 'MB'
        return (bytes / (1024 * 1024 * 1024)).toFixed(1) + 'GB'
    }

    /** 格式化时间 */
    function formatTimeAgo(dateStr: string): string {
        const diff = Date.now() - new Date(dateStr).getTime()
        const m = Math.floor(diff / 60000)
        if (m < 1) return '刚刚'
        if (m < 60) return `${m}分钟前`
        const h = Math.floor(m / 60)
        if (h < 24) return `${h}小时前`
        const d = Math.floor(h / 24)
        if (d < 30) return `${d}天前`
        return `${Math.floor(d / 30)}个月前`
    }

    /** 获取文件类型图标 */
    function getFileIcon(fileType: string | null): string {
        if (!fileType) return '📄'
        if (fileType.includes('pdf')) return '📕'
        if (fileType.includes('word') || fileType.includes('doc')) return '📘'
        if (fileType.includes('excel') || fileType.includes('sheet') || fileType.includes('csv')) return '📗'
        if (fileType.includes('ppt') || fileType.includes('presentation')) return '📙'
        if (fileType.includes('image')) return '🖼️'
        if (fileType.includes('video')) return '🎬'
        if (fileType.includes('audio')) return '🎵'
        if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('7z')) return '📦'
        return '📄'
    }

    /** 分类名获取 */
    const getCategoryName = (catId: string | null) => {
        if (!catId) return '未分类'
        return categories.value.find(c => c.id === catId)?.name || '未分类'
    }

    /** 搜索结果数量 */
    const resultCount = computed(() => totalCount.value)

    return {
        // 状态
        categories,
        resources,
        currentResource,
        resourceRatings,
        myFavorites,
        myUploads,
        loading,
        hasMore,
        resultCount,

        // 分类
        fetchCategories,

        // 搜索与查询
        searchResources,
        getResourceDetail,
        fetchFeaturedResources,

        // 上传
        createResource,
        uploadFileResource,
        deleteResource,

        // 收藏
        toggleFavorite,
        fetchMyFavorites,

        // 评分
        submitRating,
        fetchRatings,

        // 下载
        recordDownload,

        // 我的
        fetchMyUploads,

        // 工具
        formatFileSize,
        formatTimeAgo,
        getFileIcon,
        getCategoryName,

        // 常量
        SUBJECTS,
        POPULAR_TAGS,
    }
}
