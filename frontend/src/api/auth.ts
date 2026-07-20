import { apiFetch, setToken } from './client'

/** 与 Go 后端 users 表对齐的用户模型（见 BACKEND-CONTRACT.md §4.1） */
export interface ApiUser {
  id: string
  email: string
  nickname: string
  avatar_url: string | null
  school: string | null
  region: string | null
  role: 'user' | 'admin'
  created_at: string
}

interface AuthResponse {
  token: string
  user: ApiUser
}

export async function apiRegister(email: string, password: string, nickname: string): Promise<ApiUser> {
  const res = await apiFetch<AuthResponse>('/api/auth/register', {
    body: { email, password, nickname },
    noAuth: true,
  })
  setToken(res.token)
  return res.user
}

export async function apiLogin(email: string, password: string): Promise<ApiUser> {
  const res = await apiFetch<AuthResponse>('/api/auth/login', {
    body: { email, password },
    noAuth: true,
  })
  setToken(res.token)
  return res.user
}

export function apiLogout(): void {
  setToken(null)
}

export async function apiMe(): Promise<ApiUser> {
  return apiFetch<ApiUser>('/api/auth/me')
}

export async function apiUpdateMe(patch: Partial<Pick<ApiUser, 'nickname' | 'avatar_url' | 'school' | 'region'>>): Promise<ApiUser> {
  return apiFetch<ApiUser>('/api/auth/me', { method: 'PATCH', body: patch })
}
