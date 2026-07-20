export const ANONYMOUS_PLACEHOLDER_NAME = '匿名同学'

const SUPPORTED_VIDEO_EXTENSIONS = ['.mp4', '.webm', '.ogg'] as const
const SUPPORTED_VIDEO_MIME_TYPES = ['video/mp4', 'video/webm', 'video/ogg'] as const
const VIDEO_MIME_BY_EXTENSION: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ogg': 'video/ogg',
}
const ANONYMOUS_PREFIXES = [
  '流云',
  '青柠',
  '星屿',
  '晚风',
  '海盐',
  '薄荷',
  '琥珀',
  '晨雾',
  '月砂',
  '山岚',
]
const ANONYMOUS_SUFFIXES = [
  '海豚',
  '松鼠',
  '白鹭',
  '猫咪',
  '北极狐',
  '鲸鱼',
  '树袋熊',
  '萤火虫',
  '海獭',
  '小鹿',
]
const ANONYMOUS_AVATAR_BACKGROUNDS = [
  'linear-gradient(135deg, #60a5fa, #2563eb)',
  'linear-gradient(135deg, #2dd4bf, #0f766e)',
  'linear-gradient(135deg, #f59e0b, #d97706)',
  'linear-gradient(135deg, #f472b6, #db2777)',
  'linear-gradient(135deg, #a78bfa, #7c3aed)',
  'linear-gradient(135deg, #34d399, #059669)',
]

export interface AnonymousHandle {
  label: string
  avatarBg: string
}

/** 星火墙帖子视图模型 —— CampusWall 列表页与 WallPostDetail 详情组件共用同一契约 */
export interface WallPost {
  id: string
  author: string
  authorId: string
  anonymousSeed?: string
  authorInitial: string
  avatarBg: string
  isAnonymous: boolean
  categoryLabel: string
  categoryClass: string
  time: string
  createdAt: string
  content: string
  tags: string[]
  mediaUrls: string[]
  likes: number
  comments: number
  liked: boolean
  category: string
  mood?: string | null
  school?: string | null
  region?: string | null
  isOfficial?: boolean
  isVerified?: boolean
  /** 推荐接口（GET /api/wall/recommended）返回的可解释推荐理由，仅推荐 tab 展示 */
  reason?: string
}

/** 星火墙评论视图模型 —— 同上共用 */
export interface WallComment {
  id: string
  authorId: string
  authorName: string
  anonymousSeed?: string
  authorInitial: string
  avatarBg: string
  isAnonymous: boolean
  content: string
  mediaUrls: string[]
  time: string
  createdAt: string
  isOwn: boolean
  replyToName: string | null
  liked: boolean
  likeCount: number
  isHidden: boolean
  reportCount: number
}

export interface AuthorDisplay {
  name: string
  initial: string
  avatarBg: string
  isAnonymous: boolean
}

export interface FileLike {
  name: string
  type?: string | null
  size?: number
}

export interface UploadOptions {
  cacheControl: string
  contentType: string
  upsert: boolean
}

export interface CampusPostHeatInput {
  likes: number
  comments: number
}

export interface CampusSortablePost extends CampusPostHeatInput {
  createdAt: string
}

export interface CampusHotHighlightSource extends CampusSortablePost {
  id: string
  content: string
  authorId?: string | null
  authorName?: string | null
  anonymousSeed?: string | null
  isAnonymous?: boolean | null
}

export interface CampusHotHighlight {
  id: string
  author: string
  preview: string
  heat: string
  score: number
  to: string
}

const getFileExtension = (fileName: string): string => {
  const dotIndex = fileName.lastIndexOf('.')
  if (dotIndex < 0) return ''
  return fileName.slice(dotIndex).toLowerCase()
}

const hashSeed = (seed: string): number => {
  let hash = 0
  for (const char of seed) {
    hash = (hash * 33 + char.charCodeAt(0)) >>> 0
  }
  return hash
}

const resolveUploadContentType = (file: FileLike): string => {
  const mime = file.type?.toLowerCase().trim()
  if (mime) return mime

  const extension = getFileExtension(file.name)
  return VIDEO_MIME_BY_EXTENSION[extension] || 'application/octet-stream'
}

export const isSupportedVideoFile = (file: FileLike): boolean => {
  const extension = getFileExtension(file.name)
  const mime = file.type?.toLowerCase().trim()

  if (SUPPORTED_VIDEO_EXTENSIONS.includes(extension as (typeof SUPPORTED_VIDEO_EXTENSIONS)[number])) {
    return true
  }

  if (!mime) return false
  return SUPPORTED_VIDEO_MIME_TYPES.includes(mime as (typeof SUPPORTED_VIDEO_MIME_TYPES)[number])
}

