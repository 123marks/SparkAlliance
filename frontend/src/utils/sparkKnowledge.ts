/**
 * sparkKnowledge.ts — 星火域轻量 RAG（v7.3）
 *
 * 基于静态项目知识库 + Supabase 全文索引的混合检索，
 * 为 AI 问答提供 grounded context。
 *
 * 设计：
 * - 静态知识库：项目功能模块、路由、关键概念（前端 in-memory）
 * - 动态检索：从 spark_resources / news_articles / campus_wall_posts / companion_moments
 *   的 PostgreSQL tsvector 全文索引中做 top-N 命中
 * - 返回的 context 片段会拼接后作为 `extra_context` 注入给 Edge Function → Gemma
 *
 * 未来升级路径：pgvector + cohere/openai embedding + HNSW 索引，但 API 层不变。
 */

import { supabase } from '../supabase'

export interface KnowledgeChunk {
  source: string      // 来源：'module-docs' | 'resource' | 'moment' | 'news' | 'user-note'
  title: string
  content: string
  score?: number
  url?: string
}

/** ============ 项目功能静态知识库 ============
 *  这些是"不依赖数据库、永远可用"的功能说明，覆盖项目主要模块。
 *  让 AI 知道平台有哪些功能，避免瞎编。
 */
const MODULE_DOCS: KnowledgeChunk[] = [
  {
    source: 'module-docs',
    title: '星火助手（Chat）',
    content: '路径 /app/chat。用户与 AI 模型对话的主入口，支持 3 种模式（均衡/深度思考/极速）底层都用 Gemma 3 27B。支持代码块/公式/导航链接渲染，一键复制 LaTeX。',
  },
  {
    source: 'module-docs',
    title: '星火伴侣（Companion）',
    content: '路径 /app/companion。仿微信的好友/群聊/动态三合一。可发语音（自动转文字 AI 润色）、图片、文件。标签组管理好友，星标好友有⭐徽章。有星火域（动态墙），支持发布/点赞/评论/收藏/置顶，置顶动态在顶部横向滚动展示。',
  },
  {
    source: 'module-docs',
    title: '智能日程（SmartSchedule）',
    content: '路径 /app/schedule。日、周、月三视图。事件类型：course/exam/task/life/reminder/holiday。支持 AI 导入（把文本/课表图识别为结构化事件）、优先级、提醒。',
  },
  {
    source: 'module-docs',
    title: '校园墙（CampusWall）',
    content: '路径 /app/wall。全校园内容流，支持发帖、评论、点赞、标签、地区过滤。AI 生成 ai_summary 帮助快速浏览。',
  },
  {
    source: 'module-docs',
    title: '星火自习室 / LearnHub',
    content: '路径 /app/learn。番茄钟、环境白噪音、专注时长统计、学习资源广场（文档/视频/笔记分享）。',
  },
  {
    source: 'module-docs',
    title: '星火共创（CoCreate）',
    content: '路径 /app/cocreate。学生项目协作广场，可发布项目招队友/简历匹配/里程碑管理。',
  },
  {
    source: 'module-docs',
    title: '星火传承（SparkLegacy）',
    content: '路径 /app/legacy。学长学姐经验分享、考研/保研/就业指导、文章库。',
  },
  {
    source: 'module-docs',
    title: '人才招募（Talent）',
    content: '路径 /app/talent。学生简历 + 企业/社团招募信息，AI 简历诊断（年度版特权）。',
  },
  {
    source: 'module-docs',
    title: '资讯中心（News）',
    content: '路径 /app/news。每日热榜 + 深度 AI 解读，多源聚合（学术/政策/科技）。',
  },
  {
    source: 'module-docs',
    title: '校园购物（Shop）',
    content: '路径 /app/shop。学生二手市场 / 周边，会员可提升商品曝光优先级。',
  },
  {
    source: 'module-docs',
    title: '健康生活（Health）',
    content: '路径 /app/health。运动打卡、饮食记录、睡眠分析、心理健康自评。',
  },
  {
    source: 'module-docs',
    title: 'AI 模型架构',
    content: '生产环境：前端 → Supabase Edge Function（assistant-chat / spark-ai-general）→ NVIDIA NIM API（Gemma 3 27B 主模型 + LLaMA 3.1 8B 回退）。开发环境可回退本地 Ollama（VITE_LOCAL_AI_URL）。所有 API Key 仅存在服务端，不前端明文。',
  },
  {
    source: 'module-docs',
    title: '数据安全',
    content: '所有敏感参数（NVIDIA_API_KEY 等）只在 Supabase Edge Function 服务端保管，前端仅持有用户 session JWT。全链路 HTTPS；内容安全层（contentSafety.ts）过滤 XSS、敏感词、AI 身份暴露。',
  },
  {
    source: 'module-docs',
    title: '星火 ID 系统',
    content: '每用户有唯一 spark_id（可自定义，字母数字下划线 4-16 位），每年只能修改一次。spark_profiles 表为唯一用户资料真实来源。',
  },
  {
    source: 'module-docs',
    title: '标签组功能',
    content: '位置：星火伴侣→通讯录→标签组。支持创建/重命名/删除标签，成员 CRUD，星标置顶（★ 优先级 0-99），中文拼音首字母分组，搜索（标签名/成员昵称/SparkID），8 色预设。',
  },
  {
    source: 'module-docs',
    title: '发布动态',
    content: '可附带文字、图片、视频、文件、标签、地区、可见范围（公开/仅好友/部分好友/私密）。支持 24h 实况（Live）动态、自动过期、置顶。',
  },
]

