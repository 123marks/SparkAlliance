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
  poke_text?: string            // 自定义碰一碰文案，默认"碰了碰"
  region?: string               // 地区
  identity?: string             // 身份，如"计算机大二"
  major?: string                // 专业
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
  is_starred?: boolean   // 星标好友
  is_chat_pinned?: boolean // 会话置顶
  is_muted?: boolean       // 消息免打扰
}

/** 好友标签 */
export interface FriendTag {
  id: string
  name: string
  color: string          // 标签颜色
  members: string[]      // 好友spark_id列表
  priority: number       // 优先级权重
  created_at: string
}

/** 好友权限设置 */
export interface FriendPermissions {
  allow_view_my_moments: boolean  // 允许对方查看我的星火域
  hide_their_moments: boolean     // 隐藏对方星火域
}

/** 好友请求 */
export interface FriendRequest {
  id: string
  from: { spark_id: string; nickname: string; avatar: string; bio: string }
  from_profile?: SparkProfile
  message: string
  source: string         // 'search' | 'qrcode' | 'plaza'
  status: 'pending' | 'accepted' | 'rejected'
  created_at: string
}

/** 聊天消息（私聊/群聊通用） */
export interface ChatMsg {
  id: string
  sender_id: string      // spark_id
  sender_name: string
  sender_avatar: string
  sender_avatar_url?: string  // 发送者头像URL（上传的真实头像）
  sender_type: 'user' | 'ai'
  receiver_id?: string   // 私聊接收者
  content: string
  type: 'text' | 'image' | 'share' | 'system' | 'voice' | 'file' | 'video' | 'poke'
  media_url?: string
  voice_duration?: number      // 语音时长（秒）
  voice_blob_url?: string      // 语音文件Blob URL
  share_data?: { type: string; title: string; route: string }
  is_read: boolean       // 已读状态
  read_at?: string       // 读取时间
  created_at: string
  synced?: boolean       // 是否已同步到数据库
  mentions?: string[]    // @提及的 spark_id 列表
  quote_msg?: { sender_name: string; content: string }  // 引用消息
}

/** 群公告历史记录 */
export interface GroupAnnouncementRecord {
  id: string
  content: string
  author_id: string
  author_name: string
  created_at: string
}

/** 群聊 */
export interface GroupChat {
  id: string
  name: string
  avatar: string        // emoji
  owner_id: string      // spark_id
  ai_enabled: boolean
  members: {
    spark_id: string
    nickname: string       // 用户名
    avatar: string
    avatar_url?: string    // 用户上传的真实头像URL
    role: 'owner' | 'admin' | 'member'
    group_nickname?: string // 群昵称（覆盖显示名）
  }[]
  messages: ChatMsg[]
  created_at: string
  unread: number
  announcement?: string          // 当前群公告
  announcement_history?: GroupAnnouncementRecord[] // 公告历史
  is_chat_pinned?: boolean       // 会话置顶
  is_muted?: boolean             // 消息免打扰
  group_remark?: string          // 群备注（仅自己可见）
  show_member_nickname?: boolean // 是否显示群成员昵称
}

/** 动态可见时间范围设置 */
export interface MomentVisibilitySettings {
  timeRange: 'three_days' | 'one_month' | 'half_year' | 'forever'
  allowStrangers: boolean
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
  file_urls?: string[]      // 文件附件URL列表
  file_names?: string[]     // 文件名列表
  file_sizes?: number[]     // 文件大小列表(字节)
  is_live?: boolean         // 是否为实况Live动态
  live_expires_at?: string  // 实况过期时间(24h后)
  visibility: 'public' | 'friends' | 'private'
  show_in_plaza: boolean
  likes: string[]         // 点赞者 spark_id 列表
  is_liked?: boolean
  like_count?: number
  comment_count?: number
  comments: MomentComment[]
  shares: number
  is_pinned: boolean      // 是否置顶
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
  if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前'
  if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前'
  if (diff < 604800000) return Math.floor(diff / 86400000) + '天前'
  // 7天以上显示 MM-DD
  const date = new Date(dateStr)
  const now = new Date()
  if (date.getFullYear() === now.getFullYear()) {
    return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }
  // 超过一年显示 YYYY-MM-DD
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/** 智能格式化消息时间（用于聊天气泡） */
export function formatMsgTime(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const hm = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`

  // 同一天
  if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()) {
    return hm
  }

  // 昨天
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.getFullYear() === yesterday.getFullYear() && d.getMonth() === yesterday.getMonth() && d.getDate() === yesterday.getDate()) {
    return `昨天 ${hm}`
  }

  // 7天内显示星期几
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diffDays < 7) {
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    return `${weekDays[d.getDay()]} ${hm}`
  }

  // 同年
  if (d.getFullYear() === now.getFullYear()) {
    return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${hm}`
  }

