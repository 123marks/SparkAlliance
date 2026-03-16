<template>
  <div class="wall-layout">
    <div class="wall-container">
      
      <!-- Feed Header -->
      <div class="feed-header">
        <h1 class="page-title">校园动态墙</h1>
        <div class="tabs">
          <button v-for="tab in tabList" :key="tab" class="tab" :class="{ active: activeTab === tab }" @click="activeTab = tab">{{ tab }}</button>
        </div>
      </div>

      <!-- Composer -->
      <div class="composer-card" :class="{ expanded: composerExpanded }">
        <div class="c-avatar">{{ avatarInitial }}</div>
        <div class="c-input-area" v-if="!composerExpanded">
          <input type="text" placeholder="分享你的星火校园新鲜事..." class="c-input" @focus="composerExpanded = true" />
        </div>
        <div class="c-expanded" v-else>
          <textarea v-model="newPostContent" placeholder="写下你想说的..." class="c-textarea" rows="3" ref="composerTextarea"></textarea>
          <div class="c-toolbar">
            <div class="c-tools">
              <button class="tool-btn">🖼️ 图片</button>
              <button class="tool-btn">📎 文件</button>
              <label class="anon-toggle">
                <input type="checkbox" v-model="isAnonymous" />
                <span>匿名发布</span>
              </label>
            </div>
            <div class="c-actions">
              <button class="c-cancel" @click="composerExpanded = false; newPostContent = ''">取消</button>
              <button class="c-submit" @click="submitPost" :disabled="!newPostContent.trim()">发布</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Feed List -->
      <div class="feed-list">
        <div class="post-card" v-for="(post, index) in filteredPosts" :key="index">
          <div class="post-header">
            <div class="p-author">
              <div class="p-avatar" :style="{ background: post.avatarBg }">
                <span v-if="post.isAnonymous" class="anon-icon">🕵️</span>
                <span v-else>{{ post.authorInitial }}</span>
              </div>
              <div class="p-info">
                <h4>{{ post.author }} <span class="tag" :class="post.tagClass">{{ post.tagText }}</span></h4>
                <span class="time">{{ post.time }}</span>
              </div>
            </div>
            <button class="more-btn">•••</button>
          </div>
          <div class="post-content">
            <p>{{ post.content }}</p>
          </div>
          <div class="post-tags" v-if="post.tags.length">
            <span class="p-tag" v-for="tag in post.tags" :key="tag">#{{ tag }}</span>
          </div>
          <div class="post-actions">
            <button class="action-btn" :class="{ active: post.liked }" @click="toggleLike(post)">
              <span class="icon">{{ post.liked ? '❤️' : '👍' }}</span> {{ post.likes }}
            </button>
            <button class="action-btn"><span class="icon">💬</span> {{ post.comments }}</button>
            <button class="action-btn"><span class="icon">🔁</span></button>
          </div>
        </div>
      </div>

    </div>

    <!-- Floating Action Button -->
    <button class="fab" @click="composerExpanded = true; scrollToTop()">
      <span class="cross">+</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { useAuth } from '../../composables/useAuth'

const { user } = useAuth()

const avatarInitial = computed(() => {
  const name = user.value?.user_metadata?.nickname || user.value?.email?.split('@')[0] || '?'
  return name.charAt(0).toUpperCase()
})

const tabList = ['推荐', '最新', '关注', '热议表白']
const activeTab = ref('推荐')
const composerExpanded = ref(false)
const newPostContent = ref('')
const isAnonymous = ref(false)

interface Post {
  author: string;
  authorInitial: string;
  avatarBg: string;
  isAnonymous: boolean;
  tagText: string;
  tagClass: string;
  time: string;
  content: string;
  tags: string[];
  likes: number;
  comments: number;
  liked: boolean;
  category: string;
}

