<template>
  <div class="community-page">
    <!-- 顶部导航 -->
    <nav class="page-nav">
      <router-link to="/" class="nav-logo">✦ Spark Alliance</router-link>
      <div class="nav-center">
        <div class="search-box">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input v-model="searchQuery" placeholder="搜索话题、帖子..." />
        </div>
      </div>
      <div class="nav-links">
        <router-link to="/docs">文档</router-link>
        <router-link to="/community" class="active">社区</router-link>
        <router-link to="/changelog">更新日志</router-link>
        <router-link to="/register" class="nav-btn">注册</router-link>
        <router-link to="/login" class="nav-btn-ghost">登录</router-link>
      </div>
    </nav>

    <div class="community-layout">
      <!-- 左侧导航栏 -->
      <aside class="community-sidebar">
        <button class="new-topic-btn" @click="showCreateModal = true">+ 发起新话题</button>

        <div class="sidebar-group">
          <div class="sidebar-item" :class="{ active: !activeCategory && activeView === 'all' }" @click="resetFilters">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            话题
          </div>
          <div class="sidebar-item" :class="{ active: activeView === 'latest' }" @click="activeView = 'latest'; activeCategory = ''">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            最新
          </div>
        </div>

        <div class="sidebar-group">
          <div class="sidebar-label">类别</div>
          <div
            v-for="cat in categories"
            :key="cat.id"
            class="sidebar-item"
            :class="{ active: activeCategory === cat.id }"
            @click="activeCategory = activeCategory === cat.id ? '' : cat.id; activeView = 'all'"
          >
            <span class="cat-dot" :style="{ background: cat.color }"></span>
            {{ cat.name }}
            <span class="cat-count">{{ getCategoryCount(cat.name) }}</span>
          </div>
        </div>

        <div class="sidebar-group">
          <div class="sidebar-label">标签</div>
          <div class="tag-cloud">
            <span
              v-for="tag in allTags"
              :key="tag"
              class="tag-item"
              :class="{ active: activeTag === tag }"
              @click="activeTag = activeTag === tag ? '' : tag"
            >{{ tag }}</span>
          </div>
        </div>

        <div class="sidebar-group">
          <div class="sidebar-label">社区建议</div>
          <div class="sidebar-item" @click="showFeedbackModal = true">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            提交反馈
          </div>
        </div>
      </aside>

      <!-- 主内容区 -->
      <main class="community-main">
        <!-- 排序栏 -->
        <div class="toolbar">
          <div class="toolbar-tabs">
            <span :class="{ active: sortBy === 'top' }" @click="sortBy = 'top'">置顶</span>
            <span :class="{ active: sortBy === 'latest' }" @click="sortBy = 'latest'">最新消息</span>
            <span :class="{ active: sortBy === 'hot' }" @click="sortBy = 'hot'">热门</span>
          </div>
          <div class="toolbar-info">共 {{ filteredTopics.length }} 个话题</div>
        </div>

        <!-- 帖子表头 -->
        <div class="topic-thead">
          <div class="col-topic">主题</div>
          <div class="col-num">回复</div>
          <div class="col-num">浏览</div>
          <div class="col-time">活动</div>
        </div>

        <!-- 帖子列表 -->
        <div class="topic-list">
          <div
            v-for="topic in filteredTopics"
            :key="topic.id"
            class="topic-row"
            :class="{ pinned: topic.pinned }"
            @click="openTopic(topic)"
          >
            <div class="col-topic">
              <div class="topic-title-line">
                <span class="pin-badge" v-if="topic.pinned">📌</span>
                <span class="topic-title">{{ topic.title }}</span>
              </div>
              <div class="topic-meta-line">
                <span class="topic-cat-badge" :style="{ backgroundColor: getCategoryColor(topic.category) + '18', color: getCategoryColor(topic.category) }">{{ topic.category }}</span>
                <span v-for="t in topic.tags" :key="t" class="topic-tag-badge">{{ t }}</span>
              </div>
            </div>
            <div class="col-avatars">
              <div v-for="(a, i) in topic.avatars.slice(0, 4)" :key="i" class="avatar-dot" :style="{ background: a }"></div>
            </div>
            <div class="col-num">
              <strong>{{ topic.replies }}</strong>
            </div>
            <div class="col-num views">{{ topic.views }}</div>
            <div class="col-time">{{ topic.lastActive }}</div>
          </div>
        </div>
      </main>
    </div>

    <!-- 帖子详情弹窗 -->
    <Teleport to="body">
      <div v-if="selectedTopic" class="modal-overlay" @click.self="selectedTopic = null">
        <div class="modal-panel topic-detail">
          <div class="modal-header">
            <h2>{{ selectedTopic.title }}</h2>
            <button class="modal-close" @click="selectedTopic = null">✕</button>
          </div>
          <div class="modal-body">
            <div class="detail-meta">
              <span class="topic-cat-badge" :style="{ backgroundColor: getCategoryColor(selectedTopic.category) + '18', color: getCategoryColor(selectedTopic.category) }">{{ selectedTopic.category }}</span>
              <span v-for="t in selectedTopic.tags" :key="t" class="topic-tag-badge">{{ t }}</span>
              <span class="detail-stats">👁 {{ selectedTopic.views }} 浏览 · 💬 {{ selectedTopic.replies }} 回复</span>
            </div>

            <!-- 原帖内容 -->
            <div class="post-content">
              <p>{{ selectedTopic.content || '该话题的详细内容将在后台管理中编辑。这里将展示完整的讨论内容和图片等媒体。' }}</p>
            </div>

            <!-- 评论区 -->
            <div class="comments-section">
              <h3>💬 讨论 ({{ selectedTopic.comments?.length || 0 }})</h3>
              <div v-if="selectedTopic.comments && selectedTopic.comments.length" class="comment-list">
                <div v-for="(c, i) in selectedTopic.comments" :key="i" class="comment-item">
                  <div class="comment-avatar" :style="{ background: c.avatar }"></div>
                  <div class="comment-body">
                    <div class="comment-head">
                      <strong>{{ c.author }}</strong>
                      <span>{{ c.time }}</span>
                    </div>
                    <p>{{ c.text }}</p>
                    <div class="comment-actions">
                      <span @click="c.liked = !c.liked" :class="{ liked: c.liked }">❤️ {{ c.likes + (c.liked ? 1 : 0) }}</span>
                      <span>回复</span>
                    </div>
                  </div>
                </div>
              </div>
              <div v-else class="no-comments">暂无评论，快来抢沙发 🛋️</div>

              <!-- 发表评论输入 -->
              <div class="comment-input-area">
                <textarea v-model="newComment" placeholder="写下你的想法..." rows="3"></textarea>
                <div class="comment-input-footer">
                  <span class="char-count">{{ newComment.length }}/500</span>
                  <button class="submit-comment-btn" :disabled="!newComment.trim()" @click="submitComment">发表评论</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 发帖弹窗 -->
    <Teleport to="body">
      <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
        <div class="modal-panel create-topic">
          <div class="modal-header">
            <h2>发起新话题</h2>
            <button class="modal-close" @click="showCreateModal = false">✕</button>
          </div>
          <div class="modal-body">
            <label>标题</label>
            <input v-model="newTopic.title" placeholder="输入标题..." class="form-input" />
            <label>类别</label>
            <select v-model="newTopic.category" class="form-input">
              <option value="">选择类别</option>
              <option v-for="cat in categories" :key="cat.id" :value="cat.name">{{ cat.name }}</option>
            </select>
            <label>标签 <span class="label-hint">(用逗号分隔)</span></label>
            <input v-model="newTopic.tagsInput" placeholder="如：AI助手, Bug" class="form-input" />
            <label>内容</label>
            <textarea v-model="newTopic.content" placeholder="详细描述你的话题..." rows="6" class="form-input"></textarea>
            <div class="create-footer">
              <button class="cancel-btn" @click="showCreateModal = false">取消</button>
              <button class="submit-btn" :disabled="!newTopic.title.trim() || !newTopic.category" @click="submitTopic">发布话题</button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 反馈弹窗 -->
    <Teleport to="body">
      <div v-if="showFeedbackModal" class="modal-overlay" @click.self="showFeedbackModal = false">
        <div class="modal-panel feedback-modal">
          <div class="modal-header">
            <h2>提交反馈</h2>
            <button class="modal-close" @click="showFeedbackModal = false">✕</button>
          </div>
          <div class="modal-body">
            <label>反馈类型</label>
            <select v-model="feedback.type" class="form-input">
              <option value="bug">🐛 Bug 报告</option>
              <option value="feature">💡 功能建议</option>
              <option value="improve">✨ 体验改进</option>
              <option value="other">📝 其他</option>
            </select>
            <label>详细描述</label>
            <textarea v-model="feedback.content" placeholder="请详细描述你的反馈..." rows="5" class="form-input"></textarea>
            <label>联系方式 <span class="label-hint">(可选)</span></label>
            <input v-model="feedback.contact" placeholder="邮箱或微信" class="form-input" />
            <div class="create-footer">
              <button class="cancel-btn" @click="showFeedbackModal = false">取消</button>
              <button class="submit-btn" :disabled="!feedback.content.trim()" @click="submitFeedback">提交反馈</button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'

