/**
 * useCoCreate.ts — 星火共创数据层
 *
 * 职责：项目CRUD、协作申请、搜索排序、点赞评论、成员管理
 */
import { ref, computed } from 'vue'
import { supabase } from '../supabase'

// ====== 类型 ======

/** 项目分类 */
export type ProjectCategory = 'web' | 'mobile' | 'ai' | 'game' | 'design' | 'tool' | 'education' | 'other'

/** 项目状态 */
export type ProjectStatus = 'idea' | 'recruiting' | 'building' | 'launched' | 'archived'

/** 项目 */
export interface CoProject {
    id: string
    creator_id: string
    title: string
    tagline: string | null
    description: string | null
    cover_image: string | null
    logo_url: string | null
    demo_url: string | null
    repo_url: string | null
    video_url: string | null
    website_url: string | null
    category: ProjectCategory
    tech_stack: string[]
    tags: string[]
    status: ProjectStatus
    looking_for: string[]
    upvotes: number
    views: number
    member_count: number
    comment_count: number
    visibility: string
    is_featured: boolean
    created_at: string
    updated_at: string
    // 联表/运行时
    creator_name?: string
    is_upvoted?: boolean
    is_member?: boolean
}

/** 协作申请 */
export interface CoApplication {
    id: string
    project_id: string
    applicant_id: string
    role: string
    message: string | null
    status: string
    created_at: string
    // 联表
    project_title?: string
    applicant_name?: string
}

/** 评论 */
export interface CoComment {
    id: string
    project_id: string
    user_id: string
    content: string
    parent_id: string | null
    created_at: string
    user_name?: string
}

// ====== 常量 ======

export const CATEGORIES: Record<ProjectCategory, { label: string; icon: string }> = {
    web: { label: 'Web应用', icon: '🌐' },
    mobile: { label: '移动端', icon: '📱' },
    ai: { label: 'AI/ML', icon: '🤖' },
    game: { label: '游戏', icon: '🎮' },
    design: { label: '设计', icon: '🎨' },
    tool: { label: '工具', icon: '🔧' },
    education: { label: '教育', icon: '📚' },
    other: { label: '其他', icon: '💡' },
}

export const STATUS_MAP: Record<ProjectStatus, { label: string; icon: string; color: string }> = {
    idea: { label: '灵感阶段', icon: '💡', color: '#fbbf24' },
    recruiting: { label: '招募中', icon: '📢', color: '#f43f5e' },
    building: { label: '开发中', icon: '🔨', color: '#3b82f6' },
    launched: { label: '已上线', icon: '🚀', color: '#10b981' },
    archived: { label: '已归档', icon: '📦', color: '#6b7280' },
}

export const ROLES = ['前端', '后端', '设计', '产品', '运营', '数据', '全栈', '其他']

// ====== 状态 ======

const projects = ref<CoProject[]>([])
const myProjects = ref<CoProject[]>([])
const myApplications = ref<CoApplication[]>([])
const receivedApplications = ref<CoApplication[]>([])
const loading = ref(false)
const hasMore = ref(true)

// ====== Composable ======

