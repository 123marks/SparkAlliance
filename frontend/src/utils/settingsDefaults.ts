/**
 * 设置默认值常量 + deepMerge 工具
 * 确保所有分层设置永不为空，即使数据库/localStorage无记录也能正常运行
 */
import type {
    AppearanceSettings,
    ProfileData,
    PrivacyData,
    NotificationData,
    FeaturesData,
    RecommendationData,
    AccessibilityData,
    SettingsSearchItem,
} from '../types/settings'

// =============================================
// 外观默认值 (localStorage)
// =============================================
export const APPEARANCE_DEFAULTS: AppearanceSettings = {
    theme: 'dark',
    primaryColor: '#4F8EF7',
    fontSize: 14,
    fontFamily: 'system-ui',
    compactMode: false,
    animationEnabled: true,
    particleEffect: true,
    sidebarPosition: 'left',
    contentWidth: 'medium',
    cardStyle: 'rounded',
}

// =============================================
// 个人资料默认值 (Auth user_metadata)
// =============================================
export const PROFILE_DEFAULTS: ProfileData = {
    nickname: '',
    bio: '',
    gender: 'secret',
    birthday: null,
    location: '',
    avatarUrl: '',
}

// =============================================
// 隐私默认值 (user_settings.privacy)
// =============================================
export const PRIVACY_DEFAULTS: PrivacyData = {
    profileVisibility: 'public',
    postVisibility: 'public',
    showOnlineStatus: true,
    showLastActive: true,
    showLocation: false,
    showUniversity: true,
    allowSearch: true,
    aiDataUsage: true,
    personalizedRecommendation: true,
    anonymousAnalytics: true,
}

// =============================================
// 通知默认值 (user_settings.notifications)
// =============================================
export const NOTIFICATION_DEFAULTS: NotificationData = {
    message: true,
    comment: true,
    like: true,
    follow: true,
    system: true,
    schedule: true,
    doNotDisturb: false,
    doNotDisturbStart: null,
    doNotDisturbEnd: null,
    emailDigest: 'daily',
}

// =============================================
// 功能默认值 (user_settings.features)
// =============================================
export const FEATURES_DEFAULTS: FeaturesData = {
    ai: {
        defaultModel: 'gpt-3.5-turbo',
        contextLength: 'medium',
        temperature: 0.7,
        streamOutput: true,
    },
    schedule: {
        defaultView: 'week',
        timeFormat: '24h',
        weekStart: 1,
        defaultReminder: 15,
    },
}

// =============================================
// 推荐默认值 (user_settings.recommendation)
// =============================================
export const RECOMMENDATION_DEFAULTS: RecommendationData = {
    tags: [],
    sources: {
        sameUniversity: true,
        sameMajor: false,
        following: true,
    },
    diversity: 0.5,
}

// =============================================
// 辅助功能默认值 (user_settings.accessibility)
// =============================================
export const ACCESSIBILITY_DEFAULTS: AccessibilityData = {
    highContrast: false,
    reduceMotion: false,
    keyboardNavigation: false,
}

// =============================================
// 深度合并工具 — 用默认值填充缺失字段
// =============================================
export function deepMergeDefaults<T extends object>(
    data: Partial<T> | null | undefined,
    defaults: T,
): T {
    const source = (data ?? {}) as Record<string, unknown>
    const result = { ...defaults } as Record<string, unknown>
    for (const key of Object.keys(defaults)) {
        const defVal = (defaults as Record<string, unknown>)[key]
        const sourceVal = source[key]
        if (sourceVal !== undefined && sourceVal !== null) {
            if (typeof defVal === 'object' && defVal !== null && !Array.isArray(defVal)) {
                // 递归合并嵌套对象
                result[key] = deepMergeDefaults(sourceVal as Record<string, unknown>, defVal as Record<string, unknown>)
            } else {
                result[key] = sourceVal
            }
        }
    }
    return result as T
}

