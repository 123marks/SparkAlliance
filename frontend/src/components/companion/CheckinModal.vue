<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="open" class="ck-overlay" @click.self="$emit('close')">
        <div class="ck-modal" :class="{ 'is-done': isCheckedInToday && !justCheckedIn }">
          <!-- 头部 -->
          <div class="ck-head">
            <div class="ck-head-icon">
              <span v-if="!isCheckedInToday">📅</span>
              <span v-else class="ck-done-emoji">✨</span>
            </div>
            <h2 class="ck-title">
              <template v-if="!isCheckedInToday">今日签到</template>
              <template v-else-if="justCheckedIn">签到成功！</template>
              <template v-else>今天已签到</template>
            </h2>
            <button class="ck-close" @click="$emit('close')" aria-label="关闭">×</button>
          </div>

          <!-- 连续天数徽章 -->
          <div class="ck-streak-card">
            <div class="ck-streak-flame">🔥</div>
            <div class="ck-streak-content">
              <div class="ck-streak-num">{{ displayStreak }}</div>
              <div class="ck-streak-label">连续签到天数</div>
            </div>
            <div v-if="nextMilestone" class="ck-streak-next">
              <div class="ck-streak-next-num">再 {{ nextMilestone.remain }} 天</div>
              <div class="ck-streak-next-label">解锁「{{ nextMilestone.name }}」</div>
            </div>
          </div>

          <!-- 未签到：心情选择 + 备忘 + 签到按钮 -->
          <template v-if="!isCheckedInToday">
            <div class="ck-section">
              <div class="ck-section-title">今日心情</div>
              <div class="ck-mood-grid">
                <button
                  v-for="(meta, key) in MOOD_META"
                  :key="key"
                  class="ck-mood-chip"
                  :class="{ active: selectedMood === key }"
                  :style="selectedMood === key ? { '--mood-color': meta.color } : undefined"
                  @click="selectedMood = key"
                >
                  <span class="ck-mood-icon">{{ meta.icon }}</span>
                  <span class="ck-mood-label">{{ meta.label }}</span>
                </button>
              </div>
            </div>

            <div class="ck-section">
              <div class="ck-section-title">
                给自己的一句话
                <span class="ck-char-count" :class="{ warn: note.length > 80 }">{{ note.length }}/100</span>
              </div>
              <textarea
                v-model="note"
                class="ck-note"
                placeholder="今天最想记住的一件事..."
                maxlength="100"
                rows="3"
              ></textarea>
            </div>

            <button class="ck-submit" :disabled="submitting" @click="handleSubmit">
              <span v-if="submitting">签到中...</span>
              <span v-else>✨ 完成签到 +{{ xpReward }} XP</span>
            </button>
          </template>

          <!-- 已签到：展示今日签到信息 + 近 7 天热力图 -->
          <template v-else>
            <div v-if="todayRecord" class="ck-today-info">
              <div v-if="todayRecord.mood" class="ck-today-mood">
                <span class="ck-mood-big">{{ MOOD_META[todayRecord.mood as keyof typeof MOOD_META]?.icon || '💫' }}</span>
                <span>{{ MOOD_META[todayRecord.mood as keyof typeof MOOD_META]?.label || '心情满满' }}</span>
              </div>
              <p v-if="todayRecord.note" class="ck-today-note">"{{ todayRecord.note }}"</p>
            </div>

            <div class="ck-section">
              <div class="ck-section-title">近 7 天</div>
              <div class="ck-week-strip">
                <div
                  v-for="d in recentDays"
                  :key="d.date"
                  class="ck-day-cell"
                  :class="{
                    filled: !!d.record,
                    today: d.date === todayKey,
                  }"
                  :title="d.date + (d.record ? ' · ✓ 已签到' : ' · 未签')"
                >
                  <span class="ck-day-num">{{ d.date.slice(-2) }}</span>
                  <span v-if="d.record" class="ck-day-mark">✓</span>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useCheckin, type Mood } from '../../composables/useCheckin'

const props = defineProps<{
  open: boolean
}>()
const emit = defineEmits<{
  close: []
  checkedIn: [streak: number]
}>()

const {
  todayRecord, isCheckedInToday, currentStreak, submitting,
  fetchCheckinData, checkinToday, getRecentDays, MOOD_META,
} = useCheckin()

const selectedMood = ref<Mood | ''>('')
const note = ref('')
const justCheckedIn = ref(false)
const recentDays = computed(() => getRecentDays(7))
const todayKey = new Date().toISOString().slice(0, 10)

const xpReward = computed(() => {
  // 基础 10 XP，每 7 天连击加 10 XP，30 天连击额外 50 XP
  let xp = 10
  const s = currentStreak.value + 1
  if (s % 30 === 0) xp += 50
  else if (s % 7 === 0) xp += 20
  else if (s >= 3) xp += 5
  return xp
})

// 下一个连击里程碑
interface Milestone { days: number; name: string; remain: number }
const MILESTONES = [
  { days: 3, name: '三日坚持' },
  { days: 7, name: '一周达人' },
  { days: 30, name: '月度冠军' },
  { days: 100, name: '百日传奇' },
]
const nextMilestone = computed<Milestone | null>(() => {
  const s = displayStreak.value
  for (const m of MILESTONES) {
    if (s < m.days) return { ...m, remain: m.days - s }
  }
  return null
})

const displayStreak = computed(() => {
  if (isCheckedInToday.value) return currentStreak.value
  // 预览签到后的连击数
  return currentStreak.value + 1
})

watch(() => props.open, async (v) => {
  if (v) {
    justCheckedIn.value = false
    selectedMood.value = ''
    note.value = ''
    await fetchCheckinData()
  }
})

