<template>
  <!-- 成就徽章和等级展示组件 -->
  <div class="achievement-panel">
    <!-- 等级卡片 -->
    <div class="ap-level-card">
      <div class="ap-level-info">
        <span class="ap-level">Lv.{{ stats.level }}</span>
        <span class="ap-title">{{ levelTitle }}</span>
      </div>
      <div class="ap-xp-bar">
        <div class="ap-xp-fill" :style="{ width: `${levelProgress}%` }"></div>
      </div>
      <div class="ap-xp-text">
        <span>{{ stats.total_xp }} / {{ nextLevelXp }} XP</span>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="ap-stats-row">
      <div class="ap-stat">
        <span class="ap-stat-num">{{ stats.total_tasks_completed }}</span>
        <span class="ap-stat-label">任务完成</span>
      </div>
      <div class="ap-stat">
        <span class="ap-stat-num">{{ stats.total_goals_completed }}</span>
        <span class="ap-stat-label">目标达成</span>
      </div>
      <div class="ap-stat streak">
        <span class="ap-stat-num">{{ stats.current_daily_streak }}<span class="ap-fire">🔥</span></span>
        <span class="ap-stat-label">连续天数</span>
      </div>
    </div>

    <!-- 成就展示 -->
    <div class="ap-badges">
      <div class="ap-badges-header">
        <span class="ap-badges-title">🏆 成就徽章</span>
        <span class="ap-badges-count">{{ unlockedCount }}/{{ totalCount }}</span>
      </div>
      <div class="ap-badges-grid">
        <div
          v-for="a in displayAchievements"
          :key="a.key"
          class="ap-badge"
          :class="[a.tier, { locked: !isUnlocked(a.key) }]"
          :title="a.description"
          @click="showDetail(a)"
        >
          <span class="ap-badge-icon">{{ a.icon }}</span>
          <div class="ap-badge-progress" v-if="!isUnlocked(a.key)">
            <div class="ap-badge-fill" :style="{ width: `${getProgress(a)}%` }"></div>
          </div>
        </div>
      </div>
      <button v-if="hasMore" class="ap-view-all" @click="showAll = true">查看全部</button>
    </div>

    <!-- 成就详情弹窗 -->
    <Transition name="fade">
      <div v-if="detailAchievement" class="ap-modal-overlay" @click.self="detailAchievement = null">
        <div class="ap-modal" :class="detailAchievement.tier">
          <div class="ap-modal-icon">{{ detailAchievement.icon }}</div>
          <h3 class="ap-modal-name">{{ detailAchievement.name }}</h3>
          <p class="ap-modal-desc">{{ detailAchievement.description }}</p>
          <div class="ap-modal-info">
            <span class="ap-modal-tier">{{ tierLabel(detailAchievement.tier) }}</span>
            <span class="ap-modal-xp">+{{ detailAchievement.reward_xp }} XP</span>
          </div>
          <div class="ap-modal-progress" v-if="!isUnlocked(detailAchievement.key)">
            <div class="ap-modal-bar">
              <div class="ap-modal-fill" :style="{ width: `${getProgress(detailAchievement)}%` }"></div>
            </div>
            <span class="ap-modal-pct">{{ Math.floor(getProgress(detailAchievement)) }}%</span>
          </div>
          <div v-else class="ap-modal-unlocked">✅ 已解锁</div>
          <button class="ap-modal-close" @click="detailAchievement = null">关闭</button>
        </div>
      </div>
    </Transition>

    <!-- 新解锁动画（含粒子特效） -->
    <Transition name="unlock">
      <div v-if="newlyUnlocked" class="ap-unlock-toast" :class="newlyUnlocked.tier" @click="dismissUnlock">
        <div class="ap-unlock-particles">
          <span v-for="i in 12" :key="i" class="ap-particle" :style="particleStyle(i)"></span>
        </div>
        <div class="ap-unlock-glow"></div>
        <div class="ap-unlock-icon">{{ newlyUnlocked.icon }}</div>
        <div class="ap-unlock-info">
          <span class="ap-unlock-title">🎉 成就解锁！</span>
          <span class="ap-unlock-name">{{ newlyUnlocked.name }}</span>
          <span class="ap-unlock-xp">+{{ newlyUnlocked.reward_xp }} XP</span>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAchievements, type Achievement } from '../../composables/useAchievements'

