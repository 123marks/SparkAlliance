<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="open" class="ap-overlay" @click.self="$emit('close')">
        <div class="ap-modal">
          <!-- 头部 -->
          <div class="ap-head">
            <div class="ap-head-icon">🏆</div>
            <h2 class="ap-title">成就徽章</h2>
            <button class="ap-close" @click="$emit('close')" aria-label="关闭">×</button>
          </div>

          <!-- 等级卡片 -->
          <div class="ap-level-card">
            <div class="ap-level-left">
              <div class="ap-level-num">Lv.{{ userStats.level }}</div>
              <div class="ap-level-title">{{ levelTitle }}</div>
            </div>
            <div class="ap-level-right">
              <div class="ap-xp-bar">
                <div class="ap-xp-fill" :style="{ width: currentLevelProgress + '%' }"></div>
              </div>
              <div class="ap-xp-text">
                <span>{{ userStats.total_xp }} XP</span>
                <span class="ap-xp-next">/ 下一级 {{ nextLevelXp }}</span>
              </div>
            </div>
          </div>

          <!-- 统计栏 -->
          <div class="ap-stats-row">
            <div class="ap-stat">
              <div class="ap-stat-num">{{ userStats.total_tasks_completed }}</div>
              <div class="ap-stat-label">任务</div>
            </div>
            <div class="ap-stat">
              <div class="ap-stat-num">{{ userStats.total_goals_completed }}</div>
              <div class="ap-stat-label">目标</div>
            </div>
            <div class="ap-stat">
              <div class="ap-stat-num flame">🔥{{ userStats.current_daily_streak }}</div>
              <div class="ap-stat-label">当前连击</div>
            </div>
            <div class="ap-stat">
              <div class="ap-stat-num">{{ userStats.longest_daily_streak }}</div>
              <div class="ap-stat-label">最长连击</div>
            </div>
          </div>

          <!-- 分类 Tab -->
          <div class="ap-tabs">
            <button
              v-for="tab in tabs"
              :key="tab.key"
              class="ap-tab"
              :class="{ active: activeTab === tab.key }"
              @click="activeTab = tab.key"
            >
              <span>{{ tab.icon }}</span>
              <span>{{ tab.label }}</span>
              <span class="ap-tab-count">{{ countByCategory(tab.key) }}</span>
            </button>
          </div>

          <!-- 成就列表 -->
          <div class="ap-grid">
            <div
              v-for="ach in filteredAchievements"
              :key="ach.key"
              class="ap-card"
              :class="[
                'tier-' + ach.tier,
                { unlocked: isUnlocked(ach.key) }
              ]"
            >
              <div class="ap-card-icon">
                <span>{{ ach.icon }}</span>
                <span v-if="!isUnlocked(ach.key)" class="ap-card-lock">🔒</span>
              </div>
              <div class="ap-card-body">
                <div class="ap-card-name">{{ ach.name }}</div>
                <div class="ap-card-desc">{{ ach.description }}</div>
                <div v-if="!isUnlocked(ach.key)" class="ap-card-progress">
                  <div class="ap-card-bar">
                    <div class="ap-card-bar-fill" :style="{ width: getAchievementProgress(ach) + '%' }"></div>
                  </div>
                  <span>{{ Math.floor(getAchievementProgress(ach)) }}%</span>
                </div>
                <div v-else class="ap-card-unlocked">
                  <span class="ap-card-check">✓</span>
                  <span>已解锁 +{{ ach.reward_xp }} XP</span>
                </div>
              </div>
              <span class="ap-card-tier">{{ TIER_LABEL[ach.tier] }}</span>
            </div>
          </div>

          <div v-if="filteredAchievements.length === 0" class="ap-empty">
            此分类暂无成就
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useAchievements, type Achievement } from '../../composables/useAchievements'

const props = defineProps<{
  open: boolean
}>()
defineEmits<{
  close: []
}>()

const {
  userStats, ACHIEVEMENTS,
  nextLevelXp, currentLevelProgress,
  fetchUserAchievements, getAchievementProgress, getLevelTitle,
  unlockedAchievements,
} = useAchievements()

type TabKey = 'all' | Achievement['category']

const tabs: Array<{ key: TabKey; label: string; icon: string }> = [
  { key: 'all', icon: '✨', label: '全部' },
  { key: 'task', icon: '📝', label: '任务' },
  { key: 'goal', icon: '🎯', label: '目标' },
  { key: 'streak', icon: '🔥', label: '连击' },
  { key: 'habit', icon: '🧠', label: '习惯' },
  { key: 'special', icon: '🌟', label: '特殊' },
]

const activeTab = ref<TabKey>('all')

const TIER_LABEL: Record<Achievement['tier'], string> = {
  bronze: '铜',
  silver: '银',
  gold: '金',
  platinum: '钻',
}

const unlockedKeys = computed(() => new Set(unlockedAchievements.value.map((a) => a.key)))

function isUnlocked(key: string): boolean {
  return unlockedKeys.value.has(key)
}

function countByCategory(cat: TabKey): number {
  if (cat === 'all') return unlockedAchievements.value.length
  return unlockedAchievements.value.filter((a) => a.category === cat).length
}

const filteredAchievements = computed(() => {
  const list = activeTab.value === 'all'
    ? ACHIEVEMENTS
    : ACHIEVEMENTS.filter((a) => a.category === activeTab.value)
  // 已解锁的排在前面
  return [...list].sort((a, b) => {
    const au = isUnlocked(a.key) ? 1 : 0
    const bu = isUnlocked(b.key) ? 1 : 0
    if (au !== bu) return bu - au
    const tierOrder = { platinum: 0, gold: 1, silver: 2, bronze: 3 }
    return tierOrder[b.tier] - tierOrder[a.tier]
  })
})