// ============ 状态 ============
const searchQuery = ref('')
const activeView = ref('all')
const activeCategory = ref('')
const activeTag = ref('')
const sortBy = ref('top')
const showCreateModal = ref(false)
const showFeedbackModal = ref(false)
const selectedTopic = ref<any>(null)
const newComment = ref('')

// 新帖表单
const newTopic = reactive({ title: '', category: '', tagsInput: '', content: '' })

// 反馈表单
const feedback = reactive({ type: 'bug', content: '', contact: '' })

// ============ 数据 ============
const categories = [
  { id: 'announce', name: '公告', color: '#f97316' },
  { id: 'feature', name: '功能请求', color: '#3b82f6' },
  { id: 'bug', name: '漏洞报告', color: '#f43f5e' },
  { id: 'help', name: '使用帮助', color: '#10b981' },
  { id: 'share', name: '经验分享', color: '#8b5cf6' },
  { id: 'other', name: '其他', color: '#6b7280' },
]

const allTags = ['AI助手', '校园墙', '共创', '人才', '资讯', '学习', 'Bug', '建议', '新手入门']

// 帖子数据（含评论）
const topics = ref([
  {
    id: 1, title: '欢迎来到星火联盟社区，一起建设更好的平台！', category: '公告', tags: ['公告'],
    replies: 62, views: '15.6k', lastActive: '2月14日', pinned: true,
    avatars: ['linear-gradient(135deg,#8b5cf6,#3b82f6)', 'linear-gradient(135deg,#f43f5e,#f97316)', 'linear-gradient(135deg,#10b981,#06b6d4)'],
    content: '欢迎各位加入星火联盟社区！\n\n在这里你可以：\n- 讨论产品功能和改进建议\n- 报告Bug和技术问题\n- 分享你的使用经验\n- 认识其他有趣的人\n\n请遵守社区规范，友善交流 ❤️',
    comments: [
      { author: '小星', avatar: 'linear-gradient(135deg,#10b981,#06b6d4)', text: '终于有社区了！期待更多功能上线 🎉', time: '3月10日', likes: 12, liked: false },
      { author: '代码猎手', avatar: 'linear-gradient(135deg,#f97316,#f43f5e)', text: 'AI助手真的很好用，帮我解了好多数学题', time: '3月11日', likes: 8, liked: false },
    ]
  },
  {
    id: 10, title: '⭐ 星火联盟 答疑专区', category: '使用帮助', tags: ['公告'],
    replies: 66, views: '2.7k', lastActive: '3小时', pinned: true,
    avatars: ['linear-gradient(135deg,#8b5cf6,#f43f5e)', 'linear-gradient(135deg,#f97316,#f43f5e)', 'linear-gradient(135deg,#10b981,#3b82f6)'],
    content: '有任何使用问题都可以在这里提问，团队成员会及时解答。',
    comments: [
      { author: '新手小白', avatar: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', text: '请问怎么切换AI模型？', time: '1小时前', likes: 2, liked: false },
      { author: '管理员', avatar: 'linear-gradient(135deg,#f97316,#ec4899)', text: '在AI助手界面顶部的模型选择器中切换即可，目前支持DeepSeek、豆包和千问。', time: '30分钟前', likes: 5, liked: false },
    ]
  },
  {
    id: 2, title: 'AI 助手调用次数限制说明与付费方案讨论', category: '功能请求', tags: ['AI助手', '建议'],
    replies: 37, views: '4.9k', lastActive: '11月', pinned: false,
    avatars: ['linear-gradient(135deg,#3b82f6,#8b5cf6)', 'linear-gradient(135deg,#f97316,#f43f5e)'],
    content: '目前免费用户每天有20次调用限制，大家觉得这个额度合理吗？付费价格¥19.9/月觉得如何？',
    comments: [
      { author: '数学渣', avatar: 'linear-gradient(135deg,#10b981,#3b82f6)', text: '20次真的不够用啊，考试周一天就超了', time: '上周', likes: 15, liked: false },
    ]
  },
  {
    id: 3, title: '我已经达到每天20次的上限了，接下来怎么办？', category: '使用帮助', tags: ['AI助手'],
    replies: 11, views: '5.7k', lastActive: '2月4日', pinned: false,
    avatars: ['linear-gradient(135deg,#10b981,#3b82f6)'],
    content: '每天用AI改代码太方便了但是20次很快就用完了…有什么办法增加次数吗？',
    comments: []
  },
  {
    id: 4, title: '与星火联盟分享你的胜利 🎉', category: '公告', tags: ['经验分享'],
    replies: 59, views: '4.3k', lastActive: '2025年', pinned: false,
    avatars: ['linear-gradient(135deg,#f97316,#f43f5e)', 'linear-gradient(135deg,#8b5cf6,#06b6d4)', 'linear-gradient(135deg,#10b981,#3b82f6)'],
    content: '在使用星火联盟的过程中，你有什么精彩的故事想要分享吗？把你的成就发在这里吧！',
    comments: [
      { author: '学霸张', avatar: 'linear-gradient(135deg,#8b5cf6,#3b82f6)', text: '用AI助手准备期末考试，高数从60分涨到92分！', time: '1月', likes: 45, liked: false },
      { author: '前端新人', avatar: 'linear-gradient(135deg,#f43f5e,#f97316)', text: '通过星火共创找到了队友，一起做了个小程序上线了 🚀', time: '2月', likes: 38, liked: false },
    ]
  },
  {
    id: 5, title: '校园墙发帖后无法删除，疑似是Bug', category: '漏洞报告', tags: ['校园墙', 'Bug'],
    replies: 8, views: '1.2k', lastActive: '3月', pinned: false,
    avatars: ['linear-gradient(135deg,#f43f5e,#f97316)'],
    content: '在校园墙发了一条帖子，想删除，但是找不到删除按钮。请问是不是还没做这个功能？',
    comments: [
      { author: '开发团队', avatar: 'linear-gradient(135deg,#10b981,#06b6d4)', text: '感谢反馈！已记录为Issue #142，预计下个版本修复。', time: '3月2日', likes: 3, liked: false },
    ]
  },
  {
    id: 6, title: '星火共创项目协作申请流程体验反馈', category: '功能请求', tags: ['共创', '建议'],
    replies: 31, views: '2.5k', lastActive: '12月', pinned: false,
    avatars: ['linear-gradient(135deg,#8b5cf6,#3b82f6)', 'linear-gradient(135deg,#10b981,#06b6d4)'],
    content: '共创模块很好用，但申请加入项目后没有通知提醒，建议加上邮件或站内通知。',
    comments: []
  },
  {
    id: 7, title: '关于积分未使用完不结余到下个月的问题', category: '功能请求', tags: ['建议'],
    replies: 65, views: '4.2k', lastActive: '二维', pinned: false,
    avatars: ['linear-gradient(135deg,#f97316,#ec4899)', 'linear-gradient(135deg,#3b82f6,#8b5cf6)', 'linear-gradient(135deg,#10b981,#14b8a6)'],
    content: '现在的积分系统每月清零太不合理了，希望能结余到下个月使用。',
    comments: []
  },
  {
    id: 8, title: '新手入门：如何快速上手星火联盟的所有功能？', category: '使用帮助', tags: ['新手入门'],
    replies: 18, views: '1.2k', lastActive: '2025年8月', pinned: false,
    avatars: ['linear-gradient(135deg,#8b5cf6,#3b82f6)'],
    content: '刚注册的新用户，感觉功能好多，不知道从哪里开始。有没有老用户分享一下使用心得？',
    comments: [
      { author: '星火导师', avatar: 'linear-gradient(135deg,#f97316,#f43f5e)', text: '建议先试试AI助手，然后去校园墙逛逛，最后看看共创有没有感兴趣的项目！', time: '8月', likes: 22, liked: false },
    ]
  },
  {
    id: 9, title: 'AI 助手怎么选择不同的模型？DeepSeek vs 豆包哪个好', category: '使用帮助', tags: ['AI助手'],
    replies: 13, views: '4.3k', lastActive: '3月13日', pinned: false,
    avatars: ['linear-gradient(135deg,#3b82f6,#06b6d4)'],
    content: '想知道不同模型的区别，哪个更适合做数学题？哪个更适合写论文？',
    comments: [
      { author: '模型测评师', avatar: 'linear-gradient(135deg,#8b5cf6,#3b82f6)', text: 'DeepSeek擅长推理和数学，豆包擅长对话和创意写作，千问多模态能力强可以理解图片', time: '3月13日', likes: 18, liked: false },
    ]
  },
])

// ============ 计算属性 ============
const getCategoryColor = (catName: string) => {
  return categories.find(c => c.name === catName)?.color || '#6b7280'
}

const getCategoryCount = (catName: string) => {
  return topics.value.filter(t => t.category === catName).length
}

const filteredTopics = computed(() => {
  let result = [...topics.value]

  // 按分类过滤
  if (activeCategory.value) {
    const catName = categories.find(c => c.id === activeCategory.value)?.name
    if (catName) result = result.filter(t => t.category === catName)
  }

  // 按标签过滤
  if (activeTag.value) {
    result = result.filter(t => t.tags.includes(activeTag.value))
  }

  // 搜索
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(t => t.title.toLowerCase().includes(q) || t.content?.toLowerCase().includes(q))
  }

  // 排序
  if (sortBy.value === 'hot') {
    result.sort((a, b) => b.replies - a.replies)
  } else {
    // 置顶优先
    result.sort((a, b) => (a.pinned === b.pinned ? 0 : a.pinned ? -1 : 1))
  }

  return result
})