// =============================================
// 设置搜索索引 — 前端本地搜索
// =============================================
export const SETTINGS_SEARCH_INDEX: SettingsSearchItem[] = [
    // 个人资料
    { id: 'nickname', section: 'profile', sectionLabel: '个人资料', label: '昵称', keywords: ['昵称', '用户名', '名字', 'name', 'nickname'], path: '/app/settings/profile' },
    { id: 'avatar', section: 'profile', sectionLabel: '个人资料', label: '头像', keywords: ['头像', '照片', 'avatar', '图片'], path: '/app/settings/profile' },
    { id: 'bio', section: 'profile', sectionLabel: '个人资料', label: '简介', keywords: ['简介', '介绍', 'bio', '自我介绍'], path: '/app/settings/profile' },
    { id: 'university', section: 'profile', sectionLabel: '个人资料', label: '学校', keywords: ['学校', '大学', '院校', 'university', '教育'], path: '/app/settings/profile' },
    // 安全
    { id: 'password', section: 'security', sectionLabel: '账号安全', label: '修改密码', keywords: ['密码', '修改密码', 'password', '安全'], path: '/app/settings/security' },
    { id: 'email', section: 'security', sectionLabel: '账号安全', label: '邮箱', keywords: ['邮箱', 'email', '绑定', '账号'], path: '/app/settings/security' },
    // 隐私
    { id: 'profile-visibility', section: 'privacy', sectionLabel: '隐私设置', label: '主页可见性', keywords: ['隐私', '可见性', '谁能看', '主页'], path: '/app/settings/privacy' },
    { id: 'online-status', section: 'privacy', sectionLabel: '隐私设置', label: '在线状态', keywords: ['在线', '状态', '上线', '隐身'], path: '/app/settings/privacy' },
    // 通知
    { id: 'dnd', section: 'notifications', sectionLabel: '通知设置', label: '免打扰模式', keywords: ['免打扰', '静音', '勿扰', 'dnd', '通知'], path: '/app/settings/notifications' },
    { id: 'message-notif', section: 'notifications', sectionLabel: '通知设置', label: '私信通知', keywords: ['私信', '消息', '通知', 'message'], path: '/app/settings/notifications' },
    // 外观
    { id: 'theme-mode', section: 'appearance', sectionLabel: '外观主题', label: '深色模式', keywords: ['深色', '暗色', '夜间', 'dark', 'theme', '主题'], path: '/app/settings/appearance' },
    { id: 'primary-color', section: 'appearance', sectionLabel: '外观主题', label: '主题色', keywords: ['颜色', '主题色', '品牌色', 'color', '配色'], path: '/app/settings/appearance' },
    { id: 'font-size', section: 'appearance', sectionLabel: '外观主题', label: '字体大小', keywords: ['字体', '大小', '字号', 'font', 'size'], path: '/app/settings/appearance' },
    { id: 'particle-effect', section: 'appearance', sectionLabel: '外观主题', label: '粒子效果', keywords: ['粒子', '背景', '星空', '特效', 'particle'], path: '/app/settings/appearance' },
    { id: 'animation', section: 'appearance', sectionLabel: '外观主题', label: '动画效果', keywords: ['动画', '过渡', '特效', 'animation'], path: '/app/settings/appearance' },
    // 功能
    { id: 'ai-model', section: 'features', sectionLabel: '功能设置', label: 'AI默认模型', keywords: ['ai', '模型', 'gpt', 'claude', '大模型'], path: '/app/settings/features' },
    { id: 'schedule-view', section: 'features', sectionLabel: '功能设置', label: '日程默认视图', keywords: ['日程', '视图', '日历', '周视图'], path: '/app/settings/features' },
    // 数据
    { id: 'cache', section: 'data', sectionLabel: '数据存储', label: '清理缓存', keywords: ['缓存', '清理', '存储', 'cache', '空间'], path: '/app/settings/data' },
    { id: 'export', section: 'data', sectionLabel: '数据存储', label: '导出数据', keywords: ['导出', '下载', '数据', 'export', '备份'], path: '/app/settings/data' },
    // 关于
    { id: 'version', section: 'about', sectionLabel: '关于帮助', label: '版本信息', keywords: ['版本', '更新', 'version', '关于'], path: '/app/settings/about' },
    { id: 'feedback', section: 'about', sectionLabel: '关于帮助', label: '反馈建议', keywords: ['反馈', '建议', '问题', '报告', 'feedback'], path: '/app/settings/about' },
]

/**
 * 搜索设置项
 */
export function searchSettings(query: string): SettingsSearchItem[] {
    const q = query.toLowerCase().trim()
    if (!q) return []
    return SETTINGS_SEARCH_INDEX.filter(item =>
        item.label.toLowerCase().includes(q) ||
        item.keywords.some(kw => kw.toLowerCase().includes(q)),
    )
}