export const buildCampusWallUploadOptions = (file: FileLike): UploadOptions => ({
  cacheControl: '3600',
  contentType: resolveUploadContentType(file),
  upsert: false,
})

export const calculateCampusPostHeat = (post: CampusPostHeatInput): number => {
  return post.likes * 2 + post.comments * 3
}

export const sortCampusPostsByHeat = <T extends CampusSortablePost>(posts: T[]): T[] => {
  return [...posts].sort((left, right) => {
    const heatDifference = calculateCampusPostHeat(right) - calculateCampusPostHeat(left)
    if (heatDifference !== 0) return heatDifference
    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  })
}

const createCampusPreview = (content: string, limit = 36): string => {
  const normalized = content.replace(/\s+/g, ' ').trim()
  if (normalized.length <= limit) return normalized
  return `${normalized.slice(0, limit)}...`
}

export const buildCampusHotHighlights = (
  posts: CampusHotHighlightSource[],
  limit = 3,
): CampusHotHighlight[] => {
  return sortCampusPostsByHeat(posts)
    .slice(0, limit)
    .map((post) => {
      const author = resolveAuthorDisplay({
        anonymous: inferAnonymousState({
          author_name: post.authorName,
          is_anonymous: post.isAnonymous,
        }),
        authorId: post.authorId,
        authorName: post.authorName,
        anonymousSeed: post.anonymousSeed,
        fallbackSeed: post.id,
      })

      return {
        id: post.id,
        author: author.name,
        preview: createCampusPreview(post.content),
        heat: `${post.likes} 共鸣 · ${post.comments} 评论`,
        score: calculateCampusPostHeat(post),
        to: '/app/wall',
      }
    })
}

export const createAnonymousHandle = (seed: string): AnonymousHandle => {
  const normalizedSeed = seed || 'spark-anonymous'
  const hash = hashSeed(normalizedSeed)
  const prefix = ANONYMOUS_PREFIXES[hash % ANONYMOUS_PREFIXES.length]
  const suffix = ANONYMOUS_SUFFIXES[Math.floor(hash / 7) % ANONYMOUS_SUFFIXES.length]
  const code = String((hash % 900) + 100)
  const avatarBg = ANONYMOUS_AVATAR_BACKGROUNDS[hash % ANONYMOUS_AVATAR_BACKGROUNDS.length]

  return {
    label: `${prefix}${suffix} ${code}号`,
    avatarBg,
  }
}

export const inferAnonymousState = (record: { author_name?: string | null; is_anonymous?: boolean | null }): boolean => {
  if (typeof record.is_anonymous === 'boolean') {
    return record.is_anonymous
  }

  return record.author_name === ANONYMOUS_PLACEHOLDER_NAME
}

export const resolveAuthorDisplay = (params: {
  anonymous: boolean
  authorId?: string | null
  authorName?: string | null
  anonymousSeed?: string | null
  fallbackSeed?: string | null
}): AuthorDisplay => {
  if (params.anonymous) {
    const handle = createAnonymousHandle(
      params.anonymousSeed || params.fallbackSeed || params.authorId || params.authorName || 'spark-anonymous',
    )

    return {
      name: handle.label,
      initial: '',
      avatarBg: handle.avatarBg,
      isAnonymous: true,
    }
  }

  const visibleName = params.authorName?.trim() || '同学'

  return {
    name: visibleName,
    initial: visibleName.charAt(0).toUpperCase(),
    avatarBg: 'linear-gradient(135deg, var(--color-brand-blue), var(--color-brand-purple))',
    isAnonymous: false,
  }
}

export const createStorageObjectPath = (
  scope: string,
  ownerId: string,
  file: FileLike,
  timestamp = Date.now(),
  nonce = Math.random().toString(36).slice(2),
): string => {
  const extension = getFileExtension(file.name)
  return `${scope}/${ownerId}/${timestamp}-${nonce}${extension}`
}

export const createAnonymousSeed = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.random() * 16 | 0
    const value = char === 'x' ? random : ((random & 0x3) | 0x8)
    return value.toString(16)
  })
}

export const extractStoragePathFromPublicUrl = (url: string, bucketName = 'campus-wall'): string | null => {
  try {
    const parsedUrl = new URL(url)
    const marker = `/object/public/${bucketName}/`
    const markerIndex = parsedUrl.pathname.indexOf(marker)

    if (markerIndex < 0) return null

    const encodedPath = parsedUrl.pathname.slice(markerIndex + marker.length)
    return decodeURIComponent(encodedPath)
  } catch {
    return null
  }
}