// ============ 方法 ============
const resetFilters = () => {
  activeCategory.value = ''
  activeTag.value = ''
  activeView.value = 'all'
  searchQuery.value = ''
}

const openTopic = (topic: any) => {
  selectedTopic.value = { ...topic, comments: topic.comments ? [...topic.comments.map((c: any) => ({ ...c }))] : [] }
}

const submitComment = () => {
  if (!newComment.value.trim() || !selectedTopic.value) return
  // 添加评论到当前帖子
  const comment = {
    author: '我',
    avatar: 'linear-gradient(135deg,#4f8ef7,#8b5cf6)',
    text: newComment.value.trim(),
    time: '刚刚',
    likes: 0,
    liked: false,
  }
  selectedTopic.value.comments.push(comment)
  // 同步到原数据
  const orig = topics.value.find(t => t.id === selectedTopic.value.id)
  if (orig) {
    if (!orig.comments) orig.comments = []
    orig.comments.push(comment)
    orig.replies++
  }
  newComment.value = ''
}

const submitTopic = () => {
  if (!newTopic.title.trim() || !newTopic.category) return
  const tags = newTopic.tagsInput.split(/[，,]/).map(s => s.trim()).filter(Boolean)
  topics.value.unshift({
    id: Date.now(),
    title: newTopic.title,
    category: newTopic.category,
    tags,
    replies: 0,
    views: '0',
    lastActive: '刚刚',
    pinned: false,
    avatars: ['linear-gradient(135deg,#4f8ef7,#8b5cf6)'],
    content: newTopic.content,
    comments: [],
  })
  // 重置表单
  newTopic.title = ''
  newTopic.category = ''
  newTopic.tagsInput = ''
  newTopic.content = ''
  showCreateModal.value = false
}

