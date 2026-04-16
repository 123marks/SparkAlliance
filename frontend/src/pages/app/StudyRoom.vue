<template>
  <!-- 星火自习室 — 专注互助空间 -->
  <div class="sr-page">
    <!-- 顶部标题 -->
    <div class="sr-header">
      <h1 class="sr-title">📚 星火自习室</h1>
      <p class="sr-subtitle">专注学习，互相激励</p>
    </div>

    <!-- Tab 导航 -->
    <div class="sr-tabs">
      <button v-for="tab in tabs" :key="tab.key" class="sr-tab"
        :class="{ active: activeTab === tab.key }" @click="switchTab(tab.key)">
        <span class="sr-tab-icon">{{ tab.icon }}</span>
        <span class="sr-tab-label">{{ tab.label }}</span>
      </button>
    </div>

    <!-- ===== 大厅 Tab ===== -->
    <div v-if="activeTab === 'lobby'" class="sr-content">
      <!-- 快速操作 -->
      <div class="sr-quick-actions">
        <button class="sr-action-btn primary" @click="handleQuickStart">
          ⚡ 快速自习 (25分钟)
        </button>
        <button class="sr-action-btn ghost" @click="showCreateModal = true">
          ➕ 创建房间
        </button>
      </div>

      <!-- 房间分类筛选 -->
      <div class="sr-cat-bar">
        <button class="sr-cat-btn" :class="{ active: !filterCategory }"
          @click="filterCategory = null; fetchPublicRooms()">全部</button>
        <button v-for="(cfg, key) in ROOM_CATEGORIES" :key="key" class="sr-cat-btn"
          :class="{ active: filterCategory === key }"
          @click="filterCategory = key as RoomCategory; fetchPublicRooms()">
          {{ cfg.icon }} {{ cfg.label }}
        </button>
      </div>

      <!-- 房间列表 -->
      <div v-if="loading" class="sr-loading"><div class="sr-spinner"></div></div>
      <div v-else-if="filteredRooms.length === 0" class="sr-empty">
        <p>暂无自习室，创建第一个吧 ✨</p>
      </div>
      <div v-else class="sr-room-list">
        <div v-for="room in filteredRooms" :key="room.id" class="sr-room-card" @click="handleJoinRoom(room)">
          <div class="sr-rc-header">
            <span class="sr-rc-cat" :style="{ color: ROOM_CATEGORIES[room.category]?.color }">
              {{ ROOM_CATEGORIES[room.category]?.icon }}
            </span>
            <span class="sr-rc-name">{{ room.name }}</span>
            <span v-if="room.room_type === 'private'" class="sr-rc-lock">🔒</span>
          </div>
          <p v-if="room.description" class="sr-rc-desc">{{ room.description }}</p>
          <div class="sr-rc-footer">
            <span class="sr-rc-members">
              <span class="sr-rc-dot"></span>
              {{ room.current_members }}/{{ room.max_members }}人在线
            </span>
            <span class="sr-rc-sessions">🍅 {{ room.total_sessions }}个番茄</span>
          </div>
          <div class="sr-rc-creator" v-if="room.creator_nickname">
            由 {{ room.creator_nickname }} 创建
          </div>
        </div>
      </div>
    </div>

    <!-- ===== 自习 Tab ===== -->
    <div v-else-if="activeTab === 'focus'" class="sr-content">
      <!-- 未在房间中 -->
      <div v-if="!currentRoom && timerState === 'idle'" class="sr-no-room">
        <p class="sr-empty-hint">选择一个房间或快速开始</p>
        <button class="sr-action-btn primary" @click="handleQuickStart">⚡ 快速自习</button>
      </div>

      <!-- 番茄钟界面 -->
      <div v-else class="sr-focus-panel">
        <!-- 房间信息 -->
        <div v-if="currentRoom" class="sr-focus-room">
          <span class="sr-focus-room-name">{{ currentRoom.name }}</span>
          <button class="sr-leave-btn" @click="handleLeaveRoom">离开房间</button>
        </div>

        <!-- 环形计时器 -->
        <div class="sr-timer-wrap">
          <svg class="sr-timer-ring" viewBox="0 0 200 200">
            <!-- 背景环 -->
            <circle cx="100" cy="100" r="90" fill="none"
              stroke="rgba(255,255,255,0.04)" stroke-width="6" />
            <!-- 进度环 -->
            <circle cx="100" cy="100" r="90" fill="none"
              :stroke="timerState === 'focusing' ? '#4f8ef7' : '#10b981'"
              stroke-width="6" stroke-linecap="round"
              :stroke-dasharray="565.48"
              :stroke-dashoffset="565.48 - (565.48 * timerProgress / 100)"
              transform="rotate(-90 100 100)"
              class="sr-timer-progress" />
          </svg>
          <div class="sr-timer-center">
            <span class="sr-timer-time">{{ formatTimer(timerRemaining) }}</span>
            <span class="sr-timer-label">
              {{ timerState === 'focusing' ? '专注中' : timerState === 'break' ? '休息中' : '准备就绪' }}
            </span>
            <span class="sr-timer-pomodoro">🍅 × {{ pomodoroCount }}</span>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="sr-focus-actions">
          <template v-if="timerState === 'idle'">
            <button class="sr-focus-btn start" @click="handleStartFocus">
              ▶ 开始专注 ({{ currentRoom?.focus_duration || 25 }}分钟)
            </button>
          </template>
          <template v-else-if="timerState === 'focusing'">
            <button class="sr-focus-btn stop" @click="handleInterrupt">
              ⏹ 放弃本次
            </button>
          </template>
          <template v-else-if="timerState === 'break'">
            <button class="sr-focus-btn start" @click="handleStartFocus">
              ▶ 继续下一个番茄
            </button>
            <button class="sr-focus-btn skip" @click="stopTimer(); timerState = 'idle'">
              ⏭ 跳过休息
            </button>
          </template>
        </div>

        <!-- 在线成员 -->
        <div v-if="roomMembers.length > 0" class="sr-members-panel">
          <h4 class="sr-members-title">🧑‍🎓 在线伙伴 ({{ onlineMemberCount }})</h4>
          <div class="sr-members-list">
            <div v-for="m in roomMembers" :key="m.id" class="sr-member-item">
              <div class="sr-member-avatar" :class="m.status">
                {{ m.nickname?.[0] || '?' }}
              </div>
              <div class="sr-member-info">
                <span class="sr-member-name">{{ m.nickname || '用户' }}</span>
                <span class="sr-member-status" :class="m.status">
                  {{ m.status === 'focusing' ? '🔥 专注中' : m.status === 'break' ? '☕ 休息' : '💚 在线' }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== 统计 Tab ===== -->
    <div v-else-if="activeTab === 'stats'" class="sr-content">
      <!-- 今日概览 -->
      <div class="sr-stats-today">
        <h3 class="sr-section-title">📊 今日学习</h3>
        <div class="sr-stats-grid">
          <div class="sr-stat-card">
            <span class="sr-stat-value highlight">{{ todayStats?.total_focus_minutes || 0 }}</span>
            <span class="sr-stat-unit">分钟</span>
            <span class="sr-stat-label">总专注</span>
          </div>
          <div class="sr-stat-card">
            <span class="sr-stat-value">{{ todayStats?.completed_sessions || 0 }}</span>
            <span class="sr-stat-unit">个</span>
            <span class="sr-stat-label">番茄钟</span>
          </div>
          <div class="sr-stat-card">
            <span class="sr-stat-value">{{ todayStats?.longest_streak || 0 }}</span>
            <span class="sr-stat-unit">分钟</span>
            <span class="sr-stat-label">最长连续</span>
          </div>
          <div class="sr-stat-card">
            <span class="sr-stat-value streak">{{ studyStreak }}</span>
            <span class="sr-stat-unit">天</span>
            <span class="sr-stat-label">连续打卡</span>
          </div>
        </div>
      </div>

      <!-- 本周柱形图 -->
      <div class="sr-chart-section">
        <h3 class="sr-section-title">📅 本周趋势</h3>
        <div class="sr-bar-chart">
          <div v-for="(day, i) in weekChartData" :key="i" class="sr-bar-item">
            <div class="sr-bar-track">
              <div class="sr-bar-fill" :style="{ height: day.percent + '%' }"></div>
            </div>
            <span class="sr-bar-value">{{ day.minutes }}m</span>
            <span class="sr-bar-label">{{ day.label }}</span>
          </div>
        </div>
      </div>

      <!-- 周排行榜 -->
      <div class="sr-ranking-section">
        <h3 class="sr-section-title">🏆 本周排行</h3>
        <div v-if="weeklyRanking.length === 0" class="sr-empty">暂无排行数据</div>
        <div v-for="item in weeklyRanking" :key="item.user_id" class="sr-rank-item">
          <span class="sr-rank-num" :class="{ top: item.rank <= 3 }">{{ item.rank }}</span>
          <div class="sr-rank-avatar">{{ item.nickname[0] }}</div>
          <div class="sr-rank-info">
            <span class="sr-rank-name">{{ item.nickname }}</span>
            <span class="sr-rank-detail">{{ item.total_minutes }}分钟 · {{ item.total_sessions }}🍅</span>
          </div>
          <span class="sr-rank-time">{{ formatMinutes(item.total_minutes) }}</span>
        </div>
      </div>
    </div>

    <!-- ===== 我的 Tab ===== -->
    <div v-else-if="activeTab === 'mine'" class="sr-content">
      <!-- 个人数据卡片 -->
      <div class="sr-my-card">
        <div class="sr-my-header">
          <span class="sr-my-avatar">{{ userName[0] }}</span>
          <div class="sr-my-info">
            <span class="sr-my-name">{{ userName }}</span>
            <span class="sr-my-label">📅 连续学习 <strong>{{ studyStreak }}天</strong></span>
          </div>
        </div>
        <div class="sr-my-stats">
          <div class="sr-my-stat">
            <span class="sr-my-stat-val">{{ totalPomodorosAll }}</span>
            <span class="sr-my-stat-lab">总番茄</span>
          </div>
          <div class="sr-my-stat">
            <span class="sr-my-stat-val">{{ formatMinutes(totalMinutesAll) }}</span>
            <span class="sr-my-stat-lab">总时长</span>
          </div>
          <div class="sr-my-stat">
            <span class="sr-my-stat-val">{{ studyStreak }}</span>
            <span class="sr-my-stat-lab">连续天数</span>
          </div>
        </div>
      </div>

      <!-- 历史记录 -->
      <div class="sr-history-section">
        <h3 class="sr-section-title">📝 学习记录</h3>
        <div v-if="myHistory.length === 0" class="sr-empty">暂无学习记录</div>
        <div v-for="s in myHistory" :key="s.id" class="sr-history-item">
          <div class="sr-hi-left">
            <span class="sr-hi-icon" :class="s.status">
              {{ s.status === 'completed' ? '✅' : '❌' }}
            </span>
            <div class="sr-hi-info">
              <span class="sr-hi-dur">{{ s.actual_duration }}分钟</span>
              <span class="sr-hi-time">{{ formatTimeAgo(s.started_at) }}</span>
            </div>
          </div>
          <span class="sr-hi-status" :class="s.status">
            {{ s.status === 'completed' ? '已完成' : '已中断' }}
          </span>
        </div>
      </div>
    </div>

    <!-- ===== 创建房间弹窗 ===== -->
    <Teleport to="body">
      <div v-if="showCreateModal" class="sr-modal-overlay" @click.self="showCreateModal = false">
        <div class="sr-modal">
          <h3 class="sr-modal-title">➕ 创建自习室</h3>

          <div class="sr-form-group">
            <label>房间名称</label>
            <input v-model="createForm.name" class="sr-input" placeholder="给自习室起个名字" maxlength="50" />
          </div>

          <div class="sr-form-group">
            <label>房间描述</label>
            <input v-model="createForm.description" class="sr-input" placeholder="描述一下学习内容（可选）" />
          </div>

          <div class="sr-form-group">
            <label>分类</label>
            <div class="sr-cat-select">
              <button v-for="(cfg, key) in ROOM_CATEGORIES" :key="key" class="sr-cat-opt"
                :class="{ active: createForm.category === key }"
                @click="createForm.category = key as RoomCategory">
                {{ cfg.icon }} {{ cfg.label }}
              </button>
            </div>
          </div>

          <div class="sr-form-row">
            <div class="sr-form-group half">
              <label>类型</label>
              <select v-model="createForm.roomType" class="sr-select">
                <option value="public">🌐 公开</option>
                <option value="private">🔒 私密</option>
              </select>
            </div>
            <div class="sr-form-group half">
              <label>人数上限</label>
              <input v-model.number="createForm.maxMembers" type="number" class="sr-input" min="1" max="100" />
            </div>
          </div>

          <div v-if="createForm.roomType === 'private'" class="sr-form-group">
            <label>房间密码</label>
            <input v-model="createForm.password" class="sr-input" placeholder="设置进入密码" />
          </div>

          <div class="sr-form-row">
            <div class="sr-form-group half">
              <label>专注时长</label>
              <select v-model.number="createForm.focusDuration" class="sr-select">
                <option :value="15">15分钟</option>
                <option :value="25">25分钟</option>
                <option :value="30">30分钟</option>
                <option :value="45">45分钟</option>
                <option :value="60">60分钟</option>
              </select>
            </div>
            <div class="sr-form-group half">
              <label>短休息</label>
              <select v-model.number="createForm.shortBreak" class="sr-select">
                <option :value="3">3分钟</option>
                <option :value="5">5分钟</option>
                <option :value="10">10分钟</option>
              </select>
            </div>
          </div>

          <div class="sr-form-row">
            <div class="sr-form-group half">
              <label>长休息</label>
              <select v-model.number="createForm.longBreak" class="sr-select">
                <option :value="10">10分钟</option>
                <option :value="15">15分钟</option>
                <option :value="20">20分钟</option>
                <option :value="30">30分钟</option>
              </select>
            </div>
            <div class="sr-form-group half">
              <label>长休息间隔</label>
              <select v-model.number="createForm.longBreakInterval" class="sr-select">
                <option :value="2">每2个番茄</option>
                <option :value="3">每3个番茄</option>
                <option :value="4">每4个番茄</option>
                <option :value="6">每6个番茄</option>
              </select>
            </div>
          </div>

          <div class="sr-modal-actions">
            <button class="sr-btn cancel" @click="showCreateModal = false">取消</button>
            <button class="sr-btn primary" :disabled="!createForm.name.trim()" @click="handleCreateRoom">
              🚀 创建并加入
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Toast -->
    <div v-if="toastMsg" class="sr-toast">{{ toastMsg }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useAuth } from '../../composables/useAuth'
import {
  useStudyRoom,
  ROOM_CATEGORIES,
  type RoomCategory,
  type StudyRoom as StudyRoomType,
} from '../../composables/useStudyRoom'

const { user } = useAuth()

const {
  publicRooms,
  currentRoom,
  roomMembers,
  currentSession,
  timerRemaining,
  timerState,
  pomodoroCount,
  todayStats,
  weeklyRanking,
  myHistory,
  loading,
  onlineMemberCount,
  timerProgress,

  createRoom,
  fetchPublicRooms,
  joinRoom,
  leaveRoom,
  startFocusSession,
  interruptFocusSession,
  quickStart,
  startBreakTimer,
  stopTimer,
  formatTimer,

  fetchTodayStats,
  fetchRecentStats,
  fetchWeeklyRanking,
  fetchMyHistory,
  fetchStudyStreak,
  formatTimeAgo,
} = useStudyRoom()

// ====== Tab ======
const activeTab = ref<'lobby' | 'focus' | 'stats' | 'mine'>('lobby')
const tabs = [
  { key: 'lobby' as const, icon: '🏠', label: '大厅' },
  { key: 'focus' as const, icon: '⏱', label: '自习' },
  { key: 'stats' as const, icon: '📊', label: '统计' },
  { key: 'mine' as const, icon: '👤', label: '我的' },
]

// ====== 状态 ======
const filterCategory = ref<RoomCategory | null>(null)
const showCreateModal = ref(false)
const toastMsg = ref('')
const studyStreak = ref(0)
const recentStats = ref<Awaited<ReturnType<typeof fetchRecentStats>>>([])
const totalPomodorosAll = ref(0)
const totalMinutesAll = ref(0)

// 用户名
const userName = computed(() => {
  if (user.value?.user_metadata?.nickname) return user.value.user_metadata.nickname
  if (user.value?.email) return user.value.email.split('@')[0]
  return '同学'
})

// 创建房间表单
const createForm = ref({
  name: '',
  description: '',
  category: 'general' as RoomCategory,
  roomType: 'public' as 'public' | 'private',
  maxMembers: 20,
  password: '',
  focusDuration: 25,
  shortBreak: 5,
  longBreak: 15,
  longBreakInterval: 4,
})

// 筛选后的房间
const filteredRooms = computed(() => {
  if (!filterCategory.value) return publicRooms.value
  return publicRooms.value.filter(r => r.category === filterCategory.value)
})

// 本周趋势柱形图数据
const weekChartData = computed(() => {
  const dayLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  const today = new Date()
  const dayOfWeek = today.getDay() || 7 // 周日=7

  const result = dayLabels.map((label, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - (dayOfWeek - 1 - i))
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const dateStr = `${y}-${m}-${day}`
    const stat = recentStats.value.find(s => s.stat_date === dateStr)
    return {
      label,
      minutes: stat?.total_focus_minutes || 0,
      percent: 0,
    }
  })

  const maxMin = Math.max(...result.map(r => r.minutes), 1)
  result.forEach(r => { r.percent = (r.minutes / maxMin) * 100 })
  return result
})

