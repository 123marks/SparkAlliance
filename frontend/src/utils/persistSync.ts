/**
 * persistSync — 本地 localStorage ↔ Supabase 双向同步层
 * ======================================================
 * 工作原理：
 * 1. 启动时注册一组 SYNC_KEYS（及聊天前缀 `spark_chat_*`）的远端适配器；
 *    任何 savePersist 写入都会自动 upsert 到 Supabase。
 * 2. 监听 Supabase auth 状态：首次拿到 user（或登录/切换账号）时触发 fullSync()
 *    - 拉取该用户在 spark_user_state 表下的所有行
 *    - 以 updated_at 为准做 last-write-wins：
 *        · 远端新 → writeLocalFromRemote（并通过 subscribePersist 通知 Vue ref 刷新）
 *        · 本地新 → upsert 回远端
 * 3. profile 键 (`spark_companion_profile`) 额外镜像到结构化表 `spark_profiles`，
 *    供好友广场 / 搜索 / 跨模块使用。
 *
 * 设计约束：
 * - 聊天记录（spark_chat_<id>）数量可能很大，通过前缀适配器 `spark_chat_*` 统一处理，
 *   但只做轻量同步（<256KB 限制由数据库 trigger 兜底）。
 * - 远端同步失败不影响本地操作；网络异常在 console.warn 输出。
 */

import { supabase } from '../supabase'
import {
  registerSyncAdapter,
  getPersistMeta,
  loadPersist,
  writeLocalFromRemote,
  type PersistSyncAdapter,
} from './persist'

/** 会被同步到云端的 localStorage key 列表（精确匹配） */
export const SYNC_KEYS = [
  // useCompanion
  'spark_companion_profile',
  'spark_companion_friends',
  'spark_companion_requests',
  'spark_companion_groups',
  'spark_companion_moments',
  'spark_companion_favorites',
  'spark_companion_ai_chat',
  'spark_companion_tags',
  'spark_companion_blacklist',
  'spark_companion_friend_permissions',
  'spark_companion_moment_visibility',
  // useSparkAI
  'spark_ai_conversations',
  // useSettings / 外观
  'spark_appearance',
  // useSemester
  'spark_semester_config',
  // 档案背景/个人设置
  'spark_profile_settings',
] as const

/** 会被同步的 key 前缀（支持通配） */
export const SYNC_PREFIXES = [
  'spark_chat_',       // 私聊消息
  'spark-bg-',         // 个人档案背景
  'spark-profile-',    // 档案零散键
] as const

let initialized = false
let syncing = false
let lastSyncedUserId: string | null = null

/** Supabase 行类型（只选必要字段） */
interface StateRow {
  state_key: string
  data: unknown
  updated_at: string
}

/** 单个 key 的远端适配器：本地变更 → upsert 到 spark_user_state */
const upsertAdapter: PersistSyncAdapter = async (key, value, meta) => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const { error } = await supabase.from('spark_user_state').upsert({
    user_id: user.id,
    state_key: key,
    data: value ?? null,
    updated_at: new Date(meta.updated_at).toISOString(),
  }, { onConflict: 'user_id,state_key' })
  if (error) console.warn('[persistSync] upsert failed:', key, error.message)
}

/** profile 镜像适配器：同时写 spark_user_state + spark_profiles */
const profileMirrorAdapter: PersistSyncAdapter = async (key, value, meta) => {
  await upsertAdapter(key, value, meta)
  if (!value || typeof value !== 'object') return
  const p = value as Record<string, unknown>
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const payload: Record<string, unknown> = { user_id: user.id }
  if (typeof p.spark_id === 'string') payload.spark_id = p.spark_id
  if (typeof p.nickname === 'string') payload.nickname = p.nickname
  if (typeof p.avatar_url === 'string') payload.avatar_url = p.avatar_url
  if (typeof p.bio === 'string') payload.bio = p.bio
  if (typeof p.university === 'string') payload.university = p.university
  if (typeof p.school_year === 'string') payload.school_year = p.school_year
  if (typeof p.gender === 'string') payload.gender = p.gender
  if (Array.isArray(p.interests)) payload.interests = p.interests
  if (typeof p.show_in_plaza === 'boolean') payload.show_in_plaza = p.show_in_plaza
  try {
    const { error } = await supabase.from('spark_profiles').upsert(payload, { onConflict: 'user_id' })
    if (error) console.warn('[persistSync] mirror spark_profiles failed:', error.message)
  } catch (e) {
    console.warn('[persistSync] mirror spark_profiles error:', e)
  }
}