const submitFeedback = () => {
  if (!feedback.content.trim()) return
  // 模拟提交（实际对接后台时替换为API调用）
  alert('✅ 反馈已提交，感谢你的参与！')
  feedback.content = ''
  feedback.contact = ''
  showFeedbackModal.value = false
}
</script>

<style scoped>
.community-page { min-height: 100vh; background: var(--color-bg-primary); display: flex; flex-direction: column; }

/* 导航 */
.page-nav { height: 56px; border-bottom: 1px solid var(--color-border); display: flex; align-items: center; justify-content: space-between; padding: 0 24px; backdrop-filter: blur(20px); background: rgba(10,10,15,0.92); position: sticky; top: 0; z-index: 50; gap: 16px; }
.nav-logo { font-weight: 800; font-size: 16px; color: var(--color-brand-blue); flex-shrink: 0; text-decoration: none; }
.nav-center { flex: 1; max-width: 400px; }
.search-box { display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 6px 12px; }
.search-box input { flex: 1; background: none; border: none; outline: none; color: white; font-size: 13px; }
.search-box input::placeholder { color: var(--color-text-muted); }
.nav-links { display: flex; gap: 16px; align-items: center; flex-shrink: 0; }
.nav-links a { color: var(--color-text-secondary); font-size: 13px; font-weight: 500; transition: color 0.2s; text-decoration: none; }
.nav-links a:hover, .nav-links a.active { color: white; }
.nav-btn { background: var(--gradient-brand); padding: 6px 16px !important; border-radius: 8px; color: white !important; }
.nav-btn-ghost { border: 1px solid rgba(255,255,255,0.15); padding: 5px 14px !important; border-radius: 8px; }

