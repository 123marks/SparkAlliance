/**
 * useCompanion V2 — 星火伴侣核心逻辑
 * 星火ID体系 / 好友系统 / 人格化AI / 朋友圈 / 好友广场 / 群聊 / 模块深度打通
 */
import { ref } from 'vue'
import { supabase } from '../supabase'

// ====== 类型 ======

export interface SparkProfile {
  id: string
  user_id: string
  spark_id: string
  nickname: string
  avatar_url?: string
  bio: string
  gender: string
  university: string
  school_year: string
  interests: string[]
  qr_code_seed: string
  show_in_plaza: boolean
  online_status: string
  last_active_at: string
  id_changed: boolean
  created_at: string
}

export interface Friend {
  id: string
  user_id: string
  friend_id: string
  nickname?: string
  created_at: string
  // 联表
  profile?: SparkProfile
}

export interface FriendRequest {
  id: string
  from_user_id: string
  to_user_id: string
  message: string
  source: string
  status: 'pending' | 'accepted' | 'rejected'
  created_at: string
  from_profile?: SparkProfile
}

export interface ChatMessage {
  id: string
  user_id: string
  role: 'user' | 'assistant'
  content: string
  metadata: Record<string, unknown>
  created_at: string
}

export interface Moment {
  id: string
  user_id: string
  content: string
  media_urls: string[]
  video_urls: string[]
  visibility: 'public' | 'friends' | 'private'
  show_in_plaza: boolean
  expires_at: string | null
  like_count: number
  comment_count: number
  created_at: string
  // 联表
  author?: SparkProfile
  is_liked?: boolean
}

export interface MomentComment {
  id: string
  moment_id: string
  user_id: string
  content: string
  created_at: string
  author?: SparkProfile
}

export interface GroupChat {
  id: string
  name: string
  avatar_url?: string
  owner_id: string
  ai_enabled: boolean
  max_members: number
  member_count: number
  created_at: string
}

export interface GroupMessage {
  id: string
  group_id: string
  sender_id: string | null
  sender_type: 'user' | 'ai'
  content: string
  media_url?: string
  created_at: string
  sender_profile?: SparkProfile
}

// 动态有效期选项
export const MOMENT_EXPIRY_OPTIONS = [
  { value: null, label: '永久', icon: '♾️' },
  { value: 3, label: '三天', icon: '3️⃣' },
  { value: 7, label: '一周', icon: '7️⃣' },
  { value: 30, label: '一个月', icon: '📅' },
  { value: 180, label: '半年', icon: '🗓️' },
]

// AI 伴侣人格 Prompt（深度打通各模块）
const COMPANION_SYSTEM_PROMPT = `你是「星火」—— 一位温暖、聪明、有趣的校园AI伙伴。

## 性格
- 🌟 热情开朗，像关心你的学姐/学长
- 🧠 博学但不卖弄，通俗讲解
- 💪 鼓励型人格，关注情绪
- 😄 偶尔幽默，善用emoji
- 🎯 务实导向，给可执行建议

## 行为准则
- 称呼用户为「同学」
- 主动关心学习和生活状态
- 情绪低落时先共情再建议
- 保持简洁，每次≤200字

## 快捷指令（用户可以输入以下指令快速操作）
- /创建任务 <内容> → 帮用户在星火规划中创建今日任务
- /查日程 → 查看用户今日日程安排
- /发动态 <内容> → 帮用户发朋友圈动态
- /推荐文章 → 推荐学长分享的热门文章`


// ====== Composable ======

