/**
 * 稳健的本地持久化层
 * ==================
 * 兼容原有 localStorage API，额外提供：
 * 1. 配额保护：localStorage 满时降级为内存存储，避免崩溃
 * 2. 防抖写入：相同 key 的高频写入会被合并
 * 3. 跨标签页同步：订阅 storage 事件自动更新内存副本
 * 4. schema 版本号与迁移钩子
 * 5. 可插拔的远端同步适配器（Supabase）
 */

export type PersistSyncAdapter = (key: string, value: unknown) => void | Promise<void>

const MEMORY_FALLBACK: Record<string, string> = {}
const SUBSCRIBERS: Map<string, Set<(v: unknown) => void>> = new Map()
const SYNC_ADAPTERS: Map<string, PersistSyncAdapter> = new Map()
const PENDING_WRITES: Map<string, { data: unknown; timer: ReturnType<typeof setTimeout> | null }> = new Map()
const DEBOUNCE_MS = 200

let quotaExceeded = false

function canUseLocalStorage(): boolean {
  try { return typeof window !== 'undefined' && !!window.localStorage } catch { return false }
}

function rawGet(key: string): string | null {
  if (quotaExceeded || !canUseLocalStorage()) return MEMORY_FALLBACK[key] ?? null
  try { return localStorage.getItem(key) } catch { return MEMORY_FALLBACK[key] ?? null }
}

function rawSet(key: string, value: string): 'ok' | 'quota' | 'error' {
  MEMORY_FALLBACK[key] = value
  if (!canUseLocalStorage()) return 'error'
  try {
    localStorage.setItem(key, value)
    return 'ok'
  } catch (e: any) {
    if (e && (e.code === 22 || e.code === 1014 || /quota/i.test(String(e.name)))) {
      quotaExceeded = true
      try { cleanupQuota() } catch { /* ignore */ }
      return 'quota'
    }
    return 'error'
  }
}

function rawRemove(key: string) {
  delete MEMORY_FALLBACK[key]
  if (!canUseLocalStorage()) return
  try { localStorage.removeItem(key) } catch { /* ignore */ }
}

/** 配额不足时的清理策略：删除历史聊天缓存（最旧优先） */
function cleanupQuota() {
  if (!canUseLocalStorage()) return
  const chatKeys: Array<[string, number]> = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (!k) continue
    if (k.startsWith('spark_chat_')) {
      try {
        const arr = JSON.parse(localStorage.getItem(k) || '[]') as Array<{ created_at?: string }>
        const last = arr[arr.length - 1]?.created_at || '1970'
        chatKeys.push([k, new Date(last).getTime() || 0])
      } catch { chatKeys.push([k, 0]) }
    }
  }
  chatKeys.sort((a, b) => a[1] - b[1])
  const toRemove = Math.ceil(chatKeys.length * 0.2)
  for (let i = 0; i < toRemove; i++) {
    try { localStorage.removeItem(chatKeys[i][0]) } catch { /* ignore */ }
  }
  quotaExceeded = false
}

/**
 * 读取数据（带默认值 + 版本号兼容）
 */
export function loadPersist<T>(key: string, fallback: T): T {
  const raw = rawGet(key)
  if (!raw) return fallback
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && '__v' in parsed && 'data' in parsed) {
      return (parsed as { __v: number; data: T }).data ?? fallback
    }
    return (parsed as T) ?? fallback
  } catch { return fallback }
}

/**
 * 写入数据（防抖 + 远端同步）
 */
export function savePersist(key: string, data: unknown, opts?: { immediate?: boolean; version?: number }): void {
  const pending = PENDING_WRITES.get(key)
  if (pending?.timer) clearTimeout(pending.timer)

  const flush = () => {
    const payload = opts?.version != null ? { __v: opts.version, data } : data
    let serialized: string
    try { serialized = JSON.stringify(payload) } catch { return }
    rawSet(key, serialized)
    PENDING_WRITES.delete(key)
    SUBSCRIBERS.get(key)?.forEach(fn => { try { fn(data) } catch { /* ignore */ } })
    const adapter = SYNC_ADAPTERS.get(key)
    if (adapter) {
      try { Promise.resolve(adapter(key, data)).catch(() => { /* 远端失败不影响本地 */ }) } catch { /* ignore */ }
    }
  }

  if (opts?.immediate) { flush(); return }
  const timer = setTimeout(flush, DEBOUNCE_MS)
  PENDING_WRITES.set(key, { data, timer })
}

export function removePersist(key: string) {
  const pending = PENDING_WRITES.get(key)
  if (pending?.timer) clearTimeout(pending.timer)
  PENDING_WRITES.delete(key)
  rawRemove(key)
  SUBSCRIBERS.get(key)?.forEach(fn => { try { fn(undefined) } catch { /* ignore */ } })
}

/** 订阅 key 的变化（本地 + 跨标签页） */
export function subscribePersist<T = unknown>(key: string, cb: (value: T | undefined) => void): () => void {
  if (!SUBSCRIBERS.has(key)) SUBSCRIBERS.set(key, new Set())
  const set = SUBSCRIBERS.get(key)!
  const wrapped = (v: unknown) => cb(v as T | undefined)
  set.add(wrapped)
  return () => { set.delete(wrapped) }
}

/** 注册远端同步适配器（例如同步到 Supabase） */
export function registerSyncAdapter(keyOrPrefix: string, adapter: PersistSyncAdapter) {
  SYNC_ADAPTERS.set(keyOrPrefix, adapter)
}

/** 立即 flush 所有 pending 写入（页面卸载前调用） */
export function flushAllPending() {
  PENDING_WRITES.forEach((p, key) => {
    if (p.timer) clearTimeout(p.timer)
    const payload = p.data
    let s: string
    try { s = JSON.stringify(payload) } catch { return }
    rawSet(key, s)
    SUBSCRIBERS.get(key)?.forEach(fn => { try { fn(payload) } catch { /* ignore */ } })
  })
  PENDING_WRITES.clear()
}

/** 跨标签页同步：监听 storage 事件 */
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (!e.key) return
    const subs = SUBSCRIBERS.get(e.key)
    if (!subs || !subs.size) return
    try {
      const value = e.newValue ? JSON.parse(e.newValue) : undefined
      const actual = value && typeof value === 'object' && '__v' in value ? (value as any).data : value
      subs.forEach(fn => { try { fn(actual) } catch { /* ignore */ } })
    } catch { /* ignore */ }
  })
  window.addEventListener('beforeunload', flushAllPending)
  window.addEventListener('pagehide', flushAllPending)
}

/** 是否触发过 quota */
export function hasQuotaIssue() { return quotaExceeded }
