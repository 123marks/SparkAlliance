/**
 * useStudyRoom.ts — 星火自习室数据层
 *
 * 职责：房间CRUD、成员管理、番茄钟会话、统计排行
 * 架构风格：与 useSchedule.ts / useShop.ts 保持一致（模块级单例状态 + composable函数）
 */
import { ref, computed } from 'vue'
import { supabase } from '../supabase'
import bcrypt from 'bcryptjs'

// ====== 类型定义 ======

/** 房间类型 */
export type RoomType = 'public' | 'private' | 'solo'

/** 房间分类 */
export type RoomCategory = 'general' | 'exam' | 'reading' | 'coding' | 'writing'

/** 成员状态 */
export type MemberStatus = 'online' | 'focusing' | 'break' | 'offline'

/** 会话状态（状态机：focusing → completed | interrupted） */
export type SessionStatus = 'focusing' | 'completed' | 'interrupted'

/** 计时器状态 */
export type TimerState = 'idle' | 'focusing' | 'break'

/** 自习室房间 */
export interface StudyRoom {
    id: string
    creator_id: string
    name: string
    description: string | null
    room_type: RoomType
    max_members: number
    focus_duration: number
    short_break: number
    long_break: number
    long_break_interval: number
    category: RoomCategory
    current_members: number
    total_sessions: number
    status: string
    is_pinned: boolean
    created_at: string
    updated_at: string
    // 联表
    creator_nickname?: string
    creator_avatar?: string
}

/** 房间成员 */
export interface RoomMember {
    id: string
    room_id: string
    user_id: string
    status: MemberStatus
    joined_at: string
    last_active_at: string
    current_session_id: string | null
    focus_started_at: string | null
    // 联表
    nickname?: string
    avatar?: string
}

/** 专注会话 */
export interface StudySession {
    id: string
    user_id: string
    room_id: string | null
    planned_duration: number
    actual_duration: number
    session_type: string
    status: SessionStatus
    started_at: string
    ended_at: string | null
    interrupt_reason: string | null
    note: string | null
    created_at: string
}

/** 每日统计 */
export interface DailyStats {
    id: string
    user_id: string
    stat_date: string
    total_focus_minutes: number
    completed_sessions: number
    interrupted_sessions: number
    longest_streak: number
    hourly_distribution: Record<string, number>
}

/** 排行榜条目 */
export interface RankingItem {
    user_id: string
    nickname: string
    avatar: string | null
    total_minutes: number
    total_sessions: number
    rank: number
}

// ====== 工具：本地日期 ======

/** 获取本地日期字符串 YYYY-MM-DD，offset 为天数偏移（0=今天，-1=昨天） */
function getLocalDate(offset: number = 0): string {
    const d = new Date()
    d.setDate(d.getDate() + offset)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
}

// ====== 常量 ======

/** 房间分类配置 */
export const ROOM_CATEGORIES: Record<RoomCategory, { label: string; icon: string; color: string }> = {
    general: { label: '综合自习', icon: '📚', color: '#4f8ef7' },
    exam: { label: '考试冲刺', icon: '📝', color: '#ef4444' },
    reading: { label: '阅读沉浸', icon: '📖', color: '#10b981' },
    coding: { label: '编程练习', icon: '💻', color: '#8b5cf6' },
    writing: { label: '写作创作', icon: '✍️', color: '#f97316' },
}

/** 默认番茄钟配置 */
export const DEFAULT_TIMER = {
    focus: 25,
    shortBreak: 5,
    longBreak: 15,
    longBreakInterval: 4,
}

// ====== 模块级单例状态 ======

const publicRooms = ref<StudyRoom[]>([])
const currentRoom = ref<StudyRoom | null>(null)
const roomMembers = ref<RoomMember[]>([])
const currentSession = ref<StudySession | null>(null)
const timerRemaining = ref(0)          // 剩余秒数
const timerState = ref<TimerState>('idle')
const pomodoroCount = ref(0)           // 本轮已完成番茄数
const todayStats = ref<DailyStats | null>(null)
const weeklyRanking = ref<RankingItem[]>([])
const myHistory = ref<StudySession[]>([])
const loading = ref(false)

// 计时器句柄
let timerInterval: ReturnType<typeof setInterval> | null = null

// ====== Composable ======