// ====== Tab切换 ======
function switchTab(key: typeof activeTab.value) {
  activeTab.value = key
  if (key === 'lobby') fetchPublicRooms()
  if (key === 'stats') loadStatsData()
  if (key === 'mine') loadMineData()
}

// ====== 房间操作 ======
async function handleJoinRoom(room: StudyRoomType) {
  if (room.room_type === 'private') {
    const pwd = prompt('请输入房间密码：')
    if (!pwd) return
    const ok = await joinRoom(room.id, pwd)
    if (!ok) { showToast('密码错误或房间已满'); return }
  } else {
    const ok = await joinRoom(room.id)
    if (!ok) { showToast('加入失败'); return }
  }
  activeTab.value = 'focus'
  showToast('已加入 ' + room.name)
}

async function handleLeaveRoom() {
  if (!currentRoom.value) return
  await leaveRoom(currentRoom.value.id)
  activeTab.value = 'lobby'
  showToast('已离开房间')
}

async function handleCreateRoom() {
  const f = createForm.value
  if (!f.name.trim()) return

  const roomId = await createRoom(
    f.name.trim(), f.roomType, f.maxMembers,
    f.category, f.description, f.password || undefined,
    f.focusDuration, f.shortBreak, f.longBreak, f.longBreakInterval,
  )
  if (roomId) {
    showCreateModal.value = false
    activeTab.value = 'focus'
    showToast('房间已创建 🎉')
    // 重置表单
    createForm.value = { name: '', description: '', category: 'general', roomType: 'public', maxMembers: 20, password: '', focusDuration: 25, shortBreak: 5, longBreak: 15, longBreakInterval: 4 }
  } else {
    showToast('创建失败')
  }
}