export function useCompanion() {
  const myProfile = ref<SparkProfile | null>(null)
  const friends = ref<Friend[]>([])
  const friendRequests = ref<FriendRequest[]>([])
  const chatHistory = ref<ChatMessage[]>([])
  const moments = ref<Moment[]>([])
  const plazaMoments = ref<Moment[]>([])
  const groups = ref<GroupChat[]>([])
  const loading = ref(false)

  // ====== 星火ID体系 ======

  /** 获取/初始化自己的星火档案 */
  async function fetchMyProfile(): Promise<SparkProfile | null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // 尝试获取
    const { data } = await supabase.from('spark_profiles')
      .select('*').eq('user_id', user.id).maybeSingle()

    if (data) {
      myProfile.value = data as SparkProfile
      return myProfile.value
    }

    // 首次：自动创建星火ID
    const sparkId = generateLocalSparkId()
    const nickname = user.user_metadata?.nickname || user.email?.split('@')[0] || '星火用户'
    const { data: created, error } = await supabase.from('spark_profiles').insert({
      user_id: user.id,
      spark_id: sparkId,
      nickname,
    }).select().single()

    if (error) { console.error('创建星火档案失败:', error); return null }
    myProfile.value = created as SparkProfile
    return myProfile.value
  }

  /** 本地生成临时ID（服务端有唯一性函数兜底） */
  function generateLocalSparkId(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let result = ''
    for (let i = 0; i < 6; i++) {
      result += chars[Math.floor(Math.random() * chars.length)]
    }
    return result
  }

  /** 更新星火档案 */
  async function updateProfile(updates: Partial<SparkProfile>): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    const { error } = await supabase.from('spark_profiles')
      .update(updates).eq('user_id', user.id)
    if (error) { console.error(error); return false }
    await fetchMyProfile()
    return true
  }

  /** 修改星火ID（仅一次） */
  async function changeSparkId(newId: string): Promise<{ ok: boolean; msg: string }> {
    if (myProfile.value?.id_changed) return { ok: false, msg: '星火ID只能修改一次' }
    if (!/^[A-Z0-9]{4,12}$/.test(newId.toUpperCase())) return { ok: false, msg: 'ID格式：4-12位大写字母+数字' }

    // 检查唯一性
    const { data: exists } = await supabase.from('spark_profiles')
      .select('id').eq('spark_id', newId.toUpperCase()).maybeSingle()
    if (exists) return { ok: false, msg: '该ID已被占用' }

    const ok = await updateProfile({ spark_id: newId.toUpperCase(), id_changed: true })
    return { ok, msg: ok ? '修改成功' : '修改失败' }
  }

  /** 生成我的二维码数据（JSON字符串供前端渲染） */
  function getMyQRData(): string {
    if (!myProfile.value) return ''
    return JSON.stringify({
      type: 'spark_friend',
      spark_id: myProfile.value.spark_id,
      seed: myProfile.value.qr_code_seed,
      ts: Date.now(),
    })
  }

  /** 通过星火ID搜索用户 */
  async function searchBySparkId(query: string): Promise<SparkProfile[]> {
    if (!query.trim()) return []
    const q = query.trim().toUpperCase()
    const { data, error } = await supabase.from('spark_profiles')
      .select('*')
      .or(`spark_id.eq.${q},nickname.ilike.%${query.trim()}%`)
      .limit(10)
    if (error) { console.error(error); return [] }
    return (data || []) as SparkProfile[]
  }

  /** 通过二维码数据添加好友 */
  async function addFriendByQR(qrData: string): Promise<{ ok: boolean; msg: string }> {
    try {
      const parsed = JSON.parse(qrData)
      if (parsed.type !== 'spark_friend') return { ok: false, msg: '无效二维码' }
      // 用 spark_id 查找
      const results = await searchBySparkId(parsed.spark_id)
      if (!results.length) return { ok: false, msg: '用户不存在' }
      const ok = await sendFriendRequest(results[0].user_id, '通过二维码添加', 'qrcode')
      return { ok, msg: ok ? '好友申请已发送' : '发送失败' }
    } catch {
      return { ok: false, msg: '二维码解析失败' }
    }
  }

  // ====== 好友系统 ======

  async function fetchFriends(): Promise<Friend[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []
    const { data, error } = await supabase.from('friendships')
      .select('*, profile:spark_profiles!friendships_friend_id_fkey(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (error) {
      // 降级：不联表
      const { data: d2 } = await supabase.from('friendships')
        .select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      friends.value = (d2 || []) as Friend[]
      return friends.value
    }
    friends.value = (data || []) as Friend[]
    return friends.value
  }

  async function sendFriendRequest(toUserId: string, message = '', source = 'search'): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || toUserId === user.id) return false
    // 检查已有关系
    const { data: existing } = await supabase.from('friendships')
      .select('id').eq('user_id', user.id).eq('friend_id', toUserId).maybeSingle()
    if (existing) return false
    const { error } = await supabase.from('friend_requests').insert({
      from_user_id: user.id, to_user_id: toUserId, message, source,
    })
    if (error) { console.error(error); return false }
    return true
  }

  async function fetchFriendRequests(): Promise<FriendRequest[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []
    const { data, error } = await supabase.from('friend_requests')
      .select('*, from_profile:spark_profiles!friend_requests_from_user_id_fkey(*)')
      .eq('to_user_id', user.id).eq('status', 'pending')
      .order('created_at', { ascending: false })
    if (error) {
      const { data: d2 } = await supabase.from('friend_requests')
        .select('*').eq('to_user_id', user.id).eq('status', 'pending')
        .order('created_at', { ascending: false })
      friendRequests.value = (d2 || []) as FriendRequest[]
      return friendRequests.value
    }
    friendRequests.value = (data || []) as FriendRequest[]
    return friendRequests.value
  }

  async function acceptRequest(id: string): Promise<boolean> {
    const { error } = await supabase.from('friend_requests').update({
      status: 'accepted', updated_at: new Date().toISOString(),
    }).eq('id', id)
    if (error) { console.error(error); return false }
    await fetchFriends()
    await fetchFriendRequests()
    return true
  }

  async function rejectRequest(id: string): Promise<boolean> {
    const { error } = await supabase.from('friend_requests').update({
      status: 'rejected', updated_at: new Date().toISOString(),
    }).eq('id', id)
    if (error) { console.error(error); return false }
    await fetchFriendRequests()
    return true
  }

  async function removeFriend(friendId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    await supabase.from('friendships').delete().eq('user_id', user.id).eq('friend_id', friendId)
    await supabase.from('friendships').delete().eq('user_id', friendId).eq('friend_id', user.id)
    await fetchFriends()
    return true
  }

  // ====== AI 伴侣 ======

  async function fetchChatHistory(limit = 50): Promise<ChatMessage[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []
    const { data } = await supabase.from('companion_chats')
      .select('*').eq('user_id', user.id)
      .order('created_at', { ascending: true }).limit(limit)
    chatHistory.value = (data || []) as ChatMessage[]
    return chatHistory.value
  }

  /** AI 伴侣深度打通：收集各模块数据作为上下文 */
  async function gatherModuleContext(userId: string): Promise<string> {
    const contextParts: string[] = []

    // 1) 今日待办任务（规划模块）
    try {
      const today = new Date().toISOString().split('T')[0]
      const { data: tasks } = await supabase.from('planner_tasks')
        .select('title, due_date, status')
        .eq('user_id', userId).eq('status', 'pending')
        .lte('due_date', today).limit(5)
      if (tasks?.length) {
        contextParts.push(`[今日待办] ${tasks.map(t => t.title).join('、')}`)
      }
    } catch { /* 静默 */ }

    // 2) 今日日程（日程模块）
    try {
      const today = new Date().toISOString().split('T')[0]
      const { data: events } = await supabase.from('schedule_events')
        .select('title, start_time, end_time')
        .eq('user_id', userId)
        .gte('start_time', today + 'T00:00:00')
        .lte('start_time', today + 'T23:59:59')
        .order('start_time', { ascending: true }).limit(5)
      if (events?.length) {
        contextParts.push(`[今日日程] ${events.map(e => `${e.title}(${e.start_time?.slice(11, 16)})`).join('、')}`)
      }
    } catch { /* 静默 */ }

    // 3) 进行中的目标（规划模块）
    try {
      const { data: goals } = await supabase.from('goals')
        .select('title, progress')
        .eq('user_id', userId).eq('status', 'active')
        .limit(3)
      if (goals?.length) {
        contextParts.push(`[进行中目标] ${goals.map(g => `${g.title}(${g.progress}%)`).join('、')}`)
      }
    } catch { /* 静默 */ }

    // 4) 推荐文章（学长分享）
    try {
      const { data: articles } = await supabase.from('mentor_articles')
        .select('title, category')
        .eq('status', 'published').eq('is_featured', true)
        .order('like_count', { ascending: false }).limit(2)
      if (articles?.length) {
        contextParts.push(`[推荐阅读] ${articles.map(a => a.title).join('、')}`)
      }
    } catch { /* 静默 */ }

    return contextParts.length
      ? '\n\n[系统上下文 - 用户当前状态]\n' + contextParts.join('\n')
      : ''
  }

  /** 处理快捷指令 */
  async function handleQuickCommand(text: string, userId: string): Promise<string | null> {
    const trimmed = text.trim()

    // /创建任务 <内容>
    if (trimmed.startsWith('/创建任务')) {
      const taskTitle = trimmed.replace('/创建任务', '').trim()
      if (!taskTitle) return '请输入任务内容，例如：/创建任务 复习高数第三章'
      try {
        const today = new Date().toISOString().split('T')[0]
        await supabase.from('planner_tasks').insert({
          user_id: userId, title: taskTitle, status: 'pending',
          priority: 'medium', due_date: today, source: 'companion',
        })
        return `✅ 已创建今日任务「${taskTitle}」！去星火规划查看吧 🎯`
      } catch { return '创建任务失败，请稍后重试' }
    }

    // /查日程
    if (trimmed === '/查日程') {
      try {
        const today = new Date().toISOString().split('T')[0]
        const { data: events } = await supabase.from('schedule_events')
          .select('title, start_time, end_time')
          .eq('user_id', userId)
          .gte('start_time', today + 'T00:00:00')
          .lte('start_time', today + 'T23:59:59')
          .order('start_time', { ascending: true }).limit(10)
        if (!events?.length) return '📅 今天没有日程安排，可以好好放松一下！或者去星火日程添加新的事件 ✨'
        const list = events.map(e => `• ${e.start_time?.slice(11, 16)} ${e.title}`).join('\n')
        return `📅 **今日日程**\n\n${list}\n\n记得按时完成哦 💪`
      } catch { return '查询日程失败' }
    }

    // /发动态 <内容>
    if (trimmed.startsWith('/发动态')) {
      const content = trimmed.replace('/发动态', '').trim()
      if (!content) return '请输入动态内容，例如：/发动态 今天学习效率好高！'
      const ok = await postMoment(content, undefined, undefined, 'friends')
      return ok ? `📸 动态发布成功！\n\n「${content}」` : '发布失败，请稍后重试'
    }

    // /推荐文章
    if (trimmed === '/推荐文章') {
      try {
        const { data: articles } = await supabase.from('mentor_articles')
          .select('title, category, like_count')
          .eq('status', 'published')
          .order('like_count', { ascending: false }).limit(3)
        if (!articles?.length) return '📚 暂无推荐文章，你可以去学长分享模块看看'
        const list = articles.map(a => `• ${a.title} (❤️${a.like_count})`).join('\n')
        return `📚 **热门学长文章**\n\n${list}\n\n去学长分享模块查看详情吧 🎓`
      } catch { return '获取推荐失败' }
    }

    return null  // 非指令
  }

  /** 发送消息给 AI 伴侣 */
  async function sendToCompanion(
    userMessage: string,
    onChunk: (text: string) => void
  ): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return ''

    // 保存用户消息
    await supabase.from('companion_chats').insert({
      user_id: user.id, role: 'user', content: userMessage,
    })

    // 检查快捷指令
    const cmdResult = await handleQuickCommand(userMessage, user.id)
    if (cmdResult) {
      onChunk(cmdResult)
      await supabase.from('companion_chats').insert({
        user_id: user.id, role: 'assistant', content: cmdResult,
      })
      return cmdResult
    }

    // 收集模块上下文
    const moduleCtx = await gatherModuleContext(user.id)

    // 最近10条对话上下文
    const recentCtx = chatHistory.value.slice(-10).map(m => ({
      role: m.role === 'assistant' ? 'assistant' as const : 'user' as const,
      content: m.content,
    }))

    try {
      const resp = await fetch('/api/mimo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'MiMo-7B-RL',
          messages: [
            { role: 'system', content: COMPANION_SYSTEM_PROMPT + moduleCtx },
            ...recentCtx,
            { role: 'user', content: userMessage },
          ],
          temperature: 0.7, max_tokens: 500, stream: true,
        }),
      })

      let fullReply = ''
      if (resp.ok && resp.body) {
        const reader = resp.body.getReader()
        const decoder = new TextDecoder()
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const lines = decoder.decode(value, { stream: true }).split('\n')
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const d = line.slice(6).trim()
              if (d === '[DONE]') continue
              try {
                const p = JSON.parse(d)
                fullReply += p.choices?.[0]?.delta?.content || ''
                onChunk(fullReply)
              } catch { /* skip */ }
            }
          }
        }
      }

      // 非流式降级
      if (!fullReply) {
        const r2 = await fetch('/api/mimo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'MiMo-7B-RL',
            messages: [
              { role: 'system', content: COMPANION_SYSTEM_PROMPT + moduleCtx },
              ...recentCtx,
              { role: 'user', content: userMessage },
            ],
            temperature: 0.7, max_tokens: 500,
          }),
        })
        if (r2.ok) {
          const result = await r2.json()
          fullReply = result.choices?.[0]?.message?.content || '同学你好！我暂时有点忙 🌟'
          onChunk(fullReply)
        }
      }

      if (!fullReply) {
        fullReply = '同学你好！网络不太稳定，但我一直在 🌟'
        onChunk(fullReply)
      }

      await supabase.from('companion_chats').insert({
        user_id: user.id, role: 'assistant', content: fullReply,
      })
      return fullReply
    } catch (e) {
      console.error('AI对话失败:', e)
      const fb = '同学你好！网络暂时不稳，但我一直在这里 🌟'
      onChunk(fb)
      return fb
    }
  }

  async function clearChatHistory(): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    await supabase.from('companion_chats').delete().eq('user_id', user.id)
    chatHistory.value = []
    return true
  }

  // ====== 朋友圈动态 V2 ======

  /** 获取好友动态（含有效期过滤） */
  async function fetchMoments(page = 1, pageSize = 20): Promise<Moment[]> {
    loading.value = true
    try {
      const from = (page - 1) * pageSize
      const { data, error } = await supabase.from('companion_moments')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, from + pageSize - 1)
      if (error) throw error

      // 标记是否已点赞
      const { data: { user } } = await supabase.auth.getUser()
      if (user && data?.length) {
        const ids = data.map(m => m.id)
        const { data: likes } = await supabase.from('moment_likes')
          .select('moment_id').eq('user_id', user.id).in('moment_id', ids)
        const likedSet = new Set(likes?.map(l => l.moment_id) || [])
        data.forEach((m: Record<string, unknown>) => { m.is_liked = likedSet.has(m.id as string) })
      }
      moments.value = (data || []) as Moment[]
      return moments.value
    } finally { loading.value = false }
  }

  /** 获取好友广场动态（公开+show_in_plaza + 推荐算法排序） */
  async function fetchPlazaMoments(page = 1, pageSize = 20): Promise<Moment[]> {
    const from = (page - 1) * pageSize
    const { data, error } = await supabase.from('companion_moments')
      .select('*')
      .eq('visibility', 'public')
      .eq('show_in_plaza', true)
      .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
      .order('created_at', { ascending: false })
      .range(from, from + pageSize - 1)
    if (error) { console.error(error); return [] }

    // 简单推荐权重排序：互动多的靠前
    const sorted = (data || []).sort((a: Record<string, number>, b: Record<string, number>) => {
      const scoreA = (a.like_count || 0) * 2 + (a.comment_count || 0) * 3
      const scoreB = (b.like_count || 0) * 2 + (b.comment_count || 0) * 3
      return scoreB - scoreA
    })
    plazaMoments.value = sorted as Moment[]
    return plazaMoments.value
  }

  /** 发布动态（增强版：视频 + 有效期 + 广场推送） */
  async function postMoment(
    content: string,
    mediaFiles?: File[],
    videoFiles?: File[],
    visibility: 'public' | 'friends' | 'private' = 'friends',
    showInPlaza = false,
    expiryDays: number | null = null,
  ): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    try {
      // 上传图片
      const mediaUrls: string[] = []
      if (mediaFiles?.length) {
        for (const f of mediaFiles) {
          const ext = f.name.split('.').pop()
          const path = `companion/${user.id}/moments/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
          const { error: e } = await supabase.storage.from('campus-wall').upload(path, f, { contentType: f.type })
          if (e) throw e
          mediaUrls.push(supabase.storage.from('campus-wall').getPublicUrl(path).data.publicUrl)
        }
      }

      // 上传视频
      const videoUrls: string[] = []
      if (videoFiles?.length) {
        for (const f of videoFiles) {
          const ext = f.name.split('.').pop()
          const path = `companion/${user.id}/videos/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
          const { error: e } = await supabase.storage.from('campus-wall').upload(path, f, { contentType: f.type })
          if (e) throw e
          videoUrls.push(supabase.storage.from('campus-wall').getPublicUrl(path).data.publicUrl)
        }
      }

      // 计算过期时间
      const expiresAt = expiryDays
        ? new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString()
        : null

      const { error } = await supabase.from('companion_moments').insert({
        user_id: user.id, content,
        media_urls: mediaUrls, video_urls: videoUrls,
        visibility, show_in_plaza: visibility === 'public' ? showInPlaza : false,
        expires_at: expiresAt,
      })
      if (error) throw error
      return true
    } catch (e) {
      console.error('发布失败:', e)
      return false
    }
  }

  async function toggleMomentLike(momentId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    const { data: ex } = await supabase.from('moment_likes')
      .select('id').eq('user_id', user.id).eq('moment_id', momentId).maybeSingle()
    if (ex) { await supabase.from('moment_likes').delete().eq('id', ex.id) }
    else { await supabase.from('moment_likes').insert({ user_id: user.id, moment_id: momentId }) }
    const m = moments.value.find(m => m.id === momentId) || plazaMoments.value.find(m => m.id === momentId)
    if (m) { m.is_liked = !ex; m.like_count += ex ? -1 : 1 }
    return true
  }

  async function commentMoment(momentId: string, content: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    const { error } = await supabase.from('moment_comments').insert({
      moment_id: momentId, user_id: user.id, content,
    })
    return !error
  }

  async function fetchMomentComments(momentId: string): Promise<MomentComment[]> {
    const { data } = await supabase.from('moment_comments')
      .select('*').eq('moment_id', momentId)
      .order('created_at', { ascending: true })
    return (data || []) as MomentComment[]
  }

  /** 转发动态到校园墙 */
  async function shareMomentToWall(moment: Moment): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    const authorName = myProfile.value?.nickname || user.email?.split('@')[0] || '同学'
    const { error } = await supabase.from('posts').insert({
      content: `📸 朋友圈分享\n\n${moment.content}\n\n#星火伴侣`,
      author_id: user.id, author_name: authorName,
      category: 'moment', media_urls: moment.media_urls,
      tags: ['朋友圈', '星火伴侣'],
    })
    return !error
  }

  // ====== 群聊 ======

  /** 创建群聊 */
  async function createGroup(name: string, memberIds: string[], aiEnabled = true): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    try {
      const { data: group, error } = await supabase.from('group_chats').insert({
        name, owner_id: user.id, ai_enabled: aiEnabled,
      }).select().single()
      if (error) throw error

      // 添加群主
      await supabase.from('group_members').insert({
        group_id: group.id, user_id: user.id, role: 'owner',
      })
      // 添加成员
      for (const mid of memberIds) {
        try {
          await supabase.from('group_members').insert({
            group_id: group.id, user_id: mid, role: 'member',
          })
        } catch {
          // 忽略单个成员插入失败，避免影响整个群创建流程
        }
      }
      return group.id
    } catch (e) { console.error(e); return null }
  }

  /** 获取我的群聊 */
  async function fetchGroups(): Promise<GroupChat[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []
    const { data: memberships } = await supabase.from('group_members')
      .select('group_id').eq('user_id', user.id)
    if (!memberships?.length) { groups.value = []; return [] }
    const gids = memberships.map(m => m.group_id)
    const { data } = await supabase.from('group_chats')
      .select('*').in('id', gids).order('created_at', { ascending: false })
    groups.value = (data || []) as GroupChat[]
    return groups.value
  }

  /** 获取群消息 */
  async function fetchGroupMessages(groupId: string, limit = 50): Promise<GroupMessage[]> {
    const { data } = await supabase.from('group_messages')
      .select('*').eq('group_id', groupId)
      .order('created_at', { ascending: true }).limit(limit)
    return (data || []) as GroupMessage[]
  }

  /** 发送群消息（真人） */
  async function sendGroupMessage(groupId: string, content: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    const { error } = await supabase.from('group_messages').insert({
      group_id: groupId, sender_id: user.id, sender_type: 'user', content,
    })
    if (error) { console.error(error); return false }

    // 如果群聊开启了 AI，检查是否@AI或触发自动回复
    if (content.includes('@星火') || content.includes('@AI')) {
      await triggerGroupAI(groupId, content)
    }
    return true
  }

  /** 群聊AI自动回复 */
  async function triggerGroupAI(groupId: string, triggerMsg: string): Promise<void> {
    try {
      const resp = await fetch('/api/mimo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'MiMo-7B-RL',
          messages: [
            { role: 'system', content: '你是群聊里的AI助手「星火」，简洁有趣地参与讨论，每次≤100字。' },
            { role: 'user', content: triggerMsg.replace(/@星火|@AI/g, '').trim() },
          ],
          temperature: 0.8, max_tokens: 200,
        }),
      })
      if (resp.ok) {
        const r = await resp.json()
        const reply = r.choices?.[0]?.message?.content || '收到！🌟'
        await supabase.from('group_messages').insert({
          group_id: groupId, sender_id: null, sender_type: 'ai', content: reply,
        })
      }
    } catch { /* 静默 */ }
  }

  // ====== 工具 ======

  function formatTimeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return '刚刚'
    if (mins < 60) return `${mins}分钟前`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}小时前`
    const days = Math.floor(hours / 24)
    if (days < 30) return `${days}天前`
    return dateStr.slice(0, 10)
  }

  return {
    myProfile, friends, friendRequests, chatHistory, moments, plazaMoments, groups, loading,
    // 星火ID
    fetchMyProfile, updateProfile, changeSparkId, getMyQRData, searchBySparkId, addFriendByQR,
    // 好友
    fetchFriends, sendFriendRequest, fetchFriendRequests, acceptRequest, rejectRequest, removeFriend,
    // AI
    fetchChatHistory, sendToCompanion, clearChatHistory,
    // 动态
    fetchMoments, fetchPlazaMoments, postMoment, toggleMomentLike, commentMoment,
    fetchMomentComments, shareMomentToWall,
    // 群聊
    createGroup, fetchGroups, fetchGroupMessages, sendGroupMessage,
    // 工具
    formatTimeAgo, MOMENT_EXPIRY_OPTIONS,
  }
}
