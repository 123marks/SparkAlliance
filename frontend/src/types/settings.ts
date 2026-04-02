/**
 * 设置模块 — 完整 TypeScript 类型定义
 * 遵循存储四层分离：Auth metadata / Supabase DB / localStorage / Auth API
 */

// =============================================
// 外观设置 (存储: localStorage 'spark-appearance')
// =============================================
export interface AppearanceSettings {
    theme: 'dark' | 'light' | 'auto'
    primaryColor: string       // hex 色值，如 #4F8EF7
    fontSize: number           // 12-20
    fontFamily: string
    compactMode: boolean
    animationEnabled: boolean
    particleEffect: boolean
    sidebarPosition: 'left' | 'right'
    contentWidth: 'narrow' | 'medium' | 'wide' | 'auto'
    cardStyle: 'rounded' | 'sharp'
}

// =============================================
// 个人资料 (存储: Supabase Auth user_metadata)
// =============================================
export interface ProfileData {
    nickname: string
    bio: string
    gender: 'male' | 'female' | 'other' | 'secret'
    birthday: string | null    // YYYY-MM-DD
    location: string
    avatarUrl: string
}

// =============================================
// 教育信息 (存储: user_settings 表)
// =============================================
export interface EducationData {
    university: string
    department: string
    major: string
    grade: string
    studentId: string
    enrollmentYear: number | null
}

// =============================================
// 隐私设置 (存储: user_settings.privacy JSONB)
// =============================================
export interface PrivacyData {
    profileVisibility: 'public' | 'followers' | 'private'
    postVisibility: 'public' | 'followers' | 'private'
    showOnlineStatus: boolean
    showLastActive: boolean
    showLocation: boolean
    showUniversity: boolean
    allowSearch: boolean
    aiDataUsage: boolean
    personalizedRecommendation: boolean
    anonymousAnalytics: boolean
}

// =============================================
// 通知设置 (存储: user_settings.notifications JSONB)
// =============================================
export interface NotificationData {
    message: boolean
    comment: boolean
    like: boolean
    follow: boolean
    system: boolean
    schedule: boolean
    doNotDisturb: boolean
    doNotDisturbStart: string | null  // HH:mm
    doNotDisturbEnd: string | null    // HH:mm
    emailDigest: 'realtime' | 'daily' | 'off'
}

// =============================================
// 功能设置 (存储: user_settings.features JSONB)
// =============================================
export interface AIFeatureSettings {
    defaultModel: string
    contextLength: 'short' | 'medium' | 'long'
    temperature: number        // 0-2
    streamOutput: boolean
}

export interface ScheduleFeatureSettings {
    defaultView: 'day' | 'week' | 'month'
    timeFormat: '12h' | '24h'
    weekStart: 0 | 1           // 0=周日, 1=周一
    defaultReminder: number    // 分钟
}

export interface FeaturesData {
    ai: AIFeatureSettings
    schedule: ScheduleFeatureSettings
}

// =============================================
// 推荐设置 (存储: user_settings.recommendation JSONB)
// =============================================
export interface RecommendationData {
    tags: string[]
    sources: {
        sameUniversity: boolean
        sameMajor: boolean
        following: boolean
    }
    diversity: number          // 0-1
}

// =============================================
// 辅助功能 (存储: user_settings.accessibility JSONB)
// =============================================
export interface AccessibilityData {
    highContrast: boolean
    reduceMotion: boolean
    keyboardNavigation: boolean
}

// =============================================
// user_settings 表完整行结构
// =============================================
export interface UserSettingsRow {
    id: string
    user_id: string
    // 教育信息（平铺字段）
    university: string | null
    department: string | null
    major: string | null
    grade: string | null
    student_id: string | null
    enrollment_year: number | null
    // JSONB 字段
    privacy: PrivacyData
    notifications: NotificationData
    features: FeaturesData
    recommendation: RecommendationData
    accessibility: AccessibilityData
    // schema 版本
    schema_version: number
    // 时间戳
    created_at: string
    updated_at: string
}

// =============================================
// 搜索索引项
// =============================================
export interface SettingsSearchItem {
    id: string
    section: SettingsSection
    sectionLabel: string
    label: string
    keywords: string[]
    path: string
}

// =============================================
// 分类枚举
// =============================================
export type SettingsSection =
    | 'profile'
    | 'security'
    | 'privacy'
    | 'notifications'
    | 'appearance'
    | 'features'
    | 'data'
    | 'about'
