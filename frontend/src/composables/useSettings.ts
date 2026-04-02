import { ref, watch } from 'vue'
import { supabase } from '../supabase'
import { useAuth } from './useAuth'
import type {
  AccessibilityData,
  AppearanceSettings,
  EducationData,
  FeaturesData,
  NotificationData,
  PrivacyData,
  ProfileData,
  RecommendationData,
  UserSettingsRow,
} from '../types/settings'
import {
  ACCESSIBILITY_DEFAULTS,
  APPEARANCE_DEFAULTS,
  FEATURES_DEFAULTS,
  NOTIFICATION_DEFAULTS,
  PRIVACY_DEFAULTS,
  PROFILE_DEFAULTS,
  RECOMMENDATION_DEFAULTS,
  deepMergeDefaults,
} from '../utils/settingsDefaults'

const APPEARANCE_STORAGE_KEY = 'spark-appearance'
const CURRENT_SCHEMA_VERSION = 1

const appearance = ref<AppearanceSettings>({ ...APPEARANCE_DEFAULTS })
const profile = ref<ProfileData>({ ...PROFILE_DEFAULTS })
const privacy = ref<PrivacyData>({ ...PRIVACY_DEFAULTS })
const notifications = ref<NotificationData>({ ...NOTIFICATION_DEFAULTS })
const features = ref<FeaturesData>(structuredClone(FEATURES_DEFAULTS))
const recommendation = ref<RecommendationData>(structuredClone(RECOMMENDATION_DEFAULTS))
const accessibility = ref<AccessibilityData>({ ...ACCESSIBILITY_DEFAULTS })
const education = ref<EducationData>({
  university: '',
  department: '',
  major: '',
  grade: '',
  studentId: '',
  enrollmentYear: null,
})

const isLoading = ref(false)
const isSaving = ref(false)
const error = ref<string | null>(null)
const settingsLoaded = ref(false)

function cloneDefaults<T>(value: T): T {
  if (typeof structuredClone === 'function') return structuredClone(value)
  return JSON.parse(JSON.stringify(value)) as T
}

function loadAppearanceFromStorage(): AppearanceSettings {
  try {
    const stored = localStorage.getItem(APPEARANCE_STORAGE_KEY)
    if (stored) {
      return deepMergeDefaults(JSON.parse(stored), APPEARANCE_DEFAULTS)
    }
  } catch {
    // Ignore malformed local cache and fall back to defaults.
  }

  return { ...APPEARANCE_DEFAULTS }
}

function saveAppearanceToStorage(value: AppearanceSettings) {
  localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(value))
}

function resolveTheme(theme: AppearanceSettings['theme']): 'dark' | 'light' {
  if (theme === 'auto') {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  }
  return theme
}

function applyAppearanceToDOM(value: AppearanceSettings) {
  if (typeof document === 'undefined') return

  const root = document.documentElement
  const effective = resolveTheme(value.theme)
  root.dataset.theme = effective

  // 主题色 — 覆盖品牌色和 theme-color 别名
  root.style.setProperty('--color-brand-blue', value.primaryColor)
  root.style.setProperty('--theme-color', value.primaryColor)
  root.style.setProperty('--gradient-brand', `linear-gradient(135deg, ${value.primaryColor}, #8b5cf6)`)
  root.style.setProperty('--shadow-glow-blue', `0 0 20px ${value.primaryColor}33`)

  // ★ 核心修复：根据主题切换所有背景/文字/边框 CSS 变量
  if (effective === 'light') {
    root.style.setProperty('--color-bg-primary', '#f5f5f8')
    root.style.setProperty('--color-bg-secondary', '#eaeaef')
    root.style.setProperty('--color-bg-card', 'rgba(255, 255, 255, 0.8)')
    root.style.setProperty('--color-bg-card-hover', 'rgba(0, 0, 0, 0.04)')
    root.style.setProperty('--color-border', 'rgba(0, 0, 0, 0.08)')
    root.style.setProperty('--color-border-hover', 'rgba(0, 0, 0, 0.18)')
    root.style.setProperty('--color-text-primary', '#1a1a2e')
    root.style.setProperty('--color-text-secondary', 'rgba(26, 26, 46, 0.65)')
    root.style.setProperty('--color-text-muted', 'rgba(26, 26, 46, 0.4)')
    root.style.setProperty('--shadow-card', '0 2px 12px rgba(0, 0, 0, 0.08)')
    root.style.setProperty('--shadow-elevated', '0 4px 24px rgba(0, 0, 0, 0.12)')
  } else {
    // 深色 — 恢复 style.css 中的默认值
    root.style.setProperty('--color-bg-primary', '#0a0a0f')
    root.style.setProperty('--color-bg-secondary', '#0d0d18')
    root.style.setProperty('--color-bg-card', 'rgba(255, 255, 255, 0.03)')
    root.style.setProperty('--color-bg-card-hover', 'rgba(255, 255, 255, 0.06)')
    root.style.setProperty('--color-border', 'rgba(255, 255, 255, 0.06)')
    root.style.setProperty('--color-border-hover', 'rgba(255, 255, 255, 0.15)')
    root.style.setProperty('--color-text-primary', '#ffffff')
    root.style.setProperty('--color-text-secondary', 'rgba(255, 255, 255, 0.6)')
    root.style.setProperty('--color-text-muted', 'rgba(255, 255, 255, 0.3)')
    root.style.setProperty('--shadow-card', '0 4px 24px rgba(0, 0, 0, 0.3)')
    root.style.setProperty('--shadow-elevated', '0 8px 32px rgba(0, 0, 0, 0.5)')
  }

  // 字体
  root.style.fontSize = `${value.fontSize}px`
  document.body.style.fontFamily = value.fontFamily

  // 布局/外观
  root.dataset.sidebarPosition = value.sidebarPosition
  root.dataset.cardStyle = value.cardStyle
  root.classList.toggle('compact-mode', value.compactMode)
  root.classList.toggle('reduce-motion', !value.animationEnabled)
  root.classList.toggle('particle-effect-disabled', !value.particleEffect)
}