/** 注册所有精确和前缀适配器（幂等） */
function registerAllAdapters() {
  for (const key of SYNC_KEYS) {
    registerSyncAdapter(key, key === 'spark_companion_profile' ? profileMirrorAdapter : upsertAdapter)
  }
  for (const prefix of SYNC_PREFIXES) {
    registerSyncAdapter(prefix + '*', upsertAdapter)
  }
}

/**
 * 拉取当前用户所有云端状态，与本地做 last-write-wins 合并。
 * 如果远端新 → 覆盖本地；如果本地新 → 推回远端。
 */
export async function fullSync(): Promise<void> {
  if (syncing) return
  syncing = true
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: rows, error } = await supabase
      .from('spark_user_state')
      .select('state_key, data, updated_at')
      .eq('user_id', user.id)

    if (error) {
      console.warn('[persistSync] fullSync fetch failed:', error.message)
      return
    }

    const remoteMap = new Map<string, StateRow>()
    for (const r of (rows || [])) remoteMap.set(r.state_key, r as StateRow)

    // 合并远端 → 本地
    for (const [key, row] of remoteMap) {
      const remoteTs = new Date(row.updated_at).getTime() || 0
      const localTs = getPersistMeta(key).updated_at
      if (remoteTs > localTs) {
        writeLocalFromRemote(key, row.data, remoteTs)
      }
    }

    // 本地比远端新的键推回云端（包括远端没有的本地键）
    const keysToCheck = new Set<string>(SYNC_KEYS)
    // 遍历 localStorage 里以 SYNC_PREFIXES 开头的键
    if (typeof window !== 'undefined' && window.localStorage) {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (!k) continue
        if (SYNC_PREFIXES.some(p => k.startsWith(p))) keysToCheck.add(k)
      }
    }

    const pushPromises: Promise<void>[] = []
    for (const key of keysToCheck) {
      const localTs = getPersistMeta(key).updated_at
      if (!localTs) continue // 本地从未写过，跳过
      const row = remoteMap.get(key)
      const remoteTs = row ? (new Date(row.updated_at).getTime() || 0) : 0
      if (localTs > remoteTs) {
        const data = loadPersist<unknown>(key, null)
        if (data == null) continue
        pushPromises.push(
          supabase.from('spark_user_state').upsert({
            user_id: user.id,
            state_key: key,
            data,
            updated_at: new Date(localTs).toISOString(),
          }, { onConflict: 'user_id,state_key' })
            .then(({ error: e }) => {
              if (e) console.warn('[persistSync] push failed:', key, e.message)
            })
        )
      }
    }
    await Promise.allSettled(pushPromises)

    lastSyncedUserId = user.id
  } catch (e) {
    console.warn('[persistSync] fullSync error:', e)
  } finally {
    syncing = false
  }
}

/**
 * 初始化同步层：注册 adapters + 订阅 auth 事件。
 * 应在 main.ts 中调用一次。
 */
export function initPersistSync() {
  if (initialized) return
  initialized = true
  registerAllAdapters()

  // 启动时尝试一次（可能已有 session）
  void fullSync()

  // 监听后续登录 / 刷新 token / 切换账号
  supabase.auth.onAuthStateChange((_event, session) => {
    const uid = session?.user?.id || null
    if (!uid) { lastSyncedUserId = null; return }
    if (uid !== lastSyncedUserId) {
      void fullSync()
    }
  })

  // 页面重新可见时，轻量再同步一次（其他设备的更新）
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void fullSync()
    })
  }
}

/** 供调试 / 测试使用：强制触发一次同步（返回 Promise） */
export async function syncNow(): Promise<void> {
  await fullSync()
}

/** 调试：当前是否已初始化 */
export function isSyncInitialized() { return initialized }