const {
  userStats: stats,
  unlockedAchievements,
  lockedAchievements,
  newlyUnlocked,
  nextLevelXp,
  currentLevelProgress: levelProgress,
  ACHIEVEMENTS,
  fetchUserAchievements,
  getAchievementProgress,
  getLevelTitle,
  clearNewlyUnlocked,
} = useAchievements()

const showAll = ref(false)
const detailAchievement = ref<Achievement | null>(null)

const levelTitle = computed(() => getLevelTitle(stats.value.level))
const unlockedCount = computed(() => unlockedAchievements.value.length)
const totalCount = computed(() => ACHIEVEMENTS.length)

// 默认显示前8个（已解锁优先）
const displayAchievements = computed(() => {
  if (showAll.value) return ACHIEVEMENTS
  const unlocked = unlockedAchievements.value.slice(0, 8)
  const locked = lockedAchievements.value.slice(0, 8 - unlocked.length)
  return [...unlocked, ...locked]
})

const hasMore = computed(() => !showAll.value && ACHIEVEMENTS.length > 8)

function isUnlocked(key: string): boolean {
  return unlockedAchievements.value.some(a => a.key === key)
}

function getProgress(achievement: Achievement): number {
  return getAchievementProgress(achievement)
}

function showDetail(achievement: Achievement) {
  detailAchievement.value = achievement
}

function tierLabel(tier: string): string {
  const labels: Record<string, string> = {
    bronze: '🥉 青铜',
    silver: '🥈 白银',
    gold: '🥇 黄金',
    platinum: '💎 铂金',
  }
  return labels[tier] || tier
}

function dismissUnlock() {
  clearNewlyUnlocked()
}

function particleStyle(i: number): Record<string, string> {
  const angle = (i / 12) * 360
  const dist = 30 + Math.random() * 40
  const size = 3 + Math.random() * 4
  const delay = Math.random() * 0.3
  const colors = ['#8b5cf6', '#f59e0b', '#22c55e', '#ef4444', '#ec4899', '#06b6d4']
  return {
    '--angle': `${angle}deg`,
    '--dist': `${dist}px`,
    '--size': `${size}px`,
    '--delay': `${delay}s`,
    '--color': colors[i % colors.length],
  }
}

onMounted(fetchUserAchievements)
</script>

<style scoped>
.achievement-panel{display:flex;flex-direction:column;gap:12px}