/* 布局 */
.community-layout { display: flex; flex: 1; }

/* 侧边栏 */
.community-sidebar { width: 230px; border-right: 1px solid var(--color-border); padding: 16px 12px; overflow-y: auto; flex-shrink: 0; position: sticky; top: 56px; height: calc(100vh - 56px); }
.new-topic-btn { width: 100%; padding: 10px; background: var(--gradient-brand); border: none; border-radius: 10px; color: white; font-weight: 700; font-size: 14px; cursor: pointer; margin-bottom: 16px; transition: transform 0.15s, box-shadow 0.15s; }
.new-topic-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(139,92,246,0.3); }

.sidebar-group { margin-bottom: 16px; }
.sidebar-label { font-size: 10px; color: var(--color-text-muted); font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; padding: 8px 12px 4px; }
.sidebar-item { display: flex; align-items: center; gap: 8px; padding: 7px 12px; border-radius: 8px; font-size: 13px; color: var(--color-text-secondary); cursor: pointer; transition: all 0.12s; }
.sidebar-item:hover { background: rgba(255,255,255,0.04); color: white; }
.sidebar-item.active { background: rgba(139,92,246,0.12); color: white; }
.cat-dot { width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; }
.cat-count { margin-left: auto; font-size: 11px; color: var(--color-text-muted); background: rgba(255,255,255,0.04); padding: 1px 6px; border-radius: 999px; }