// ====== 番茄钟操作 ======
async function handleQuickStart() {
  const sid = await quickStart(25)
  if (sid) {
    activeTab.value = 'focus'
    showToast('开始专注 🍅')
  }
}

async function handleStartFocus() {
  const duration = currentRoom.value?.focus_duration || 25
  const roomId = currentRoom.value?.id || null
  await startFocusSession(roomId, duration)
}

async function handleInterrupt() {
  if (!currentSession.value) return
  const ok = confirm('确定放弃本次专注吗？')
  if (!ok) return
  await interruptFocusSession(currentSession.value.id, '主动放弃')
  showToast('已中断本次专注')
}

// ====== 数据加载 ======
async function loadStatsData() {
  await fetchTodayStats()
  recentStats.value = await fetchRecentStats(7)
  await fetchWeeklyRanking()
  studyStreak.value = await fetchStudyStreak()
}

async function loadMineData() {
  await fetchMyHistory(30)
  studyStreak.value = await fetchStudyStreak()
  // 计算总量
  const allStats = await fetchRecentStats(365)
  totalMinutesAll.value = allStats.reduce((sum, s) => sum + s.total_focus_minutes, 0)
  totalPomodorosAll.value = allStats.reduce((sum, s) => sum + s.completed_sessions, 0)
}

