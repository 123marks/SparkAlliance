<template>
  <!-- 学长名片卡 -->
  <div class="mentor-card" @click="$emit('click', mentor)">
    <div class="mc-avatar">
      <span v-if="mentor.avatar_url" class="mc-img" :style="{ backgroundImage: `url(${mentor.avatar_url})` }"></span>
      <span v-else class="mc-initial">{{ mentor.display_name[0] }}</span>
      <span class="mc-level-badge" :style="{ color: levelConfig.color }">{{ levelConfig.icon }}</span>
    </div>
    <div class="mc-info">
      <div class="mc-name-row">
        <span class="mc-name">{{ mentor.display_name }}</span>
        <span class="mc-cert" :style="{ color: levelConfig.color, borderColor: levelConfig.color + '30' }">
          {{ levelConfig.label }}
        </span>
      </div>
      <p class="mc-meta">{{ mentor.university || '未填写院校' }} · {{ mentor.major || '未填写专业' }}</p>
      <div class="mc-tags">
        <span v-for="tag in mentor.expertise_tags.slice(0, 4)" :key="tag" class="mc-tag">{{ tag }}</span>
      </div>
      <div class="mc-stats">
        <span>📝 {{ mentor.article_count }}篇</span>
        <span>💬 {{ mentor.consultation_count }}次</span>
        <span>❤️ {{ mentor.total_likes }}</span>
        <span v-if="mentor.avg_rating > 0">⭐ {{ mentor.avg_rating.toFixed(1) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { MentorProfile } from '../../composables/useMentor'
import { CERT_LEVELS } from '../../composables/useMentor'

const props = defineProps<{ mentor: MentorProfile }>()
defineEmits<{ click: [mentor: MentorProfile] }>()

const levelConfig = computed(() =>
  CERT_LEVELS[props.mentor.certification_level as keyof typeof CERT_LEVELS] || CERT_LEVELS.pending
)
</script>

<style scoped>
.mentor-card{display:flex;gap:12px;padding:14px;border-radius:14px;background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.05);cursor:pointer;transition:all .25s}
.mentor-card:hover{background:rgba(139,92,246,.04);border-color:rgba(139,92,246,.1);transform:translateY(-1px)}
.mc-avatar{position:relative;flex-shrink:0}
.mc-img{display:block;width:48px;height:48px;border-radius:14px;background-size:cover;background-position:center}
.mc-initial{display:flex;align-items:center;justify-content:center;width:48px;height:48px;border-radius:14px;background:linear-gradient(135deg,rgba(139,92,246,.2),rgba(59,130,246,.15));color:rgba(255,255,255,.7);font-size:18px;font-weight:700}
.mc-level-badge{position:absolute;bottom:-2px;right:-2px;font-size:14px}
.mc-info{flex:1;min-width:0}
.mc-name-row{display:flex;align-items:center;gap:6px;margin-bottom:3px}
.mc-name{font-size:14px;font-weight:600;color:rgba(255,255,255,.8)}
.mc-cert{font-size:10px;padding:1px 6px;border-radius:6px;border:1px solid;font-weight:500}
.mc-meta{font-size:11px;color:rgba(255,255,255,.3);margin:0 0 6px}
.mc-tags{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px}
.mc-tag{font-size:10px;padding:1px 6px;border-radius:4px;background:rgba(139,92,246,.08);color:rgba(139,92,246,.6)}
.mc-stats{display:flex;gap:10px;font-size:10px;color:rgba(255,255,255,.25)}
</style>
