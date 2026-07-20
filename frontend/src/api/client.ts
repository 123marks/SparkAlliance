/**
 * 自建 Go 后端（BACKEND-CONTRACT.md）的统一 fetch 客户端。
 *
 * - token 存 localStorage `spark_api_token`，自动注入 Authorization
 * - 非 2xx 统一抛 ApiError（携带后端 {error, code} 与 httpStatus）
 * - 401 时清除本地 token 并广播 `spark-auth-expired` 事件（由 useAuth 监听跳登录）
 */

export const API_BASE: string =
  (import.meta.env.VITE_API_BASE as string | undefined) || 'http://127.0.0.1:8787'

const TOKEN_KEY = 'spark_api_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export class ApiError extends Error {
  code: string
  httpStatus: number
  constructor(message: string, code: string, httpStatus: number) {
    super(message)
    this.code = code
    this.httpStatus = httpStatus
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  /** 显式跳过 Authorization（登录/注册） */
  noAuth?: boolean
  signal?: AbortSignal
}

export async function apiFetch<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {}
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  const token = getToken()
  if (token && !options.noAuth) headers['Authorization'] = `Bearer ${token}`

  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: options.method || (options.body !== undefined ? 'POST' : 'GET'),
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    })
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') throw err
    throw new ApiError('无法连接服务器，请确认后端已启动', 'NETWORK_ERROR', 0)
  }

  if (response.status === 401 && !options.noAuth) {
    setToken(null)
    window.dispatchEvent(new CustomEvent('spark-auth-expired'))
  }

  if (!response.ok) {
    let message = `请求失败（HTTP ${response.status}）`
    let code = `HTTP_${response.status}`
    try {
      const payload = await response.json()
      if (payload && typeof payload === 'object') {
        if (typeof payload.error === 'string') message = payload.error
        if (typeof payload.code === 'string') code = payload.code
      }
    } catch { /* 保留默认 message */ }
    throw new ApiError(message, code, response.status)
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

/** multipart 上传（POST /api/uploads），返回可访问 URL */
export async function apiUpload(file: File): Promise<string> {
  const token = getToken()
  const form = new FormData()
  form.append('file', file)
  const response = await fetch(`${API_BASE}/api/uploads`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  })
  if (!response.ok) {
    let message = '上传失败'
    try { message = (await response.json()).error || message } catch { /* ignore */ }
    throw new ApiError(message, 'UPLOAD_FAILED', response.status)
  }
  const { url } = await response.json()
  return url.startsWith('http') ? url : `${API_BASE}${url}`
}
