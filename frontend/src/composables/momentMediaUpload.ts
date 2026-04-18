/**
 * 动态媒体上传（moment-media bucket）
 *
 * 责任：
 *   1. 把用户选择的本地 File 真实上传到 Supabase Storage
 *   2. 返回 public URL，供数据库存储与跨设备展示
 *   3. 处理失败降级：上传失败则返回 blob: URL（保证 UI 可用），但标记 uploaded=false
 *   4. 图片客户端压缩（>1MB 时 resize 到最长边 1920px，保证上传速度）
 *   5. 评论图附件单独走 comments 子目录
 *
 * 路径约定（与 SQL RLS 一致）：
 *   {user_id}/moments/{timestamp}_{random}.{ext}
 *   {user_id}/comments/{timestamp}_{random}.{ext}
 */

import { supabase } from '../supabase'

export const MOMENT_MEDIA_BUCKET = 'moment-media'

/** 单文件上传结果 */
export interface UploadResult {
  /** 最终 URL：上传成功 = Supabase public URL；失败 = 原 blob: URL（仅本地可见） */
  url: string
  /** 原文件名 */
  name: string
  /** 文件大小 */
  size: number
  /** MIME */
  mime: string
  /** 是否成功上传到云端（false = 回退到 blob） */
  uploaded: boolean
  /** 是否是视频 */
  isVideo: boolean
  /** 失败原因（如有） */
  error?: string
  /** Supabase 存储路径（成功时）用于后续删除 */
  storagePath?: string
}

const MAX_IMAGE_SIZE = 10 * 1024 * 1024    // 10MB 上限（超出拒绝）
const MAX_VIDEO_SIZE = 50 * 1024 * 1024    // 50MB（动态视频）
const COMPRESS_THRESHOLD = 1 * 1024 * 1024 // >1MB 的图片才压缩
const TARGET_LONG_SIDE = 1920              // 压缩后最长边
const JPEG_QUALITY = 0.85

function randomId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function getExt(filename: string, mime: string): string {
  const fromName = filename.includes('.') ? filename.split('.').pop()!.toLowerCase() : ''
  if (fromName && fromName.length <= 5) return fromName
  // 从 mime 推断
  const map: Record<string, string> = {
    'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif',
    'image/webp': 'webp', 'image/heic': 'heic', 'image/heif': 'heif',
    'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov',
  }
  return map[mime.toLowerCase()] || 'bin'
}

/** 压缩图片（仅浏览器环境）—— 返回新的 Blob */
async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file
  if (file.size <= COMPRESS_THRESHOLD) return file
  // HEIC / GIF 不压缩（前者浏览器不支持解码，后者会丢失动画）
  if (/heic|heif|gif/i.test(file.type)) return file

  try {
    const blobUrl = URL.createObjectURL(file)
    const img = new Image()
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('image_load_failed'))
      img.src = blobUrl
    })
    URL.revokeObjectURL(blobUrl)

    const { width, height } = img
    const longSide = Math.max(width, height)
    if (longSide <= TARGET_LONG_SIDE) return file // 尺寸已足够小，仅因体积大就跳过

    const ratio = TARGET_LONG_SIDE / longSide
    const w = Math.round(width * ratio)
    const h = Math.round(height * ratio)

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(img, 0, 0, w, h)

    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY))
    if (!blob) return file

    const newName = file.name.replace(/\.[^.]+$/, '') + '.jpg'
    return new File([blob], newName, { type: 'image/jpeg', lastModified: Date.now() })
  } catch (err) {
    console.warn('[momentMediaUpload] compress fail, fallback to original:', err)
    return file
  }
}

/** 获取当前用户 id（和 Storage RLS 匹配） */
async function getUserId(): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    return user?.id || null
  } catch {
    return null
  }
}

/**
 * 上传单个文件到 moment-media bucket
 * @param file 用户选择的本地 File
 * @param kind moments | comments 子目录
 */
