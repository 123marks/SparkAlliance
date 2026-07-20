// 统一 fetch 封装：Bearer 注入、错误规范化、401 全局拦截回登录
import { clearSession, getToken } from './auth'
import type {
  AdminPost,
  AdminReport,
  AdminUser,
  LoginResponse,
  ModuleStat,
  PostListResponse,
  PostStatus,
  ReportStatus,
  StatsOverview,
  TrendPoint,
  UserListResponse,
  UserRole,
  UserStatus,
} from './types'

export const API_BASE: string =
  (import.meta.env.VITE_API_BASE as string | undefined) ?? 'http://127.0.0.1:8787'

/** 后端统一错误体 {error, code}；网络层失败 code 固定 NETWORK_ERROR */
export class ApiError extends Error {
  readonly code: string
  readonly status: number

  constructor(message: string, code: string, status: number) {
    super(message)
    this.code = code
    this.status = status
  }
}

let onUnauthorized: (() => void) | null = null

/** router 装配时注册，避免 api 模块反向依赖路由 */
export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  /** 登录请求本身 401 时不触发全局跳转 */
  skipAuthRedirect?: boolean
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {}
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'

  let res: Response
  try {
    res = await fetch(`${API_BASE}/api${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    })
  } catch {
    throw new ApiError('无法连接后端服务，请确认服务已启动', 'NETWORK_ERROR', 0)
  }

  if (res.status === 401 && !options.skipAuthRedirect) {
    clearSession()
    onUnauthorized?.()
    throw new ApiError('登录已失效，请重新登录', 'UNAUTHORIZED', 401)
  }

  if (!res.ok) {
    let message = `请求失败（HTTP ${res.status}）`
    let code = 'HTTP_ERROR'
    try {
      const data = (await res.json()) as { error?: string; code?: string }
      if (data.error) message = data.error
      if (data.code) code = data.code
    } catch {
      // 非 JSON 错误体，保留默认信息
    }
    throw new ApiError(message, code, res.status)
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

function qs(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value))
  }
  const str = search.toString()
  return str ? `?${str}` : ''
}

// ---- Auth ----

export function login(email: string, password: string): Promise<LoginResponse> {
  return request<LoginResponse>('/auth/login', {
    method: 'POST',
    body: { email, password },
    skipAuthRedirect: true,
  })
}

// ---- Admin: stats ----

export function fetchOverview(): Promise<StatsOverview> {
  return request<StatsOverview>('/admin/stats/overview')
}

export async function fetchTrend(days = 30): Promise<TrendPoint[]> {
  const res = await request<{ trend: TrendPoint[] }>(`/admin/stats/trend${qs({ days })}`)
  return res.trend ?? []
}

export async function fetchModules(): Promise<ModuleStat[]> {
  const res = await request<{ modules: ModuleStat[] }>('/admin/stats/modules')
  return res.modules ?? []
}

// ---- Admin: users ----

export function fetchUsers(params: {
  search?: string
  status?: string
  limit: number
  offset: number
}): Promise<UserListResponse> {
  return request<UserListResponse>(`/admin/users${qs(params)}`)
}

export function updateUser(
  id: string,
  patch: { status?: UserStatus; role?: UserRole },
): Promise<AdminUser> {
  return request<AdminUser>(`/admin/users/${id}`, { method: 'PATCH', body: patch })
}

// ---- Admin: posts ----

export function fetchPosts(params: {
  status?: string
  search?: string
  limit: number
  offset: number
}): Promise<PostListResponse> {
  return request<PostListResponse>(`/admin/posts${qs(params)}`)
}

export function updatePostStatus(id: string, status: PostStatus): Promise<AdminPost> {
  return request<AdminPost>(`/admin/posts/${id}`, { method: 'PATCH', body: { status } })
}

// ---- Admin: reports ----

export function fetchReports(status?: ReportStatus): Promise<AdminReport[]> {
  return request<AdminReport[]>(`/admin/reports${qs({ status })}`)
}

export function updateReport(
  id: string,
  patch: { status: 'resolved' | 'dismissed'; hide_target?: boolean },
): Promise<AdminReport> {
  return request<AdminReport>(`/admin/reports/${id}`, { method: 'PATCH', body: patch })
}
