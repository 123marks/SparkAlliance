/**
 * useMentor — 学长分享模块核心逻辑
 * 认证体系 / 经验文章 / 一对一咨询 / AI匹配 / 模块打通
 */
import { ref, computed } from 'vue'
import { supabase } from '../supabase'

// ====== 类型定义 ======

export interface MentorProfile {
  id: string
  user_id: string
  display_name: string
  avatar_url?: string
  bio?: string
  university?: string
  major?: string
  grade?: string
  graduation_year?: number
  certification_level: 'pending' | 'normal' | 'excellent' | 'gold'
  certification_proof: string[]
  certified_at?: string
  expertise_tags: string[]
  expertise_areas: string[]
  article_count: number
  consultation_count: number
  total_likes: number
  avg_rating: number
  contribution_points: number
  is_accepting_consult: boolean
  consult_price: { text: number; voice: number; video: number }
  created_at: string
  updated_at: string
}

export interface MentorArticle {
  id: string
  author_id: string
  title: string
  content: string
  summary?: string
  cover_url?: string
  media_urls: string[]
  category: ArticleCategory
  tags: string[]
  view_count: number
  like_count: number
  comment_count: number
  bookmark_count: number
  status: 'draft' | 'published' | 'archived' | 'reported'
  is_pinned: boolean
  is_featured: boolean
  created_at: string
  updated_at: string
  // 联表查询附带
  author?: MentorProfile
  is_liked?: boolean
  is_bookmarked?: boolean
}

export interface MentorComment {
  id: string
  article_id: string
  user_id: string
  content: string
  parent_id?: string
  like_count: number
  created_at: string
  // 联表附带
  user_name?: string
  user_avatar?: string
}

export interface Consultation {
  id: string
  student_id: string
  mentor_id?: string
  title: string
  description: string
  category: ArticleCategory
  consult_type: 'text' | 'voice' | 'video' | 'offline'
  status: 'pending' | 'matched' | 'accepted' | 'in_progress' | 'completed' | 'reviewed' | 'cancelled'
  ai_match_score?: number
  ai_match_reason?: string
  scheduled_at?: string
  schedule_event_id?: string
  rating?: number
  review_text?: string
  created_at: string
  updated_at: string
  completed_at?: string
  // 联表附带
  mentor?: MentorProfile
  student_name?: string
}

export type ArticleCategory = 'academic' | 'life' | 'career' | 'postgrad'

// 分类配置
export const ARTICLE_CATEGORIES = [
  { value: 'academic' as const, label: '📚 学习经验', desc: '课程方法/考试技巧/笔记资料' },
  { value: 'life' as const, label: '🏠 生活指南', desc: '校园攻略/美食推荐/宿舍技巧' },
  { value: 'career' as const, label: '💼 职业发展', desc: '实习求职/简历面试/行业认知' },
  { value: 'postgrad' as const, label: '🎓 考研留学', desc: '备考经验/院校选择/申请指南' },
]

// 认证等级配置
export const CERT_LEVELS = {
  pending: { label: '待审核', color: '#6b7280', icon: '⏳' },
  normal: { label: '认证学长', color: '#3b82f6', icon: '✅' },
  excellent: { label: '优秀学长', color: '#8b5cf6', icon: '🌟' },
  gold: { label: '金牌学长', color: '#f59e0b', icon: '👑' },
}

// 热门标签
export const HOT_TAGS = [
  '高等数学', '大学英语', '考研', '四六级', 'Python', '数据结构',
  '实习', '简历', '面试', '考公', '留学', '奖学金',
  '宿舍', '选课', '社团', '竞赛', '论文', '毕业设计',
]

// ====== Composable ======