const levelTitle = computed(() => getLevelTitle(userStats.value.level))

watch(() => props.open, async (v) => {
  if (v) {
    await fetchUserAchievements()
  }
})
</script>

<style scoped>
.ap-overlay {
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

.ap-modal {
  background: linear-gradient(180deg, rgba(30, 27, 45, 0.95), rgba(20, 18, 30, 0.95));
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 20px;
  width: 100%;
  max-width: 560px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 20px;
  box-shadow: 0 20px 60px rgba(139, 92, 246, 0.25);
}

/* 头部 */
.ap-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.ap-head-icon {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: linear-gradient(135deg, #F59E0B, #EC4899);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  box-shadow: 0 4px 14px rgba(245, 158, 11, 0.35);
}

.ap-title {
  flex: 1;
  font-size: 18px;
  font-weight: 700;
  color: #fff;
}

.ap-close {
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

.ap-close:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
}

/* 等级卡片 */
.ap-level-card {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.18), rgba(79, 70, 229, 0.12));
  border: 1px solid rgba(139, 92, 246, 0.35);
  border-radius: 16px;
  padding: 16px;
  display: flex;
  gap: 16px;
  align-items: center;
  margin-bottom: 14px;
}

.ap-level-left {
  flex-shrink: 0;
  text-align: center;
}

.ap-level-num {
  font-size: 28px;
  font-weight: 900;
  background: linear-gradient(135deg, #C4B5FD, #F0ABFC);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.ap-level-title {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 600;
  margin-top: 2px;
}

.ap-level-right {
  flex: 1;
}

.ap-xp-bar {
  height: 8px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 6px;
}

.ap-xp-fill {
  height: 100%;
  background: linear-gradient(90deg, #8B5CF6, #EC4899);
  border-radius: 6px;
  transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.ap-xp-text {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.85);
}

.ap-xp-next {
  color: rgba(255, 255, 255, 0.4);
}

/* 统计栏 */
.ap-stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 14px;
}

.ap-stat {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  padding: 10px 4px;
  text-align: center;
}

.ap-stat-num {
  font-size: 18px;
  font-weight: 700;
  color: #fff;
}

.ap-stat-num.flame {
  color: #FF6B4A;
}

.ap-stat-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 2px;
}

/* Tab */
.ap-tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
  overflow-x: auto;
  scrollbar-width: none;
}

.ap-tabs::-webkit-scrollbar {
  display: none;
}

.ap-tab {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 16px;
  color: rgba(255, 255, 255, 0.55);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.ap-tab:hover {
  background: rgba(255, 255, 255, 0.07);
  color: #fff;
}

.ap-tab.active {
  background: rgba(139, 92, 246, 0.2);
  border-color: rgba(139, 92, 246, 0.5);
  color: #fff;
}

.ap-tab-count {
  font-size: 10px;
  padding: 1px 5px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
}

/* 成就卡片 */
.ap-grid {
  display: grid;
  gap: 8px;
}

.ap-card {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.03);
  position: relative;
  transition: all 0.2s;
}

.ap-card.unlocked {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(236, 72, 153, 0.08));
  border-color: rgba(245, 158, 11, 0.3);
}

.ap-card.tier-platinum.unlocked { border-color: rgba(191, 219, 254, 0.5); }
.ap-card.tier-gold.unlocked     { border-color: rgba(245, 158, 11, 0.5); }
.ap-card.tier-silver.unlocked   { border-color: rgba(226, 232, 240, 0.4); }
.ap-card.tier-bronze.unlocked   { border-color: rgba(251, 146, 60, 0.4); }

.ap-card-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  position: relative;
  flex-shrink: 0;
}

.ap-card.unlocked .ap-card-icon {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(236, 72, 153, 0.15));
  box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.3);
}

.ap-card:not(.unlocked) .ap-card-icon > span:first-child {
  filter: grayscale(1);
  opacity: 0.45;
}

.ap-card-lock {
  position: absolute;
  bottom: -4px;
  right: -4px;
  font-size: 12px;
  background: #1F2937;
  padding: 2px;
  border-radius: 6px;
}

.ap-card-body {
  flex: 1;
  min-width: 0;
}

.ap-card-name {
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 2px;
}

.ap-card:not(.unlocked) .ap-card-name {
  color: rgba(255, 255, 255, 0.6);
}

.ap-card-desc {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  line-height: 1.4;
}

.ap-card-progress {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);
}

.ap-card-bar {
  flex: 1;
  height: 4px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 2px;
  overflow: hidden;
}

.ap-card-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #8B5CF6, #EC4899);
  transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.ap-card-unlocked {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
  font-size: 11px;
  color: #10B981;
  font-weight: 600;
}

.ap-card-check {
  font-size: 14px;
  font-weight: 800;
}

.ap-card-tier {
  position: absolute;
  top: 6px;
  right: 8px;
  font-size: 9px;
  font-weight: 800;
  padding: 1px 6px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.6);
  letter-spacing: 1px;
}

.ap-card.tier-platinum .ap-card-tier { background: rgba(191, 219, 254, 0.25); color: #BFDBFE; }
.ap-card.tier-gold     .ap-card-tier { background: rgba(245, 158, 11, 0.25); color: #FDE68A; }
.ap-card.tier-silver   .ap-card-tier { background: rgba(226, 232, 240, 0.2); color: #E2E8F0; }
.ap-card.tier-bronze   .ap-card-tier { background: rgba(251, 146, 60, 0.25); color: #FED7AA; }

.ap-empty {
  text-align: center;
  padding: 40px 20px;
  color: rgba(255, 255, 255, 0.4);
  font-size: 14px;
}

/* transitions */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
