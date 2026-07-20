import { ref } from 'vue'
import { apiLogin, apiRegister, apiLogout, apiMe, apiUpdateMe, type ApiUser } from '../api/auth'
import { getToken, ApiError } from '../api/client'

/**
 * 会话用户（自建 Go 后端）。
 * 字段形状对齐旧 Supabase User（id/email/user_metadata），
 * 让全站既有的 `user.value?.user_metadata?.nickname` 类访问零改动继续工作。
 */
export interface SparkUser {
  id: string
  email: string
  role: 'user' | 'admin'
  created_at: string
  /** 兼容旧 Supabase User.user_metadata 的宽松访问（历史代码大量直接取任意键） */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  user_metadata: { nickname?: string; avatar_url?: string; school?: string; region?: string } & Record<string, any>
}

function toSparkUser(u: ApiUser): SparkUser {
  return {
    id: u.id,
    email: u.email,
    role: u.role,
    created_at: u.created_at,
    user_metadata: {
      nickname: u.nickname || undefined,
      avatar_url: u.avatar_url || undefined,
      school: u.school || undefined,
      region: u.region || undefined,
    },
  }
}

const user = ref<SparkUser | null>(null)
const loadingParams = ref(true)
let expiredListenerBound = false

export function useAuth() {
  /** 应用启动时恢复会话：有 token 就向后端要 me */
  const initAuth = async () => {
    loadingParams.value = true
    try {
      if (getToken()) {
        user.value = toSparkUser(await apiMe())
      } else {
        user.value = null
      }
    } catch (error) {
      // token 失效（401 已由 client 清除）或后端未启动：保持未登录态
      if (!(error instanceof ApiError && error.httpStatus === 401)) {
        console.warn('[Auth] 会话恢复失败:', error)
      }
      user.value = null
    } finally {
      loadingParams.value = false
    }

    if (!expiredListenerBound && typeof window !== 'undefined') {
      window.addEventListener('spark-auth-expired', () => { user.value = null })
      expiredListenerBound = true
    }
  }

  const login = async (email: string, password: string): Promise<SparkUser> => {
    const u = toSparkUser(await apiLogin(email, password))
    user.value = u
    return u
  }

  const register = async (email: string, password: string, nickname: string): Promise<SparkUser> => {
    const u = toSparkUser(await apiRegister(email, password, nickname))
    user.value = u
    return u
  }

  const logout = () => {
    apiLogout()
    user.value = null
  }

  const updateProfile = async (patch: { nickname?: string; avatar_url?: string; school?: string; region?: string }): Promise<SparkUser> => {
    const u = toSparkUser(await apiUpdateMe(patch))
    user.value = u
    return u
  }

  return {
    user,
    isLoading: loadingParams,
    initAuth,
    login,
    register,
    logout,
    updateProfile,
  }
}