async function handleSubmit() {
  const result = await checkinToday({
    mood: (selectedMood.value as Mood) || undefined,
    note: note.value.trim() || undefined,
  })
  if (result) {
    justCheckedIn.value = true
    emit('checkedIn', result.streak_days)
    // 3 秒后自动关闭
    setTimeout(() => { emit('close') }, 3000)
  }
}
</script>

<style scoped>
.ck-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(10, 8, 20, 0.7);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.ck-modal {
  background: linear-gradient(180deg, rgba(30, 27, 45, 0.95), rgba(20, 18, 30, 0.95));
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 20px;
  width: 100%;
  max-width: 420px;
  padding: 20px;
  box-shadow: 0 20px 60px rgba(139, 92, 246, 0.25);
  max-height: 90vh;
  overflow-y: auto;
}

.ck-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.ck-head-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: linear-gradient(135deg, #8B5CF6, #EC4899);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  box-shadow: 0 4px 14px rgba(139, 92, 246, 0.4);
}

.ck-done-emoji {
  animation: pulse-celebrate 1.6s ease-in-out infinite;
}

@keyframes pulse-celebrate {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.2); }
}

.ck-title {
  flex: 1;
  font-size: 18px;
  font-weight: 700;
  color: #fff;
}

.ck-close {
  background: rgba(255, 255, 255, 0.06);
  border: none;
  color: rgba(255, 255, 255, 0.5);
  width: 30px;
  height: 30px;
  border-radius: 8px;
  font-size: 20px;
  cursor: pointer;
  transition: all 0.15s;
}

.ck-close:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
}

/* 连续天数卡片 */
.ck-streak-card {
  background: linear-gradient(135deg, rgba(255, 107, 74, 0.15), rgba(236, 72, 153, 0.1));
  border: 1px solid rgba(255, 107, 74, 0.3);
  border-radius: 16px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.ck-streak-flame {
  font-size: 32px;
  animation: flame-flicker 1.5s ease-in-out infinite alternate;
}

@keyframes flame-flicker {
  0% { transform: rotate(-5deg) scale(1); filter: drop-shadow(0 0 6px rgba(255, 107, 74, 0.5)); }
  100% { transform: rotate(5deg) scale(1.08); filter: drop-shadow(0 0 12px rgba(255, 107, 74, 0.8)); }
}

.ck-streak-content {
  flex: 1;
}

.ck-streak-num {
  font-size: 28px;
  font-weight: 800;
  color: #FF6B4A;
  line-height: 1.1;
}

.ck-streak-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 2px;
}

.ck-streak-next {
  text-align: right;
}

.ck-streak-next-num {
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
}

.ck-streak-next-label {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.4);
  margin-top: 2px;
}

/* 通用 section */
.ck-section {
  margin-bottom: 16px;
}

.ck-section-title {
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.65);
  margin-bottom: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.ck-char-count {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.3);
  font-weight: 500;
}

.ck-char-count.warn {
  color: #F87171;
}

/* 心情选择 */
.ck-mood-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.ck-mood-chip {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 10px 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 11px;
  --mood-color: #8B5CF6;
}

.ck-mood-chip:hover {
  background: rgba(255, 255, 255, 0.07);
  transform: translateY(-2px);
}

.ck-mood-chip.active {
  background: color-mix(in srgb, var(--mood-color) 18%, transparent);
  border-color: var(--mood-color);
  color: #fff;
  transform: translateY(-2px);
  box-shadow: 0 4px 14px color-mix(in srgb, var(--mood-color) 40%, transparent);
}

.ck-mood-icon {
  font-size: 22px;
}

.ck-mood-label {
  font-weight: 600;
}

/* 备忘 textarea */
.ck-note {
  width: 100%;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 10px 12px;
  color: #fff;
  font-size: 14px;
  line-height: 1.5;
  resize: none;
  outline: none;
  font-family: inherit;
}

.ck-note:focus {
  border-color: rgba(139, 92, 246, 0.4);
  background: rgba(0, 0, 0, 0.3);
}

/* 提交按钮 */
.ck-submit {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #8B5CF6, #EC4899);
  border: none;
  border-radius: 14px;
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 6px 20px rgba(139, 92, 246, 0.35);
}

.ck-submit:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 26px rgba(139, 92, 246, 0.5);
}

.ck-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 已签到态 */
.ck-today-info {
  text-align: center;
  padding: 12px 0;
}

.ck-today-mood {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.85);
  font-size: 14px;
  margin-bottom: 8px;
}

.ck-mood-big {
  font-size: 32px;
}

.ck-today-note {
  color: rgba(255, 255, 255, 0.7);
  font-style: italic;
  font-size: 13px;
  line-height: 1.5;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 12px;
  max-width: 320px;
  margin: 0 auto;
}

/* 近 7 天横条 */
.ck-week-strip {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
}

.ck-day-cell {
  aspect-ratio: 1;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.35);
  transition: all 0.15s;
}

.ck-day-cell.filled {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(236, 72, 153, 0.25));
  border-color: rgba(139, 92, 246, 0.4);
  color: #fff;
}

.ck-day-cell.today {
  box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.4);
}

.ck-day-num {
  font-weight: 600;
}

.ck-day-mark {
  position: absolute;
  top: 2px;
  right: 4px;
  font-size: 10px;
  color: #10B981;
  font-weight: 800;
}

/* transitions */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

.fade-enter-active .ck-modal, .fade-leave-active .ck-modal {
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.fade-enter-from .ck-modal {
  transform: translateY(12px) scale(0.94);
}
.fade-leave-to .ck-modal {
  transform: translateY(6px) scale(0.98);
}
</style>
