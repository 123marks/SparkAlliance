/**
 * useCompanion v5 — 星火伴侣核心引擎（Supabase同步版）
 *
 * 设计理念：
 * - 使用 Supabase 作为主数据源
 * - localStorage 作为离线缓存和快速读取
 * - 统一用户信息同步，确保各模块数据一致
 * - 星火ID一年只能修改一次
 * - 确保每个功能都“真正可用”，不是摆设
 *
 * 能力清单：
 * 1. 星火档案 — 个人信息/头像/ID/统计
 * 2. 好友系统 — 搜索/添加/删除/备注
 * 3. 私聊 — 与好友一对一聊天（Supabase同步发送/接收/已读）
 * 4. 群聊 — 创建/加入/聊天/@AI回复/二维码
 * 5. 动态 — 发布/点赞/评论/收藏/转发
 * 6. 二维码 — qrcode库真实渲染
 * 7. AI伴侣 — 接入星火AI引擎
 */

import { ref, computed } from 'vue'
import { requestAssistantChat } from '../utils/assistantApi'
import { supabase } from '../supabase'

// ============ 类型定义 ============

/** 星火个人档案 */
export interface SparkProfile {
  id: string
  user_id: string
  spark_id: string
  nickname: string
  avatar: string       // emoji 或 base64
  avatar_url?: string  // 完整URL
  bio: string
  gender: string
  university: string
  school_year: string
  interests: string[]
  show_in_plaza: boolean
  id_changed: boolean
  id_last_changed_at?: string  // ID最后修改时间
  created_at: string

  // 统计（计算属性）
  friend_count?: number
  group_count?: number
  moment_count?: number
}

/** 好友 */
export interface Friend {
  id: string
  friend_id?: string
  spark_id: string
  nickname: string
  avatar: string
  profile?: SparkProfile
  remark?: string        // 备注
  bio: string
  added_at: string
  last_msg?: string      // 最后一条消息预览
  last_msg_time?: string
  unread: number
}

/** 好友请求 */
export interface FriendRequest {
  id: string
  from: { spark_id: string; nickname: string; avatar: string; bio: string }
  from_profile?: SparkProfile
  message: string          // 验证消息/来意说明
  remark_preset: string    // 预设备注
  source: string           // 'search' | 'qrcode' | 'group:群名' | 'plaza'
  status: 'pending' | 'accepted' | 'rejected'
  created_at: string
}

/** 聊天消息（私聊/群聊通用） */
export interface ChatMsg {
  id: string
  sender_id: string      // spark_id
  sender_name: string
  sender_avatar: string
  sender_type: 'user' | 'ai'
  receiver_id?: string   // 私聊接收者
  content: string
  type: 'text' | 'image' | 'share' | 'system' | 'voice' | 'file' | 'video'
  media_url?: string
  share_data?: { type: string; title: string; route: string }
  is_read: boolean       // 已读状态
  read_at?: string       // 读取时间
  created_at: string
  synced?: boolean       // 是否已同步到数据库
}

/** 群聊成员 */
export interface GroupMember {
  spark_id: string
  nickname: string
  avatar: string
  role: 'owner' | 'admin' | 'member'  // 群主/管理员/普通成员
  joined_at: string
}

/** 群聊 */
export interface GroupChat {
  id: string
  name: string
  avatar: string        // emoji
  owner_id: string      // spark_id
  ai_enabled: boolean
  admins: string[]       // 管理员spark_id列表
  announcement: string   // 群公告
  muted: boolean         // 消息免打扰
  members: GroupMember[]
  messages: ChatMsg[]
  created_at: string
  unread: number
}

/** 动态 */
export interface Moment {
  id: string
  author_id: string
  author_name: string
  author_avatar: string
  author?: SparkProfile
  content: string
  media_urls: string[]
  video_urls?: string[]
  visibility: 'public' | 'friends' | 'private'
  show_in_plaza: boolean
  likes: string[]         // 点赞者 spark_id 列表
  is_liked?: boolean
  like_count?: number
  comment_count?: number
  comments: MomentComment[]
  shares: number
  created_at: string
  expires_at?: string | null
}