async function loadFromSupabase(userId: string): Promise<UserSettingsRow | null> {
  const { data, error: dbError } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (dbError) {
    console.warn('[useSettings] load failed:', dbError.message)
    return null
  }

  if (data) return data as UserSettingsRow

  const { data: createdRow, error: insertError } = await supabase
    .from('user_settings')
    .upsert({
      user_id: userId,
      privacy: PRIVACY_DEFAULTS,
      notifications: NOTIFICATION_DEFAULTS,
      features: FEATURES_DEFAULTS,
      recommendation: RECOMMENDATION_DEFAULTS,
      accessibility: ACCESSIBILITY_DEFAULTS,
      schema_version: CURRENT_SCHEMA_VERSION,
    })
    .select()
    .single()

  if (insertError) {
    console.warn('[useSettings] bootstrap failed:', insertError.message)
    return null
  }

  return createdRow as UserSettingsRow
}

async function saveToSupabase(userId: string, section: string, value: unknown) {
  isSaving.value = true
  error.value = null

  const { error: updateError } = await supabase
    .from('user_settings')
    .update({ [section]: value })
    .eq('user_id', userId)

  isSaving.value = false

  if (updateError) {
    error.value = `保存失败: ${updateError.message}`
    console.error('[useSettings] save failed:', updateError)
    return false
  }

  return true
}

watch(
  appearance,
  (value) => {
    applyAppearanceToDOM(value)
  },
  { deep: true },
)