export function useStudyRoom() {
    /** 获取当前用户 */
    const getUser = async () => {
        const { data } = await supabase.auth.getUser()
        return data.user
    }

    // ========================
    //     1. 房间管理
    // ========================

    /** 创建房间 */
    async function createRoom(
        name: string,
        roomType: RoomType,
        maxMembers: number = 20,
        category: RoomCategory = 'general',
        description: string = '',
        password?: string,
        focusDuration: number = 25,
        shortBreak: number = 5,
        longBreak: number = 15,
        longBreakInterval: number = 4,
    ): Promise<string | null> {
        const user = await getUser()
        if (!user) return null

        const hashedPwd = password ? await bcrypt.hash(password, 10) : null

        const { data, error } = await supabase.from('study_rooms').insert({
            creator_id: user.id,
            name,
            description: description || null,
            room_type: roomType,
            password_hash: hashedPwd,
            max_members: maxMembers,
            category,
            focus_duration: focusDuration,
            short_break: shortBreak,
            long_break: longBreak,
            long_break_interval: longBreakInterval,
        }).select('id').single()

        if (error || !data) return null

        // 创建者自动加入房间
        await joinRoom(data.id)
        return data.id
    }

    /** 获取公开房间列表（含在线人数） */
    async function fetchPublicRooms(): Promise<StudyRoom[]> {
        loading.value = true
        try {
            const { data, error } = await supabase.from('study_rooms')
                .select('*')
                .eq('status', 'active')
                .in('room_type', ['public', 'private'])
                .order('is_pinned', { ascending: false })
                .order('current_members', { ascending: false })
                .order('created_at', { ascending: false })
                .limit(50)

            if (error) throw error
            const rooms = (data || []) as StudyRoom[]

            // 联表查询创建者信息
            const creatorIds = [...new Set(rooms.map(r => r.creator_id))]
            if (creatorIds.length) {
                const { data: profiles } = await supabase.from('spark_profiles')
                    .select('user_id, nickname, avatar_url')
                    .in('user_id', creatorIds)
                if (profiles) {
                    const profileMap = new Map(profiles.map(p => [p.user_id, p]))
                    rooms.forEach(r => {
                        const p = profileMap.get(r.creator_id)
                        if (p) {
                            r.creator_nickname = p.nickname
                            r.creator_avatar = p.avatar_url
                        }
                    })
                }
            }

            publicRooms.value = rooms
            return rooms
        } catch {
            return []
        } finally {
            loading.value = false
        }
    }

    /** 加入房间 */
    async function joinRoom(roomId: string, password?: string): Promise<boolean> {
        const user = await getUser()
        if (!user) return false

        // 私密房间校验密码（bcrypt）
        if (password !== undefined) {
            const { data: room } = await supabase.from('study_rooms')
                .select('password_hash').eq('id', roomId).single()
            if (room?.password_hash) {
                const match = await bcrypt.compare(password, room.password_hash)
                if (!match) return false
            }
        }

        // 检查是否已在房间中
        const { data: existing } = await supabase.from('study_room_members')
            .select('id, status').eq('room_id', roomId).eq('user_id', user.id).maybeSingle()

        if (existing) {
            // 已存在，更新为在线
            await supabase.from('study_room_members')
                .update({ status: 'online', last_active_at: new Date().toISOString() })
                .eq('id', existing.id)
        } else {
            // 新加入
            const { error } = await supabase.from('study_room_members').insert({
                room_id: roomId,
                user_id: user.id,
                status: 'online',
            })
            if (error) return false
        }

        // 更新房间在线人数（计算实际在线数）
        await refreshRoomMemberCount(roomId)

        // 加载房间信息
        await loadRoomDetail(roomId)
        return true
    }

    /** 离开房间 */
    async function leaveRoom(roomId: string): Promise<boolean> {
        const user = await getUser()
        if (!user) return false

        // 如果正在专注，先中断
        if (currentSession.value && currentSession.value.status === 'focusing') {
            await interruptFocusSession(currentSession.value.id, '离开房间')
        }

        await supabase.from('study_room_members')
            .update({ status: 'offline', last_active_at: new Date().toISOString() })
            .eq('room_id', roomId).eq('user_id', user.id)

        await refreshRoomMemberCount(roomId)

        // 清理本地状态
        currentRoom.value = null
        roomMembers.value = []
        stopTimer()
        return true
    }

    /** 加载房间详情 */
    async function loadRoomDetail(roomId: string): Promise<void> {
        const { data } = await supabase.from('study_rooms')
            .select('*').eq('id', roomId).single()
        if (data) currentRoom.value = data as StudyRoom

        // 加载成员列表
        await fetchRoomMembers(roomId)
    }

    /** 获取房间成员列表（联表昵称头像） */
    async function fetchRoomMembers(roomId: string): Promise<RoomMember[]> {
        const { data } = await supabase.from('study_room_members')
            .select('*')
            .eq('room_id', roomId)
            .neq('status', 'offline')
            .order('status', { ascending: true })

        const members = (data || []) as RoomMember[]

        // 联表查昵称头像
        const userIds = members.map(m => m.user_id)
        if (userIds.length) {
            const { data: profiles } = await supabase.from('spark_profiles')
                .select('user_id, nickname, avatar_url')
                .in('user_id', userIds)
            if (profiles) {
                const pm = new Map(profiles.map(p => [p.user_id, p]))
                members.forEach(m => {
                    const p = pm.get(m.user_id)
                    if (p) { m.nickname = p.nickname; m.avatar = p.avatar_url }
                })
            }
        }

        roomMembers.value = members
        return members
    }

    /** 刷新房间在线人数 */
    async function refreshRoomMemberCount(roomId: string): Promise<void> {
        const { count } = await supabase.from('study_room_members')
            .select('id', { count: 'exact', head: true })
            .eq('room_id', roomId)
            .neq('status', 'offline')
        await supabase.from('study_rooms')
            .update({ current_members: count || 0 })
            .eq('id', roomId)
    }

    // ========================
    //     2. 番茄钟会话
    // ========================

    /** 开始专注 */
    async function startFocusSession(roomId: string | null, duration: number): Promise<string | null> {
        const user = await getUser()
        if (!user) return null

        const { data, error } = await supabase.from('study_sessions').insert({
            user_id: user.id,
            room_id: roomId,
            planned_duration: duration,
            session_type: 'focus',
            status: 'focusing',
            started_at: new Date().toISOString(),
        }).select('*').single()

        if (error || !data) return null

        currentSession.value = data as StudySession

        // 更新成员状态为"专注中"
        if (roomId) {
            await supabase.from('study_room_members')
                .update({
                    status: 'focusing',
                    current_session_id: data.id,
                    focus_started_at: new Date().toISOString(),
                })
                .eq('room_id', roomId).eq('user_id', user.id)
        }

        // 启动计时器
        startTimer(duration * 60)
        return data.id
    }

    /** 完成专注（正常结束） */
    async function completeFocusSession(sessionId: string): Promise<boolean> {
        const session = currentSession.value
        if (!session || session.id !== sessionId) return false

        const endedAt = new Date()
        const startedAt = new Date(session.started_at)
        const actualMinutes = Math.round((endedAt.getTime() - startedAt.getTime()) / 60000)

        const { error } = await supabase.from('study_sessions')
            .update({
                status: 'completed',
                actual_duration: actualMinutes,
                ended_at: endedAt.toISOString(),
            }).eq('id', sessionId)

        if (error) return false

        // 更新统计
        await updateDailyStats(actualMinutes, 'completed')

        // 更新房间统计
        if (session.room_id) {
            try {
                await supabase.rpc('increment_room_sessions', { room_id_input: session.room_id })
            } catch {
                // 降级：RPC不存在时直接update
                await supabase.from('study_rooms')
                    .update({ total_sessions: (currentRoom.value?.total_sessions || 0) + 1 })
                    .eq('id', session.room_id!)
            }
            // 成员状态 → online
            const user = await getUser()
            if (user) {
                await supabase.from('study_room_members')
                    .update({ status: 'online', current_session_id: null, focus_started_at: null })
                    .eq('room_id', session.room_id).eq('user_id', user.id)
            }
        }

        pomodoroCount.value++
        currentSession.value = null
        stopTimer()
        return true
    }

    /** 中断专注 */
    async function interruptFocusSession(sessionId: string, reason: string = '主动中断'): Promise<boolean> {
        const session = currentSession.value
        if (!session || session.id !== sessionId) {
            // 尝试直接更新数据库（兜底）
            await supabase.from('study_sessions')
                .update({ status: 'interrupted', interrupt_reason: reason, ended_at: new Date().toISOString() })
                .eq('id', sessionId)
            stopTimer()
            currentSession.value = null
            return true
        }

        const endedAt = new Date()
        const startedAt = new Date(session.started_at)
        const actualMinutes = Math.round((endedAt.getTime() - startedAt.getTime()) / 60000)

        await supabase.from('study_sessions')
            .update({
                status: 'interrupted',
                actual_duration: actualMinutes,
                ended_at: endedAt.toISOString(),
                interrupt_reason: reason,
            }).eq('id', sessionId)

        // 更新统计（中断也计入）
        if (actualMinutes > 0) {
            await updateDailyStats(actualMinutes, 'interrupted')
        }

        // 成员状态 → online
        if (session.room_id) {
            const user = await getUser()
            if (user) {
                await supabase.from('study_room_members')
                    .update({ status: 'online', current_session_id: null, focus_started_at: null })
                    .eq('room_id', session.room_id).eq('user_id', user.id)
            }
        }

        currentSession.value = null
        stopTimer()
        return true
    }

    // ========================
    //     3. 计时器
    // ========================

    /** 启动倒计时 */
    function startTimer(totalSeconds: number): void {
        stopTimer()
        timerRemaining.value = totalSeconds
        timerState.value = 'focusing'

        timerInterval = setInterval(() => {
            if (timerRemaining.value <= 0) {
                stopTimer()
                // 自动完成
                if (currentSession.value && currentSession.value.status === 'focusing') {
                    completeFocusSession(currentSession.value.id)
                }
                return
            }
            timerRemaining.value--
        }, 1000)
    }

    /** 启动休息倒计时 */
    function startBreakTimer(breakMinutes: number): void {
        stopTimer()
        timerRemaining.value = breakMinutes * 60
        timerState.value = 'break'

        timerInterval = setInterval(() => {
            if (timerRemaining.value <= 0) {
                stopTimer()
                timerState.value = 'idle'
                return
            }
            timerRemaining.value--
        }, 1000)
    }

    /** 停止计时器 */
    function stopTimer(): void {
        if (timerInterval) {
            clearInterval(timerInterval)
            timerInterval = null
        }
        timerRemaining.value = 0
        timerState.value = 'idle'
    }

    /** 格式化秒数为 MM:SS */
    function formatTimer(seconds: number): string {
        const m = Math.floor(seconds / 60)
        const s = seconds % 60
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    }

    /** 计时器进度百分比 */
    const timerProgress = computed(() => {
        if (!currentSession.value && timerState.value === 'idle') return 0
        const total = currentSession.value
            ? currentSession.value.planned_duration * 60
            : (currentRoom.value?.short_break || 5) * 60
        if (total <= 0) return 0
        return Math.max(0, Math.min(100, ((total - timerRemaining.value) / total) * 100))
    })

    // ========================
    //     4. 统计
    // ========================

    /** 更新今日统计 */
    async function updateDailyStats(minutes: number, sessionResult: 'completed' | 'interrupted'): Promise<void> {
        const user = await getUser()
        if (!user) return

        const today = getLocalDate()
        const hour = String(new Date().getHours())

        // upsert今日统计
        const { data: existing } = await supabase.from('study_daily_stats')
            .select('*').eq('user_id', user.id).eq('stat_date', today).maybeSingle()

        if (existing) {
            const dist = (existing.hourly_distribution || {}) as Record<string, number>
            dist[hour] = (dist[hour] || 0) + minutes

            await supabase.from('study_daily_stats').update({
                total_focus_minutes: existing.total_focus_minutes + minutes,
                completed_sessions: existing.completed_sessions + (sessionResult === 'completed' ? 1 : 0),
                interrupted_sessions: existing.interrupted_sessions + (sessionResult === 'interrupted' ? 1 : 0),
                longest_streak: Math.max(existing.longest_streak, minutes),
                hourly_distribution: dist,
            }).eq('id', existing.id)
        } else {
            const dist: Record<string, number> = { [hour]: minutes }
            await supabase.from('study_daily_stats').insert({
                user_id: user.id,
                stat_date: today,
                total_focus_minutes: minutes,
                completed_sessions: sessionResult === 'completed' ? 1 : 0,
                interrupted_sessions: sessionResult === 'interrupted' ? 1 : 0,
                longest_streak: minutes,
                hourly_distribution: dist,
            })
        }
    }

    /** 获取今日统计 */
    async function fetchTodayStats(): Promise<DailyStats | null> {
        const user = await getUser()
        if (!user) return null

        const today = getLocalDate()
        const { data } = await supabase.from('study_daily_stats')
            .select('*').eq('user_id', user.id).eq('stat_date', today).maybeSingle()

        todayStats.value = (data as DailyStats) || null
        return todayStats.value
    }

    /** 获取近N天统计 */
    async function fetchRecentStats(days: number = 7): Promise<DailyStats[]> {
        const user = await getUser()
        if (!user) return []

        const since = getLocalDate(-days)
        const { data } = await supabase.from('study_daily_stats')
            .select('*').eq('user_id', user.id)
            .gte('stat_date', since)
            .order('stat_date', { ascending: true })

        return (data || []) as DailyStats[]
    }

    /** 获取周排行榜 */
    async function fetchWeeklyRanking(): Promise<RankingItem[]> {
        const weekAgo = getLocalDate(-7)

        // 聚合本周每个用户的总学习时长
        const { data } = await supabase.from('study_daily_stats')
            .select('user_id, total_focus_minutes, completed_sessions')
            .gte('stat_date', weekAgo)

        if (!data || data.length === 0) {
            weeklyRanking.value = []
            return []
        }

        // 客户端聚合（Supabase无group by RPC的情况下）
        const aggregated = new Map<string, { minutes: number; sessions: number }>()
        for (const row of data) {
            const prev = aggregated.get(row.user_id) || { minutes: 0, sessions: 0 }
            prev.minutes += row.total_focus_minutes
            prev.sessions += row.completed_sessions
            aggregated.set(row.user_id, prev)
        }

        // 排序
        const sorted = [...aggregated.entries()]
            .sort((a, b) => b[1].minutes - a[1].minutes)
            .slice(0, 20) // Top 20

        // 联表查昵称
        const userIds = sorted.map(([uid]) => uid)
        const { data: profiles } = await supabase.from('spark_profiles')
            .select('user_id, nickname, avatar_url')
            .in('user_id', userIds)
        const pm = new Map((profiles || []).map(p => [p.user_id, p]))

        const ranking: RankingItem[] = sorted.map(([uid, agg], i) => ({
            user_id: uid,
            nickname: pm.get(uid)?.nickname || '用户',
            avatar: pm.get(uid)?.avatar_url || null,
            total_minutes: agg.minutes,
            total_sessions: agg.sessions,
            rank: i + 1,
        }))

        weeklyRanking.value = ranking
        return ranking
    }

    /** 获取我的学习历史 */
    async function fetchMyHistory(days: number = 7): Promise<StudySession[]> {
        const user = await getUser()
        if (!user) return []

        const since = new Date(Date.now() - days * 86400000).toISOString()
        const { data } = await supabase.from('study_sessions')
            .select('*').eq('user_id', user.id)
            .gte('started_at', since)
            .order('started_at', { ascending: false })
            .limit(50)

        myHistory.value = (data || []) as StudySession[]
        return myHistory.value
    }

    /** 获取连续学习天数 */
    async function fetchStudyStreak(): Promise<number> {
        const user = await getUser()
        if (!user) return 0

        const { data } = await supabase.from('study_daily_stats')
            .select('stat_date')
            .eq('user_id', user.id)
            .gt('completed_sessions', 0)
            .order('stat_date', { ascending: false })
            .limit(365)

        if (!data || data.length === 0) return 0

        // 从今天往回数连续天数
        let streak = 0

        for (let i = 0; i < data.length; i++) {
            const dateStr = getLocalDate(-i)
            if (data[i].stat_date === dateStr) {
                streak++
            } else {
                break
            }
        }
        return streak
    }

    // ========================
    //     5. 快速自习（无房间）
    // ========================

    /** 快速开始个人自习 */
    async function quickStart(duration: number = 25): Promise<string | null> {
        return startFocusSession(null, duration)
    }

    // ========================
    //     工具函数
    // ========================

    /** 格式化时间差 */
    function formatTimeAgo(dateStr: string): string {
        const diff = Date.now() - new Date(dateStr).getTime()
        const m = Math.floor(diff / 60000)
        if (m < 1) return '刚刚'
        if (m < 60) return `${m}分钟前`
        const h = Math.floor(m / 60)
        if (h < 24) return `${h}小时前`
        return `${Math.floor(h / 24)}天前`
    }

    /** 在线人数 → 计算属性 */
    const onlineMemberCount = computed(() =>
        roomMembers.value.filter(m => m.status !== 'offline').length
    )

    /** 当前专注中的成员 */
    const focusingMembers = computed(() =>
        roomMembers.value.filter(m => m.status === 'focusing')
    )

    return {
        // 状态
        publicRooms,
        currentRoom,
        roomMembers,
        currentSession,
        timerRemaining,
        timerState,
        pomodoroCount,
        todayStats,
        weeklyRanking,
        myHistory,
        loading,
        onlineMemberCount,
        focusingMembers,
        timerProgress,

        // 房间管理
        createRoom,
        fetchPublicRooms,
        joinRoom,
        leaveRoom,
        loadRoomDetail,
        fetchRoomMembers,

        // 番茄钟
        startFocusSession,
        completeFocusSession,
        interruptFocusSession,
        quickStart,
        startBreakTimer,
        stopTimer,
        formatTimer,

        // 统计
        fetchTodayStats,
        fetchRecentStats,
        fetchWeeklyRanking,
        fetchMyHistory,
        fetchStudyStreak,
        updateDailyStats,
        formatTimeAgo,

        // 常量
        ROOM_CATEGORIES,
        DEFAULT_TIMER,
    }
}
