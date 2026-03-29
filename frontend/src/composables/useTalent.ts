/**
 * useTalent.ts — 星火人才数据层
 *
 * 职责：能力名片CRUD、机会发布、双向申请/邀约、人才搜索、技能标签
 * 产品定位：从「单向投递」到「双向寻访」
 */
import { ref, computed } from 'vue'
import { supabase } from '../supabase'

// ====== 类型定义 ======

/** 求职状态 */
export type JobStatus = 'open' | 'looking' | 'not_looking'

/** 机会类型 */
export type OpportunityType = 'job' | 'internship' | 'project' | 'competition' | 'volunteer'

/** 申请方向 */
export type ApplicationDirection = 'apply' | 'invite'

/** 申请状态 */
export type ApplicationStatus = 'pending' | 'reviewing' | 'accepted' | 'rejected' | 'withdrawn'

/** 技能标签 */
export interface TalentSkill {
    id: string
    name: string
    category: string
    hot_score: number
}

/** 作品集项 */
export interface PortfolioItem {
    title: string
    description: string
    url: string
    image_url?: string
    tags: string[]
}

/** 经历项 */
export interface ExperienceItem {
    title: string
    company: string
    start_date: string
    end_date: string
    description: string
}

/** 能力名片 */
export interface TalentProfile {
    id: string
    user_id: string
    display_name: string
    headline: string | null
    bio: string | null
    avatar_url: string | null
    university: string | null
    major: string | null
    degree: string | null
    graduation_year: number | null
    gpa: string | null
    job_status: JobStatus
    preferred_roles: string[]
    preferred_cities: string[]
    preferred_types: string[]
    skill_ids: string[]
    skill_levels: Record<string, number>
    portfolio_items: PortfolioItem[]
    experiences: ExperienceItem[]
    contact_email: string | null
    contact_phone: string | null
    wechat_id: string | null
    github_url: string | null
    linkedin_url: string | null
    personal_site: string | null
    visibility: string
    view_count: number
    invite_count: number
    is_verified: boolean
    is_featured: boolean
    created_at: string
    updated_at: string
    // 解析后的技能名
    skill_names?: string[]
}

/** 机会 */
export interface TalentOpportunity {
    id: string
    poster_id: string
    title: string
    description: string | null
    opportunity_type: OpportunityType
    org_name: string | null
    org_logo_url: string | null
    org_type: string
    required_skills: string[]
    experience_level: string
    location: string | null
    work_mode: string
    salary_range: string | null
    apply_deadline: string | null
    max_applicants: number
    current_applicants: number
    tags: string[]
    view_count: number
    favorite_count: number
    status: string
    is_pinned: boolean
    is_verified: boolean
    created_at: string
    updated_at: string
    // 联表
    poster_nickname?: string
    is_favorited?: boolean
    required_skill_names?: string[]
}

/** 申请/邀约 */
export interface TalentApplication {
    id: string
    applicant_id: string
    opportunity_id: string
    profile_id: string | null
    direction: ApplicationDirection
    status: ApplicationStatus
    cover_letter: string | null
    response_note: string | null
    applied_at: string
    responded_at: string | null
    // 联表
    opportunity_title?: string
    applicant_name?: string
    org_name?: string
}

// ====== 常量 ======

export const SKILL_CATEGORIES: Record<string, { label: string; icon: string }> = {
    tech: { label: '技术开发', icon: '💻' },
    design: { label: '设计创意', icon: '🎨' },
    business: { label: '商业运营', icon: '📊' },
    language: { label: '语言能力', icon: '🌐' },
    other: { label: '其他技能', icon: '✨' },
}

export const OPPORTUNITY_TYPES: Record<OpportunityType, { label: string; icon: string; color: string }> = {
    job: { label: '全职岗位', icon: '💼', color: '#4f8ef7' },
    internship: { label: '实习机会', icon: '🎓', color: '#10b981' },
    project: { label: '项目合作', icon: '🚀', color: '#8b5cf6' },
    competition: { label: '竞赛组队', icon: '🏆', color: '#f97316' },
    volunteer: { label: '志愿公益', icon: '💚', color: '#06b6d4' },
}

