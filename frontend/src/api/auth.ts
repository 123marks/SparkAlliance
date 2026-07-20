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

export async function apiRegister(email: string, password: string, nickname: string, emailCode?: string): Promise<ApiUser> {
  const res = await apiFetch<AuthResponse>('/api/auth/register', {
    body: { email, password, nickname, ...(emailCode ? { email_code: emailCode } : {}) },
    noAuth: true,
  })
  setToken(res.token)
  return res.user
}

/** 发送邮箱验证码；dev_mode（后端未配 SMTP）时响应会带回明文 code */
export async function apiSendEmailCode(email: string, purpose: 'register' | 'reset_password'): Promise<{ sent: boolean; dev_mode?: boolean; code?: string }> {
  return apiFetch('/api/auth/email-code', { body: { email, purpose }, noAuth: true })
}

/** 验证码重置密码（成功后旧 token 全部失效） */
export async function apiVerifyReset(email: string, code: string, newPassword: string): Promise<void> {
  await apiFetch('/api/auth/verify-reset', { body: { email, code, new_password: newPassword }, noAuth: true })
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