export async function uploadMomentMedia(
  file: File,
  kind: 'moments' | 'comments' = 'moments',
): Promise<UploadResult> {
  const isVideo = file.type.startsWith('video/')
  const fallbackUrl = URL.createObjectURL(file)  // 失败时前端仍可预览
  const baseResult: Omit<UploadResult, 'uploaded' | 'url'> = {
    name: file.name, size: file.size, mime: file.type, isVideo,
  }

  // 文件大小校验（一上来就拦截，别走网络）
  if (!isVideo && file.size > MAX_IMAGE_SIZE) {
    return { ...baseResult, url: fallbackUrl, uploaded: false, error: `图片不能超过 ${Math.floor(MAX_IMAGE_SIZE / 1024 / 1024)}MB` }
  }
  if (isVideo && file.size > MAX_VIDEO_SIZE) {
    return { ...baseResult, url: fallbackUrl, uploaded: false, error: `视频不能超过 ${Math.floor(MAX_VIDEO_SIZE / 1024 / 1024)}MB` }
  }

  const userId = await getUserId()
  if (!userId) {
    return { ...baseResult, url: fallbackUrl, uploaded: false, error: '未登录，无法上传到云端' }
  }

  // 压缩图片（非视频）
  const finalFile = isVideo ? file : await compressImage(file)
  const ext = getExt(finalFile.name, finalFile.type)
  const storagePath = `${userId}/${kind}/${Date.now()}_${randomId()}.${ext}`

  try {
    const { error: upErr } = await supabase.storage
      .from(MOMENT_MEDIA_BUCKET)
      .upload(storagePath, finalFile, {
        cacheControl: '31536000',      // 1 年缓存（发布后资源不变）
        contentType: finalFile.type || undefined,
        upsert: false,
      })

    if (upErr) {
      console.error('[momentMediaUpload] upload fail:', upErr)
      return { ...baseResult, url: fallbackUrl, uploaded: false, error: upErr.message, size: finalFile.size, mime: finalFile.type }
    }

    const { data: urlData } = supabase.storage.from(MOMENT_MEDIA_BUCKET).getPublicUrl(storagePath)
    URL.revokeObjectURL(fallbackUrl)  // 成功后回收本地 blob
    return {
      ...baseResult,
      url: urlData.publicUrl,
      uploaded: true,
      storagePath,
      size: finalFile.size,
      mime: finalFile.type,
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[momentMediaUpload] upload exception:', err)
    return { ...baseResult, url: fallbackUrl, uploaded: false, error: msg }
  }
}

/**
 * 批量上传（并行，带并发限制）
 */
export async function uploadMomentMediaBatch(
  files: File[],
  kind: 'moments' | 'comments' = 'moments',
  options?: {
    concurrency?: number
    onProgress?: (done: number, total: number, last: UploadResult) => void
  },
): Promise<UploadResult[]> {
  const concurrency = options?.concurrency ?? 3
  const results: UploadResult[] = new Array(files.length)
  let done = 0
  let idx = 0

  async function worker() {
    while (idx < files.length) {
      const myIdx = idx++
      const res = await uploadMomentMedia(files[myIdx], kind)
      results[myIdx] = res
      done++
      options?.onProgress?.(done, files.length, res)
    }
  }

  const workers: Promise<void>[] = []
  const n = Math.min(concurrency, files.length)
  for (let i = 0; i < n; i++) workers.push(worker())
  await Promise.all(workers)
  return results
}

/** 从 public URL 中提取 storage path（用于删除） */
export function extractStoragePath(publicUrl: string): string | null {
  // https://xxx.supabase.co/storage/v1/object/public/moment-media/{userId}/...
  const marker = `/${MOMENT_MEDIA_BUCKET}/`
  const idx = publicUrl.indexOf(marker)
  if (idx < 0) return null
  return publicUrl.slice(idx + marker.length)
}

/** 删除已上传的媒体文件（失败静默） */
export async function deleteMomentMedia(publicUrlOrPath: string): Promise<boolean> {
  const path = publicUrlOrPath.startsWith('http') ? extractStoragePath(publicUrlOrPath) : publicUrlOrPath
  if (!path) return false
  try {
    const { error } = await supabase.storage.from(MOMENT_MEDIA_BUCKET).remove([path])
    return !error
  } catch {
    return false
  }
}

/** 判断一个 URL 是不是视频（供前端渲染决定 <video> vs <img>） */
export function isVideoUrl(url: string): boolean {
  if (!url) return false
  if (url.startsWith('data:video/') || url.startsWith('blob:') === false) {
    if (/\.(mp4|webm|mov|m4v|ogg)(\?|#|$)/i.test(url)) return true
  }
  return false
}
