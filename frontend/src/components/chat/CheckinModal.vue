<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="visible" class="checkin-overlay" @click.self="$emit('close')">
        <div class="checkin-modal">
          <button class="cm-close" @click="$emit('close')">×</button>

          <!-- 签到成功视图 -->
          <div v-if="checkinResult" class="cm-success">
            <div class="cm-success-icon">🎉</div>
            <h3>签到成功！</h3>
            <p class="cm-streak">连续签到 <strong>{{ checkinResult.streak_days }}</strong> 天</p>
            <div class="cm-xp-reward">+{{ 10 + checkinResult.streak_days * 2 }} XP</div>

            <div v-if="streakMilestone" class="cm-milestone">
              <div class="cm-milestone-icon">{{ streakMilestone.icon }}</div>
              <p>{{ streakMilestone.text }}</p>
            </div>

            <div class="cm-share-row">
              <button class="cm-share-btn" @click="shareCheckin">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                分享打卡记录
              </button>
            </div>
            <button class="cm-done-btn" @click="$emit('close')">完成</button>
          </div>

          <!-- 签到表单视图 -->
          <div v-else class="cm-form">
            <div class="cm-header">
              <span class="cm-header-icon">✨</span>
              <h3>今日签到</h3>
            </div>
            <p class="cm-hint">选择今天的心情，开始新的一天</p>

            <div class="cm-mood-grid">
              <button
                v-for="(meta, key) in MOOD_META"
                :key="key"
                class="cm-mood-btn"
                :class="{ active: selectedMood === key }"
                :style="{ '--mood-color': meta.color }"
                @click="selectedMood = key as Mood"
              >
                <span class="cm-mood-emoji">{{ meta.icon }}</span>
                <span class="cm-mood-label">{{ meta.label }}</span>
              </button>
            </div>

            <textarea
              v-model="noteText"
              class="cm-note"
              rows="2"
              placeholder="今天想记录点什么？（可选）"
              maxlength="200"
            ></textarea>

            <button class="cm-submit-btn" :disabled="submitting" @click="doCheckin">
              {{ submitting ? '签到中...' : '确认签到' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCheckin, MOOD_META, type Mood, type CheckinRecord } from '../../composables/useCheckin'
import { useEasterEggs } from '../../composables/useEasterEggs'

defineProps<{ visible: boolean }>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'success', record: CheckinRecord): void
}>()

const { checkinToday } = useCheckin()
const { detectStreakEgg } = useEasterEggs()

const selectedMood = ref<Mood>('happy')
const noteText = ref('')
const submitting = ref(false)
const checkinResult = ref<CheckinRecord | null>(null)

const streakMilestone = computed(() => {
  if (!checkinResult.value) return null
  const egg = detectStreakEgg(checkinResult.value.streak_days)
  if (!egg?.banner) return null
  return { icon: egg.banner.icon, text: egg.banner.text }
})

async function doCheckin() {
  submitting.value = true
  const record = await checkinToday({ mood: selectedMood.value, note: noteText.value.trim() || undefined })
  submitting.value = false

  if (record) {
    checkinResult.value = record
    emit('success', record)
  }
}

function shareCheckin() {
  if (!checkinResult.value) return
  const text = `我在 SparkAlliance 星火联盟连续签到了 ${checkinResult.value.streak_days} 天！坚持是最好的天赋。 #星火联盟 #每日签到`

  if (navigator.share) {
    navigator.share({ title: '星火联盟签到', text }).catch(() => {})
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(text)
    alert('签到文案已复制到剪贴板！')
  }
}
</script>

<style scoped>
.checkin-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.checkin-modal {
  width: min(420px, 92vw);
  background: linear-gradient(180deg, #13112a, #0d0b1e);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 20px;
  padding: 28px;
  position: relative;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5);
  animation: modalIn 0.25s ease-out;
}

@keyframes modalIn {
  from { opacity: 0; transform: scale(0.95) translateY(12px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

.cm-close {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: none;
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.4);
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.cm-close:hover { background: rgba(239, 68, 68, 0.12); color: #f87171; }

.cm-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.cm-header-icon { font-size: 24px; }

.cm-header h3,
.cm-success h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: white;
}

.cm-hint {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.3);
  margin: 0 0 18px;
}

.cm-mood-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 16px;
}

.cm-mood-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 8px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.02);
  cursor: pointer;
  transition: all 0.2s;
}

.cm-mood-btn:hover {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.1);
}

.cm-mood-btn.active {
  background: color-mix(in srgb, var(--mood-color) 12%, transparent);
  border-color: color-mix(in srgb, var(--mood-color) 35%, transparent);
  box-shadow: 0 0 12px color-mix(in srgb, var(--mood-color) 15%, transparent);
}

.cm-mood-emoji { font-size: 26px; }
.cm-mood-label { font-size: 11px; color: rgba(255, 255, 255, 0.5); font-weight: 500; }
.cm-mood-btn.active .cm-mood-label { color: rgba(255, 255, 255, 0.8); }

.cm-note {
  width: 100%;
  resize: none;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.02);
  border-radius: 12px;
  padding: 10px 14px;
  font: inherit;
  font-size: 13px;
  color: white;
  outline: none;
  margin-bottom: 16px;
  transition: border-color 0.2s;
}

.cm-note::placeholder { color: rgba(255, 255, 255, 0.2); }
.cm-note:focus { border-color: rgba(139, 92, 246, 0.3); }

.cm-submit-btn {
  width: 100%;
  height: 42px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #6d28d9, #8b5cf6);
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 16px rgba(139, 92, 246, 0.3);
}

.cm-submit-btn:hover:not(:disabled) {
  box-shadow: 0 6px 24px rgba(139, 92, 246, 0.45);
  transform: translateY(-1px);
}

.cm-submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* 成功视图 */
.cm-success {
  text-align: center;
  padding: 10px 0;
}

.cm-success-icon { font-size: 48px; margin-bottom: 12px; }

.cm-streak {
  font-size: 15px;
  color: rgba(255, 255, 255, 0.6);
  margin: 8px 0;
}

.cm-streak strong {
  font-size: 28px;
  font-weight: 800;
  color: #f59e0b;
}

.cm-xp-reward {
  display: inline-flex;
  padding: 4px 14px;
  border-radius: 20px;
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.2);
  color: #34d399;
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 16px;
}

.cm-milestone {
  padding: 14px;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(139, 92, 246, 0.06));
  border: 1px solid rgba(245, 158, 11, 0.15);
  margin-bottom: 16px;
}

.cm-milestone-icon { font-size: 28px; margin-bottom: 6px; }
.cm-milestone p { margin: 0; font-size: 13px; color: rgba(255, 255, 255, 0.6); line-height: 1.5; }

.cm-share-row { margin-bottom: 16px; }

.cm-share-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 10px;
  border: 1px solid rgba(59, 130, 246, 0.2);
  background: rgba(59, 130, 246, 0.06);
  color: rgba(147, 197, 253, 0.8);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.cm-share-btn:hover {
  background: rgba(59, 130, 246, 0.12);
  border-color: rgba(59, 130, 246, 0.35);
}

.cm-done-btn {
  width: 100%;
  height: 40px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.cm-done-btn:hover {
  background: rgba(255, 255, 255, 0.06);
  color: white;
}

.modal-enter-active { transition: all 0.25s; }
.modal-leave-active { transition: all 0.15s; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from .checkin-modal { transform: scale(0.95) translateY(12px); }
</style>