.tag-cloud { display: flex; flex-wrap: wrap; gap: 5px; padding: 4px 8px; }
.tag-item { font-size: 11px; padding: 3px 9px; border-radius: 999px; background: rgba(255,255,255,0.04); color: var(--color-text-muted); cursor: pointer; transition: all 0.12s; border: 1px solid transparent; }
.tag-item:hover { background: rgba(255,255,255,0.08); color: white; }
.tag-item.active { background: rgba(139,92,246,0.15); color: #c4b5fd; border-color: rgba(139,92,246,0.3); }

/* 主内容 */
.community-main { flex: 1; display: flex; flex-direction: column; min-width: 0; }

.toolbar { display: flex; justify-content: space-between; align-items: center; padding: 12px 20px; border-bottom: 1px solid var(--color-border); }
.toolbar-tabs { display: flex; gap: 16px; }
.toolbar-tabs span { font-size: 13px; color: var(--color-text-muted); cursor: pointer; padding: 4px 0; border-bottom: 2px solid transparent; transition: all 0.12s; }
.toolbar-tabs span:hover { color: var(--color-text-secondary); }
.toolbar-tabs span.active { color: white; border-bottom-color: var(--color-brand-blue); }
.toolbar-info { font-size: 12px; color: var(--color-text-muted); }

/* 表头 */
.topic-thead { display: flex; align-items: center; padding: 8px 20px; font-size: 11px; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid var(--color-border); background: rgba(255,255,255,0.01); }
.col-topic { flex: 1; min-width: 0; }
.col-avatars { width: 80px; }
.col-num { width: 60px; text-align: center; }
.col-time { width: 80px; text-align: right; }

/* 帖子行 */
.topic-list { flex: 1; overflow-y: auto; }
.topic-row { display: flex; align-items: center; padding: 12px 20px; border-bottom: 1px solid rgba(255,255,255,0.03); cursor: pointer; transition: background 0.12s; }
.topic-row:hover { background: rgba(255,255,255,0.025); }
.topic-row.pinned { background: rgba(139,92,246,0.03); }

.topic-title-line { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
.pin-badge { font-size: 11px; }
.topic-title { font-size: 14px; font-weight: 500; color: white; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.topic-row:hover .topic-title { color: var(--color-brand-blue); }

.topic-meta-line { display: flex; gap: 5px; flex-wrap: wrap; }
.topic-cat-badge { font-size: 10px; padding: 1px 8px; border-radius: 4px; font-weight: 600; }
.topic-tag-badge { font-size: 10px; padding: 1px 6px; border-radius: 4px; background: rgba(255,255,255,0.04); color: var(--color-text-muted); }

.col-avatars { display: flex; }
.avatar-dot { width: 22px; height: 22px; border-radius: 50%; border: 2px solid var(--color-bg-primary); margin-left: -6px; flex-shrink: 0; }
.avatar-dot:first-child { margin-left: 0; }

.col-num { font-size: 13px; color: var(--color-text-secondary); }
.col-num strong { color: white; }
.col-num.views { color: var(--color-text-muted); }
.col-time { font-size: 12px; color: var(--color-text-muted); }

/* ============ 弹窗样式 ============ */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.65); backdrop-filter: blur(6px); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 20px; }
.modal-panel { background: var(--color-bg-primary); border: 1px solid var(--color-border); border-radius: 16px; width: 100%; max-height: 85vh; overflow-y: auto; box-shadow: 0 24px 80px rgba(0,0,0,0.6); }
.topic-detail { max-width: 720px; }
.create-topic, .feedback-modal { max-width: 560px; }

.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid var(--color-border); }
.modal-header h2 { font-size: 18px; font-weight: 700; }
.modal-close { background: none; border: none; color: var(--color-text-muted); font-size: 18px; cursor: pointer; padding: 4px 8px; border-radius: 6px; transition: all 0.12s; }
.modal-close:hover { background: rgba(255,255,255,0.06); color: white; }
.modal-body { padding: 20px 24px; }