export const JOB_STATUS_MAP: Record<JobStatus, { label: string; color: string }> = {
    open: { label: '🟢 开放机会', color: '#10b981' },
    looking: { label: '🔥 积极求职', color: '#f97316' },
    not_looking: { label: '🔴 暂不考虑', color: '#6b7280' },
}

// ====== 模块级单例状态 ======

const allSkills = ref<TalentSkill[]>([])
const myProfile = ref<TalentProfile | null>(null)
const talentProfiles = ref<TalentProfile[]>([])
const opportunities = ref<TalentOpportunity[]>([])
const myApplications = ref<TalentApplication[]>([])
const receivedApplications = ref<TalentApplication[]>([])
const loading = ref(false)

// ====== Composable ======

export function useTalent() {
    const getUser = async () => {
        const { data } = await supabase.auth.getUser()
        return data.user
    }

    // ========================
    //     1. 技能标签
    // ========================

    async function fetchSkills(): Promise<TalentSkill[]> {
        const { data } = await supabase.from('talent_skills')
            .select('*').order('hot_score', { ascending: false })
        allSkills.value = (data || []) as TalentSkill[]
        return allSkills.value
    }

    function getSkillName(id: string): string {
        return allSkills.value.find(s => s.id === id)?.name || '未知技能'
    }

    function getSkillNames(ids: string[]): string[] {
        return ids.map(id => getSkillName(id))
    }

    // ========================
    //     2. 能力名片
    // ========================

    /** 获取/创建我的名片 */
    async function fetchMyProfile(): Promise<TalentProfile | null> {
        const user = await getUser()
        if (!user) return null

        const { data } = await supabase.from('talent_profiles')
            .select('*').eq('user_id', user.id).maybeSingle()

        if (data) {
            const profile = data as TalentProfile
            profile.skill_names = getSkillNames(profile.skill_ids || [])
            myProfile.value = profile
        } else {
            myProfile.value = null
        }
        return myProfile.value
    }

    /** 创建/更新名片 */
    async function saveProfile(profileData: Partial<TalentProfile>): Promise<boolean> {
        const user = await getUser()
        if (!user) return false

        const { data: existing } = await supabase.from('talent_profiles')
            .select('id').eq('user_id', user.id).maybeSingle()

        if (existing) {
            const { error } = await supabase.from('talent_profiles')
                .update(profileData).eq('id', existing.id)
            if (error) return false
        } else {
            const { error } = await supabase.from('talent_profiles')
                .insert({ ...profileData, user_id: user.id })
            if (error) return false
        }

        await fetchMyProfile()
        return true
    }

    /** 浏览人才广场 */
    async function fetchTalentList(filters?: {
        skillIds?: string[]
        university?: string
        jobStatus?: JobStatus
        keyword?: string
    }): Promise<TalentProfile[]> {
        loading.value = true
        try {
            let query = supabase.from('talent_profiles')
                .select('*')
                .eq('visibility', 'public')
                .order('is_featured', { ascending: false })
                .order('view_count', { ascending: false })
                .limit(50)

            if (filters?.skillIds?.length) {
                query = query.overlaps('skill_ids', filters.skillIds)
            }
            if (filters?.university) {
                query = query.ilike('university', `%${filters.university}%`)
            }
            if (filters?.jobStatus) {
                query = query.eq('job_status', filters.jobStatus)
            }
            if (filters?.keyword) {
                query = query.or(
                    `display_name.ilike.%${filters.keyword}%,headline.ilike.%${filters.keyword}%,bio.ilike.%${filters.keyword}%,major.ilike.%${filters.keyword}%`
                )
            }

            const { data } = await query
            const profiles = (data || []) as TalentProfile[]
            profiles.forEach(p => { p.skill_names = getSkillNames(p.skill_ids || []) })
            talentProfiles.value = profiles
            return profiles
        } finally {
            loading.value = false
        }
    }

    /** 查看某人名片（浏览量+1） */
    async function viewProfile(profileId: string): Promise<TalentProfile | null> {
        const { data } = await supabase.from('talent_profiles')
            .select('*').eq('id', profileId).single()
        if (!data) return null

        const profile = data as TalentProfile
        profile.skill_names = getSkillNames(profile.skill_ids || [])

        // 浏览量+1
        await supabase.from('talent_profiles')
            .update({ view_count: profile.view_count + 1 })
            .eq('id', profileId)

        return profile
    }

    // ========================
    //     3. 机会管理
    // ========================

    /** 发布机会 */
    async function createOpportunity(opp: Partial<TalentOpportunity>): Promise<string | null> {
        const user = await getUser()
        if (!user) return null

        const { data, error } = await supabase.from('talent_opportunities')
            .insert({ ...opp, poster_id: user.id })
            .select('id').single()

        if (error || !data) return null
        return data.id
    }

    /** 搜索机会 */
    async function searchOpportunities(filters?: {
        type?: OpportunityType
        keyword?: string
        skillIds?: string[]
        workMode?: string
        sortBy?: 'newest' | 'popular'
    }): Promise<TalentOpportunity[]> {
        loading.value = true
        try {
            let query = supabase.from('talent_opportunities')
                .select('*')
                .eq('status', 'active')

            if (filters?.type) query = query.eq('opportunity_type', filters.type)
            if (filters?.skillIds?.length) query = query.overlaps('required_skills', filters.skillIds)
            if (filters?.workMode) query = query.eq('work_mode', filters.workMode)
            if (filters?.keyword) {
                query = query.or(`title.ilike.%${filters.keyword}%,description.ilike.%${filters.keyword}%,org_name.ilike.%${filters.keyword}%`)
            }

            if (filters?.sortBy === 'popular') {
                query = query.order('view_count', { ascending: false })
            } else {
                query = query.order('is_pinned', { ascending: false }).order('created_at', { ascending: false })
            }

            query = query.limit(50)
            const { data } = await query
            const opps = (data || []) as TalentOpportunity[]

            // 填充技能名
            opps.forEach(o => { o.required_skill_names = getSkillNames(o.required_skills || []) })

            // 填充收藏状态
            const user = await getUser()
            if (user) {
                const oppIds = opps.map(o => o.id)
                const { data: favs } = await supabase.from('talent_opportunity_favorites')
                    .select('opportunity_id').eq('user_id', user.id).in('opportunity_id', oppIds)
                const favSet = new Set((favs || []).map(f => f.opportunity_id))
                opps.forEach(o => { o.is_favorited = favSet.has(o.id) })
            }

            // 联表poster信息
            const posterIds = [...new Set(opps.map(o => o.poster_id))]
            if (posterIds.length) {
                const { data: profiles } = await supabase.from('spark_profiles')
                    .select('user_id, nickname').in('user_id', posterIds)
                if (profiles) {
                    const pm = new Map(profiles.map(p => [p.user_id, p]))
                    opps.forEach(o => { o.poster_nickname = pm.get(o.poster_id)?.nickname })
                }
            }

            opportunities.value = opps
            return opps
        } finally {
            loading.value = false
        }
    }

    /** 收藏/取消机会 */
    async function toggleOpportunityFavorite(oppId: string): Promise<boolean> {
        const user = await getUser()
        if (!user) return false

        const { data: existing } = await supabase.from('talent_opportunity_favorites')
            .select('id').eq('user_id', user.id).eq('opportunity_id', oppId).maybeSingle()

        if (existing) {
            await supabase.from('talent_opportunity_favorites').delete().eq('id', existing.id)
            const o = opportunities.value.find(o => o.id === oppId)
            if (o) { o.is_favorited = false; o.favorite_count = Math.max(0, o.favorite_count - 1) }
            return false
        } else {
            await supabase.from('talent_opportunity_favorites').insert({ user_id: user.id, opportunity_id: oppId })
            const o = opportunities.value.find(o => o.id === oppId)
            if (o) { o.is_favorited = true; o.favorite_count++ }
            return true
        }
    }

    /** 删除机会 */
    async function deleteOpportunity(oppId: string): Promise<boolean> {
        const { error } = await supabase.from('talent_opportunities').delete().eq('id', oppId)
        return !error
    }

    // ========================
    //     4. 申请/邀约
    // ========================

    /** 申请机会 */
    async function applyToOpportunity(oppId: string, coverLetter: string): Promise<boolean> {
        const user = await getUser()
        if (!user) return false

        const { error } = await supabase.from('talent_applications').insert({
            applicant_id: user.id,
            opportunity_id: oppId,
            profile_id: myProfile.value?.id || null,
            direction: 'apply',
            cover_letter: coverLetter || null,
        })

        if (!error) {
            // 更新申请人数
            await supabase.from('talent_opportunities')
                .update({ current_applicants: (opportunities.value.find(o => o.id === oppId)?.current_applicants || 0) + 1 })
                .eq('id', oppId)
        }

        return !error
    }

    /** 获取我的申请列表 */
    async function fetchMyApplications(): Promise<TalentApplication[]> {
        const user = await getUser()
        if (!user) return []

        const { data } = await supabase.from('talent_applications')
            .select('*').eq('applicant_id', user.id).eq('direction', 'apply')
            .order('applied_at', { ascending: false })

        const apps = (data || []) as TalentApplication[]

        // 联表机会名称
        const oppIds = [...new Set(apps.map(a => a.opportunity_id))]
        if (oppIds.length) {
            const { data: opps } = await supabase.from('talent_opportunities')
                .select('id, title, org_name').in('id', oppIds)
            if (opps) {
                const om = new Map(opps.map(o => [o.id, o]))
                apps.forEach(a => {
                    const o = om.get(a.opportunity_id)
                    if (o) { a.opportunity_title = o.title; a.org_name = o.org_name }
                })
            }
        }

        myApplications.value = apps
        return apps
    }

    /** 获取收到的申请/邀约 */
    async function fetchReceivedApplications(): Promise<TalentApplication[]> {
        const user = await getUser()
        if (!user) return []

        // 找到我发布的所有机会
        const { data: myOpps } = await supabase.from('talent_opportunities')
            .select('id, title').eq('poster_id', user.id)

        if (!myOpps || myOpps.length === 0) {
            receivedApplications.value = []
            return []
        }

        const oppIds = myOpps.map(o => o.id)
        const { data } = await supabase.from('talent_applications')
            .select('*').in('opportunity_id', oppIds).eq('direction', 'apply')
            .order('applied_at', { ascending: false })

        const apps = (data || []) as TalentApplication[]

        // 联表
        const oppMap = new Map(myOpps.map(o => [o.id, o]))
        const applicantIds = [...new Set(apps.map(a => a.applicant_id))]
        let profileMap = new Map<string, string>()
        if (applicantIds.length) {
            const { data: profiles } = await supabase.from('spark_profiles')
                .select('user_id, nickname').in('user_id', applicantIds)
            if (profiles) profileMap = new Map(profiles.map(p => [p.user_id, p.nickname]))
        }

        apps.forEach(a => {
            a.opportunity_title = oppMap.get(a.opportunity_id)?.title
            a.applicant_name = profileMap.get(a.applicant_id) || '用户'
        })

        receivedApplications.value = apps
        return apps
    }

    /** 回复申请 */
    async function respondToApplication(appId: string, newStatus: 'accepted' | 'rejected', note: string = ''): Promise<boolean> {
        const { error } = await supabase.from('talent_applications')
            .update({
                status: newStatus,
                response_note: note || null,
                responded_at: new Date().toISOString(),
            }).eq('id', appId)
        return !error
    }

    // ========================
    //     工具函数
    // ========================

    function formatTimeAgo(dateStr: string): string {
        const diff = Date.now() - new Date(dateStr).getTime()
        const m = Math.floor(diff / 60000)
        if (m < 1) return '刚刚'
        if (m < 60) return `${m}分钟前`
        const h = Math.floor(m / 60)
        if (h < 24) return `${h}小时前`
        return `${Math.floor(h / 24)}天前`
    }

    const hasProfile = computed(() => !!myProfile.value)

    return {
        // 状态
        allSkills,
        myProfile,
        talentProfiles,
        opportunities,
        myApplications,
        receivedApplications,
        loading,
        hasProfile,

        // 技能
        fetchSkills,
        getSkillName,
        getSkillNames,

        // 名片
        fetchMyProfile,
        saveProfile,
        fetchTalentList,
        viewProfile,

        // 机会
        createOpportunity,
        searchOpportunities,
        toggleOpportunityFavorite,
        deleteOpportunity,

        // 申请
        applyToOpportunity,
        fetchMyApplications,
        fetchReceivedApplications,
        respondToApplication,

        // 工具
        formatTimeAgo,

        // 常量
        SKILL_CATEGORIES,
        OPPORTUNITY_TYPES,
        JOB_STATUS_MAP,
    }
}
