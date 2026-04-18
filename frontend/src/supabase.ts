import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'http://localhost:54321'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'fake-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    storageKey: 'spark-auth-token',
  },
  global: {
    headers: { 'x-client-app': 'spark-alliance' },
  },
})

/**
 * 调用 Supabase Edge Function 的统一封装。
 *
 * ─── 头部策略（修复 UNAUTHORIZED_UNSUPPORTED_TOKEN_ALGORITHM 的关键）───
 *
 *  apikey:        VITE_SUPABASE_ANON_KEY（sb_publishable_xxx 或旧 eyJ JWT 都可）
 *  Authorization: Bearer <用户 access_token>
 *
 * 为什么不能把 user access_token 同时塞进 apikey ？
 * ────────────────────────────────────────────────
 * Supabase 已升级 Auth 到 ES256（ECC P-256）签名，但 Edge Function
 * 网关侧的 `jose` 库尚未稳定支持 ES256 的 JWKS 校验
 *  → 任何放进 apikey 头的 ES256 JWT 都会被网关直接打回
 *    `401 UNAUTHORIZED_UNSUPPORTED_TOKEN_ALGORITHM`
 *
 * 而 sb_publishable_xxx 不是 JWT，网关不会触发 alg 校验，可以安全放 apikey。
 * 兜底：若 anon key 缺失（fake-anon-key），仍回落到放 access_token，
 *       让本地开发场景在没有真实 anon key 时也能跑通。
 *
 * Edge Function 内部仍用 service_role key 校验 Authorization 中的 user JWT
 * （见 assistant-chat/index.ts），不依赖 apikey 头的内容。
 *
 * 对于 SSE（text/event-stream）返回，data 即原始 Response 对象，
 * 可直接 getReader() 逐块读取。
 */
export async function invokeEdgeFunction<T = unknown>(
  functionName: string,
  body: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<{ data: T; response: Response }> {
  /* ── 1. 获取用户 JWT（getValidSession 等价：< 90s 自动 refresh） ── */
  let session = (await supabase.auth.getSession()).data.session
  if (session?.access_token) {
    const nowSec = Math.floor(Date.now() / 1000)
    const expSec = session.expires_at ?? 0
    if (expSec > 0 && expSec - nowSec < 90) {
      try {
        const refreshed = await supabase.auth.refreshSession()
        session = refreshed.data?.session ?? session
      } catch { /* refresh 失败就用原 token，让 Edge Function 明确 401 */ }
    }
  }
  const token = session?.access_token
  if (!token) {
    throw Object.assign(new Error('请先登录后再使用星火助手'), { code: 'NO_AUTH', httpStatus: 401 })
  }

  /* ── 2. 选 apikey：优先 anon key；fake 时回落 user JWT ── */
  const apikeyHeader = supabaseAnonKey && supabaseAnonKey !== 'fake-anon-key'
    ? supabaseAnonKey
    : token

  /* ── 3. 直接 fetch（不走 client.functions.invoke 以保留对 apikey 的完全控制） ── */
  const url = `${supabaseUrl}/functions/v1/${functionName}`
  let response: Response
  const fetchStartedAt = (typeof performance !== 'undefined' ? performance.now() : Date.now())
  try {
    response = await fetch(url, {
      method: 'POST',
      // 关键：只发 CORS 允许列表里的头（Authorization / apikey / content-type / x-client-info），
      // 不要加自定义头（如 x-client-app），否则浏览器 preflight 会被 Edge Function 的
      // Access-Control-Allow-Headers 拒绝，整个请求挂在 NetworkError，前端只看到「网络连接失败」。
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        apikey: apikeyHeader,
      },
      body: JSON.stringify(body),
      signal,
    })
  } catch (fetchErr: any) {
    if (fetchErr?.name === 'AbortError') {
      throw Object.assign(new Error('已停止生成'), { code: 'ABORTED', httpStatus: 0 })
    }
    /**
     * fetch TypeError 真实诊断：
     * 浏览器在 fetch 失败时只会抛 "Failed to fetch"，没有具体原因。
     * 这里把 URL、真实 error.message、耗时、UA 摘要都拼进 message，
     * 让 humanizeErrorCode 能透传给 UI、用户截图就能看到根因，
     * 同时 console.error 完整堆栈便于 DevTools 定位。
     */
    const elapsedMs = Math.round(((typeof performance !== 'undefined' ? performance.now() : Date.now()) - fetchStartedAt))
    const rawMsg = (fetchErr?.message || 'unknown fetch error').toString()
    const onlineHint = (typeof navigator !== 'undefined' && navigator.onLine === false) ? '（浏览器报告当前离线）' : ''
    const detail = `${rawMsg}${onlineHint} · target=${url} · ${elapsedMs}ms`
    console.error('[invokeEdgeFunction] fetch TypeError:', {
      url,
      elapsedMs,
      online: typeof navigator !== 'undefined' ? navigator.onLine : 'n/a',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'n/a',
      error: fetchErr,
    })
    throw Object.assign(
      new Error(detail),
      { code: 'NETWORK_ERROR', httpStatus: 0, target: url, elapsedMs },
    )
  }

  /* ── 4. 非 2xx → 解析结构化错误 ── */
  if (!response.ok) {
    let code = `HTTP_${response.status}`
    let reason = ''
    let raw = ''
    try {
      const payload = await response.clone().json()
      if (payload && typeof payload === 'object') {
        code = typeof payload.code === 'string' ? payload.code : code
        reason = typeof payload.error === 'string'
          ? payload.error
          : typeof payload.message === 'string' ? payload.message : ''
      }
    } catch {
      try { raw = await response.clone().text() } catch { /* ignore */ }
      reason = raw ? raw.slice(0, 200) : `HTTP ${response.status}`
    }
    // 网关 alg 错误的人话提示
    if (/UNSUPPORTED_TOKEN_ALGORITHM/i.test(code) || /UNSUPPORTED_TOKEN_ALGORITHM/i.test(reason)) {
      reason = 'Supabase 网关当前的 JWT 校验策略与本项目密钥不匹配。请管理员在 Dashboard → Project Settings → API Keys 中确认使用 sb_publishable_xxx 作为前端公钥，并把它写入 frontend/.env.local 的 VITE_SUPABASE_ANON_KEY；保存后刷新页面重试。'
      code = 'GATEWAY_TOKEN_ALG_MISMATCH'
    }
    throw Object.assign(
      new Error(reason || `Edge Function 错误 (${code})`),
      { code, httpStatus: response.status },
    )
  }

  /* ── 5. 按 Content-Type 分流 ── */
  const contentType = (response.headers.get('Content-Type') ?? '').split(';')[0].trim()

  if (contentType === 'text/event-stream') {
    return { data: response as unknown as T, response }
  }

  if (contentType === 'application/json') {
    const json = await response.json()
    return { data: json as T, response }
  }

  const text = await response.text()
  let parsed: any
  try { parsed = JSON.parse(text) } catch { parsed = { content: text } }
  return { data: parsed as T, response }
}

if (typeof window !== 'undefined') {
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'TOKEN_REFRESHED' && session?.expires_at) {
      console.debug('[Auth] token refreshed, expires_at:', new Date(session.expires_at * 1000).toISOString())
    }
  })
}