export function useCoCreate() {
    const getUser = async () => {
        const { data } = await supabase.auth.getUser()
        return data.user
    }

    // ========================
    //     1. 项目展示
    // ========================

    /** 搜索/浏览项目 */
    async function searchProjects(params?: {
        keyword?: string
        category?: ProjectCategory
        status?: ProjectStatus
        sortBy?: 'latest' | 'hot' | 'trending'
        page?: number
        pageSize?: number
    }): Promise<CoProject[]> {
        loading.value = true
        try {
            const page = params?.page || 1
            const size = params?.pageSize || 20
            const from = (page - 1) * size

            let query = supabase.from('cocreate_projects')
                .select('*', { count: 'exact' })
                .eq('visibility', 'public')

            if (params?.keyword?.trim()) {
                query = query.or(`title.ilike.%${params.keyword}%,tagline.ilike.%${params.keyword}%,description.ilike.%${params.keyword}%`)
            }
            if (params?.category) query = query.eq('category', params.category)
            if (params?.status) query = query.eq('status', params.status)

            if (params?.sortBy === 'hot') {
                query = query.order('upvotes', { ascending: false })
            } else if (params?.sortBy === 'trending') {
                query = query.order('views', { ascending: false })
            } else {
                query = query.order('created_at', { ascending: false })
            }

            query = query.range(from, from + size - 1)
            const { data } = await query
            const items = (data || []) as CoProject[]
            hasMore.value = items.length >= size

            // 填充点赞状态
            await enrichUpvoteStatus(items)

            if (page === 1) projects.value = items
            else projects.value = [...projects.value, ...items]
            return items
        } finally {
            loading.value = false
        }
    }

    /** 我创建的/参与的项目 */
    async function fetchMyProjects(): Promise<CoProject[]> {
        const user = await getUser()
        if (!user) return []

        // 创建的
        const { data: created } = await supabase.from('cocreate_projects')
            .select('*').eq('creator_id', user.id).order('created_at', { ascending: false })

        // 参与的（通过成员表）
        const { data: memberOf } = await supabase.from('cocreate_members')
            .select('project_id').eq('user_id', user.id)

        const joinedIds = (memberOf || []).map(m => m.project_id)
        let joined: CoProject[] = []
        if (joinedIds.length) {
            const { data } = await supabase.from('cocreate_projects')
                .select('*').in('id', joinedIds).neq('creator_id', user.id)
            joined = (data || []) as CoProject[]
        }

        const all = [...(created || []) as CoProject[], ...joined]
        all.forEach(p => { p.is_member = true })
        myProjects.value = all
        return all
    }

    // ========================
    //     2. 项目CRUD
    // ========================

    /** 创建项目 */
    async function createProject(form: {
        title: string
        tagline?: string
        description?: string
        cover_image?: string
        category: ProjectCategory
        tech_stack?: string[]
        tags?: string[]
        status: ProjectStatus
        looking_for?: string[]
        demo_url?: string
        repo_url?: string
    }): Promise<CoProject | null> {
        const user = await getUser()
        if (!user) return null

        const { data, error } = await supabase.from('cocreate_projects').insert({
            creator_id: user.id,
            ...form,
        }).select().single()

        if (error || !data) return null
        const project = data as CoProject

        // 创建者自动加入成员表
        await supabase.from('cocreate_members').insert({
            project_id: project.id,
            user_id: user.id,
            role: '创建者',
        })

        return project
    }

    /** 更新项目 */
    async function updateProject(id: string, updates: Partial<CoProject>): Promise<boolean> {
        const { error } = await supabase.from('cocreate_projects')
            .update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id)
        return !error
    }

    /** 删除项目 */
    async function deleteProject(id: string): Promise<boolean> {
        const { error } = await supabase.from('cocreate_projects').delete().eq('id', id)
        if (!error) myProjects.value = myProjects.value.filter(p => p.id !== id)
        return !error
    }

    // ========================
    //     3. 点赞
    // ========================

    async function toggleUpvote(projectId: string): Promise<boolean> {
        const user = await getUser()
        if (!user) return false

        const { data: existing } = await supabase.from('cocreate_upvotes')
            .select('id').eq('project_id', projectId).eq('user_id', user.id).maybeSingle()

        if (existing) {
            await supabase.from('cocreate_upvotes').delete().eq('id', existing.id)
            updateProjectState(projectId, { is_upvoted: false, upvoteDelta: -1 })
            return false
        } else {
            await supabase.from('cocreate_upvotes').insert({ project_id: projectId, user_id: user.id })
            updateProjectState(projectId, { is_upvoted: true, upvoteDelta: 1 })
            return true
        }
    }

    // ========================
    //     4. 协作申请
    // ========================

    /** 申请加入项目 */
    async function applyToProject(projectId: string, role: string, message: string): Promise<boolean> {
        const user = await getUser()
        if (!user) return false

        const { error } = await supabase.from('cocreate_applications').insert({
            project_id: projectId,
            applicant_id: user.id,
            role,
            message,
        })
        return !error
    }

    /** 获取我发出的申请 */
    async function fetchMyApplications(): Promise<CoApplication[]> {
        const user = await getUser()
        if (!user) return []

        const { data } = await supabase.from('cocreate_applications')
            .select('*').eq('applicant_id', user.id).order('created_at', { ascending: false })

        const apps = (data || []) as CoApplication[]
        // 填充项目标题
        if (apps.length) {
            const pIds = [...new Set(apps.map(a => a.project_id))]
            const { data: ps } = await supabase.from('cocreate_projects')
                .select('id, title').in('id', pIds)
            const pMap = new Map((ps || []).map(p => [p.id, p.title]))
            apps.forEach(a => { a.project_title = pMap.get(a.project_id) || '未知项目' })
        }

        myApplications.value = apps
        return apps
    }

    /** 获取我项目收到的申请 */
    async function fetchReceivedApplications(): Promise<CoApplication[]> {
        const user = await getUser()
        if (!user) return []

        // 先获取我创建的项目ID
        const { data: myP } = await supabase.from('cocreate_projects')
            .select('id, title').eq('creator_id', user.id)

        if (!myP?.length) { receivedApplications.value = []; return [] }

        const pIds = myP.map(p => p.id)
        const pMap = new Map(myP.map(p => [p.id, p.title]))

        const { data } = await supabase.from('cocreate_applications')
            .select('*').in('project_id', pIds).eq('status', 'pending')
            .order('created_at', { ascending: false })

        const apps = (data || []) as CoApplication[]
        apps.forEach(a => { a.project_title = pMap.get(a.project_id) || '' })

        receivedApplications.value = apps
        return apps
    }

    /** 处理申请（通过/拒绝） */
    async function handleApplication(appId: string, accept: boolean): Promise<boolean> {
        const app = receivedApplications.value.find(a => a.id === appId)
        if (!app) return false

        const { error } = await supabase.from('cocreate_applications')
            .update({ status: accept ? 'accepted' : 'rejected', updated_at: new Date().toISOString() })
            .eq('id', appId)

        if (error) return false

        // 通过 → 加入成员
        if (accept) {
            await supabase.from('cocreate_members').insert({
                project_id: app.project_id,
                user_id: app.applicant_id,
                role: app.role,
            })
            // 更新成员数
            await supabase.from('cocreate_projects')
                .update({ member_count: (await getMemberCount(app.project_id)) })
                .eq('id', app.project_id)
        }

        receivedApplications.value = receivedApplications.value.filter(a => a.id !== appId)
        return true
    }

    // ========================
    //     5. 评论
    // ========================

    /** 获取项目评论 */
    async function fetchComments(projectId: string): Promise<CoComment[]> {
        const { data } = await supabase.from('cocreate_comments')
            .select('*').eq('project_id', projectId).order('created_at', { ascending: true })
        return (data || []) as CoComment[]
    }

    /** 发表评论 */
    async function addComment(projectId: string, content: string): Promise<boolean> {
        const user = await getUser()
        if (!user) return false
        const { error } = await supabase.from('cocreate_comments').insert({
            project_id: projectId, user_id: user.id, content,
        })
        return !error
    }

    // ========================
    //     辅助
    // ========================

    async function getMemberCount(projectId: string): Promise<number> {
        const { count } = await supabase.from('cocreate_members')
            .select('*', { count: 'exact', head: true }).eq('project_id', projectId)
        return count || 1
    }

    async function enrichUpvoteStatus(items: CoProject[]): Promise<void> {
        const user = await getUser()
        if (!user || !items.length) return
        const ids = items.map(p => p.id)
        const { data } = await supabase.from('cocreate_upvotes')
            .select('project_id').eq('user_id', user.id).in('project_id', ids)
        const upSet = new Set((data || []).map(d => d.project_id))
        items.forEach(p => { p.is_upvoted = upSet.has(p.id) })
    }

    function updateProjectState(projectId: string, opts: { is_upvoted: boolean; upvoteDelta: number }) {
        const update = (list: CoProject[]) => {
            const p = list.find(p => p.id === projectId)
            if (p) { p.is_upvoted = opts.is_upvoted; p.upvotes += opts.upvoteDelta }
        }
        update(projects.value)
        update(myProjects.value)
    }

    function formatTimeAgo(dateStr: string): string {
        const diff = Date.now() - new Date(dateStr).getTime()
        const m = Math.floor(diff / 60000)
        if (m < 1) return '刚刚'
        if (m < 60) return `${m}分钟前`
        const h = Math.floor(m / 60)
        if (h < 24) return `${h}小时前`
        const d = Math.floor(h / 24)
        if (d < 30) return `${d}天前`
        return `${Math.floor(d / 30)}月前`
    }

    const recruitingProjects = computed(() => projects.value.filter(p => p.status === 'recruiting'))

    return {
        projects, myProjects, myApplications, receivedApplications,
        loading, hasMore, recruitingProjects,
        searchProjects, fetchMyProjects,
        createProject, updateProject, deleteProject,
        toggleUpvote,
        applyToProject, fetchMyApplications, fetchReceivedApplications, handleApplication,
        fetchComments, addComment,
        formatTimeAgo,
        CATEGORIES, STATUS_MAP, ROLES,
    }
}