// ====== 工具 ======
function showToast(msg: string) {
  toastMsg.value = msg
  setTimeout(() => { toastMsg.value = '' }, 2500)
}

function formatMinutes(m: number): string {
  if (m < 60) return `${m}分钟`
  const h = Math.floor(m / 60)
  const remainder = m % 60
  return remainder > 0 ? `${h}h${remainder}m` : `${h}小时`
}

// ====== 生命周期 ======

// 监听番茄完成 → 自动进入休息
watch(pomodoroCount, (newCount) => {
  if (newCount > 0 && timerState.value === 'idle') {
    // 判断长休息or短休息
    const room = currentRoom.value
    const longInterval = room?.long_break_interval || 4
    const isLong = newCount % longInterval === 0
    const breakMin = isLong ? (room?.long_break || 15) : (room?.short_break || 5)
    startBreakTimer(breakMin)
    showToast(isLong ? '🎉 长休息时间！' : '☕ 短休息一下')
  }
})

onMounted(async () => {
  await fetchPublicRooms()
  await fetchTodayStats()
})

onBeforeUnmount(() => {
  if (currentSession.value && currentSession.value.status === 'focusing') {
    interruptFocusSession(currentSession.value.id, '离开页面')
  }
  stopTimer()
})
</script>

<style scoped>
/* 页面容器 */
.sr-page{max-width:600px;margin:0 auto;padding:20px 16px 80px;min-height:100vh}
.sr-header{text-align:center;margin-bottom:20px}
.sr-title{font-size:22px;font-weight:800;color:white;margin:0}
.sr-subtitle{font-size:12px;color:rgba(255,255,255,.3);margin:4px 0 0}

