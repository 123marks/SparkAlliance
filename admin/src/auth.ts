const TOKEN_KEY = 'spark_admin_token'
const EMAIL_KEY = 'spark_admin_email'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setSession(token: string, email: string): void {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(EMAIL_KEY, email)
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(EMAIL_KEY)
}

export function getAdminEmail(): string {
  return localStorage.getItem(EMAIL_KEY) ?? ''
}