const posts = ref<Post[]>([
  {
    author: '计科吴彦祖', authorInitial: '计', avatarBg: 'linear-gradient(135deg, #10b981, #3b82f6)',
    isAnonymous: false, tagText: '身份认证', tagClass: '', time: '10 分钟前',
    content: '有没有兄弟知道软工的课设如果使用 Vue3，老师那边查重容忍度高不高啊？我用 Composition API 写了一套，感觉大家代码结构都很像 😂',
    tags: ['软件工程', '求助交流'], likes: 24, comments: 8, liked: false, category: '推荐'
  },
  {
    author: '匿名同学', authorInitial: '🕵️', avatarBg: 'rgba(255,255,255,0.1)',
    isAnonymous: true, tagText: '半匿名', tagClass: 'anon', time: '1 小时前',
    content: '今天在二食堂二楼那个打麻辣烫的阿姨，手真的太抖了！好几片肉硬生生地被抖回了锅里！心碎 💔',
    tags: ['生活吐槽'], likes: 156, comments: 45, liked: false, category: '推荐'
  },
  {
    author: '校园社团联盟', authorInitial: '校', avatarBg: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
    isAnonymous: false, tagText: '官方', tagClass: 'official', time: '昨天 18:00',
    content: '【百团大战预告】本周六，中心广场，校团委联合 80+ 社团等你来玩！现场扫码加入即送精美文创，还有随机掉落的抽奖机会哦！🎉',
    tags: [], likes: 890, comments: 120, liked: true, category: '推荐'
  },
  {
    author: '深夜食堂', authorInitial: '深', avatarBg: 'linear-gradient(135deg, #f97316, #ef4444)',
    isAnonymous: false, tagText: '身份认证', tagClass: '', time: '3 小时前',
    content: '致暗恋了两年的你：每次在图书馆遇到你，你总戴着那副白色的无线耳机，翻开的书旁边永远放着一杯冰美式。我不知道你是谁，但我想认识你。如果你看到了，回复我一句「我也是」就好。',
    tags: ['表白墙'], likes: 342, comments: 89, liked: false, category: '热议表白'
  },
])

const filteredPosts = computed(() => {
  if (activeTab.value === '推荐' || activeTab.value === '最新') return posts.value
  if (activeTab.value === '热议表白') return posts.value.filter(p => p.category === '热议表白' || p.tags.includes('表白墙'))
  return posts.value
})

const toggleLike = (post: Post) => {
  post.liked = !post.liked
  post.likes += post.liked ? 1 : -1
}

const submitPost = () => {
  if (!newPostContent.value.trim()) return
  const authorName = isAnonymous.value ? '匿名同学' : (user.value?.user_metadata?.nickname || user.value?.email?.split('@')[0] || '同学')
  posts.value.unshift({
    author: authorName,
    authorInitial: isAnonymous.value ? '🕵️' : authorName.charAt(0),
    avatarBg: isAnonymous.value ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, var(--color-brand-blue), var(--color-brand-purple))',
    isAnonymous: isAnonymous.value,
    tagText: isAnonymous.value ? '半匿名' : '刚刚发布',
    tagClass: isAnonymous.value ? 'anon' : 'new',
    time: '刚刚',
    content: newPostContent.value,
    tags: [],
    likes: 0,
    comments: 0,
    liked: false,
    category: '推荐'
  })
  newPostContent.value = ''
  composerExpanded.value = false
}

const scrollToTop = () => {
  nextTick(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  })
}
</script>

<style scoped>
.wall-layout {
  position: relative;
  min-height: calc(100vh - 72px);
  padding: 32px 0;
}

.wall-container {
  max-width: 680px;
  margin: 0 auto;
  padding: 0 20px;
}

.feed-header {
  margin-bottom: 24px;
}
.page-title {
  font-size: 24px; font-weight: 800; margin-bottom: 20px; color: white;
}

.tabs {
  display: flex; gap: 12px; border-bottom: 1px solid var(--color-border); padding-bottom: 12px;
}
.tab { background: transparent; border: none; color: var(--color-text-secondary); font-size: 15px; font-weight: 500; padding: 4px 12px; cursor: pointer; transition: all 0.2s; position: relative;}
.tab:hover { color: white; }
.tab.active { color: white; font-weight: 600; }
.tab.active::after { content: ''; position: absolute; bottom: -13px; left: 0; width: 100%; height: 2px; background: var(--color-brand-blue); border-radius: 2px 2px 0 0; }