/* Tab导航 */
.sr-tabs{display:flex;gap:4px;padding:4px;background:rgba(255,255,255,.02);border-radius:14px;border:1px solid rgba(255,255,255,.05);margin-bottom:20px}
.sr-tab{flex:1;padding:10px 4px;border-radius:10px;border:none;background:none;cursor:pointer;text-align:center;transition:all .2s}
.sr-tab.active{background:rgba(79,142,247,.1);box-shadow:0 2px 8px rgba(79,142,247,.15)}
.sr-tab-icon{display:block;font-size:16px;margin-bottom:2px}
.sr-tab-label{display:block;font-size:10px;color:rgba(255,255,255,.3);font-weight:500}
.sr-tab.active .sr-tab-label{color:rgba(79,142,247,.8)}

/* 通用 */
.sr-content{animation:fadeIn .2s ease}
@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
.sr-empty{text-align:center;padding:40px 0;font-size:13px;color:rgba(255,255,255,.2)}
.sr-loading{text-align:center;padding:40px 0}
.sr-spinner{width:28px;height:28px;border:2px solid rgba(79,142,247,.2);border-top-color:#4f8ef7;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto}
@keyframes spin{to{transform:rotate(360deg)}}
.sr-section-title{font-size:14px;font-weight:600;color:rgba(255,255,255,.6);margin:0 0 12px}

/* 快速操作 */
.sr-quick-actions{display:flex;gap:8px;margin-bottom:16px}
.sr-action-btn{flex:1;padding:14px;border-radius:14px;border:none;font-size:13px;font-weight:600;cursor:pointer;transition:all .2s}
.sr-action-btn.primary{background:linear-gradient(135deg,#4f8ef7,#6366f1);color:white}
.sr-action-btn.primary:hover{filter:brightness(1.1)}
.sr-action-btn.ghost{background:rgba(255,255,255,.03);color:rgba(255,255,255,.4);border:1px solid rgba(255,255,255,.06)}

/* 分类筛选 */
.sr-cat-bar{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:14px}
.sr-cat-btn{padding:5px 10px;border-radius:8px;border:1px solid rgba(255,255,255,.04);background:rgba(255,255,255,.015);color:rgba(255,255,255,.3);font-size:11px;cursor:pointer;transition:all .2s}
.sr-cat-btn.active{background:rgba(79,142,247,.08);border-color:rgba(79,142,247,.15);color:rgba(79,142,247,.7)}

/* 房间列表 */
.sr-room-list{display:flex;flex-direction:column;gap:8px}
.sr-room-card{padding:14px 16px;border-radius:14px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.05);cursor:pointer;transition:all .2s}
.sr-room-card:hover{background:rgba(79,142,247,.03);border-color:rgba(79,142,247,.1);transform:translateY(-1px)}
.sr-rc-header{display:flex;align-items:center;gap:6px;margin-bottom:4px}
.sr-rc-cat{font-size:16px}
.sr-rc-name{font-size:14px;font-weight:600;color:rgba(255,255,255,.7);flex:1}
.sr-rc-lock{font-size:12px}
.sr-rc-desc{font-size:11px;color:rgba(255,255,255,.25);margin:0 0 6px;line-height:1.4}
.sr-rc-footer{display:flex;justify-content:space-between;align-items:center}
.sr-rc-members{font-size:11px;color:rgba(255,255,255,.3);display:flex;align-items:center;gap:4px}
.sr-rc-dot{width:6px;height:6px;border-radius:50%;background:#10b981;box-shadow:0 0 6px rgba(16,185,129,.5)}
.sr-rc-sessions{font-size:10px;color:rgba(249,115,22,.5)}
.sr-rc-creator{font-size:10px;color:rgba(255,255,255,.15);margin-top:4px}

/* 番茄钟 */
.sr-focus-panel{display:flex;flex-direction:column;align-items:center}
.sr-focus-room{display:flex;align-items:center;justify-content:space-between;width:100%;padding:10px 14px;border-radius:12px;background:rgba(79,142,247,.04);border:1px solid rgba(79,142,247,.08);margin-bottom:20px}
.sr-focus-room-name{font-size:13px;font-weight:600;color:rgba(79,142,247,.7)}
.sr-leave-btn{padding:4px 10px;border-radius:6px;border:1px solid rgba(239,68,68,.1);background:rgba(239,68,68,.04);color:rgba(239,68,68,.5);font-size:10px;cursor:pointer}
.sr-no-room{text-align:center;padding:60px 0}
.sr-empty-hint{font-size:13px;color:rgba(255,255,255,.2);margin-bottom:16px}

/* 环形计时器 */
.sr-timer-wrap{position:relative;width:220px;height:220px;margin:10px 0 20px}
.sr-timer-ring{width:100%;height:100%}
.sr-timer-progress{transition:stroke-dashoffset .5s ease}
.sr-timer-center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
.sr-timer-time{font-size:42px;font-weight:800;color:white;font-variant-numeric:tabular-nums;letter-spacing:2px}
.sr-timer-label{font-size:12px;color:rgba(255,255,255,.3);margin-top:4px}
.sr-timer-pomodoro{font-size:13px;color:rgba(249,115,22,.6);margin-top:6px}

.sr-focus-actions{display:flex;gap:8px;width:100%;max-width:320px;margin-bottom:24px}
.sr-focus-btn{flex:1;padding:14px;border-radius:12px;border:none;font-size:13px;font-weight:600;cursor:pointer;transition:all .2s}
.sr-focus-btn.start{background:linear-gradient(135deg,#4f8ef7,#6366f1);color:white}
.sr-focus-btn.stop{background:rgba(239,68,68,.08);color:rgba(239,68,68,.7);border:1px solid rgba(239,68,68,.1)}
.sr-focus-btn.skip{background:rgba(255,255,255,.03);color:rgba(255,255,255,.3)}

/* 成员列表 */
.sr-members-panel{width:100%;margin-top:8px}
.sr-members-title{font-size:13px;font-weight:600;color:rgba(255,255,255,.4);margin:0 0 10px}
.sr-members-list{display:flex;flex-wrap:wrap;gap:6px}
.sr-member-item{display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:10px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.04);min-width:120px}
.sr-member-avatar{width:28px;height:28px;border-radius:8px;background:rgba(79,142,247,.15);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:rgba(79,142,247,.7)}
.sr-member-avatar.focusing{background:rgba(249,115,22,.15);color:rgba(249,115,22,.7);box-shadow:0 0 8px rgba(249,115,22,.2)}
.sr-member-info{display:flex;flex-direction:column}
.sr-member-name{font-size:11px;color:rgba(255,255,255,.5)}
.sr-member-status{font-size:9px;color:rgba(255,255,255,.2)}
.sr-member-status.focusing{color:rgba(249,115,22,.6)}

/* 统计 */
.sr-stats-today{margin-bottom:20px}
.sr-stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
.sr-stat-card{text-align:center;padding:14px 6px;border-radius:12px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.04)}
.sr-stat-value{display:block;font-size:22px;font-weight:800;color:rgba(255,255,255,.7)}
.sr-stat-value.highlight{color:#4f8ef7}
.sr-stat-value.streak{color:#f97316}
.sr-stat-unit{font-size:10px;color:rgba(255,255,255,.2);margin-left:1px}
.sr-stat-label{display:block;font-size:10px;color:rgba(255,255,255,.25);margin-top:4px}

/* 柱形图 */
.sr-bar-chart{display:flex;gap:6px;align-items:flex-end;height:120px;padding:10px 0}
.sr-bar-item{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px}
.sr-bar-track{width:100%;height:80px;background:rgba(255,255,255,.02);border-radius:6px;position:relative;overflow:hidden;display:flex;align-items:flex-end}
.sr-bar-fill{width:100%;background:linear-gradient(180deg,#4f8ef7,rgba(79,142,247,.3));border-radius:6px;transition:height .5s ease;min-height:2px}
.sr-bar-value{font-size:9px;color:rgba(255,255,255,.3)}
.sr-bar-label{font-size:10px;color:rgba(255,255,255,.25)}

/* 排行榜 */
.sr-ranking-section{margin-top:20px}
.sr-rank-item{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;background:rgba(255,255,255,.015);border:1px solid rgba(255,255,255,.03);margin-bottom:4px}
.sr-rank-num{width:22px;height:22px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;background:rgba(255,255,255,.04);color:rgba(255,255,255,.3);flex-shrink:0}
.sr-rank-num.top{background:rgba(249,115,22,.12);color:#f97316}
.sr-rank-avatar{width:30px;height:30px;border-radius:8px;background:linear-gradient(135deg,rgba(79,142,247,.2),rgba(139,92,246,.15));display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:13px;flex-shrink:0}
.sr-rank-info{flex:1;min-width:0}
.sr-rank-name{display:block;font-size:13px;font-weight:500;color:rgba(255,255,255,.6)}
.sr-rank-detail{display:block;font-size:10px;color:rgba(255,255,255,.2);margin-top:1px}
.sr-rank-time{font-size:12px;font-weight:700;color:rgba(79,142,247,.6);flex-shrink:0}

/* 我的 */
.sr-my-card{padding:20px;border-radius:16px;background:linear-gradient(135deg,rgba(79,142,247,.06),rgba(139,92,246,.04));border:1px solid rgba(79,142,247,.1);margin-bottom:20px}
.sr-my-header{display:flex;align-items:center;gap:12px;margin-bottom:16px}
.sr-my-avatar{width:46px;height:46px;border-radius:14px;background:linear-gradient(135deg,rgba(79,142,247,.3),rgba(99,102,241,.2));display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800;color:white;flex-shrink:0}
.sr-my-info{flex:1}
.sr-my-name{display:block;font-size:16px;font-weight:700;color:white}
.sr-my-label{display:block;font-size:11px;color:rgba(255,255,255,.3);margin-top:2px}
.sr-my-label strong{color:rgba(249,115,22,.7)}
.sr-my-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.sr-my-stat{text-align:center;padding:10px;border-radius:10px;background:rgba(255,255,255,.03)}
.sr-my-stat-val{display:block;font-size:18px;font-weight:800;color:rgba(79,142,247,.8)}
.sr-my-stat-lab{display:block;font-size:10px;color:rgba(255,255,255,.25);margin-top:2px}

/* 历史记录 */
.sr-history-section{margin-top:8px}
.sr-history-item{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-radius:10px;background:rgba(255,255,255,.015);border:1px solid rgba(255,255,255,.03);margin-bottom:4px}
.sr-hi-left{display:flex;align-items:center;gap:8px}
.sr-hi-icon{font-size:14px}
.sr-hi-info{display:flex;flex-direction:column}
.sr-hi-dur{font-size:13px;font-weight:500;color:rgba(255,255,255,.6)}
.sr-hi-time{font-size:10px;color:rgba(255,255,255,.2);margin-top:1px}
.sr-hi-status{font-size:11px;font-weight:500;padding:2px 8px;border-radius:6px}
.sr-hi-status.completed{background:rgba(16,185,129,.08);color:rgba(16,185,129,.6)}
.sr-hi-status.interrupted{background:rgba(239,68,68,.06);color:rgba(239,68,68,.5)}

/* 弹窗 */
.sr-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;z-index:500;backdrop-filter:blur(4px)}
.sr-modal{background:rgba(22,18,50,.97);border:1px solid rgba(79,142,247,.12);border-radius:20px;padding:24px;max-width:420px;width:92vw;box-shadow:0 20px 60px rgba(0,0,0,.5)}
.sr-modal-title{font-size:16px;font-weight:700;color:rgba(255,255,255,.7);margin:0 0 16px}
.sr-form-group{margin-bottom:12px}
.sr-form-group label{display:block;font-size:11px;font-weight:600;color:rgba(255,255,255,.3);margin-bottom:4px}
.sr-form-group.half{flex:1}
.sr-form-row{display:flex;gap:10px}
.sr-input{width:100%;padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.03);color:white;font-size:13px;outline:none;box-sizing:border-box}
.sr-input::placeholder{color:rgba(255,255,255,.15)}
.sr-select{width:100%;padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.03);color:white;font-size:13px;outline:none;appearance:none}
.sr-cat-select{display:flex;gap:4px;flex-wrap:wrap}
.sr-cat-opt{padding:5px 10px;border-radius:8px;border:1px solid rgba(255,255,255,.04);background:rgba(255,255,255,.015);color:rgba(255,255,255,.3);font-size:11px;cursor:pointer;transition:all .2s}
.sr-cat-opt.active{background:rgba(79,142,247,.08);border-color:rgba(79,142,247,.15);color:rgba(79,142,247,.7)}
.sr-modal-actions{display:flex;gap:8px;margin-top:16px}
.sr-btn{flex:1;padding:12px;border-radius:12px;border:none;font-size:13px;font-weight:600;cursor:pointer;transition:all .2s}
.sr-btn.cancel{background:rgba(255,255,255,.03);color:rgba(255,255,255,.3)}
.sr-btn.primary{background:linear-gradient(135deg,#4f8ef7,#6366f1);color:white}
.sr-btn:disabled{opacity:.3;cursor:default}

/* Toast */
.sr-toast{position:fixed;bottom:90px;left:50%;transform:translateX(-50%);padding:10px 20px;border-radius:14px;background:rgba(79,142,247,.9);color:white;font-size:13px;font-weight:500;white-space:nowrap;z-index:300;box-shadow:0 4px 20px rgba(79,142,247,.3);animation:fadeIn .2s ease}

/* 柱形图部分 */
.sr-chart-section{margin-bottom:20px}
</style>