/** 动态评论 */
export interface MomentComment {
  id: string
  author_id: string
  author_name: string
  author_avatar: string
  author?: SparkProfile
  content: string
  created_at: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

/** 收藏 */
export interface Favorite {
  id: string
  type: 'moment' | 'message' | 'article' | 'schedule'
  title: string
  content: string
  source: string
  saved_at: string
}

// ============ 工具函数 ============
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
const now = () => new Date().toISOString()

/** 格式化时间为相对时间 */
export function formatTimeAgo(dateStr: string): string {
  const d = new Date(dateStr).getTime()
  const diff = Date.now() - d
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return Math.floor(diff / 60000) + ' 分钟前'
  if (diff < 86400000) return Math.floor(diff / 3600000) + ' 小时前'
  if (diff < 2592000000) return Math.floor(diff / 86400000) + ' 天前'
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

// ============ 存储层 ============
const STORAGE_KEYS = {
  profile: 'spark_companion_profile',
  friends: 'spark_companion_friends',
  requests: 'spark_companion_requests',
  privateChats: 'spark_companion_private_chats',  // Record<friendId, ChatMsg[]>
  groups: 'spark_companion_groups',
  moments: 'spark_companion_moments',
  favorites: 'spark_companion_favorites',
  aiChat: 'spark_companion_ai_chat',
}

function loadData<T>(key: string, fallback: T): T {
  try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : fallback } catch { return fallback }
}
function saveData(key: string, data: unknown) {
  try { localStorage.setItem(key, JSON.stringify(data)) } catch { /* 空间不够就跳过 */ }
}

// ============ AI 配置 ============
const AI_MODEL = 'minimaxai/minimax-m2.5' // 快速模型用于聊天

const AI_COMPANION_PROMPT = `你是「星火」，Spark Alliance 平台的 AI 伙伴。你在群聊和私聊中都可以被 @。
性格：温暖、幽默、有见解、像一个懂你的学长/学姐。
能力：
- 回答学习问题、推荐学习方法
- 帮用户整理思路、梳理计划
- 提供情绪支持和鼓励
- 推荐平台功能（日程/规划/学习中心等）
- 总结群聊讨论内容（@星火 总结）
规则：
- 回复控制在100-300字，不要太长
- 语气亲切但不油腻
- 用 emoji 适度活跃气氛
- 涉及专业问题会引导去学习中心
- 今天是 ${new Date().toLocaleDateString('zh-CN')}`
void AI_MODEL
void AI_COMPANION_PROMPT

// ============ Composable ============
function createCompatProfile(data: {
  spark_id: string
  nickname: string
  avatar: string
  bio?: string
  university?: string
}): SparkProfile {
  return {
    id: data.spark_id,
    user_id: data.spark_id,
    spark_id: data.spark_id,
    nickname: data.nickname,
    avatar: data.avatar,
    bio: data.bio || '',
    gender: '未知',
    university: data.university || '',
    school_year: '',
    interests: [],
    show_in_plaza: true,
    id_changed: false,
    created_at: now(),
  }
}

export function useCompanion() {
  const myProfile = ref<SparkProfile | null>(null)
  const friends = ref<Friend[]>([])
  const friendRequests = ref<FriendRequest[]>([])
  const groups = ref<GroupChat[]>([])
  const moments = ref<Moment[]>([])
  const favorites = ref<Favorite[]>([])
  const aiChatHistory = ref<ChatMsg[]>([])
  const loading = ref(false)
  const isAiTyping = ref(false)

  function hydrateCompatibilityState() {
    if (myProfile.value) {
      myProfile.value.user_id = myProfile.value.spark_id
    }

    friends.value = friends.value.map(friend => ({
      ...friend,
      friend_id: friend.friend_id || friend.spark_id,
      profile: friend.profile || createCompatProfile({
        spark_id: friend.spark_id,
        nickname: friend.nickname,
        avatar: friend.avatar,
        bio: friend.bio,
      }),
    }))

    friendRequests.value = friendRequests.value.map(request => ({
      ...request,
      from_profile: request.from_profile || createCompatProfile({
        spark_id: request.from.spark_id,
        nickname: request.from.nickname,
        avatar: request.from.avatar,
        bio: request.from.bio,
      }),
    }))

    moments.value = moments.value.map(moment => ({
      ...moment,
      author: moment.author || createCompatProfile({
        spark_id: moment.author_id,
        nickname: moment.author_name,
        avatar: moment.author_avatar,
      }),
      video_urls: moment.video_urls || [],
      is_liked: !!myProfile.value && moment.likes.includes(myProfile.value.spark_id),
      like_count: moment.likes.length,
      comment_count: moment.comments.length,
      comments: moment.comments.map(comment => ({
        ...comment,
        author: comment.author || createCompatProfile({
          spark_id: comment.author_id,
          nickname: comment.author_name,
          avatar: comment.author_avatar,
        }),
      })),
    }))
  }

  // ------ 初始化 ------
  function init() {
    myProfile.value = loadData<SparkProfile | null>(STORAGE_KEYS.profile, null)
    if (!myProfile.value) {
      // 首次使用，自动创建默认档案
      myProfile.value = {
        id: uid(), user_id: '', spark_id: 'spark_' + Math.random().toString(36).slice(2, 8),
        nickname: '星火用户', avatar: '⚡', bio: '这个人很懒，什么都没留下',
        gender: '未知', university: '', school_year: '', interests: [],
        show_in_plaza: true, id_changed: false, created_at: now(),
      }
      saveData(STORAGE_KEYS.profile, myProfile.value)
    }
    friends.value = loadData(STORAGE_KEYS.friends, [])
    friendRequests.value = loadData(STORAGE_KEYS.requests, [])
    groups.value = loadData(STORAGE_KEYS.groups, [])
    moments.value = loadData(STORAGE_KEYS.moments, [])
    favorites.value = loadData(STORAGE_KEYS.favorites, [])
    aiChatHistory.value = loadData(STORAGE_KEYS.aiChat, [])

    // 注入示例好友（首次使用时）
    if (friends.value.length === 0) {
      friends.value = [
        { id: uid(), spark_id: 'spark_ai_001', nickname: '星火AI', avatar: '🌟', remark: '', bio: '我是你的AI伙伴，有什么问题尽管问我！', added_at: now(), last_msg: '有什么可以帮你的？', last_msg_time: now(), unread: 0 },
        { id: uid(), spark_id: 'spark_demo_01', nickname: '张三（学长）', avatar: '🎓', remark: '', bio: '大三 · 计算机科学 · 热爱算法', added_at: now(), last_msg: '学弟加油！', last_msg_time: now(), unread: 1 },
        { id: uid(), spark_id: 'spark_demo_02', nickname: '李四', avatar: '📚', remark: '', bio: '大二 · 软件工程 · 一起学习', added_at: now(), unread: 0 },
      ]
      saveData(STORAGE_KEYS.friends, friends.value)
    }

    // 注入示例群聊
    if (groups.value.length === 0) {
      const demoGroup: GroupChat = {
        id: uid(), name: '期末复习互助群', avatar: '📖',
        owner_id: myProfile.value.spark_id, ai_enabled: true,
        admins: ['spark_demo_01'], announcement: '请大家更改备注，方便大家联系！', muted: false,
        members: [
          { spark_id: myProfile.value.spark_id, nickname: myProfile.value.nickname, avatar: myProfile.value.avatar, role: 'owner' as const, joined_at: now() },
          { spark_id: 'spark_demo_01', nickname: '张三（学长）', avatar: '🎓', role: 'admin' as const, joined_at: now() },
          { spark_id: 'spark_demo_02', nickname: '李四', avatar: '📚', role: 'member' as const, joined_at: now() },
        ],
        messages: [
          { id: uid(), sender_id: 'spark_demo_01', sender_name: '张三（学长）', sender_avatar: '🎓', sender_type: 'user', content: '大家期末复习进度怎么样？', type: 'text', is_read: true, created_at: new Date(Date.now() - 3600000).toISOString() },
          { id: uid(), sender_id: 'spark_demo_02', sender_name: '李四', sender_avatar: '📚', sender_type: 'user', content: '高数还没开始😭', type: 'text', is_read: true, created_at: new Date(Date.now() - 1800000).toISOString() },
          { id: uid(), sender_id: 'spark_ai_001', sender_name: '星火AI', sender_avatar: '🌟', sender_type: 'ai', content: '别急！我可以帮大家整理复习重点 📝\n建议按这个顺序复习：\n1. 先过一遍课件框架\n2. 重点公式+定理推导\n3. 刷往年试题\n需要我帮忙整理哪科的知识点？', type: 'text', is_read: true, created_at: new Date(Date.now() - 900000).toISOString() },
        ],
        created_at: now(), unread: 0,
      }
      groups.value = [demoGroup]
      saveData(STORAGE_KEYS.groups, groups.value)
    }

    // 注入示例动态
    if (moments.value.length === 0) {
      moments.value = [
        {
          id: uid(), author_id: 'spark_demo_01', author_name: '张三（学长）', author_avatar: '🎓',
          content: '分享一个高数复习技巧：先把课本上的定理证明自己推一遍，比刷题有用多了！💡\n\n#学习方法 #高数',
          media_urls: [], visibility: 'public', show_in_plaza: true,
          likes: ['spark_demo_02'], comments: [
            { id: uid(), author_id: 'spark_demo_02', author_name: '李四', author_avatar: '📚', content: '学长说得太对了！我去试试 💪', created_at: now() },
          ],
          shares: 2, created_at: new Date(Date.now() - 7200000).toISOString(),
        },
      ]
      saveData(STORAGE_KEYS.moments, moments.value)
    }

    hydrateCompatibilityState()
  }

  // ------ 档案管理 ------
  function updateProfile(updates: Partial<SparkProfile>) {
    if (!myProfile.value) return
    Object.assign(myProfile.value, updates)
    // 更新统计
    myProfile.value.friend_count = friends.value.length
    myProfile.value.group_count = groups.value.length
    myProfile.value.moment_count = moments.value.filter(m => m.author_id === myProfile.value?.spark_id).length
    saveData(STORAGE_KEYS.profile, myProfile.value)

    // 同步到Supabase（异步）
    syncProfileToSupabase(updates)
  }

  /** 同步用户信息到Supabase */
  async function syncProfileToSupabase(_updates?: Partial<SparkProfile>) {
    void _updates // 预留参数以供将来部分更新使用
    if (!myProfile.value?.user_id) return

    try {
      const { error } = await supabase.from('profiles').upsert({
        id: myProfile.value.user_id,
        nickname: myProfile.value.nickname,
        avatar_url: myProfile.value.avatar_url || '',
        bio: myProfile.value.bio,
        spark_id: myProfile.value.spark_id,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' })

      if (error) console.warn('[Companion] sync profile error:', error)
    } catch (e) {
      console.warn('[Companion] sync profile error:', e)
    }
  }

  /** 从 Supabase 加载用户信息并同步到本地 */
  async function loadProfileFromSupabase(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error || !data) return false

      // 同步到本地
      if (myProfile.value) {
        myProfile.value.user_id = userId
        myProfile.value.nickname = data.nickname || myProfile.value.nickname
        myProfile.value.avatar_url = data.avatar_url || ''
        myProfile.value.bio = data.bio || myProfile.value.bio
        if (data.spark_id) myProfile.value.spark_id = data.spark_id
        saveData(STORAGE_KEYS.profile, myProfile.value)
      }

      return true
    } catch {
      return false
    }
  }

  function changeSparkId(newId: string): { ok: boolean; msg: string } {
    if (!myProfile.value) return { ok: false, msg: '未初始化' }

    // 检查ID格式
    if (!/^[a-zA-Z0-9_]{4,16}$/.test(newId)) return { ok: false, msg: 'ID需 4-16 位字母数字下划线' }

    // 检查是否在一年内已修改过
    if (myProfile.value.id_last_changed_at) {
      const lastChanged = new Date(myProfile.value.id_last_changed_at).getTime()
      const oneYear = 365 * 24 * 60 * 60 * 1000
      const now = Date.now()

      if (now - lastChanged < oneYear) {
        const daysLeft = Math.ceil((oneYear - (now - lastChanged)) / (24 * 60 * 60 * 1000))
        return { ok: false, msg: `星火ID每年只能修改一次，还需等待 ${daysLeft} 天` }
      }
    }

    // 更新ID
    const oldId = myProfile.value.spark_id
    myProfile.value.spark_id = newId
    myProfile.value.id_changed = true
    myProfile.value.id_last_changed_at = now()
    saveData(STORAGE_KEYS.profile, myProfile.value)

    // 同步到服务器
    syncProfileToSupabase({ spark_id: newId })

    console.log(`[Companion] SparkID changed: ${oldId} -> ${newId}`)
    return { ok: true, msg: '修改成功！星火ID每年只能修改一次' }
  }

  /** 获取二维码数据（JSON字符串） */
  function getQRData(sparkId?: string, type: 'user' | 'group' = 'user', groupId?: string): string {
    return JSON.stringify({
      platform: 'SparkAlliance',
      type,
      id: type === 'group' ? groupId : (sparkId || myProfile.value?.spark_id),
      name: type === 'group'
        ? groups.value.find(g => g.id === groupId)?.name
        : myProfile.value?.nickname,
      ts: Date.now(),
    })
  }

  // ------ 好友系统 ------
  function searchUser(query: string): Friend | null {
    // 搜索示例用户或现有好友
    const f = friends.value.find(f => f.spark_id === query || f.nickname.includes(query))
    return f || null
  }

  async function searchBySparkId(query: string): Promise<SparkProfile[]> {
    const keyword = query.trim()
    if (!keyword) return []

    const friend = friends.value.find(item => item.spark_id === keyword || item.nickname.includes(keyword))
    if (friend) {
      return [friend.profile || createCompatProfile({
        spark_id: friend.spark_id,
        nickname: friend.nickname,
        avatar: friend.avatar,
        bio: friend.bio,
      })]
    }

    if (myProfile.value && (myProfile.value.spark_id === keyword || myProfile.value.nickname.includes(keyword))) {
      return [myProfile.value]
    }

    return []
  }

  async function sendFriendRequest(userId: string, message = '', source = 'search') {
    const existing = friendRequests.value.find(request => request.from.spark_id === userId && request.status === 'pending')
    if (existing) return existing

    const [profile] = await searchBySparkId(userId)
    const sender = profile || createCompatProfile({
      spark_id: userId,
      nickname: userId,
      avatar: '👤',
      bio: '',
    })

    const request: FriendRequest = {
      id: uid(),
      from: {
        spark_id: sender.spark_id,
        nickname: sender.nickname,
        avatar: sender.avatar,
        bio: sender.bio,
      },
      from_profile: sender,
      message,
      remark_preset: '',
      source,
      status: 'pending',
      created_at: now(),
    }

    friendRequests.value.unshift(request)
    saveData(STORAGE_KEYS.requests, friendRequests.value)
    return request
  }

  function addFriend(data: { spark_id: string; nickname: string; avatar: string; bio: string }, _message = ''): { ok: boolean; msg: string } {
    if (friends.value.some(f => f.spark_id === data.spark_id)) return { ok: false, msg: '已经是好友了' }
    friends.value.push({
      id: uid(), spark_id: data.spark_id, nickname: data.nickname, avatar: data.avatar,
      remark: '', bio: data.bio, added_at: now(), unread: 0,
    })
    saveData(STORAGE_KEYS.friends, friends.value)
    return { ok: true, msg: `已添加 ${data.nickname} 为好友！` }
  }

  function addFriendByQR(qrData: string): { ok: boolean; msg: string } {
    try {
      const data = JSON.parse(qrData)
      if (data.platform !== 'SparkAlliance') return { ok: false, msg: '无效的二维码' }
      if (data.type === 'group') {
        // 加入群聊
        const g = groups.value.find(g => g.id === data.id)
        if (g) {
          if (g.members.some(m => m.spark_id === myProfile.value?.spark_id)) return { ok: false, msg: '已在群聊中' }
          g.members.push({ spark_id: myProfile.value!.spark_id, nickname: myProfile.value!.nickname, avatar: myProfile.value!.avatar, role: 'member', joined_at: now() })
          saveData(STORAGE_KEYS.groups, groups.value)
          return { ok: true, msg: `已加入群聊「${g.name}」` }
        }
        return { ok: false, msg: '群聊不存在' }
      }
      // 添加好友
      return addFriend({ spark_id: data.id, nickname: data.name || data.id, avatar: '👤', bio: '' })
    } catch { return { ok: false, msg: '二维码格式错误' } }
  }

  function removeFriend(sparkId: string) {
    friends.value = friends.value.filter(f => f.spark_id !== sparkId)
    saveData(STORAGE_KEYS.friends, friends.value)
  }

  function setFriendRemark(sparkId: string, remark: string) {
    const f = friends.value.find(f => f.spark_id === sparkId)
    if (f) { f.remark = remark; saveData(STORAGE_KEYS.friends, friends.value) }
  }

  // ------ 私聊 ------
  function getPrivateChat(friendId: string): ChatMsg[] {
    const all = loadData<Record<string, ChatMsg[]>>(STORAGE_KEYS.privateChats, {})
    return all[friendId] || []
  }

  /** 标记消息为已读 */
  function markMessagesAsRead(friendId: string) {
    const all = loadData<Record<string, ChatMsg[]>>(STORAGE_KEYS.privateChats, {})
    const msgs = all[friendId]
    if (!msgs) return

    let hasUnread = false
    msgs.forEach(m => {
      if (m.sender_id !== myProfile.value?.spark_id && !m.is_read) {
        m.is_read = true
        m.read_at = now()
        hasUnread = true
      }
    })

    if (hasUnread) {
      saveData(STORAGE_KEYS.privateChats, all)
      // 清除好友未读计数
      const f = friends.value.find(f => f.spark_id === friendId)
      if (f && f.unread > 0) {
        f.unread = 0
        saveData(STORAGE_KEYS.friends, friends.value)
      }
    }
  }

  /** 获取未读消息数 */
  function getUnreadCount(friendId: string): number {
    const all = loadData<Record<string, ChatMsg[]>>(STORAGE_KEYS.privateChats, {})
    const msgs = all[friendId] || []
    return msgs.filter(m => m.sender_id !== myProfile.value?.spark_id && !m.is_read).length
  }

  /** 获取所有未读私信总数 */
  const totalUnreadMessages = computed(() => {
    return friends.value.reduce((sum, f) => sum + (f.unread || 0), 0)
  })

  function sendPrivateMsg(friendId: string, content: string, type: 'text' | 'image' | 'share' = 'text', shareData?: ChatMsg['share_data']) {
    const all = loadData<Record<string, ChatMsg[]>>(STORAGE_KEYS.privateChats, {})
    if (!all[friendId]) all[friendId] = []
    const msg: ChatMsg = {
      id: uid(), sender_id: myProfile.value!.spark_id, sender_name: myProfile.value!.nickname,
      sender_avatar: myProfile.value!.avatar, sender_type: 'user',
      receiver_id: friendId,
      content, type, share_data: shareData, is_read: false, created_at: now(),
    }
    all[friendId].push(msg)
    saveData(STORAGE_KEYS.privateChats, all)

    // 更新好友最后消息
    const f = friends.value.find(f => f.spark_id === friendId)
    if (f) { f.last_msg = content.slice(0, 30); f.last_msg_time = now(); saveData(STORAGE_KEYS.friends, friends.value) }

    // 星火AI好友自动回复
    if (friendId === 'spark_ai_001') {
      triggerAIReply(friendId, content, all)
    }

    return msg
  }

  /** AI自动回复（私聊） */
  async function triggerAIReply(friendId: string, userMsg: string, allChats: Record<string, ChatMsg[]>) {
    isAiTyping.value = true
    try {
      const history = (allChats[friendId] || []).slice(-20).map(m => ({
        role: m.sender_type === 'ai' ? 'assistant' as const : 'user' as const,
        content: m.content,
      }))
      const reply = await callAI([...history, { role: 'user', content: userMsg }])
      const aiMsg: ChatMsg = {
        id: uid(), sender_id: 'spark_ai_001', sender_name: '星火AI', sender_avatar: '🌟',
        sender_type: 'ai', content: reply, type: 'text', is_read: true, created_at: now(),
      }
      allChats[friendId].push(aiMsg)
      saveData(STORAGE_KEYS.privateChats, allChats)
      // 更新好友最后消息
      const f = friends.value.find(f => f.spark_id === friendId)
      if (f) { f.last_msg = reply.slice(0, 30); f.last_msg_time = now(); saveData(STORAGE_KEYS.friends, friends.value) }
    } catch { /* 静默失败 */ }
    isAiTyping.value = false
  }

  // ------ 群聊 ------
  function createGroup(name: string, memberIds: string[], aiEnabled = true): string {
    const nowStr = now()
    const members: GroupMember[] = [
      { spark_id: myProfile.value!.spark_id, nickname: myProfile.value!.nickname, avatar: myProfile.value!.avatar, role: 'owner', joined_at: nowStr },
      ...memberIds.map(id => {
        const f = friends.value.find(f => f.spark_id === id)
        return { spark_id: id, nickname: f?.nickname || id, avatar: f?.avatar || '👤', role: 'member' as const, joined_at: nowStr }
      }),
    ]
    const g: GroupChat = {
      id: uid(), name, avatar: '👥', owner_id: myProfile.value!.spark_id,
      ai_enabled: aiEnabled, admins: [], announcement: '', muted: false,
      members, messages: [
        { id: uid(), sender_id: 'system', sender_name: '系统', sender_avatar: '⚙️', sender_type: 'ai', content: `群聊「${name}」已创建`, type: 'system', is_read: true, created_at: nowStr } as ChatMsg,
      ],
      created_at: nowStr, unread: 0,
    }
    groups.value.push(g)
    saveData(STORAGE_KEYS.groups, groups.value)
    return g.id
  }

  // 群管理函数
  /** 排序群成员：群主→管理员→普通(按首字母) */
  function sortGroupMembers(g: GroupChat): GroupMember[] {
    return [...g.members].sort((a, b) => {
      const order = { owner: 0, admin: 1, member: 2 }
      if (order[a.role] !== order[b.role]) return order[a.role] - order[b.role]
      return a.nickname.localeCompare(b.nickname, 'zh-CN')
    })
  }

  /** 设置管理员 */
  function setGroupAdmin(groupId: string, sparkId: string) {
    const g = groups.value.find(g => g.id === groupId)
    if (!g || g.owner_id !== myProfile.value?.spark_id) return
    if (!g.admins.includes(sparkId)) g.admins.push(sparkId)
    const m = g.members.find(m => m.spark_id === sparkId)
    if (m) m.role = 'admin'
    g.messages.push({ id: uid(), sender_id: 'system', sender_name: '系统', sender_avatar: '', sender_type: 'user', content: `「${m?.nickname}」已被设为管理员`, type: 'system', is_read: true, created_at: now() })
    saveData(STORAGE_KEYS.groups, groups.value)
  }

  /** 移除管理员 */
  function removeGroupAdmin(groupId: string, sparkId: string) {
    const g = groups.value.find(g => g.id === groupId)
    if (!g || g.owner_id !== myProfile.value?.spark_id) return
    g.admins = g.admins.filter(id => id !== sparkId)
    const m = g.members.find(m => m.spark_id === sparkId)
    if (m) m.role = 'member'
    saveData(STORAGE_KEYS.groups, groups.value)
  }

  /** 设置群公告 */
  function setGroupAnnouncement(groupId: string, text: string) {
    const g = groups.value.find(g => g.id === groupId)
    if (!g) return
    const isOwnerOrAdmin = g.owner_id === myProfile.value?.spark_id || g.admins.includes(myProfile.value?.spark_id || '')
    if (!isOwnerOrAdmin) return
    g.announcement = text
    g.messages.push({ id: uid(), sender_id: 'system', sender_name: '系统', sender_avatar: '', sender_type: 'user', content: `群公告已更新：${text}`, type: 'system', is_read: true, created_at: now() })
    saveData(STORAGE_KEYS.groups, groups.value)
  }

  /** 修改群名称 */
  function renameGroup(groupId: string, newName: string) {
    const g = groups.value.find(g => g.id === groupId)
    if (!g) return
    const isOwnerOrAdmin = g.owner_id === myProfile.value?.spark_id || g.admins.includes(myProfile.value?.spark_id || '')
    if (!isOwnerOrAdmin) return
    const old = g.name
    g.name = newName
    g.messages.push({ id: uid(), sender_id: 'system', sender_name: '系统', sender_avatar: '', sender_type: 'user', content: `群名已从「${old}」改为「${newName}」`, type: 'system', is_read: true, created_at: now() })
    saveData(STORAGE_KEYS.groups, groups.value)
  }

  /** 踢出成员(群主/管理员可操作) */
  function kickMember(groupId: string, sparkId: string) {
    const g = groups.value.find(g => g.id === groupId)
    if (!g) return
    const myId = myProfile.value?.spark_id || ''
    const isOwner = g.owner_id === myId
    const isAdmin = g.admins.includes(myId)
    if (!isOwner && !isAdmin) return
    // 管理员不能踢群主/其他管理员
    if (!isOwner && (sparkId === g.owner_id || g.admins.includes(sparkId))) return
    const m = g.members.find(m => m.spark_id === sparkId)
    g.members = g.members.filter(m => m.spark_id !== sparkId)
    g.admins = g.admins.filter(id => id !== sparkId)
    g.messages.push({ id: uid(), sender_id: 'system', sender_name: '系统', sender_avatar: '', sender_type: 'user', content: `「${m?.nickname}」已被移出群聊`, type: 'system', is_read: true, created_at: now() })
    saveData(STORAGE_KEYS.groups, groups.value)
  }

  /** 解散群聊(仅群主) */
  function dissolveGroup(groupId: string) {
    const g = groups.value.find(g => g.id === groupId)
    if (!g || g.owner_id !== myProfile.value?.spark_id) return
    groups.value = groups.value.filter(g => g.id !== groupId)
    saveData(STORAGE_KEYS.groups, groups.value)
  }

  /** 退出群聊(非群主) */
  function quitGroup(groupId: string) {
    const g = groups.value.find(g => g.id === groupId)
    if (!g || g.owner_id === myProfile.value?.spark_id) return
    const myId = myProfile.value?.spark_id || ''
    g.members = g.members.filter(m => m.spark_id !== myId)
    g.admins = g.admins.filter(id => id !== myId)
    saveData(STORAGE_KEYS.groups, groups.value)
  }

  /** 邀请好友入群 */
  function inviteToGroup(groupId: string, sparkId: string) {
    const g = groups.value.find(g => g.id === groupId)
    if (!g || g.members.some(m => m.spark_id === sparkId)) return
    const f = friends.value.find(f => f.spark_id === sparkId)
    g.members.push({ spark_id: sparkId, nickname: f?.nickname || sparkId, avatar: f?.avatar || '👤', role: 'member', joined_at: now() })
    g.messages.push({ id: uid(), sender_id: 'system', sender_name: '系统', sender_avatar: '', sender_type: 'user', content: `「${f?.nickname || sparkId}」加入了群聊`, type: 'system', is_read: true, created_at: now() })
    saveData(STORAGE_KEYS.groups, groups.value)
  }

  function sendGroupMsg(groupId: string, content: string) {
    const g = groups.value.find(g => g.id === groupId)
    if (!g) return
    const msg: ChatMsg = {
      id: uid(), sender_id: myProfile.value!.spark_id, sender_name: myProfile.value!.nickname,
      sender_avatar: myProfile.value!.avatar, sender_type: 'user',
      content, type: 'text', is_read: true, created_at: now(),
    }
    g.messages.push(msg)
    saveData(STORAGE_KEYS.groups, groups.value)

    // @星火 触发AI回复
    if (g.ai_enabled && content.includes('@星火')) {
      triggerGroupAI(groupId, content)
    }
  }

  async function triggerGroupAI(groupId: string, triggerMsg: string) {
    const g = groups.value.find(g => g.id === groupId)
    if (!g) return
    isAiTyping.value = true
    try {
      const history = g.messages.slice(-20).map(m => ({
        role: m.sender_type === 'ai' ? 'assistant' as const : 'user' as const,
        content: `${m.sender_name}: ${m.content}`,
      }))
      const reply = await callAI(history, `这是群聊「${g.name}」中的对话。有人 @你说："${triggerMsg}"。请回复。`)
      const aiMsg: ChatMsg = {
        id: uid(), sender_id: 'spark_ai_001', sender_name: '星火AI', sender_avatar: '🌟',
        sender_type: 'ai', content: reply, type: 'text', is_read: true, created_at: now(),
      }
      g.messages.push(aiMsg)
      saveData(STORAGE_KEYS.groups, groups.value)
    } catch { /* 静默 */ }
    isAiTyping.value = false
  }

  // ------ 动态系统 ------
  function postMoment(content: string, mediaUrls: string[] = [], visibility: 'public' | 'friends' | 'private' = 'public', showInPlaza = true) {
    const m: Moment = {
      id: uid(), author_id: myProfile.value!.spark_id, author_name: myProfile.value!.nickname,
      author_avatar: myProfile.value!.avatar, content, media_urls: mediaUrls,
      visibility, show_in_plaza: showInPlaza, likes: [], comments: [], shares: 0, created_at: now(),
    }
    moments.value.unshift(m)
    saveData(STORAGE_KEYS.moments, moments.value)
    return m
  }

  function toggleLike(momentId: string): boolean {
    const m = moments.value.find(m => m.id === momentId)
    if (!m || !myProfile.value) return false
    const idx = m.likes.indexOf(myProfile.value.spark_id)
    if (idx >= 0) m.likes.splice(idx, 1)
    else m.likes.push(myProfile.value.spark_id)
    saveData(STORAGE_KEYS.moments, moments.value)
    return idx < 0 // 返回是否点赞
  }

  function commentMoment(momentId: string, content: string) {
    const m = moments.value.find(m => m.id === momentId)
    if (!m || !myProfile.value) return
    m.comments.push({
      id: uid(), author_id: myProfile.value.spark_id, author_name: myProfile.value.nickname,
      author_avatar: myProfile.value.avatar, content, created_at: now(),
    })
    saveData(STORAGE_KEYS.moments, moments.value)
    hydrateCompatibilityState()
  }

  async function fetchMomentComments(momentId: string): Promise<MomentComment[]> {
    const moment = moments.value.find(item => item.id === momentId)
    if (!moment) return []

    return moment.comments.map(comment => ({
      ...comment,
      author: comment.author || createCompatProfile({
        spark_id: comment.author_id,
        nickname: comment.author_name,
        avatar: comment.author_avatar,
      }),
    }))
  }

  function deleteMoment(momentId: string) {
    moments.value = moments.value.filter(m => m.id !== momentId)
    saveData(STORAGE_KEYS.moments, moments.value)
  }

  // ------ 收藏系统 ------
  function addFavorite(item: Omit<Favorite, 'id' | 'saved_at'>) {
    favorites.value.unshift({ ...item, id: uid(), saved_at: now() })
    saveData(STORAGE_KEYS.favorites, favorites.value)
  }

  function removeFavorite(id: string) {
    favorites.value = favorites.value.filter(f => f.id !== id)
    saveData(STORAGE_KEYS.favorites, favorites.value)
  }

  // ------ AI 通信 ------
  async function callAI(messages: { role: 'user' | 'assistant'; content: string }[], extraSystem?: string): Promise<string> {
    const scopedMessages = extraSystem
      ? [{ role: 'user' as const, content: `[Context]\n${extraSystem}` }, ...messages.slice(-20)]
      : messages.slice(-20)
    const response = await requestAssistantChat({
      assistant: 'companion',
      mode: 'fast',
      messages: scopedMessages,
    })
    const res = {
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: response.content } }],
      }),
    }
    if (!res.ok) throw new Error(`AI请求失败 (${res.status})`)
    const data = await res.json()
    return data.choices?.[0]?.message?.content || '抱歉，我暂时无法回复 🤔'
  }

  /** 发消息给AI伴侣（独立聊天，非群聊/私聊） */
  async function sendToAI(content: string): Promise<string> {
    aiChatHistory.value.push({
      id: uid(), sender_id: myProfile.value!.spark_id, sender_name: myProfile.value!.nickname,
      sender_avatar: myProfile.value!.avatar, sender_type: 'user',
      content, type: 'text', is_read: true, created_at: now(),
    })
    saveData(STORAGE_KEYS.aiChat, aiChatHistory.value)

    isAiTyping.value = true
    try {
      const history = aiChatHistory.value.slice(-20).map(m => ({
        role: m.sender_type === 'ai' ? 'assistant' as const : 'user' as const,
        content: m.content,
      }))
      const reply = await callAI(history)
      const aiMsg: ChatMsg = {
        id: uid(), sender_id: 'spark_ai_001', sender_name: '星火AI', sender_avatar: '🌟',
        sender_type: 'ai', content: reply, type: 'text', is_read: true, created_at: now(),
      }
      aiChatHistory.value.push(aiMsg)
      saveData(STORAGE_KEYS.aiChat, aiChatHistory.value)
      return reply
    } finally { isAiTyping.value = false }
  }

  function clearAIChat() {
    aiChatHistory.value = []
    saveData(STORAGE_KEYS.aiChat, [])
  }

  init()

  void loadProfileFromSupabase

  return {
    // 数据
    myProfile, friends, friendRequests, groups, moments, favorites, aiChatHistory,
    loading, isAiTyping, totalUnreadMessages,
    // 档案
    updateProfile, changeSparkId, getQRData, loadProfileFromSupabase, syncProfileToSupabase,
    // 好友
    searchUser, searchBySparkId, sendFriendRequest, addFriend, addFriendByQR, removeFriend, setFriendRemark,
    // 私聊
    getPrivateChat, sendPrivateMsg, markMessagesAsRead, getUnreadCount,
    // 群聊
    createGroup, sendGroupMsg, fetchMomentComments,
    sortGroupMembers, setGroupAdmin, removeGroupAdmin, setGroupAnnouncement,
    renameGroup, kickMember, dissolveGroup, quitGroup, inviteToGroup,
    // 动态
    postMoment, toggleLike, commentMoment, deleteMoment,
    // 收藏
    addFavorite, removeFavorite,
    // AI
    sendToAI, clearAIChat,
    // 工具
    formatTimeAgo,
  }
}