/* Composer */
.composer-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  padding: 16px;
  display: flex; align-items: flex-start; gap: 16px;
  margin-bottom: 32px;
  transition: all 0.3s;
}
.composer-card.expanded { flex-direction: column; }
.c-avatar { width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, var(--color-brand-purple), var(--color-brand-orange)); flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 16px; color: white; }
.c-input-area { flex: 1; }
.c-input { width: 100%; background: rgba(0,0,0,0.2); border: 1px solid var(--color-border); height: 44px; border-radius: 22px; padding: 0 20px; color: white; outline: none; transition: border-color 0.2s; }
.c-input:focus { border-color: var(--color-brand-blue); }
.c-expanded { width: 100%; }
.c-textarea { width: 100%; background: rgba(0,0,0,0.2); border: 1px solid var(--color-border); border-radius: 12px; padding: 16px; color: white; outline: none; resize: vertical; font-family: inherit; font-size: 15px; line-height: 1.6; transition: border-color 0.2s; }
.c-textarea:focus { border-color: var(--color-brand-blue); }
.c-toolbar { display: flex; justify-content: space-between; align-items: center; margin-top: 12px; }
.c-tools { display: flex; gap: 8px; align-items: center; }
.tool-btn { background: rgba(255,255,255,0.05); border: 1px solid var(--color-border); color: var(--color-text-secondary); padding: 6px 12px; border-radius: 8px; font-size: 13px; cursor: pointer; transition: all 0.2s; }
.tool-btn:hover { background: rgba(255,255,255,0.1); color: white; }
.anon-toggle { display: flex; align-items: center; gap: 8px; color: var(--color-text-secondary); font-size: 13px; cursor: pointer; }
.anon-toggle input { accent-color: var(--color-brand-purple); }
.c-actions { display: flex; gap: 8px; }
.c-cancel { background: transparent; border: 1px solid var(--color-border); color: white; padding: 8px 16px; border-radius: 8px; font-size: 14px; cursor: pointer; transition: background 0.2s; }
.c-cancel:hover { background: rgba(255,255,255,0.05); }
.c-submit { background: var(--gradient-brand); border: none; color: white; padding: 8px 20px; border-radius: 8px; font-weight: 600; font-size: 14px; cursor: pointer; transition: opacity 0.2s; }
.c-submit:disabled { opacity: 0.4; cursor: not-allowed; }
.tag.new { background: rgba(16, 185, 129, 0.1); border-color: rgba(16, 185, 129, 0.3); color: #10b981; }

/* Feed */
.feed-list {
  display: flex; flex-direction: column; gap: 24px;
}

.post-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 20px;
  padding: 24px;
  transition: transform 0.2s, box-shadow 0.2s;
}
.post-card:hover { transform: translateY(-2px); box-shadow: 0 10px 30px rgba(0,0,0,0.3); }

.post-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;}
.p-author { display: flex; gap: 12px; align-items: center; }
.p-avatar { width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center;}
.anon-icon { font-size: 24px; filter: grayscale(1); }
.p-info h4 { font-size: 15px; font-weight: 600; display: flex; align-items: center; gap: 8px; color: white; margin-bottom: 4px;}
.p-info .time { font-size: 12px; color: var(--color-text-muted); }
.tag { font-size: 10px; padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2); font-weight: normal;}
.tag.anon { border-color: var(--color-text-muted); color: var(--color-text-muted); }
.tag.official { background: rgba(249, 115, 22, 0.1); border-color: rgba(249, 115, 22, 0.3); color: var(--color-brand-orange); }

.more-btn { background: transparent; border: none; color: var(--color-text-muted); letter-spacing: 2px; }

.post-content { color: var(--color-text-primary); line-height: 1.6; font-size: 15px; margin-bottom: 16px; }
.post-image-mock { width: 100%; height: 200px; background: rgba(0,0,0,0.2); border-radius: 12px; margin-top: 16px; display: flex; align-items: center; justify-content: center; border: 1px dashed var(--color-border); color: var(--color-text-muted);}

.post-tags { display: flex; gap: 8px; margin-bottom: 16px; }
.p-tag { color: var(--color-brand-blue); font-size: 13px; cursor: pointer; }
.p-tag:hover { text-decoration: underline; }

.post-actions { display: flex; gap: 32px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 16px; }
.action-btn { background: transparent; border: none; color: var(--color-text-secondary); display: flex; align-items: center; gap: 8px; font-size: 14px; cursor: pointer; transition: color 0.2s;}
.action-btn:hover { color: white; }
.action-btn.active { color: #f43f5e; }

/* FAB */
.fab {
  position: fixed;
  bottom: 40px; right: 40px;
  width: 64px; height: 64px;
  border-radius: 32px;
  background: var(--gradient-brand);
  border: none; color: white; font-size: 32px;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 10px 20px rgba(139, 92, 246, 0.4);
  cursor: pointer; transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.fab:hover { transform: scale(1.1) rotate(90deg); }
.cross { line-height: 1; }
</style>