export function useMentor() {
  const user = computed(() => supabase.auth.getUser().then(r => r.data.user))

  const articles = ref<MentorArticle[]>([])
  const currentArticle = ref<MentorArticle | null>(null)
  const comments = ref<MentorComment[]>([])
  const myProfile = ref<MentorProfile | null>(null)
  const topMentors = ref<MentorProfile[]>([])
  const consultations = ref<Consultation[]>([])
  const loading = ref(false)
  const totalCount = ref(0)

  // ====== 认证体系 ======

  /** 获取当前用户的学长档案 */
  async function fetchMyProfile(): Promise<MentorProfile | null> {
    const { data: { user: u } } = await supabase.auth.getUser()
    if (!u) return null
    const { data, error } = await supabase
      .from('mentor_profiles')
      .select('*')
      .eq('user_id', u.id)
      .maybeSingle()
    if (error) { console.error('获取学长档案失败:', error); return null }
    myProfile.value = data
    return data
  }

  /** 提交学长认证申请 */
  async function applyForMentor(profile: {
    display_name: string
    bio?: string
    university?: string
    major?: string
    grade?: string
    graduation_year?: number
    expertise_tags: string[]
    expertise_areas: string[]
    proofFiles?: File[]
  }): Promise<boolean> {
    const { data: { user: u } } = await supabase.auth.getUser()
    if (!u) return false
    try {
      // 上传认证材料
      const proofUrls: string[] = []
      if (profile.proofFiles?.length) {
        for (const file of profile.proofFiles) {
          const ext = file.name.split('.').pop()
          const path = `mentors/${u.id}/proof/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
          const { error: upErr } = await supabase.storage
            .from('campus-wall')
            .upload(path, file, { contentType: file.type })
          if (upErr) throw upErr
          const { data: urlData } = supabase.storage.from('campus-wall').getPublicUrl(path)
          proofUrls.push(urlData.publicUrl)
        }
      }

      // 检查是否已有档案
      const existing = await fetchMyProfile()
      if (existing) {
        // 更新
        const { error } = await supabase.from('mentor_profiles').update({
          display_name: profile.display_name,
          bio: profile.bio,
          university: profile.university,
          major: profile.major,
          grade: profile.grade,
          graduation_year: profile.graduation_year,
          expertise_tags: profile.expertise_tags,
          expertise_areas: profile.expertise_areas,
          certification_proof: [...(existing.certification_proof || []), ...proofUrls],
          certification_level: existing.certification_level === 'pending' ? 'pending' : existing.certification_level,
          updated_at: new Date().toISOString(),
        }).eq('user_id', u.id)
        if (error) throw error
      } else {
        // 新建
        const { error } = await supabase.from('mentor_profiles').insert({
          user_id: u.id,
          display_name: profile.display_name,
          avatar_url: u.user_metadata?.avatar_url || null,
          bio: profile.bio,
          university: profile.university,
          major: profile.major,
          grade: profile.grade,
          graduation_year: profile.graduation_year,
          expertise_tags: profile.expertise_tags,
          expertise_areas: profile.expertise_areas,
          certification_proof: proofUrls,
          certification_level: 'pending', // 默认待审核，后续管理员手动升级
          contribution_points: 10, // 注册送10分
        })
        if (error) throw error
      }

      await fetchMyProfile()
      return true
    } catch (e) {
      console.error('学长认证申请失败:', e)
      return false
    }
  }

  /** 获取金牌学长排行 */
  async function fetchTopMentors(limit = 10): Promise<MentorProfile[]> {
    const { data, error } = await supabase
      .from('mentor_profiles')
      .select('*')
      .in('certification_level', ['normal', 'excellent', 'gold'])
      .order('contribution_points', { ascending: false })
      .limit(limit)
    if (error) { console.error(error); return [] }
    topMentors.value = data || []
    return data || []
  }

  // ====== 经验文章 ======

  /** 查询文章列表（分页+筛选） */
  async function fetchArticles(options: {
    category?: ArticleCategory
    tag?: string
    search?: string
    sort?: 'latest' | 'popular' | 'featured'
    page?: number
    pageSize?: number
  } = {}): Promise<MentorArticle[]> {
    loading.value = true
    const { category, tag, search, sort = 'latest', page = 1, pageSize = 20 } = options
    try {
      let query = supabase
        .from('mentor_articles')
        .select('*, author:mentor_profiles!mentor_articles_author_id_fkey(id, user_id, display_name, avatar_url, certification_level, university, major)', { count: 'exact' })
        .eq('status', 'published')

      if (category) query = query.eq('category', category)
      if (tag) query = query.contains('tags', [tag])
      if (search) query = query.ilike('title', `%${search}%`)

      // 排序
      if (sort === 'popular') {
        query = query.order('like_count', { ascending: false })
      } else if (sort === 'featured') {
        query = query.eq('is_featured', true).order('created_at', { ascending: false })
      } else {
        query = query.order('created_at', { ascending: false })
      }

      // 分页
      const from = (page - 1) * pageSize
      query = query.range(from, from + pageSize - 1)

      const { data, error, count } = await query
      if (error) throw error
      articles.value = (data || []) as unknown as MentorArticle[]
      totalCount.value = count || 0
      return articles.value
    } catch (e) {
      console.error('获取文章失败:', e)
      return []
    } finally {
      loading.value = false
    }
  }

  /** 获取文章详情 */
  async function fetchArticleDetail(articleId: string): Promise<MentorArticle | null> {
    try {
      const { data, error } = await supabase
        .from('mentor_articles')
        .select('*, author:mentor_profiles!mentor_articles_author_id_fkey(id, user_id, display_name, avatar_url, certification_level, university, major, expertise_tags)')
        .eq('id', articleId)
        .single()
      if (error) throw error

      // 浏览量 +1
      await supabase.from('mentor_articles')
        .update({ view_count: (data.view_count || 0) + 1 })
        .eq('id', articleId)

      // 检查是否已点赞/收藏
      const { data: { user: u } } = await supabase.auth.getUser()
      if (u) {
        const { data: bk } = await supabase
          .from('mentor_bookmarks')
          .select('id')
          .eq('user_id', u.id)
          .eq('article_id', articleId)
          .maybeSingle()
        ;(data as any).is_bookmarked = !!bk
      }

      currentArticle.value = data as unknown as MentorArticle
      return currentArticle.value
    } catch (e) {
      console.error('获取文章详情失败:', e)
      return null
    }
  }

  /** 发布/编辑文章 */
  async function createArticle(article: {
    title: string
    content: string
    category: ArticleCategory
    tags: string[]
    coverFile?: File
    mediaFiles?: File[]
    status?: 'draft' | 'published'
  }): Promise<string | null> {
    const { data: { user: u } } = await supabase.auth.getUser()
    if (!u) return null
    try {
      // 上传封面
      let coverUrl: string | null = null
      if (article.coverFile) {
        const ext = article.coverFile.name.split('.').pop()
        const path = `mentors/${u.id}/covers/${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage
          .from('campus-wall').upload(path, article.coverFile, { contentType: article.coverFile.type })
        if (upErr) throw upErr
        const { data: urlData } = supabase.storage.from('campus-wall').getPublicUrl(path)
        coverUrl = urlData.publicUrl
      }

      // 上传附件
      const mediaUrls: string[] = []
      if (article.mediaFiles?.length) {
        for (const file of article.mediaFiles) {
          const ext = file.name.split('.').pop()
          const path = `mentors/${u.id}/media/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
          const { error: upErr } = await supabase.storage
            .from('campus-wall').upload(path, file, { contentType: file.type })
          if (upErr) throw upErr
          const { data: urlData } = supabase.storage.from('campus-wall').getPublicUrl(path)
          mediaUrls.push(urlData.publicUrl)
        }
      }

      // AI 生成摘要
      let summary = ''
      try {
        const resp = await fetch('/api/mimo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'MiMo-7B-RL',
            messages: [{ role: 'user', content: `请用50字以内概括这篇文章的核心内容：\n\n${article.title}\n\n${article.content.slice(0, 500)}` }],
            temperature: 0.3, max_tokens: 100,
          }),
        })
        if (resp.ok) {
          const result = await resp.json()
          summary = result.choices?.[0]?.message?.content || ''
        }
      } catch { /* AI 不可用时静默 */ }

      const { data, error } = await supabase.from('mentor_articles').insert({
        author_id: u.id,
        title: article.title,
        content: article.content,
        summary,
        cover_url: coverUrl,
        media_urls: mediaUrls,
        category: article.category,
        tags: article.tags,
        status: article.status || 'published',
      }).select('id').single()
      if (error) throw error

      // 发布奖励积分
      if (article.status !== 'draft' && myProfile.value) {
        await supabase.from('mentor_profiles').update({
          contribution_points: (myProfile.value.contribution_points || 0) + 5,
        }).eq('user_id', u.id)
      }

      return data.id
    } catch (e) {
      console.error('发布文章失败:', e)
      return null
    }
  }

  /** 点赞文章 */
  async function likeArticle(articleId: string): Promise<boolean> {
    try {
      // 直接 +1（简化实现，生产环境需要防重复）
      const { error } = await supabase.from('mentor_articles')
        .update({ like_count: (currentArticle.value?.like_count || 0) + 1 })
        .eq('id', articleId)
      if (error) throw error
      if (currentArticle.value?.id === articleId) {
        currentArticle.value.like_count++
      }
      return true
    } catch (e) {
      console.error('点赞失败:', e)
      return false
    }
  }

  /** 收藏/取消收藏 */
  async function toggleBookmark(articleId: string): Promise<boolean> {
    const { data: { user: u } } = await supabase.auth.getUser()
    if (!u) return false
    try {
      const { data: existing } = await supabase
        .from('mentor_bookmarks')
        .select('id')
        .eq('user_id', u.id)
        .eq('article_id', articleId)
        .maybeSingle()

      if (existing) {
        await supabase.from('mentor_bookmarks').delete().eq('id', existing.id)
        if (currentArticle.value?.id === articleId) currentArticle.value.is_bookmarked = false
      } else {
        await supabase.from('mentor_bookmarks').insert({ user_id: u.id, article_id: articleId })
        if (currentArticle.value?.id === articleId) currentArticle.value.is_bookmarked = true
      }
      return true
    } catch (e) {
      console.error('收藏操作失败:', e)
      return false
    }
  }

  /** 获取文章评论 */
  async function fetchComments(articleId: string): Promise<MentorComment[]> {
    const { data, error } = await supabase
      .from('mentor_comments')
      .select('*')
      .eq('article_id', articleId)
      .order('created_at', { ascending: true })
    if (error) { console.error(error); return [] }
    comments.value = data || []
    return comments.value
  }

  /** 发表评论 */
  async function addComment(articleId: string, content: string, parentId?: string): Promise<boolean> {
    const { data: { user: u } } = await supabase.auth.getUser()
    if (!u) return false
    try {
      const { error } = await supabase.from('mentor_comments').insert({
        article_id: articleId,
        user_id: u.id,
        content,
        parent_id: parentId || null,
      })
      if (error) throw error
      await fetchComments(articleId)
      return true
    } catch (e) {
      console.error('评论失败:', e)
      return false
    }
  }

  // ====== 模块打通：一键转发到校园墙 ======

  async function shareArticleToWall(article: MentorArticle): Promise<boolean> {
    const { data: { user: u } } = await supabase.auth.getUser()
    if (!u) return false
    try {
      const categoryLabel = ARTICLE_CATEGORIES.find(c => c.value === article.category)?.label || '📝'
      const content = `${categoryLabel} 学长经验分享\n\n📖 ${article.title}\n\n${article.summary || article.content.slice(0, 150)}...\n\n#学长分享 #${article.tags.slice(0, 3).join(' #')}`
      const authorName = u.user_metadata?.nickname || u.email?.split('@')[0] || '同学'
      const { error } = await supabase.from('posts').insert({
        content,
        author_id: u.id,
        author_name: authorName,
        category: 'mentor',
        tags: ['学长分享', ...article.tags.slice(0, 3)],
      })
      if (error) throw error
      return true
    } catch (e) {
      console.error('转发到校园墙失败:', e)
      return false
    }
  }

  // ====== 模块打通：一键生成规划目标 ======

  async function createGoalFromArticle(article: MentorArticle): Promise<boolean> {
    const { data: { user: u } } = await supabase.auth.getUser()
    if (!u) return false
    try {
      // 根据文章分类映射目标类型
      const typeMap: Record<ArticleCategory, string> = {
        academic: 'academic',
        life: 'personal',
        career: 'career',
        postgrad: 'academic',
      }
      // 使用 AI 从文章提炼任务
      let tasks: { title: string; due_date?: string }[] = []
      try {
        const resp = await fetch('/api/mimo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'MiMo-7B-RL',
            messages: [{ role: 'user', content: `根据这篇学习经验分享，提炼3-5个可执行的学习任务。
标题：${article.title}
摘要：${article.summary || article.content.slice(0, 300)}

返回JSON数组格式：[{"title":"任务名"},...]` }],
            temperature: 0.4, max_tokens: 300,
          }),
        })
        if (resp.ok) {
          const result = await resp.json()
          const text = result.choices?.[0]?.message?.content || ''
          const match = text.match(/\[[\s\S]*\]/)
          if (match) tasks = JSON.parse(match[0])
        }
      } catch { /* fallback */ }

      if (tasks.length === 0) {
        tasks = [{ title: `阅读并实践「${article.title}」的建议` }]
      }

      // 创建目标
      const deadline = new Date()
      deadline.setDate(deadline.getDate() + 14) // 默认2周
      const { data: goal, error: gErr } = await supabase.from('goals').insert({
        user_id: u.id,
        title: `📖 学习：${article.title}`,
        goal_type: typeMap[article.category],
        deadline: deadline.toISOString().split('T')[0],
        status: 'active',
      }).select('id').single()
      if (gErr) throw gErr

      // 创建任务
      const today = new Date()
      for (const [i, t] of tasks.entries()) {
        const d = new Date(today.getTime() + (i + 1) * 3 * 86400000) // 每3天一个
        await supabase.from('planner_tasks').insert({
          goal_id: goal.id,
          user_id: u.id,
          title: t.title,
          due_date: d.toISOString().split('T')[0],
          source: 'mentor',
          sort_order: i,
          status: 'pending',
        })
      }

      return true
    } catch (e) {
      console.error('从文章创建目标失败:', e)
      return false
    }
  }

  // ====== 一对一咨询 ======

  /** 发起咨询 */
  async function createConsultation(data: {
    title: string
    description: string
    category: ArticleCategory
    consult_type?: 'text' | 'voice' | 'video' | 'offline'
  }): Promise<Consultation | null> {
    const { data: { user: u } } = await supabase.auth.getUser()
    if (!u) return null
    try {
      const { data: consult, error } = await supabase.from('mentor_consultations').insert({
        student_id: u.id,
        title: data.title,
        description: data.description,
        category: data.category,
        consult_type: data.consult_type || 'text',
        status: 'pending',
      }).select().single()
      if (error) throw error

      // 异步 AI 匹配学长
      aiMatchMentor(consult.id, data.category, data.description)

      return consult as Consultation
    } catch (e) {
      console.error('发起咨询失败:', e)
      return null
    }
  }

  /** AI 匹配学长 */
  async function aiMatchMentor(consultId: string, category: ArticleCategory, description: string) {
    try {
      // 获取该分类下接单的学长
      const { data: mentors } = await supabase
        .from('mentor_profiles')
        .select('*')
        .contains('expertise_areas', [category])
        .eq('is_accepting_consult', true)
        .in('certification_level', ['normal', 'excellent', 'gold'])
        .order('avg_rating', { ascending: false })
        .limit(5)

      if (!mentors?.length) return

      // 调用 AI 计算匹配度
      let bestMentor = mentors[0]
      let bestScore = 70
      let bestReason = '根据专业领域和评分推荐'

      try {
        const mentorList = mentors.map(m =>
          `${m.display_name}(${m.major || '未知专业'}, 标签: ${m.expertise_tags.join('/')}, 评分: ${m.avg_rating}, 咨询数: ${m.consultation_count})`
        ).join('\n')

        const resp = await fetch('/api/mimo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'MiMo-7B-RL',
            messages: [{ role: 'user', content: `学生咨询问题: "${description}"
候选学长列表：
${mentorList}

请选出最匹配的学长（0号开始），给出匹配度（0-100）和一句话理由。
返回JSON: {"index":0, "score":85, "reason":"..."}` }],
            temperature: 0.3, max_tokens: 150,
          }),
        })
        if (resp.ok) {
          const result = await resp.json()
          const text = result.choices?.[0]?.message?.content || ''
          const match = text.match(/\{[\s\S]*\}/)
          if (match) {
            const parsed = JSON.parse(match[0])
            const idx = Math.min(parsed.index || 0, mentors.length - 1)
            bestMentor = mentors[idx]
            bestScore = parsed.score || 70
            bestReason = parsed.reason || '根据专业领域推荐'
          }
        }
      } catch { /* fallback 使用第一个 */ }

      // 更新咨询状态
      await supabase.from('mentor_consultations').update({
        mentor_id: bestMentor.user_id,
        ai_match_score: bestScore,
        ai_match_reason: bestReason,
        status: 'matched',
        updated_at: new Date().toISOString(),
      }).eq('id', consultId)

    } catch (e) {
      console.error('AI匹配学长失败:', e)
    }
  }

  /** 获取我的咨询列表 */
  async function fetchMyConsultations(): Promise<Consultation[]> {
    const { data: { user: u } } = await supabase.auth.getUser()
    if (!u) return []
    try {
      const { data, error } = await supabase
        .from('mentor_consultations')
        .select('*, mentor:mentor_profiles!mentor_consultations_mentor_id_fkey(id, user_id, display_name, avatar_url, certification_level, major)')
        .or(`student_id.eq.${u.id},mentor_id.eq.${u.id}`)
        .order('created_at', { ascending: false })
      if (error) throw error
      consultations.value = (data || []) as unknown as Consultation[]
      return consultations.value
    } catch (e) {
      console.error('获取咨询列表失败:', e)
      return []
    }
  }

  /** 学长接单 */
  async function acceptConsultation(consultId: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('mentor_consultations').update({
        status: 'accepted',
        updated_at: new Date().toISOString(),
      }).eq('id', consultId)
      if (error) throw error
      return true
    } catch (e) {
      console.error('接单失败:', e)
      return false
    }
  }

  /** 完成咨询（同步写入日程） */
  async function completeConsultation(consultId: string, scheduledAt?: string): Promise<boolean> {
    const { data: { user: u } } = await supabase.auth.getUser()
    if (!u) return false
    try {
      const updates: Record<string, unknown> = {
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      // 如果有预约时间，同步到日程模块
      if (scheduledAt) {
        const consult = consultations.value.find(c => c.id === consultId)
        const start = new Date(scheduledAt)
        const end = new Date(start.getTime() + 30 * 60000) // 默认30分钟
        const { data: event, error: evtErr } = await supabase.from('schedule_events').insert({
          user_id: u.id,
          title: `💬 学长咨询: ${consult?.title || '一对一咨询'}`,
          description: consult?.description || '',
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          event_type: 'consultation',
          status: 'active',
        }).select('id').single()
        if (!evtErr && event) {
          updates.schedule_event_id = event.id
          updates.scheduled_at = scheduledAt
        }
      }

      const { error } = await supabase.from('mentor_consultations')
        .update(updates)
        .eq('id', consultId)
      if (error) throw error

      // 学长获得积分
      if (myProfile.value) {
        await supabase.from('mentor_profiles').update({
          contribution_points: (myProfile.value.contribution_points || 0) + 10,
        }).eq('user_id', u.id)
      }

      return true
    } catch (e) {
      console.error('完成咨询失败:', e)
      return false
    }
  }

  /** 评价咨询 */
  async function reviewConsultation(consultId: string, rating: number, reviewText: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('mentor_consultations').update({
        rating,
        review_text: reviewText,
        status: 'reviewed',
        updated_at: new Date().toISOString(),
      }).eq('id', consultId)
      if (error) throw error
      return true
    } catch (e) {
      console.error('评价失败:', e)
      return false
    }
  }

  // ====== 智能推荐 ======

  /** 获取推荐文章（根据用户专业+兴趣） */
  async function fetchRecommendedArticles(limit = 10): Promise<MentorArticle[]> {
    try {
      // 优先精选 + 热门
      const { data, error } = await supabase
        .from('mentor_articles')
        .select('*, author:mentor_profiles!mentor_articles_author_id_fkey(id, user_id, display_name, avatar_url, certification_level)')
        .eq('status', 'published')
        .order('is_featured', { ascending: false })
        .order('like_count', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit)
      if (error) throw error
      return (data || []) as unknown as MentorArticle[]
    } catch (e) {
      console.error('获取推荐失败:', e)
      return []
    }
  }

  // ====== 工具函数 ======

  function getCategoryConfig(category: ArticleCategory) {
    return ARTICLE_CATEGORIES.find(c => c.value === category) || ARTICLE_CATEGORIES[0]
  }

  function getCertLevelConfig(level: string) {
    return CERT_LEVELS[level as keyof typeof CERT_LEVELS] || CERT_LEVELS.pending
  }

  function formatTimeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return '刚刚'
    if (mins < 60) return `${mins}分钟前`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}小时前`
    const days = Math.floor(hours / 24)
    if (days < 30) return `${days}天前`
    return dateStr.slice(0, 10)
  }

  return {
    // 状态
    articles, currentArticle, comments, myProfile, topMentors, consultations, loading, totalCount,
    // 认证
    fetchMyProfile, applyForMentor, fetchTopMentors,
    // 文章
    fetchArticles, fetchArticleDetail, createArticle, likeArticle, toggleBookmark,
    fetchComments, addComment, fetchRecommendedArticles,
    // 模块打通
    shareArticleToWall, createGoalFromArticle,
    // 咨询
    createConsultation, fetchMyConsultations, acceptConsultation, completeConsultation, reviewConsultation,
    // 工具
    getCategoryConfig, getCertLevelConfig, formatTimeAgo,
    // 常量
    ARTICLE_CATEGORIES, CERT_LEVELS, HOT_TAGS,
  }
}