export function useSettings() {
  const { user } = useAuth()

  async function loadSettings() {
    isLoading.value = true
    error.value = null

    appearance.value = loadAppearanceFromStorage()
    applyAppearanceToDOM(appearance.value)

    if (!user.value) {
      settingsLoaded.value = true
      isLoading.value = false
      return
    }

    const meta = user.value.user_metadata || {}
    profile.value = deepMergeDefaults(
      {
        nickname: meta.nickname || '',
        bio: meta.bio || '',
        gender: meta.gender || 'secret',
        birthday: meta.birthday || null,
        location: meta.location || '',
        avatarUrl: meta.avatar_url || '',
      },
      PROFILE_DEFAULTS,
    )

    const row = await loadFromSupabase(user.value.id)
    if (row) {
      education.value = {
        university: row.university || '',
        department: row.department || '',
        major: row.major || '',
        grade: row.grade || '',
        studentId: row.student_id || '',
        enrollmentYear: row.enrollment_year,
      }

      privacy.value = deepMergeDefaults(row.privacy, PRIVACY_DEFAULTS)
      notifications.value = deepMergeDefaults(row.notifications, NOTIFICATION_DEFAULTS)
      features.value = deepMergeDefaults(row.features, FEATURES_DEFAULTS)
      recommendation.value = deepMergeDefaults(row.recommendation, RECOMMENDATION_DEFAULTS)
      accessibility.value = deepMergeDefaults(row.accessibility, ACCESSIBILITY_DEFAULTS)
    }

    settingsLoaded.value = true
    isLoading.value = false
  }

  async function updateProfile(data: Partial<ProfileData>) {
    isSaving.value = true
    error.value = null

    const metadata: Record<string, unknown> = {}
    if (data.nickname !== undefined) metadata.nickname = data.nickname
    if (data.bio !== undefined) metadata.bio = data.bio
    if (data.gender !== undefined) metadata.gender = data.gender
    if (data.birthday !== undefined) metadata.birthday = data.birthday
    if (data.location !== undefined) metadata.location = data.location
    if (data.avatarUrl !== undefined) metadata.avatar_url = data.avatarUrl

    const { error: authError } = await supabase.auth.updateUser({ data: metadata })
    isSaving.value = false

    if (authError) {
      error.value = `更新资料失败: ${authError.message}`
      return false
    }

    Object.assign(profile.value, data)
    return true
  }

  async function updateEducation(data: Partial<EducationData>) {
    if (!user.value) return false

    isSaving.value = true
    error.value = null

    const updateData: Record<string, unknown> = {}
    if (data.university !== undefined) updateData.university = data.university
    if (data.department !== undefined) updateData.department = data.department
    if (data.major !== undefined) updateData.major = data.major
    if (data.grade !== undefined) updateData.grade = data.grade
    if (data.studentId !== undefined) updateData.student_id = data.studentId
    if (data.enrollmentYear !== undefined) updateData.enrollment_year = data.enrollmentYear

    const { error: dbError } = await supabase
      .from('user_settings')
      .update(updateData)
      .eq('user_id', user.value.id)

    isSaving.value = false

    if (dbError) {
      error.value = `更新教育信息失败: ${dbError.message}`
      return false
    }

    Object.assign(education.value, data)
    return true
  }

  async function updatePrivacy(data: Partial<PrivacyData>) {
    if (!user.value) return false
    const merged = { ...privacy.value, ...data }
    const success = await saveToSupabase(user.value.id, 'privacy', merged)
    if (success) privacy.value = merged
    return success
  }

  async function updateNotifications(data: Partial<NotificationData>) {
    if (!user.value) return false
    const merged = { ...notifications.value, ...data }
    const success = await saveToSupabase(user.value.id, 'notifications', merged)
    if (success) notifications.value = merged
    return success
  }

  function updateAppearance(data: Partial<AppearanceSettings>) {
    const merged = { ...appearance.value, ...data }
    appearance.value = merged
    saveAppearanceToStorage(merged)
    applyAppearanceToDOM(merged)
  }

  async function updateFeatures(data: Partial<FeaturesData>) {
    if (!user.value) return false
    const merged = {
      ...features.value,
      ...data,
      ai: { ...features.value.ai, ...data.ai },
      schedule: { ...features.value.schedule, ...data.schedule },
    }
    const success = await saveToSupabase(user.value.id, 'features', merged)
    if (success) features.value = merged
    return success
  }

  async function updateAccessibility(data: Partial<AccessibilityData>) {
    if (!user.value) return false
    const merged = { ...accessibility.value, ...data }
    const success = await saveToSupabase(user.value.id, 'accessibility', merged)
    if (success) accessibility.value = merged
    return success
  }

  async function changePassword(currentPassword: string, newPassword: string) {
    if (!user.value?.email) {
      return { success: false, message: '未获取到用户邮箱' }
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.value.email,
      password: currentPassword,
    })

    if (signInError) {
      return { success: false, message: '当前密码不正确' }
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
    if (updateError) {
      return { success: false, message: `密码修改失败: ${updateError.message}` }
    }

    return { success: true, message: '密码修改成功' }
  }

  function clearCache() {
    const keepKeys = new Set([APPEARANCE_STORAGE_KEY, 'spark_quick_note'])
    const keysToDelete: string[] = []

    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index)
      if (key && !keepKeys.has(key)) keysToDelete.push(key)
    }

    keysToDelete.forEach(key => localStorage.removeItem(key))
  }

  async function exportUserData(): Promise<Blob> {
    const data = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      profile: profile.value,
      education: education.value,
      settings: {
        appearance: appearance.value,
        privacy: privacy.value,
        notifications: notifications.value,
        features: features.value,
        recommendation: recommendation.value,
        accessibility: accessibility.value,
      },
    }

    return new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  }

  async function resetSection(section: string) {
    switch (section) {
      case 'appearance':
        updateAppearance({ ...APPEARANCE_DEFAULTS })
        break
      case 'privacy':
        await updatePrivacy({ ...PRIVACY_DEFAULTS })
        break
      case 'notifications':
        await updateNotifications({ ...NOTIFICATION_DEFAULTS })
        break
      case 'features':
        await updateFeatures(cloneDefaults(FEATURES_DEFAULTS))
        break
      case 'accessibility':
        await updateAccessibility({ ...ACCESSIBILITY_DEFAULTS })
        break
      default:
        break
    }
  }

  return {
    appearance,
    profile,
    education,
    privacy,
    notifications,
    features,
    recommendation,
    accessibility,
    isLoading,
    isSaving,
    error,
    settingsLoaded,
    loadSettings,
    updateProfile,
    updateEducation,
    updatePrivacy,
    updateNotifications,
    updateAppearance,
    updateFeatures,
    updateAccessibility,
    changePassword,
    clearCache,
    exportUserData,
    resetSection,
  }
}
