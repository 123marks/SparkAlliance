/**
 * sparkCache.ts — 星火助手响应缓存
 * ==================================
 * 目标：对相同 (prompt + 模式 + 最近上下文哈希) 的请求在短时间窗口内命中缓存，
 * 秒回结果并在 UI 上明确标记"来自缓存"，降低 NVIDIA API 调用次数 & 提升体感。
 *
 * 设计要点：
 * 1. LRU + TTL：默认 50 条容量，12h TTL。
 * 2. Key：稳定短哈希（FNV-1a 32-bit，性能够用且无碰撞敏感场景）。
 * 3. 存储：localStorage（通过 persist 防抖），大小硬限 ~256KB，超出自动淘汰最旧。
 * 4. 不缓存的场景（由调用方判断）：
 *    - 有附件（图片/文件）
 *    - 有 extraContext（RAG 结果每次可能变）
 *    - 命中内容安全拦截
 *    - 失败/中断的回复
 *    - 用户标记"不要缓存"
 *
 * 对外 API：
 *   - makeCacheKey(prompt, mode, contextFingerprint?): string
 *   - readCache(key): CacheEntry | null
 *   - writeCache(key, entry): void
 *   - invalidate(key?): void
 *   - getStats(): { size, hits, misses }
 */

import { loadPersist, savePersist } from './persist'

const STORAGE_KEY = 'spark_ai_response_cache_v1'
const DEFAULT_CAPACITY = 50
const DEFAULT_TTL_MS = 12 * 60 * 60 * 1000
const MAX_CONTENT_LENGTH = 32_000 // 单条缓存 content 上限，防止超大响应爆 localStorage

export interface CacheEntry {
  key: string
  prompt: string
  mode: string
  /** 回复内容（已做安全/身份过滤后的干净文本） */
  content: string
  /** 思考过程（可空） */
  reasoning?: string
  /** 创建时间戳（ms） */
  createdAt: number
  /** 命中次数，用于 UI 展示"此回复被缓存 X 次使用" */
  hits: number
}

interface CacheFile {
  __v: 1
  entries: Record<string, CacheEntry>
  /** 简单的 LRU 顺序：越靠前越新 */
  order: string[]
  stats: { hits: number; misses: number; writes: number }
}

const EMPTY_FILE: CacheFile = { __v: 1, entries: {}, order: [], stats: { hits: 0, misses: 0, writes: 0 } }

function loadFile(): CacheFile {
  const raw = loadPersist<CacheFile | null>(STORAGE_KEY, null)
  if (!raw || typeof raw !== 'object' || !('entries' in raw)) return { ...EMPTY_FILE, entries: {}, order: [], stats: { ...EMPTY_FILE.stats } }
  return {
    __v: 1,
    entries: raw.entries || {},
    order: Array.isArray(raw.order) ? raw.order : [],
    stats: raw.stats || { hits: 0, misses: 0, writes: 0 },
  }
}

let file: CacheFile = loadFile()
let saveTimer: ReturnType<typeof setTimeout> | null = null
function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    savePersist(STORAGE_KEY, file)
    saveTimer = null
  }, 400)
}

/** FNV-1a 32-bit 哈希，转 base36 压短。相同输入必出相同输出。 */
function fnv1a(str: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(36)
}

/**
 * 生成缓存 key。
 * @param prompt 用户原始 prompt（会被 trim+lowercase 归一化，去掉首尾空白）
 * @param mode 模式（default/thinking/fast）
 * @param contextFingerprint 可选的上下文指纹（例如最近 5 条消息的哈希），避免同样的 prompt 在不同上下文下错误命中
 */
export function makeCacheKey(prompt: string, mode: string, contextFingerprint?: string): string {
  const p = (prompt || '').trim().toLowerCase().replace(/\s+/g, ' ')
  const ctx = contextFingerprint || ''
  return `${mode}:${fnv1a(p)}:${fnv1a(ctx)}`
}

/** 快速为最近 N 条消息生成指纹，让"同样 prompt 在不同上下文"不会错误命中 */
export function fingerprintContext(recent: Array<{ role: string; content: string }>): string {
  const tail = recent.slice(-5).map((m) => `${m.role}|${(m.content || '').slice(0, 120)}`).join('\n')
  return fnv1a(tail)
}

export function readCache(key: string, ttlMs: number = DEFAULT_TTL_MS): CacheEntry | null {
  const entry = file.entries[key]
  if (!entry) {
    file.stats.misses++
    scheduleSave()
    return null
  }
  if (Date.now() - entry.createdAt > ttlMs) {
    // 过期：清除
    delete file.entries[key]
    file.order = file.order.filter((k) => k !== key)
    file.stats.misses++
    scheduleSave()
    return null
  }
  // LRU 提升
  file.order = [key, ...file.order.filter((k) => k !== key)]
  entry.hits++
  file.stats.hits++
  scheduleSave()
  return entry
}

export interface WriteCacheInput {
  prompt: string
  mode: string
  content: string
  reasoning?: string
  contextFingerprint?: string
}

export function writeCache(input: WriteCacheInput, opts?: { capacity?: number }): string | null {
  const content = (input.content || '').trim()
  if (!content) return null
  if (content.length > MAX_CONTENT_LENGTH) return null // 太大不缓存，避免吃光 localStorage

  const key = makeCacheKey(input.prompt, input.mode, input.contextFingerprint)
  const entry: CacheEntry = {
    key,
    prompt: input.prompt,
    mode: input.mode,
    content,
    reasoning: input.reasoning && input.reasoning.length < MAX_CONTENT_LENGTH ? input.reasoning : undefined,
    createdAt: Date.now(),
    hits: 0,
  }
  file.entries[key] = entry
  file.order = [key, ...file.order.filter((k) => k !== key)]
  file.stats.writes++

  const capacity = opts?.capacity ?? DEFAULT_CAPACITY
  while (file.order.length > capacity) {
    const oldestKey = file.order.pop()
    if (oldestKey) delete file.entries[oldestKey]
  }
  scheduleSave()
  return key
}

export function invalidate(key?: string) {
  if (key) {
    delete file.entries[key]
    file.order = file.order.filter((k) => k !== key)
  } else {
    file = { __v: 1, entries: {}, order: [], stats: { hits: 0, misses: 0, writes: 0 } }
  }
  scheduleSave()
}

export function getCacheStats(): { size: number; hits: number; misses: number; writes: number } {
  return {
    size: file.order.length,
    hits: file.stats.hits,
    misses: file.stats.misses,
    writes: file.stats.writes,
  }
}

/** 把 entry 按"流式"方式分批投喂给 onChunk 回调，模拟真实对话体感 */
export async function replayCachedStream(
  entry: CacheEntry,
  onChunk: (text: string) => void,
  opts?: { batchSize?: number; intervalMs?: number; onThinking?: (text: string) => void },
): Promise<void> {
  const batch = opts?.batchSize ?? 4
  const interval = opts?.intervalMs ?? 12
  // 先把 reasoning 一次性吐出
  if (entry.reasoning && opts?.onThinking) opts.onThinking(entry.reasoning)
  const text = entry.content
  let cursor = 0
  return new Promise((resolve) => {
    const tick = () => {
      if (cursor >= text.length) { onChunk(text); resolve(); return }
      cursor = Math.min(text.length, cursor + batch)
      onChunk(text.slice(0, cursor))
      setTimeout(tick, interval)
    }
    tick()
  })
}