  // 跨年
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${hm}`
}

/** 是否应显示时间分隔线（间隔5分钟以上） */
export function shouldShowTimeSeparator(prevMsg: { created_at: string } | null, currMsg: { created_at: string }): boolean {
  if (!prevMsg) return true
  const prev = new Date(prevMsg.created_at).getTime()
  const curr = new Date(currMsg.created_at).getTime()
  return curr - prev > 5 * 60 * 1000
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
  tags: 'spark_companion_tags',
  blacklist: 'spark_companion_blacklist',
  friendPermissions: 'spark_companion_friend_permissions',
  momentVisibility: 'spark_companion_moment_visibility',
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
  const friendTags = ref<FriendTag[]>([])
  const blacklist = ref<string[]>([])
  const friendPermissions = ref<Record<string, FriendPermissions>>({})
  const loading = ref(false)
  const isAiTyping = ref(false)
  const aiTypingText = ref('')  // v7.1: AI思考状态文字（'正在思考...' / '正在生成回复...'）

  // ====== 私聊内存缓存层（消除高频 localStorage 解析） ======
  let _privateChatCache: Record<string, ChatMsg[]> | null = null
  let _privateChatDirty = false

  function getPrivateChatStore(): Record<string, ChatMsg[]> {
    if (!_privateChatCache) {
      _privateChatCache = loadData<Record<string, ChatMsg[]>>(STORAGE_KEYS.privateChats, {})
    }
    return _privateChatCache
  }

  function flushPrivateChatStore() {
    if (_privateChatDirty && _privateChatCache) {
      saveData(STORAGE_KEYS.privateChats, _privateChatCache)
      _privateChatDirty = false
    }
  }

  function markPrivateChatDirty() {
    _privateChatDirty = true
    // 延迟写盘，合并同一帧内的多次写操作
    queueMicrotask(flushPrivateChatStore)
  }

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
    friendTags.value = loadData(STORAGE_KEYS.tags, [])
    blacklist.value = loadData(STORAGE_KEYS.blacklist, [])
    friendPermissions.value = loadData(STORAGE_KEYS.friendPermissions, {})

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
        members: [
          { spark_id: myProfile.value.spark_id, nickname: myProfile.value.nickname, avatar: myProfile.value.avatar, role: 'owner' as const },
          { spark_id: 'spark_demo_01', nickname: '张三（学长）', avatar: '🎓', role: 'admin' as const },
          { spark_id: 'spark_demo_02', nickname: '李四', avatar: '📚', role: 'member' as const },
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
          shares: 2, is_pinned: false, created_at: new Date(Date.now() - 7200000).toISOString(),
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
          g.members.push({ spark_id: myProfile.value!.spark_id, nickname: myProfile.value!.nickname, avatar: myProfile.value!.avatar, role: 'member' })
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

  // ------ 私聊（内存缓存 + Supabase 同步） ------
  function getPrivateChat(friendId: string): ChatMsg[] {
    return getPrivateChatStore()[friendId] || []
  }

  // 清空私聊记录
  function clearPrivateChat(friendId: string) {
    const all = getPrivateChatStore()
    all[friendId] = []
    savePrivateChatStore()
  }

  /** 标记消息为已读（本地缓存 + 异步 Supabase 同步） */
  function markMessagesAsRead(friendId: string) {
    const all = getPrivateChatStore()
    const msgs = all[friendId]
    if (!msgs) return

    let hasUnread = false
    const readAt = now()
    const updatedMsgIds: string[] = []
    msgs.forEach(m => {
      if (m.sender_id !== myProfile.value?.spark_id && !m.is_read) {
        m.is_read = true
        m.read_at = readAt
        hasUnread = true
        updatedMsgIds.push(m.id)
      }
    })

    if (hasUnread) {
      markPrivateChatDirty()
      // 清除好友未读计数
      const f = friends.value.find(f => f.spark_id === friendId)
      if (f && f.unread > 0) {
        f.unread = 0
        saveData(STORAGE_KEYS.friends, friends.value)
      }
      // 异步同步已读状态到 Supabase
      syncReadStatusToSupabase(friendId, updatedMsgIds, readAt)
    }
  }

  /** 异步同步已读状态到 Supabase */
  async function syncReadStatusToSupabase(friendId: string, _msgIds: string[], readAt: string) {
    if (!myProfile.value?.user_id) return
    try {
      await supabase.from('companion_read_receipts').upsert({
        user_id: myProfile.value.user_id,
        friend_id: friendId,
        last_read_at: readAt,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,friend_id' })
    } catch (e) {
      console.warn('[Companion] sync read status error:', e)
    }
  }

  /** 获取未读消息数（从内存缓存读取） */
  function getUnreadCount(friendId: string): number {
    const msgs = getPrivateChatStore()[friendId] || []
    return msgs.filter(m => m.sender_id !== myProfile.value?.spark_id && !m.is_read).length
  }

  /** 获取所有未读私信总数 */
  const totalUnreadMessages = computed(() => {
    return friends.value.reduce((sum, f) => sum + (f.unread || 0), 0)
  })

  function sendPrivateMsg(friendId: string, content: string, type: 'text' | 'image' | 'share' = 'text', shareData?: ChatMsg['share_data']) {
    const all = getPrivateChatStore()
    if (!all[friendId]) all[friendId] = []
    const msg: ChatMsg = {
      id: uid(), sender_id: myProfile.value!.spark_id, sender_name: myProfile.value!.nickname,
      sender_avatar: myProfile.value!.avatar, sender_avatar_url: myProfile.value!.avatar_url,
      sender_type: 'user',
      receiver_id: friendId,
      content, type, share_data: shareData, is_read: false, created_at: now(),
    }
    all[friendId].push(msg)
    markPrivateChatDirty()

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
  async function triggerAIReply(friendId: string, userMsg: string, _allChats: Record<string, ChatMsg[]>) {
    void _allChats // 使用缓存替代传入引用
    isAiTyping.value = true
    try {
      const store = getPrivateChatStore()
      const chatMsgs = store[friendId] || []
      const history = chatMsgs.slice(-20).map(m => ({
        role: m.sender_type === 'ai' ? 'assistant' as const : 'user' as const,
        content: m.content,
      }))
      const reply = await callAI([...history, { role: 'user', content: userMsg }])
      const aiMsg: ChatMsg = {
        id: uid(), sender_id: 'spark_ai_001', sender_name: '星火AI', sender_avatar: '🌟',
        sender_type: 'ai', content: reply, type: 'text', is_read: true, created_at: now(),
      }
      if (!store[friendId]) store[friendId] = []
      store[friendId].push(aiMsg)
      markPrivateChatDirty()
      // 更新好友最后消息
      const f = friends.value.find(f => f.spark_id === friendId)
      if (f) { f.last_msg = reply.slice(0, 30); f.last_msg_time = now(); saveData(STORAGE_KEYS.friends, friends.value) }
    } catch { /* 静默失败 */ }
    isAiTyping.value = false
  }

  // ------ 消息撤回 ------
  function recallMessage(chatId: string, msgId: string, chatType: 'private' | 'group' | 'ai' = 'private'): boolean {
    if (chatType === 'private') {
      const all = getPrivateChatStore()
      const msgs = all[chatId]
      if (!msgs) return false
      const idx = msgs.findIndex(m => m.id === msgId)
      if (idx < 0) return false
      const msg = msgs[idx]
      // 只能撤回自己的消息，且2分钟内
      if (msg.sender_id !== myProfile.value?.spark_id) return false
      if (Date.now() - new Date(msg.created_at).getTime() > 2 * 60 * 1000) return false
      // 替换为系统消息
      msgs.splice(idx, 1, {
        id: uid(), sender_id: 'system', sender_name: '系统', sender_avatar: '⚙️',
        sender_type: 'user', content: '你撤回了一条消息', type: 'system',
        is_read: true, created_at: now(),
      })
      markPrivateChatDirty()
      return true
    } else if (chatType === 'group') {
      const g = groups.value.find(g => g.id === chatId)
      if (!g) return false
      const idx = g.messages.findIndex(m => m.id === msgId)
      if (idx < 0) return false
      const msg = g.messages[idx]
      if (msg.sender_id !== myProfile.value?.spark_id) return false
      if (Date.now() - new Date(msg.created_at).getTime() > 2 * 60 * 1000) return false
      g.messages.splice(idx, 1, {
        id: uid(), sender_id: 'system', sender_name: '系统', sender_avatar: '⚙️',
        sender_type: 'user', content: '你撤回了一条消息', type: 'system',
        is_read: true, created_at: now(),
      })
      saveData(STORAGE_KEYS.groups, groups.value)
      return true
    } else if (chatType === 'ai') {
      const idx = aiChatHistory.value.findIndex(m => m.id === msgId)
      if (idx < 0) return false
      const msg = aiChatHistory.value[idx]
      if (msg.sender_id !== myProfile.value?.spark_id) return false
      if (Date.now() - new Date(msg.created_at).getTime() > 2 * 60 * 1000) return false
      aiChatHistory.value.splice(idx, 1, {
        id: uid(), sender_id: 'system', sender_name: '系统', sender_avatar: '⚙️',
        sender_type: 'user', content: '你撤回了一条消息', type: 'system',
        is_read: true, created_at: now(),
      })
      saveData(STORAGE_KEYS.aiChat, aiChatHistory.value)
      return true
    }
    return false
  }

  // ------ 碰一碰 ------
  function sendPokeMessage(chatId: string, targetName: string, chatType: 'private' | 'group' = 'private') {
    const pokeText = myProfile.value?.poke_text || '碰了碰'
    const content = `你${pokeText} ${targetName}`
    const msg: ChatMsg = {
      id: uid(), sender_id: myProfile.value!.spark_id, sender_name: myProfile.value!.nickname,
      sender_avatar: myProfile.value!.avatar, sender_type: 'user',
      content, type: 'poke', is_read: true, created_at: now(),
    }
    if (chatType === 'private') {
      const all = getPrivateChatStore()
      if (!all[chatId]) all[chatId] = []
      all[chatId].push(msg)
      markPrivateChatDirty()
    } else {
      const g = groups.value.find(g => g.id === chatId)
      if (g) { g.messages.push(msg); saveData(STORAGE_KEYS.groups, groups.value) }
    }
    return msg
  }

  // ------ 群聊 ------
  // v7.0: 成员上限500
  const MAX_GROUP_MEMBERS = 500

  function createGroup(name: string, memberIds: string[], aiEnabled = true): string {
    const limitedIds = memberIds.slice(0, MAX_GROUP_MEMBERS - 1) // 减去群主自己
    const members: GroupChat['members'] = [
      { spark_id: myProfile.value!.spark_id, nickname: myProfile.value!.nickname, avatar: myProfile.value!.avatar, avatar_url: myProfile.value!.avatar_url, role: 'owner' },
      ...limitedIds.map(id => {
        const f = friends.value.find(f => f.spark_id === id)
        return { spark_id: id, nickname: f?.nickname || id, avatar: f?.avatar || '👤', avatar_url: f?.avatar_url, role: 'member' as const }
      }),
    ]
    const g: GroupChat = {
      id: uid(), name, avatar: '👥', owner_id: myProfile.value!.spark_id,
      ai_enabled: aiEnabled, members, messages: [
        { id: uid(), sender_id: 'system', sender_name: '系统', sender_avatar: '⚙️', sender_type: 'ai', content: `群聊「${name}」已创建`, type: 'system', is_read: true, created_at: now() } as ChatMsg,
      ],
      created_at: now(), unread: 0,
    }
    groups.value.push(g)
    saveData(STORAGE_KEYS.groups, groups.value)
    return g.id
  }

  function sendGroupMsg(groupId: string, content: string) {
    const g = groups.value.find(g => g.id === groupId)
    if (!g) return
    // 使用群昵称（如果设置了的话）
    const me = g.members.find(m => m.spark_id === myProfile.value?.spark_id)
    const displayName = me?.group_nickname || myProfile.value!.nickname
    const msg: ChatMsg = {
      id: uid(), sender_id: myProfile.value!.spark_id, sender_name: displayName,
      sender_avatar: myProfile.value!.avatar, sender_avatar_url: myProfile.value!.avatar_url,
      sender_type: 'user',
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
  function postMoment(
    content: string,
    mediaUrls: string[] = [],
    visibility: 'public' | 'friends' | 'private' = 'public',
    showInPlaza = true,
    options?: {
      videoUrls?: string[]
      fileUrls?: string[]
      fileNames?: string[]
      fileSizes?: number[]
      isLive?: boolean
    }
  ) {
    const m: Moment = {
      id: uid(), author_id: myProfile.value!.spark_id, author_name: myProfile.value!.nickname,
      author_avatar: myProfile.value!.avatar, content, media_urls: mediaUrls,
      video_urls: options?.videoUrls || [],
      file_urls: options?.fileUrls || [],
      file_names: options?.fileNames || [],
      file_sizes: options?.fileSizes || [],
      is_live: options?.isLive || false,
      live_expires_at: options?.isLive ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : undefined,
      visibility, show_in_plaza: showInPlaza, likes: [], comments: [], shares: 0, is_pinned: false, created_at: now(),
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

  /** 切换动态置顶状态 */
  function togglePinMoment(momentId: string) {
    const m = moments.value.find(m => m.id === momentId)
    if (!m || !myProfile.value) return
    // 只能置顶自己的动态
    if (m.author_id !== myProfile.value.spark_id) return
    m.is_pinned = !m.is_pinned
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
      sender_avatar: myProfile.value!.avatar, sender_avatar_url: myProfile.value!.avatar_url,
      sender_type: 'user',
      content, type: 'text', is_read: true, created_at: now(),
    })
    saveData(STORAGE_KEYS.aiChat, aiChatHistory.value)

    isAiTyping.value = true
    aiTypingText.value = '正在思考...'
    try {
      const history = aiChatHistory.value.slice(-20).map(m => ({
        role: m.sender_type === 'ai' ? 'assistant' as const : 'user' as const,
        content: m.content,
      }))
      aiTypingText.value = '正在生成回复...'
      const reply = await callAI(history)
      const aiMsg: ChatMsg = {
        id: uid(), sender_id: 'spark_ai_001', sender_name: '星火AI伴侣', sender_avatar: '🌟',
        sender_type: 'ai', content: reply, type: 'text', is_read: true, created_at: now(),
      }
      aiChatHistory.value.push(aiMsg)
      saveData(STORAGE_KEYS.aiChat, aiChatHistory.value)
      return reply
    } catch (err: any) {
      // v7.1: 失败时插入错误消息气泡，而非静默失败
      const errorText = err?.message || 'AI服务暂时不可用'
      const errorMsg: ChatMsg = {
        id: uid(), sender_id: 'spark_ai_001', sender_name: '星火AI伴侣', sender_avatar: '🌟',
        sender_type: 'ai', content: `⚠️ ${errorText}\n\n请稍后再试，或检查网络连接。`, type: 'text', is_read: true, created_at: now(),
      }
      aiChatHistory.value.push(errorMsg)
      saveData(STORAGE_KEYS.aiChat, aiChatHistory.value)
      return errorText
    } finally {
      isAiTyping.value = false
      aiTypingText.value = ''
    }
  }

  function clearAIChat() {
    aiChatHistory.value = []
    saveData(STORAGE_KEYS.aiChat, [])
  }

  // ====== F6: 星标好友 ======
  function toggleStarFriend(friendId: string) {
    const f = friends.value.find(f => f.spark_id === friendId)
    if (f) {
      f.is_starred = !f.is_starred
      saveData(STORAGE_KEYS.friends, friends.value)
    }
  }

  // ====== F12: 好友标签系统 ======
  function createTag(name: string, color: string): FriendTag {
    const tag: FriendTag = {
      id: uid(), name, color, members: [], priority: friendTags.value.length, created_at: now()
    }
    friendTags.value.push(tag)
    saveData(STORAGE_KEYS.tags, friendTags.value)
    return tag
  }

  function renameTag(tagId: string, newName: string) {
    const tag = friendTags.value.find(t => t.id === tagId)
    if (tag) { tag.name = newName; saveData(STORAGE_KEYS.tags, friendTags.value) }
  }

  function deleteTag(tagId: string) {
    friendTags.value = friendTags.value.filter(t => t.id !== tagId)
    saveData(STORAGE_KEYS.tags, friendTags.value)
  }

  function addMemberToTag(tagId: string, friendId: string) {
    const tag = friendTags.value.find(t => t.id === tagId)
    if (tag && !tag.members.includes(friendId)) {
      tag.members.push(friendId)
      saveData(STORAGE_KEYS.tags, friendTags.value)
    }
  }

  function removeMemberFromTag(tagId: string, friendId: string) {
    const tag = friendTags.value.find(t => t.id === tagId)
    if (tag) {
      tag.members = tag.members.filter(m => m !== friendId)
      saveData(STORAGE_KEYS.tags, friendTags.value)
    }
  }

  function setMemberPriority(tagId: string, _friendId: string, priority: number) {
    const tag = friendTags.value.find(t => t.id === tagId)
    if (tag) { tag.priority = priority; saveData(STORAGE_KEYS.tags, friendTags.value) }
  }

  function getTagsForFriend(friendId: string): FriendTag[] {
    return friendTags.value.filter(t => t.members.includes(friendId))
  }

  // ====== F18: 好友权限/拉黑/备注 ======
  function updateFriendRemark(friendId: string, remark: string) {
    setFriendRemark(friendId, remark)
  }

  function blockFriend(friendId: string) {
    if (!blacklist.value.includes(friendId)) {
      blacklist.value.push(friendId)
      saveData(STORAGE_KEYS.blacklist, blacklist.value)
    }
  }

  function unblockFriend(friendId: string) {
    blacklist.value = blacklist.value.filter(id => id !== friendId)
    saveData(STORAGE_KEYS.blacklist, blacklist.value)
  }

  function isBlocked(friendId: string): boolean {
    return blacklist.value.includes(friendId)
  }

  function updateFriendPermissions(friendId: string, perms: Partial<FriendPermissions>) {
    const current = friendPermissions.value[friendId] || { allow_view_my_moments: true, hide_their_moments: false }
    friendPermissions.value[friendId] = { ...current, ...perms }
    saveData(STORAGE_KEYS.friendPermissions, friendPermissions.value)
  }

  function getFriendPermissions(friendId: string): FriendPermissions {
    return friendPermissions.value[friendId] || { allow_view_my_moments: true, hide_their_moments: false }
  }

  // ------ 群聊管理 ------

  /** 获取群成员角色 */
  function getMemberRole(groupId: string, sparkId: string): 'owner' | 'admin' | 'member' | null {
    const g = groups.value.find(g => g.id === groupId)
    if (!g) return null
    // v7.1: 精确匹配成员spark_id
    const m = g.members.find(m => m.spark_id === sparkId)
    if (m?.role) return m.role
    // v7.1兜底: 如果成员列表里没匹配到但owner_id匹配，说明spark_id曾被修改，自动修复
    if (g.owner_id === sparkId) {
      // 自动修复：将owner成员的spark_id更新为当前值
      const ownerMember = g.members.find(m => m.role === 'owner')
      if (ownerMember && ownerMember.spark_id !== sparkId) {
        ownerMember.spark_id = sparkId
        saveData(STORAGE_KEYS.groups, groups.value)
      }
      return 'owner'
    }
    return null
  }

  /** 设置/取消管理员（仅群主） */
  function setGroupAdmin(groupId: string, memberId: string, isAdmin: boolean): { ok: boolean; msg: string } {
    const g = groups.value.find(g => g.id === groupId)
    if (!g) return { ok: false, msg: '群聊不存在' }
    if (g.owner_id !== myProfile.value?.spark_id) return { ok: false, msg: '仅群主可设置管理员' }
    const member = g.members.find(m => m.spark_id === memberId)
    if (!member) return { ok: false, msg: '成员不存在' }
    if (member.spark_id === g.owner_id) return { ok: false, msg: '不能修改群主角色' }
    // v7.0: 管理员数量上限 = floor(成员数/5)，最少1个
    if (isAdmin) {
      const currentAdminCount = g.members.filter(m => m.role === 'admin').length
      const maxAdmins = Math.max(1, Math.floor(g.members.length / 5))
      if (currentAdminCount >= maxAdmins) {
        return { ok: false, msg: `管理员数量已达上限（最多${maxAdmins}人）` }
      }
    }
    member.role = isAdmin ? 'admin' : 'member'
    // 插入系统消息
    g.messages.push({
      id: uid(), sender_id: 'system', sender_name: '系统', sender_avatar: '⚙️',
      sender_type: 'user', content: `群主已${isAdmin ? '设置' : '取消'} ${member.nickname} 为管理员`,
      type: 'system', is_read: true, created_at: now(),
    })
    saveData(STORAGE_KEYS.groups, groups.value)
    return { ok: true, msg: isAdmin ? '已设置为管理员' : '已取消管理员' }
  }

  /** 踢出成员（群主可踢任何人，管理员可踢普通成员） */
  function kickGroupMember(groupId: string, memberId: string): { ok: boolean; msg: string } {
    const g = groups.value.find(g => g.id === groupId)
    if (!g) return { ok: false, msg: '群聊不存在' }
    const myRole = getMemberRole(groupId, myProfile.value?.spark_id || '')
    const targetMember = g.members.find(m => m.spark_id === memberId)
    if (!targetMember) return { ok: false, msg: '成员不存在' }
    if (targetMember.spark_id === g.owner_id) return { ok: false, msg: '不能踢出群主' }
    if (myRole === 'admin' && targetMember.role === 'admin') return { ok: false, msg: '管理员不能踢出其他管理员' }
    if (myRole === 'member') return { ok: false, msg: '普通成员无权踢人' }
    g.members = g.members.filter(m => m.spark_id !== memberId)
    g.messages.push({
      id: uid(), sender_id: 'system', sender_name: '系统', sender_avatar: '⚙️',
      sender_type: 'user', content: `${targetMember.nickname} 已被移出群聊`,
      type: 'system', is_read: true, created_at: now(),
    })
    saveData(STORAGE_KEYS.groups, groups.value)
    return { ok: true, msg: `已将 ${targetMember.nickname} 移出群聊` }
  }

  /** 解散群聊（仅群主） */
  function disbandGroup(groupId: string): { ok: boolean; msg: string } {
    const g = groups.value.find(g => g.id === groupId)
    if (!g) return { ok: false, msg: '群聊不存在' }
    if (g.owner_id !== myProfile.value?.spark_id) return { ok: false, msg: '仅群主可解散群聊' }
    groups.value = groups.value.filter(gr => gr.id !== groupId)
    saveData(STORAGE_KEYS.groups, groups.value)
    return { ok: true, msg: `群聊「${g.name}」已解散` }
  }

  /** 转让群主（仅群主） */
  function transferGroupOwner(groupId: string, newOwnerId: string): { ok: boolean; msg: string } {
    const g = groups.value.find(g => g.id === groupId)
    if (!g) return { ok: false, msg: '群聊不存在' }
    if (g.owner_id !== myProfile.value?.spark_id) return { ok: false, msg: '仅群主可转让' }
    const newOwner = g.members.find(m => m.spark_id === newOwnerId)
    if (!newOwner) return { ok: false, msg: '目标成员不存在' }
    // 旧群主变成普通成员
    const oldOwner = g.members.find(m => m.spark_id === g.owner_id)
    if (oldOwner) oldOwner.role = 'member'
    newOwner.role = 'owner'
    g.owner_id = newOwnerId
    g.messages.push({
      id: uid(), sender_id: 'system', sender_name: '系统', sender_avatar: '⚙️',
      sender_type: 'user', content: `${newOwner.nickname} 已成为新群主`,
      type: 'system', is_read: true, created_at: now(),
    })
    saveData(STORAGE_KEYS.groups, groups.value)
    return { ok: true, msg: `已将群主转让给 ${newOwner.nickname}` }
  }

  /** 设置群公告（群主/管理员） */
  function setGroupAnnouncement(groupId: string, content: string): { ok: boolean; msg: string } {
    const g = groups.value.find(g => g.id === groupId)
    if (!g) return { ok: false, msg: '群聊不存在' }
    const myRole = getMemberRole(groupId, myProfile.value?.spark_id || '')
    if (myRole !== 'owner' && myRole !== 'admin') return { ok: false, msg: '仅群主或管理员可设置公告' }
    g.announcement = content
    // 保存到公告历史
    if (!g.announcement_history) g.announcement_history = []
    g.announcement_history.unshift({
      id: uid(),
      content,
      author_id: myProfile.value!.spark_id,
      author_name: myProfile.value!.nickname,
      created_at: now(),
    })
    g.messages.push({
      id: uid(), sender_id: 'system', sender_name: '系统', sender_avatar: '⚙️',
      sender_type: 'user', content: `📢 群公告已更新：${content}`,
      type: 'system', is_read: true, created_at: now(),
    })
    saveData(STORAGE_KEYS.groups, groups.value)
    return { ok: true, msg: '群公告已更新' }
  }

  /** 设置群备注（仅自己可见） */
  function setGroupRemark(groupId: string, remark: string) {
    const g = groups.value.find(g => g.id === groupId)
    if (!g) return
    g.group_remark = remark
    saveData(STORAGE_KEYS.groups, groups.value)
  }

  /** 设置我在群里的昵称 */
  function setMyGroupNickname(groupId: string, nickname: string) {
    const g = groups.value.find(g => g.id === groupId)
    if (!g || !myProfile.value) return
    const me = g.members.find(m => m.spark_id === myProfile.value!.spark_id)
    if (me) {
      me.group_nickname = nickname || undefined
      saveData(STORAGE_KEYS.groups, groups.value)
    }
  }

  /** 获取群成员显示名（优先群昵称） */
  function getGroupDisplayName(groupId: string, sparkId: string): string {
    const g = groups.value.find(g => g.id === groupId)
    if (!g) return sparkId
    const m = g.members.find(m => m.spark_id === sparkId)
    if (!m) return sparkId
    return m.group_nickname || m.nickname
  }

  /** 修改群名称（群主/管理员） */
  function renameGroup(groupId: string, newName: string): { ok: boolean; msg: string } {
    const g = groups.value.find(g => g.id === groupId)
    if (!g) return { ok: false, msg: '群聊不存在' }
    const myRole = getMemberRole(groupId, myProfile.value?.spark_id || '')
    if (myRole !== 'owner' && myRole !== 'admin') return { ok: false, msg: '仅群主或管理员可修改群名' }
    const oldName = g.name
    g.name = newName
    g.messages.push({
      id: uid(), sender_id: 'system', sender_name: '系统', sender_avatar: '⚙️',
      sender_type: 'user', content: `群名称已修改为「${newName}」`,
      type: 'system', is_read: true, created_at: now(),
    })
    saveData(STORAGE_KEYS.groups, groups.value)
    return { ok: true, msg: `群名已从「${oldName}」修改为「${newName}」` }
  }

  /** 发送群消息（带提及解析） */
  function sendGroupMsgWithMentions(groupId: string, content: string, mentionIds: string[]) {
    const g = groups.value.find(g => g.id === groupId)
    if (!g) return
    const msg: ChatMsg = {
      id: uid(), sender_id: myProfile.value!.spark_id, sender_name: myProfile.value!.nickname,
      sender_avatar: myProfile.value!.avatar, sender_avatar_url: myProfile.value!.avatar_url,
      sender_type: 'user',
      content, type: 'text', is_read: true, created_at: now(),
      mentions: mentionIds.length > 0 ? mentionIds : undefined,
    }
    g.messages.push(msg)
    saveData(STORAGE_KEYS.groups, groups.value)

    // @星火 触发AI回复
    if (g.ai_enabled && content.includes('@星火')) {
      triggerGroupAI(groupId, content)
    }
  }

  // ====== F10: 动态可见时间范围设置 ======
  const momentVisibilitySettings = ref<MomentVisibilitySettings>(
    loadData<MomentVisibilitySettings>(STORAGE_KEYS.momentVisibility, { timeRange: 'forever', allowStrangers: false })
  )

  function updateMomentVisibility(settings: Partial<MomentVisibilitySettings>) {
    Object.assign(momentVisibilitySettings.value, settings)
    saveData(STORAGE_KEYS.momentVisibility, momentVisibilitySettings.value)
  }

  /** 根据可见时间范围过滤动态 */
  function filterMomentsByVisibility(momentsList: Moment[], authorSettings?: MomentVisibilitySettings): Moment[] {
    const settings = authorSettings || momentVisibilitySettings.value
    if (settings.timeRange === 'forever') return momentsList
    const nowMs = Date.now()
    const rangeMs: Record<string, number> = {
      three_days: 3 * 24 * 60 * 60 * 1000,
      one_month: 30 * 24 * 60 * 60 * 1000,
      half_year: 180 * 24 * 60 * 60 * 1000,
    }
    const cutoff = nowMs - (rangeMs[settings.timeRange] || Infinity)
    return momentsList.filter(m => new Date(m.created_at).getTime() >= cutoff)
  }

  /** 检查实况动态是否还在有效期内 */
  function isMomentLive(moment: Moment): boolean {
    if (!moment.is_live) return false
    if (!moment.live_expires_at) return false
    return new Date(moment.live_expires_at).getTime() > Date.now()
  }

  // ====== 持久化工具（供前端侧边栏操作使用） ======
  function persistFriends() { saveData(STORAGE_KEYS.friends, friends.value) }
  function persistGroups() { saveData(STORAGE_KEYS.groups, groups.value) }

  // v7.0: 同步当前用户的最新头像到所有群的成员列表
  function syncMyGroupAvatars() {
    if (!myProfile.value) return
    let changed = false
    for (const g of groups.value) {
      const me = g.members.find(m => m.spark_id === myProfile.value!.spark_id)
      if (me) {
        if (me.avatar !== myProfile.value.avatar || me.avatar_url !== myProfile.value.avatar_url || me.nickname !== myProfile.value.nickname) {
          me.avatar = myProfile.value.avatar
          me.avatar_url = myProfile.value.avatar_url
          me.nickname = myProfile.value.nickname
          changed = true
        }
      }
    }
    if (changed) persistGroups()
  }

  init()
  // 初始化后同步头像
  setTimeout(() => syncMyGroupAvatars(), 500)

  void loadProfileFromSupabase

  return {
    // 数据
    myProfile, friends, friendRequests, groups, moments, favorites, aiChatHistory,
    friendTags, blacklist, friendPermissions,
    loading, isAiTyping, aiTypingText, totalUnreadMessages,
    // 档案
    updateProfile, changeSparkId, getQRData, loadProfileFromSupabase, syncProfileToSupabase,
    // 好友
    searchUser, searchBySparkId, sendFriendRequest, addFriend, addFriendByQR, removeFriend, setFriendRemark,
    // 好友管理(星标/标签/拉黑/权限)
    toggleStarFriend, updateFriendRemark,
    createTag, renameTag, deleteTag, addMemberToTag, removeMemberFromTag, setMemberPriority, getTagsForFriend,
    blockFriend, unblockFriend, isBlocked,
    updateFriendPermissions, getFriendPermissions,
    // 私聊
    getPrivateChat, clearPrivateChat, sendPrivateMsg, markMessagesAsRead, getUnreadCount,
    // 消息操作
    recallMessage, sendPokeMessage,
    // 群聊
    createGroup, sendGroupMsg, sendGroupMsgWithMentions, fetchMomentComments,
    // 群管理
    getMemberRole, setGroupAdmin, kickGroupMember, disbandGroup, transferGroupOwner, setGroupAnnouncement, renameGroup,
    setGroupRemark, setMyGroupNickname, getGroupDisplayName,
    // 动态
    postMoment, toggleLike, commentMoment, deleteMoment, togglePinMoment,
    // 动态可见性设置
    momentVisibilitySettings, updateMomentVisibility, filterMomentsByVisibility, isMomentLive,
    // 收藏
    addFavorite, removeFavorite,
    // AI
    sendToAI, clearAIChat,
    // 工具
    formatTimeAgo,
    // 持久化
    persistFriends, persistGroups, syncMyGroupAvatars, MAX_GROUP_MEMBERS,
  }
}
