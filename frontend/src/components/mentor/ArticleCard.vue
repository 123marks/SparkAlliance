<template>
  <!-- 文章卡片 -->
  <div class="article-card" @click="$emit('click', article)">
    <div v-if="article.cover_url" class="ac-cover" :style="{ backgroundImage: `url(${article.cover_url})` }">
      <span v-if="article.is_featured" class="ac-featured">🌟 精选</span>
    </div>
    <div class="ac-body">
      <div class="ac-category" :style="{ color: catConfig.label.split(' ')[0] === '📚' ? '#3b82f6' : catConfig.label.split(' ')[0] === '🏠' ? '#22c55e' : catConfig.label.split(' ')[0] === '💼' ? '#f59e0b' : '#8b5cf6' }">
        {{ catConfig.label }}
      </div>
      <h3 class="ac-title">{{ article.title }}</h3>
      <p v-if="article.summary" class="ac-summary">{{ article.summary }}</p>
      <!-- 标签 -->
      <div class="ac-tags">
        <span v-for="tag in article.tags.slice(0, 3)" :key="tag" class="ac-tag">{{ tag }}</span>
      </div>
      <!-- 底栏：作者+统计 -->
      <div class="ac-footer">
        <div class="ac-author" v-if="article.author">
          <span class="ac-author-name">{{ (article.author as any).display_name }}</span>
          <span class="ac-author-cert">{{ getCertIcon((article.author as any).certification_level) }}</span>
        </div>
        <div class="ac-stats">
          <span>👁 {{ article.view_count }}</span>
          <span>❤️ {{ article.like_count }}</span>
          <span>💬 {{ article.comment_count }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { MentorArticle } from '../../composables/useMentor'
import { ARTICLE_CATEGORIES, CERT_LEVELS } from '../../composables/useMentor'

const props = defineProps<{ article: MentorArticle }>()
defineEmits<{ click: [article: MentorArticle] }>()

const catConfig = computed(() =>
  ARTICLE_CATEGORIES.find(c => c.value === props.article.category) || ARTICLE_CATEGORIES[0]
)

function getCertIcon(level: string): string {
  return CERT_LEVELS[level as keyof typeof CERT_LEVELS]?.icon || ''
}
</script>

<style scoped>
.article-card{border-radius:14px;background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.05);overflow:hidden;cursor:pointer;transition:all .25s}
.article-card:hover{background:rgba(139,92,246,.04);border-color:rgba(139,92,246,.1);transform:translateY(-1px)}
.ac-cover{height:120px;background-size:cover;background-position:center;position:relative}
.ac-featured{position:absolute;top:8px;right:8px;font-size:10px;padding:2px 8px;border-radius:8px;background:rgba(0,0,0,.5);color:#f59e0b;backdrop-filter:blur(4px)}
.ac-body{padding:12px}
.ac-category{font-size:10px;font-weight:600;margin-bottom:4px}
.ac-title{font-size:14px;font-weight:600;color:rgba(255,255,255,.8);margin:0 0 6px;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.ac-summary{font-size:12px;color:rgba(255,255,255,.3);margin:0 0 8px;line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.ac-tags{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px}
.ac-tag{font-size:9px;padding:1px 5px;border-radius:4px;background:rgba(255,255,255,.04);color:rgba(255,255,255,.3)}
.ac-footer{display:flex;justify-content:space-between;align-items:center}
.ac-author{display:flex;align-items:center;gap:4px}
.ac-author-name{font-size:11px;color:rgba(255,255,255,.4)}
.ac-author-cert{font-size:12px}
.ac-stats{display:flex;gap:8px;font-size:10px;color:rgba(255,255,255,.2)}
</style>
