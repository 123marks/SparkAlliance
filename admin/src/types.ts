// 与 docs/project/BACKEND-CONTRACT.md §4 对齐的类型定义

export interface TableColumn {
  key: string
  label: string
  width?: string
}

export type UserRole = 'user' | 'admin'
export type UserStatus = 'active' | 'disabled'
export type PostStatus = 'visible' | 'hidden' | 'deleted'
export type ReportStatus = 'pending' | 'resolved' | 'dismissed'

export interface UserInfo {
  id: string
  email: string
  nickname: string | null
  avatar_url: string | null
  school: string | null
  region: string | null
  role: UserRole
  created_at: string
}

export interface LoginResponse {
  token: string
  user: UserInfo
}

export interface StatsOverview {
  total_users: number
  new_users_today: number
  total_posts: number
  posts_today: number
  total_comments: number
  total_events: number
  total_tasks: number
  active_users_7d: number
}

export interface TrendPoint {
  date: string
  new_users: number
  new_posts: number
  new_comments: number
}

export interface ModuleStat {
  module: string
  rows: number
}

export interface AdminUser {
  id: string
  email: string
  nickname: string | null
  role: UserRole
  status: UserStatus
  posts_count: number
  created_at: string
}

export interface UserListResponse {
  users: AdminUser[]
  total: number
}

export interface AdminPost {
  id: string
  user_id: string
  content: string
  category: string | null
  author_email?: string | null
  author_nickname?: string | null
  likes_count: number
  comments_count: number
  status: PostStatus
  created_at: string
}

export interface PostListResponse {
  posts: AdminPost[]
  total: number
}

// 摘要字段命名契约未细化，做多名称兼容（见 ReportsPage.targetSummary）
export interface AdminReport {
  id: string
  reporter_id: string | null
  post_id: string | null
  comment_id: string | null
  reason: string
  status: ReportStatus
  created_at: string
  resolved_at: string | null
  reporter_email?: string | null
  reporter_nickname?: string | null
  post_content?: string | null
  comment_content?: string | null
  target_content?: string | null
  target_summary?: string | null
}