/** 关键词提取：简易中文分词 + 去停用词 */
function extractKeywords(query: string): string[] {
  const stopwords = new Set(['的', '了', '吗', '呢', '啊', '哦', '嗯', '是', '我', '你', '他', '她', '它',
    '怎么', '如何', '什么', '为什么', '哪里', '哪个', '这个', '那个', '一下', '请', '帮', '给', '下',
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'do', 'does', 'how', 'what', 'why', 'where'])
  const q = query.toLowerCase().replace(/[^\w\u4e00-\u9fa5\s]/g, ' ')
  const words = q.split(/\s+/).flatMap(w => {
    // 中文按 2 字窗口切分
    if (/[\u4e00-\u9fa5]/.test(w) && w.length >= 2) {
      const arr: string[] = []
      for (let i = 0; i < w.length - 1; i++) arr.push(w.slice(i, i + 2))
      return arr
    }
    return [w]
  })
  return [...new Set(words)].filter(w => w.length >= 2 && !stopwords.has(w))
}

/** 静态文档打分（简单 term frequency） */
function scoreStaticDoc(doc: KnowledgeChunk, keywords: string[]): number {
  const haystack = (doc.title + ' ' + doc.content).toLowerCase()
  let score = 0
  for (const kw of keywords) {
    const matches = haystack.split(kw).length - 1
    score += matches * (doc.title.toLowerCase().includes(kw) ? 2 : 1)
  }
  return score
}

/** 从静态知识库检索 top-K */
function searchStaticDocs(query: string, k = 3): KnowledgeChunk[] {
  const keywords = extractKeywords(query)
  if (!keywords.length) return []
  const scored = MODULE_DOCS
    .map(doc => ({ ...doc, score: scoreStaticDoc(doc, keywords) }))
    .filter(d => d.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
  return scored
}

/** 从 Supabase 表做全文检索（tsvector）——可选，静默失败 */
async function searchDatabase(query: string, k = 3, myUserId?: string): Promise<KnowledgeChunk[]> {
  const results: KnowledgeChunk[] = []
  try {
    // 学习资源检索（公共，任何人都能访问）
    const { data: resources } = await supabase
      .from('spark_resources')
      .select('id, title, description, course_name, subject')
      .textSearch('search_vector', query.replace(/\s+/g, ' & '), { type: 'websearch', config: 'simple' })
      .limit(k)

    resources?.forEach((r: any) => {
      results.push({
        source: 'resource',
        title: r.title,
        content: `【学习资源】${r.description || ''}${r.course_name ? ' · 课程：' + r.course_name : ''}${r.subject ? ' · 学科：' + r.subject : ''}`,
      })
    })
  } catch { /* 表可能不存在或无权限，静默降级 */ }

  // 用户动态检索（仅当前用户或公开）
  try {
    if (myUserId) {
      const { data: moments } = await supabase
        .from('companion_moments')
        .select('id, content, created_at')
        .or(`user_id.eq.${myUserId},show_in_plaza.eq.true`)
        .ilike('content', `%${query.slice(0, 30)}%`)
        .limit(k)

      moments?.forEach((m: any) => {
        results.push({
          source: 'moment',
          title: (m.content || '').slice(0, 30),
          content: `【动态】${m.content || ''}（发布于 ${(m.created_at || '').slice(0, 10)}）`,
        })
      })
    }
  } catch { /* ignore */ }

  return results
}

/**
 * 综合检索：静态知识库 + 数据库全文索引
 * @param query 用户原始问题
 * @param options.maxChunks 返回的最大片段数（默认 5）
 * @param options.includeDb 是否查数据库（默认 true）
 * @param options.myUserId 当前登录用户 ID（用于检索其动态/笔记）
 */
export async function retrieveRelevantContext(
  query: string,
  options?: { maxChunks?: number; includeDb?: boolean; myUserId?: string },
): Promise<KnowledgeChunk[]> {
  const maxChunks = options?.maxChunks ?? 5
  const staticChunks = searchStaticDocs(query, Math.ceil(maxChunks * 0.6))

  let dbChunks: KnowledgeChunk[] = []
  if (options?.includeDb !== false) {
    try {
      dbChunks = await searchDatabase(query, Math.ceil(maxChunks * 0.6), options?.myUserId)
    } catch { /* 静默 */ }
  }

  return [...staticChunks, ...dbChunks].slice(0, maxChunks)
}

/** 将 chunks 组装为 Edge Function 可用的 extra_context 字符串 */
export function formatContextForAI(chunks: KnowledgeChunk[]): string {
  if (!chunks.length) return ''
  const lines = chunks.map((c, i) => `[${i + 1}] 《${c.title}》（${sourceLabel(c.source)}）\n${c.content}`)
  return `## 项目相关知识（检索自星火域知识库，请基于此回答用户问题，避免凭空编造）\n${lines.join('\n\n')}`
}

function sourceLabel(source: string): string {
  switch (source) {
    case 'module-docs': return '功能文档'
    case 'resource': return '学习资源'
    case 'moment': return '动态'
    case 'news': return '资讯'
    case 'user-note': return '用户笔记'
    default: return source
  }
}