/* 帖子详情 */
.detail-meta { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 16px; }
.detail-stats { font-size: 12px; color: var(--color-text-muted); margin-left: auto; }
.post-content { padding: 16px 0; border-bottom: 1px solid rgba(255,255,255,0.04); margin-bottom: 20px; }
.post-content p { color: var(--color-text-secondary); line-height: 1.8; font-size: 14px; white-space: pre-wrap; }

/* 评论区 */
.comments-section h3 { font-size: 15px; font-weight: 700; margin-bottom: 16px; }
.comment-list { display: flex; flex-direction: column; gap: 14px; margin-bottom: 20px; }
.comment-item { display: flex; gap: 10px; }
.comment-avatar { width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0; }
.comment-body { flex: 1; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.04); border-radius: 10px; padding: 10px 14px; }
.comment-head { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 12px; }
.comment-head strong { color: white; }
.comment-head span { color: var(--color-text-muted); }
.comment-body p { font-size: 13px; color: var(--color-text-secondary); line-height: 1.6; }
.comment-actions { display: flex; gap: 14px; margin-top: 6px; font-size: 12px; color: var(--color-text-muted); }
.comment-actions span { cursor: pointer; transition: color 0.12s; }
.comment-actions span:hover, .comment-actions .liked { color: #f43f5e; }
.no-comments { text-align: center; padding: 24px; color: var(--color-text-muted); font-size: 14px; }

/* 评论输入 */
.comment-input-area { margin-top: 16px; }
.comment-input-area textarea { width: 100%; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 12px; color: white; font-size: 13px; resize: none; outline: none; transition: border-color 0.15s; }
.comment-input-area textarea:focus { border-color: rgba(139,92,246,0.4); }
.comment-input-area textarea::placeholder { color: var(--color-text-muted); }
.comment-input-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 8px; }
.char-count { font-size: 11px; color: var(--color-text-muted); }
.submit-comment-btn { padding: 8px 20px; background: var(--gradient-brand); border: none; border-radius: 8px; color: white; font-weight: 600; font-size: 13px; cursor: pointer; transition: transform 0.12s; }
.submit-comment-btn:hover { transform: translateY(-1px); }
.submit-comment-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

/* 发帖/反馈表单 */
.modal-body label { display: block; font-size: 13px; font-weight: 600; color: white; margin-bottom: 6px; margin-top: 14px; }
.modal-body label:first-child { margin-top: 0; }
.label-hint { font-weight: 400; color: var(--color-text-muted); }
.form-input { width: 100%; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 10px 12px; color: white; font-size: 13px; outline: none; transition: border-color 0.15s; }
.form-input:focus { border-color: rgba(139,92,246,0.4); }
.form-input::placeholder { color: var(--color-text-muted); }
select.form-input { appearance: none; cursor: pointer; }
textarea.form-input { resize: vertical; min-height: 80px; }

.create-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.04); }
.cancel-btn { padding: 8px 20px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: var(--color-text-secondary); font-size: 13px; cursor: pointer; }
.submit-btn { padding: 8px 24px; background: var(--gradient-brand); border: none; border-radius: 8px; color: white; font-weight: 600; font-size: 13px; cursor: pointer; transition: transform 0.12s; }
.submit-btn:hover { transform: translateY(-1px); }
.submit-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

/* 响应式 */
@media (max-width: 768px) {
  .community-sidebar { display: none; }
  .nav-center { max-width: 180px; }
  .col-avatars { display: none; }
}
</style>