/* 等级卡片 */
.ap-level-card{background:linear-gradient(135deg,rgba(139,92,246,.12),rgba(245,197,94,.06));border:1px solid rgba(139,92,246,.15);border-radius:14px;padding:14px}
.ap-level-info{display:flex;align-items:baseline;gap:8px;margin-bottom:8px}
.ap-level{font-size:22px;font-weight:800;background:linear-gradient(135deg,#8b5cf6,#f59e0b);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.ap-title{font-size:13px;color:rgba(255,255,255,.5);font-weight:500}
.ap-xp-bar{height:6px;background:rgba(255,255,255,.06);border-radius:3px;overflow:hidden}
.ap-xp-fill{height:100%;background:linear-gradient(90deg,#8b5cf6,#f59e0b);border-radius:3px;transition:width .5s ease}
.ap-xp-text{margin-top:4px;text-align:right}
.ap-xp-text span{font-size:10px;color:rgba(255,255,255,.3)}

/* 统计 */
.ap-stats-row{display:flex;gap:8px}
.ap-stat{flex:1;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.04);border-radius:10px;padding:10px;text-align:center}
.ap-stat.streak{background:linear-gradient(135deg,rgba(245,158,11,.08),rgba(239,68,68,.04));border-color:rgba(245,158,11,.1)}
.ap-stat-num{font-size:20px;font-weight:700;color:rgba(255,255,255,.8);display:block}
.ap-fire{font-size:14px;margin-left:2px}
.ap-stat-label{font-size:10px;color:rgba(255,255,255,.3)}

/* 徽章 */
.ap-badges{background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.04);border-radius:14px;padding:14px}
.ap-badges-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
.ap-badges-title{font-size:13px;font-weight:600;color:rgba(255,255,255,.6)}
.ap-badges-count{font-size:11px;color:rgba(139,92,246,.5)}
.ap-badges-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.ap-badge{aspect-ratio:1;border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;transition:all .2s;position:relative;overflow:hidden}
.ap-badge.bronze{background:linear-gradient(135deg,rgba(205,127,50,.15),rgba(205,127,50,.05));border:1px solid rgba(205,127,50,.2)}
.ap-badge.silver{background:linear-gradient(135deg,rgba(192,192,192,.15),rgba(192,192,192,.05));border:1px solid rgba(192,192,192,.2)}
.ap-badge.gold{background:linear-gradient(135deg,rgba(255,215,0,.15),rgba(255,215,0,.05));border:1px solid rgba(255,215,0,.2)}
.ap-badge.platinum{background:linear-gradient(135deg,rgba(229,228,226,.15),rgba(229,228,226,.05));border:1px solid rgba(229,228,226,.2)}
.ap-badge.locked{opacity:.4;filter:grayscale(.8)}
.ap-badge:hover{transform:scale(1.05)}
.ap-badge-icon{font-size:24px}
.ap-badge-progress{position:absolute;bottom:0;left:0;right:0;height:3px;background:rgba(0,0,0,.3)}
.ap-badge-fill{height:100%;background:rgba(139,92,246,.6)}

.ap-view-all{width:100%;margin-top:10px;padding:8px;border-radius:8px;border:1px dashed rgba(139,92,246,.15);background:transparent;color:rgba(139,92,246,.5);font-size:12px;cursor:pointer}
.ap-view-all:hover{background:rgba(139,92,246,.05)}

/* 弹窗 */
.ap-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;z-index:200;backdrop-filter:blur(6px)}
.ap-modal{background:linear-gradient(160deg,#0d0b1e,#12102a);border-radius:20px;padding:24px;width:90%;max-width:300px;text-align:center}
.ap-modal.gold{border:2px solid rgba(255,215,0,.3)}
.ap-modal.platinum{border:2px solid rgba(229,228,226,.3)}
.ap-modal.silver{border:2px solid rgba(192,192,192,.3)}
.ap-modal.bronze{border:2px solid rgba(205,127,50,.3)}
.ap-modal-icon{font-size:48px;margin-bottom:8px}
.ap-modal-name{font-size:18px;font-weight:700;color:white;margin:0 0 6px}
.ap-modal-desc{font-size:13px;color:rgba(255,255,255,.5);margin:0 0 12px}
.ap-modal-info{display:flex;justify-content:center;gap:16px;margin-bottom:12px}
.ap-modal-tier,.ap-modal-xp{font-size:12px;color:rgba(255,255,255,.4)}
.ap-modal-xp{color:rgba(245,158,11,.6)}
.ap-modal-progress{margin-bottom:12px}
.ap-modal-bar{height:6px;background:rgba(255,255,255,.1);border-radius:3px;overflow:hidden}
.ap-modal-fill{height:100%;background:linear-gradient(90deg,#8b5cf6,#f59e0b);border-radius:3px}
.ap-modal-pct{font-size:11px;color:rgba(255,255,255,.3)}
.ap-modal-unlocked{font-size:14px;color:rgba(34,197,94,.6);margin-bottom:12px}
.ap-modal-close{padding:8px 24px;border-radius:10px;border:none;background:rgba(255,255,255,.1);color:rgba(255,255,255,.5);font-size:12px;cursor:pointer}

/* 徽章悬浮特效 */
.ap-badge:not(.locked):hover{transform:scale(1.12);box-shadow:0 4px 16px rgba(139,92,246,.2)}
.ap-badge.gold:not(.locked):hover{box-shadow:0 4px 20px rgba(255,215,0,.3)}
.ap-badge.platinum:not(.locked):hover{box-shadow:0 4px 20px rgba(229,228,226,.3)}
.ap-badge:not(.locked)::after{content:'';position:absolute;inset:0;border-radius:12px;background:linear-gradient(135deg,rgba(255,255,255,.1),transparent);opacity:0;transition:opacity .3s}
.ap-badge:not(.locked):hover::after{opacity:1}

/* 解锁动画（含粒子） */
.ap-unlock-toast{position:fixed;top:80px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:14px;padding:14px 22px;border-radius:20px;background:linear-gradient(135deg,rgba(139,92,246,.92),rgba(99,102,241,.88));box-shadow:0 12px 48px rgba(139,92,246,.5),0 0 60px rgba(139,92,246,.15);z-index:300;cursor:pointer;overflow:visible}
.ap-unlock-toast.gold{background:linear-gradient(135deg,rgba(255,215,0,.9),rgba(245,158,11,.85));box-shadow:0 12px 48px rgba(255,215,0,.4),0 0 60px rgba(255,215,0,.12)}
.ap-unlock-toast.platinum{background:linear-gradient(135deg,rgba(200,200,230,.9),rgba(139,92,246,.85));box-shadow:0 12px 48px rgba(229,228,226,.4),0 0 60px rgba(229,228,226,.12)}
.ap-unlock-toast.silver{background:linear-gradient(135deg,rgba(192,192,210,.9),rgba(148,163,184,.85));box-shadow:0 12px 48px rgba(192,192,192,.4)}
.ap-unlock-glow{position:absolute;inset:-4px;border-radius:24px;background:linear-gradient(135deg,rgba(139,92,246,.3),rgba(245,158,11,.2));filter:blur(12px);animation:unlockGlow 2s ease-in-out infinite alternate;z-index:-1}
@keyframes unlockGlow{0%{opacity:.5;transform:scale(1)}100%{opacity:.8;transform:scale(1.05)}}
.ap-unlock-icon{font-size:36px;animation:unlockBounce .6s ease;z-index:1}
@keyframes unlockBounce{0%{transform:scale(0) rotate(-15deg)}50%{transform:scale(1.3) rotate(5deg)}100%{transform:scale(1) rotate(0)}}
.ap-unlock-info{display:flex;flex-direction:column;gap:2px;z-index:1}
.ap-unlock-title{font-size:11px;color:rgba(255,255,255,.7)}
.ap-unlock-name{font-size:16px;font-weight:700;color:white;text-shadow:0 1px 4px rgba(0,0,0,.2)}
.ap-unlock-xp{font-size:12px;color:rgba(255,255,255,.85);font-weight:600}

/* 粒子特效 */
.ap-unlock-particles{position:absolute;inset:0;pointer-events:none;z-index:2}
.ap-particle{position:absolute;top:50%;left:20%;width:var(--size);height:var(--size);border-radius:50%;background:var(--color);animation:particleBurst .8s ease-out var(--delay) forwards;opacity:0}
@keyframes particleBurst{0%{opacity:1;transform:translate(0,0) scale(1)}60%{opacity:.8}100%{opacity:0;transform:translate(calc(cos(var(--angle)) * var(--dist)),calc(sin(var(--angle)) * var(--dist))) scale(0)}}

.unlock-enter-active{animation:unlockIn .5s cubic-bezier(.21,1.02,.73,1)}
.unlock-leave-active{animation:unlockOut .3s ease}
@keyframes unlockIn{0%{opacity:0;transform:translateX(-50%) translateY(-30px) scale(.7)}50%{transform:translateX(-50%) translateY(5px) scale(1.05)}100%{opacity:1;transform:translateX(-50%) translateY(0) scale(1)}}
@keyframes unlockOut{0%{opacity:1;transform:translateX(-50%) translateY(0)}100%{opacity:0;transform:translateX(-50%) translateY(-30px) scale(.8)}}

.fade-enter-active,.fade-leave-active{transition:opacity .2s}
.fade-enter-from,.fade-leave-to{opacity:0}
</style>
