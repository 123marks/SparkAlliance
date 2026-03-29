<template>
  <div class="planner-page">
    <!-- 顶栏 -->
    <div class="pl-topbar">
      <div class="pl-greeting">
        <h1 class="pl-title">星火规划</h1>
        <p class="pl-hello">{{ greeting }}</p>
      </div>
      <button class="pl-create-btn" @click="showCreate = true">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        新目标
      </button>
    </div>

    <!-- Tab 切换 -->
    <div class="pl-tabs">
      <button v-for="tab in tabs" :key="tab.key" class="pl-tab" :class="{ active: activeTab === tab.key }" @click="switchTab(tab.key)">
        {{ tab.icon }} {{ tab.label }}
        <span v-if="tab.key === 'today' && todayTasks.length" class="pl-badge">{{ todayTasks.length }}</span>
      </button>
    </div>

    <!-- ===== 今日任务 Tab ===== -->
    <div v-if="activeTab === 'today'" class="pl-content">
      <!-- 统计卡片 -->
      <StatsCard
        ref="statsCardRef"
        @add-task="showQuickAdd"
        @view-achievements="activeTab = 'achievements'"
      />
      <!-- 快速添加栏 -->
      <div class="pl-quick-add">
        <input v-model="quickTaskTitle" class="pl-qa-input" placeholder="＋ 快速添加一个今日任务..." maxlength="100" @keydown.enter="addQuickTask" />
        <button v-if="quickTaskTitle.trim()" class="pl-qa-btn" @click="addQuickTask">添加</button>
      </div>
      <TaskList
        :tasks="todayTasks"
        @complete="handleCompleteTask"
        @delete="handleDeleteTask"
        @edit="handleEditTask"
        @push="handlePushToSchedule"
        @record="handleRecordTask"
      />
    </div>

    <!-- ===== 我的目标 Tab ===== -->
    <div v-else-if="activeTab === 'goals'" class="pl-content">
      <PlannerEmpty
        v-if="!loading && goals.length === 0"
        @create="showCreate = true"
        @template="handleTemplate"
      />
      <div v-else class="pl-goals-grid">
        <GoalCard
          v-for="g in activeGoals"
          :key="g.id"
          :goal="g"
          @complete-task="handleCompleteTask"
          @delete-task="handleDeleteTask"
          @edit-task="handleEditTask"
          @add-task="handleAddTask"
          @archive="handleArchive"
          @delete-goal="handleDeleteGoal"
          @push-to-schedule="handlePushToSchedule"
          @record-task="handleRecordTask"
        />
      </div>
    </div>

    <!-- ===== 历史 Tab ===== -->
    <div v-else-if="activeTab === 'history'" class="pl-content">
      <HistoryPanel :goals="historyGoals" @review="handleReview" @share="handleShare" />
    </div>

    <!-- ===== 习惯 Tab ===== -->
    <div v-else-if="activeTab === 'habits'" class="pl-content">
      <HabitTracker />
    </div>

    <!-- ===== 成就 Tab ===== -->
    <div v-else-if="activeTab === 'achievements'" class="pl-content">
      <AchievementPanel />
    </div>

    <!-- 免责声明 -->
    <p class="pl-disclaimer">📌 AI 生成的计划仅供参考</p>

    <!-- 加载遮罩 -->
    <div v-if="loading" class="pl-loading">
      <div class="pl-spinner"></div>
    </div>

    <!-- 创建目标弹窗 -->
    <GoalCreateSheet :visible="showCreate" @close="showCreate = false" @created="handleGoalCreated" />

    <!-- 添加任务弹窗 -->
    <Transition name="fade">
      <div v-if="addTaskGoalId" class="pl-modal-overlay" @click.self="addTaskGoalId = null">
        <div class="pl-modal">
          <h3>添加任务</h3>
          <input v-model="newTaskTitle" class="pl-modal-input" placeholder="任务名称" maxlength="100" />
          <input v-model="newTaskDate" type="date" class="pl-modal-input" :min="getLocalDate()" />
          <div class="pl-modal-actions">
            <button class="pl-modal-cancel" @click="addTaskGoalId = null">取消</button>
            <button class="pl-modal-confirm" :disabled="!newTaskTitle.trim()" @click="submitNewTask">创建</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 编辑任务弹窗 -->
    <Transition name="fade">
      <div v-if="editingTask" class="pl-modal-overlay" @click.self="editingTask = null">
        <div class="pl-modal">
          <h3>编辑任务</h3>
          <input v-model="editTitle" class="pl-modal-input" placeholder="任务名称" maxlength="100" />
          <input v-model="editDate" type="date" class="pl-modal-input" :min="getLocalDate()" />
          <div class="pl-modal-actions">
            <button class="pl-modal-cancel" @click="editingTask = null">取消</button>
            <button class="pl-modal-confirm" :disabled="!editTitle.trim()" @click="submitEditTask">保存</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 评语弹窗 -->
    <Transition name="fade">
      <div v-if="reviewGoalId" class="pl-modal-overlay" @click.self="reviewGoalId = null">
        <div class="pl-modal">
          <h3>📝 目标复盘</h3>
          <div class="pl-rating">
            <button v-for="s in 5" :key="s" class="pl-star" :class="{ active: reviewRating >= s }" @click="reviewRating = s">⭐</button>
          </div>
          <textarea v-model="reviewContent" class="pl-modal-textarea" rows="3" placeholder="这段时间的收获和感悟..."></textarea>
          <textarea v-model="reviewImprovements" class="pl-modal-textarea" rows="2" placeholder="可以改进的地方（选填）"></textarea>
          <div class="pl-modal-actions">
            <button class="pl-modal-cancel" @click="reviewGoalId = null">取消</button>
            <button class="pl-modal-confirm" :disabled="!reviewContent.trim()" @click="submitReview">提交评语</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 任务记录上传弹窗 -->
    <Transition name="fade">
      <div v-if="recordingTask" class="pl-modal-overlay" @click.self="recordingTask = null">
        <div class="pl-modal">
          <h3>📸 提交任务记录</h3>
          <p class="pl-modal-desc">为「{{ recordingTask.title }}」提交完成证据</p>
          <textarea v-model="recordNote" class="pl-modal-textarea" rows="2" placeholder="记录一下你的进展或心得..."></textarea>
          <!-- 文件上传 -->
          <label class="pl-upload-area">
            <input type="file" accept="image/*,video/*" @change="handleFileSelect" style="display:none" />
            <span v-if="!recordFile">📎 点击上传图片/视频</span>
            <span v-else class="pl-file-name">✅ {{ recordFile.name }}</span>
          </label>
          <div class="pl-modal-actions">
            <button class="pl-modal-cancel" @click="recordingTask = null">取消</button>
            <button class="pl-modal-confirm" :disabled="(!recordNote.trim() && !recordFile) || recordUploading" @click="submitRecord">
              {{ recordUploading ? '上传中...' : '🚀 提交并AI评审' }}
            </button>
          </div>
          <!-- AI 评审结果 -->
          <div v-if="recordAiFeedback" class="pl-ai-result">
            <div class="pl-ai-score">{{ recordAiScore }}分</div>
            <p class="pl-ai-text">{{ recordAiFeedback }}</p>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Toast 提示 -->
    <Transition name="fade">
      <div v-if="toastMsg" class="pl-toast">{{ toastMsg }}</div>
    </Transition>

    <!-- 里程碑庆祝动画 -->
    <MilestoneToast
      :show="showMilestone"
      :progress="milestoneProgress"
      :goal-title="milestoneGoalTitle"
      @close="showMilestone = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { usePlanner } from '../../composables/usePlanner'
import { useAchievements } from '../../composables/useAchievements'
import type { PlannerTask } from '../../composables/usePlanner'
import PlannerEmpty from '../../components/planner/PlannerEmpty.vue'
import GoalCard from '../../components/planner/GoalCard.vue'
import TaskList from '../../components/planner/TaskList.vue'
import HabitTracker from '../../components/planner/HabitTracker.vue'
import GoalCreateSheet from '../../components/planner/GoalCreateSheet.vue'
import HistoryPanel from '../../components/planner/HistoryPanel.vue'
import StatsCard from '../../components/planner/StatsCard.vue'
import AchievementPanel from '../../components/planner/AchievementPanel.vue'
import MilestoneToast from '../../components/planner/MilestoneToast.vue'

const {
  goals, loading, todayTasks, activeGoals, historyGoals,
  fetchGoals, fetchTodayTasks, fetchHistory,
  completeTask, deleteTask, editTask, createQuickTask, createTask,
  pushTaskToSchedule, archiveGoal, deleteGoal, addReview,
  createFromTemplate, shareGoalToWall, aiReviewTask,
  uploadEvidence, aiReviewEvidence,
  getGreeting, getLocalDate,
} = usePlanner()

const { checkAndUnlockAchievements, fetchUserAchievements } = useAchievements()

// 页面状态
const activeTab = ref<'today' | 'goals' | 'history' | 'habits' | 'achievements'>('today')
const showCreate = ref(false)
const greeting = getGreeting()
const statsCardRef = ref<InstanceType<typeof StatsCard> | null>(null)

// 快速添加
const quickTaskTitle = ref('')

// 添加任务弹窗
const addTaskGoalId = ref<string | null>(null)
const newTaskTitle = ref('')
const newTaskDate = ref('')

// 编辑任务弹窗
const editingTask = ref<PlannerTask | null>(null)
const editTitle = ref('')
const editDate = ref('')

// 评语弹窗
const reviewGoalId = ref<string | null>(null)
const reviewRating = ref(3)
const reviewContent = ref('')
const reviewImprovements = ref('')

// 任务记录弹窗
const recordingTask = ref<PlannerTask | null>(null)
const recordNote = ref('')
const recordFile = ref<File | null>(null)
const recordUploading = ref(false)
const recordAiFeedback = ref('')
const recordAiScore = ref(0)

// Toast
const toastMsg = ref('')
function showToast(msg: string, duration = 2500) {
  toastMsg.value = msg
  setTimeout(() => { toastMsg.value = '' }, duration)
}

// 里程碑庆祝
const showMilestone = ref(false)
const milestoneProgress = ref(0)
const milestoneGoalTitle = ref('')
const milestoneTriggers = [25, 50, 75, 100] // 触发里程碑的进度点

function checkMilestone(oldProgress: number, newProgress: number, goalTitle: string) {
  // 检查是否跨越了某个里程碑
  for (const trigger of milestoneTriggers) {
    if (oldProgress < trigger && newProgress >= trigger) {
      milestoneProgress.value = trigger
      milestoneGoalTitle.value = goalTitle
      showMilestone.value = true
      setTimeout(() => { showMilestone.value = false }, 4000)
      break
    }
  }
}

const tabs = [
  { key: 'today' as const, label: '今日', icon: '📋' },
  { key: 'goals' as const, label: '目标', icon: '🎯' },
  { key: 'habits' as const, label: '打卡', icon: '🔥' },
  { key: 'achievements' as const, label: '成就', icon: '🏆' },
  { key: 'history' as const, label: '历史', icon: '📜' },
]

function switchTab(key: typeof activeTab.value) {
  activeTab.value = key
  if (key === 'history') fetchHistory()
  if (key === 'achievements') fetchUserAchievements()
}

// ===== 快速添加任务 =====
function showQuickAdd() {
  activeTab.value = 'today'
  // 聚焦输入框（下一 tick）
  setTimeout(() => {
    const input = document.querySelector('.pl-qa-input') as HTMLInputElement
    input?.focus()
  }, 100)
}

async function addQuickTask() {
  if (!quickTaskTitle.value.trim()) return
  const title = quickTaskTitle.value.trim()
  quickTaskTitle.value = ''
  const task = await createQuickTask(title)
  if (task) showToast(`✅ 已添加「${title}」到今日任务`)
  else showToast('⚠️ 添加失败，请重试')
}

// ===== 完成任务（含AI反馈 + 成就检查 + 里程碑检查） =====
async function handleCompleteTask(taskId: string) {
  const task = todayTasks.value.find(t => t.id === taskId)
  const taskTitle = task?.title || ''
  const goalTitle = task?.goalTitle || ''
  
  // 记录任务所属目标的旧进度（用于里程碑检查）
  let oldProgress = 0
  let targetGoal: typeof goals.value[0] | undefined
  if (task?.goal_id) {
    targetGoal = goals.value.find(g => g.id === task.goal_id)
    oldProgress = targetGoal?.total_progress || 0
  }
  
  await completeTask(taskId)
  
  // 刷新统计卡片
  statsCardRef.value?.refresh()
  
  // 检查成就解锁
  checkAndUnlockAchievements('task_complete')
  
  // 检查里程碑（目标进度变化）
  if (targetGoal) {
    // 重新获取目标以获取更新后的进度
    const updatedGoal = goals.value.find(g => g.id === targetGoal!.id)
    if (updatedGoal) {
      checkMilestone(oldProgress, updatedGoal.total_progress, updatedGoal.title)
    }
  }
  
  // AI 异步反馈
  aiReviewTask(taskTitle, goalTitle).then(feedback => {
    showToast(feedback, 3000)
  })
}

// ===== 删除任务 =====
async function handleDeleteTask(taskId: string) {
  if (confirm('确认删除此任务？关联的日程也会被删除。')) {
    await deleteTask(taskId)
    showToast('任务已删除')
  }
}

// ===== 编辑任务 =====
function handleEditTask(task: PlannerTask) {
  editingTask.value = task
  editTitle.value = task.title
  editDate.value = task.due_date || ''
}
async function submitEditTask() {
  if (!editingTask.value || !editTitle.value.trim()) return
  await editTask(editingTask.value.id, {
    title: editTitle.value.trim(),
    due_date: editDate.value || undefined,
  })
  editingTask.value = null
  showToast('任务已更新（日程同步更新）')
}

// ===== 推送到日程 =====
async function handlePushToSchedule(task: PlannerTask) {
  await pushTaskToSchedule(task)
  showToast('📅 已同步到星火日程')
}

// ===== 添加任务到目标 =====
function handleAddTask(goalId: string) {
  addTaskGoalId.value = goalId
  newTaskTitle.value = ''
  newTaskDate.value = ''
}
async function submitNewTask() {
  if (!addTaskGoalId.value || !newTaskTitle.value.trim()) return
  await createTask(addTaskGoalId.value, {
    title: newTaskTitle.value.trim(),
    due_date: newTaskDate.value || undefined,
  })
  addTaskGoalId.value = null
  await fetchTodayTasks()
  showToast('任务已创建')
}

// ===== 归档 =====
async function handleArchive(goalId: string) {
  if (confirm('归档后可在历史中查看并写评语，确认归档？')) {
    await archiveGoal(goalId)
    showToast('目标已归档到历史')
  }
}

// ===== 删除目标 =====
async function handleDeleteGoal(goalId: string) {
  if (confirm('⚠️ 确认删除此目标？\n所有子任务和关联日程也会被清除，不可恢复！')) {
    await deleteGoal(goalId)
    showToast('目标及关联数据已删除')
  }
}

// ===== 模板一键创建 =====
async function handleTemplate(tmpl: any) {
  await createFromTemplate(tmpl)
  await fetchGoals()
  await fetchTodayTasks()
  activeTab.value = 'goals'
  showToast('🎉 目标已创建，任务已同步到日程')
}

// ===== 目标创建完成 =====
async function handleGoalCreated(_goalId: string) {
  showCreate.value = false
  await fetchGoals()
  await fetchTodayTasks()
  activeTab.value = 'goals'
  showToast('🎉 目标已创建，任务已同步到日程')
}

// ===== 写评语 =====
function handleReview(goalId: string) {
  reviewGoalId.value = goalId
  reviewRating.value = 3
  reviewContent.value = ''
  reviewImprovements.value = ''
}
async function submitReview() {
  if (!reviewGoalId.value || !reviewContent.value.trim()) return
  await addReview(reviewGoalId.value, reviewRating.value, reviewContent.value, reviewImprovements.value || undefined)
  reviewGoalId.value = null
  showToast('评语已提交')
}

// ===== 分享到广场（带确认） =====
async function handleShare(goalId: string) {
  const goal = historyGoals.value.find(g => g.id === goalId)
  if (!goal) return
  // 友情提醒确认
  if (!confirm(`确认将「${goal.title}」的成就分享到校园广场吗？\n其他同学可以看到你的成就！`)) return
  const review = goal.review
  const success = await shareGoalToWall(goal, review?.content)
  if (success) showToast('🎉 已分享到校园广场！')
  else showToast('分享失败，请稍后重试')
}

// ===== 任务记录上传 =====
function handleRecordTask(task: PlannerTask) {
  recordingTask.value = task
  recordNote.value = ''
  recordFile.value = null
  recordAiFeedback.value = ''
  recordAiScore.value = 0
}
function handleFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files?.[0]) {
    recordFile.value = input.files[0]
  }
}
async function submitRecord() {
  if (!recordingTask.value || recordUploading.value) return
  if (!recordNote.value.trim() && !recordFile.value) return
  recordUploading.value = true
  recordAiFeedback.value = ''

  const evidenceType = recordFile.value
    ? (recordFile.value.type.startsWith('video') ? 'video' : 'image')
    : 'text'

  const evidence = await uploadEvidence(
    recordingTask.value.id,
    evidenceType as 'image' | 'video' | 'text',
    { content: recordNote.value.trim() || undefined, file: recordFile.value || undefined }
  )

  if (evidence) {
    showToast('📤 记录已上传，AI正在评审...')
    // AI 评审
    const result = await aiReviewEvidence(
      evidence.id,
      recordingTask.value.title,
      recordNote.value.trim() || undefined,
      evidence.media_url || undefined
    )
    recordAiFeedback.value = result.feedback
    recordAiScore.value = result.score
    showToast(`🤖 AI评分：${result.score}分`, 3000)
  } else {
    showToast('上传失败，请重试')
  }
  recordUploading.value = false
}

// ===== 初始化 =====
onMounted(async () => {
  await fetchGoals()
  await fetchTodayTasks()
})
</script>

<style scoped>
.planner-page{min-height:100vh;padding:0 16px 80px;max-width:520px;margin:0 auto;position:relative}
.pl-topbar{display:flex;justify-content:space-between;align-items:center;padding:16px 0 10px}
.pl-greeting{flex:1}
.pl-title{font-size:20px;font-weight:700;color:rgba(255,255,255,.88);margin:0;letter-spacing:1px}
.pl-hello{font-size:12px;color:rgba(255,255,255,.3);margin:2px 0 0}
.pl-create-btn{display:flex;align-items:center;gap:5px;padding:7px 14px;border-radius:18px;border:1px solid rgba(139,92,246,.2);background:linear-gradient(135deg,rgba(139,92,246,.12),rgba(245,197,94,.05));color:rgba(139,92,246,.75);font-size:12px;font-weight:600;cursor:pointer;transition:all .25s;white-space:nowrap}
.pl-create-btn:hover{background:linear-gradient(135deg,rgba(139,92,246,.2),rgba(245,197,94,.1));color:rgba(139,92,246,.95);box-shadow:0 0 16px rgba(139,92,246,.15)}

/* Tab */
.pl-tabs{display:flex;gap:0;padding:3px;background:rgba(255,255,255,.025);border-radius:12px;border:1px solid rgba(255,255,255,.04);margin-bottom:14px}
.pl-tab{flex:1;padding:8px 0;border-radius:9px;border:none;background:transparent;color:rgba(255,255,255,.3);font-size:12px;font-weight:500;cursor:pointer;transition:all .25s;position:relative}
.pl-tab.active{background:rgba(139,92,246,.12);color:rgba(139,92,246,.85);font-weight:600}
.pl-badge{position:absolute;top:2px;right:6px;min-width:15px;height:15px;border-radius:8px;background:linear-gradient(135deg,#f59e0b,#ef4444);color:white;font-size:9px;font-weight:700;display:flex;align-items:center;justify-content:center;padding:0 3px}

/* 快速添加 */
.pl-quick-add{display:flex;gap:8px;margin-bottom:12px}
.pl-qa-input{flex:1;padding:10px 14px;border-radius:12px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.03);color:white;font-size:13px;outline:none;box-sizing:border-box}
.pl-qa-input:focus{border-color:rgba(139,92,246,.2)}
.pl-qa-input::placeholder{color:rgba(255,255,255,.2)}
.pl-qa-btn{padding:10px 16px;border-radius:12px;border:none;background:rgba(139,92,246,.15);color:rgba(139,92,246,.8);font-size:12px;font-weight:600;cursor:pointer}

.pl-content{flex:1}
.pl-goals-grid{display:flex;flex-direction:column;gap:8px}
.pl-disclaimer{text-align:center;font-size:10px;color:rgba(245,158,11,.2);margin:24px 0 0}

/* 通用弹窗 */
.pl-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;z-index:100;backdrop-filter:blur(4px);padding:20px}
.pl-modal{width:100%;max-width:400px;background:linear-gradient(160deg,#0d0b1e,#12102a);border:1px solid rgba(139,92,246,.12);border-radius:20px;padding:20px}
.pl-modal h3{font-size:16px;color:rgba(255,255,255,.8);font-weight:600;margin:0 0 14px;text-align:center}
.pl-modal-desc{font-size:12px;color:rgba(255,255,255,.35);text-align:center;margin:0 0 12px}
.pl-modal-input,.pl-modal-textarea{width:100%;padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.03);color:white;font-size:13px;outline:none;box-sizing:border-box;margin-bottom:10px;font-family:inherit}
.pl-modal-textarea{resize:none}
.pl-modal-input:focus,.pl-modal-textarea:focus{border-color:rgba(139,92,246,.2)}
.pl-modal-input::-webkit-calendar-picker-indicator{filter:invert(.5)}
.pl-modal-actions{display:flex;gap:8px;margin-top:4px}
.pl-modal-cancel,.pl-modal-confirm{flex:1;padding:10px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;border:none}
.pl-modal-cancel{background:rgba(255,255,255,.03);color:rgba(255,255,255,.4)}
.pl-modal-confirm{background:linear-gradient(135deg,#6d28d9,#8b5cf6);color:white}
.pl-modal-confirm:disabled{opacity:.3;cursor:default}
.pl-rating{display:flex;gap:4px;justify-content:center;margin-bottom:12px}
.pl-star{background:none;border:none;font-size:22px;cursor:pointer;opacity:.3;transition:opacity .2s}
.pl-star.active{opacity:1}

/* 记录上传区 */
.pl-upload-area{display:flex;align-items:center;justify-content:center;padding:16px;border-radius:12px;border:2px dashed rgba(139,92,246,.12);background:rgba(139,92,246,.03);cursor:pointer;margin-bottom:10px;transition:all .2s}
.pl-upload-area:hover{border-color:rgba(139,92,246,.25);background:rgba(139,92,246,.06)}
.pl-upload-area span{font-size:13px;color:rgba(255,255,255,.3)}
.pl-file-name{color:rgba(34,197,94,.6)!important}

/* AI 评审结果 */
.pl-ai-result{margin-top:12px;padding:12px;border-radius:12px;background:rgba(139,92,246,.06);border:1px solid rgba(139,92,246,.1);text-align:center}
.pl-ai-score{font-size:28px;font-weight:800;background:linear-gradient(135deg,#8b5cf6,#f59e0b);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.pl-ai-text{font-size:13px;color:rgba(255,255,255,.5);margin:6px 0 0;line-height:1.5}

.pl-loading{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.4);z-index:50;backdrop-filter:blur(4px)}
.pl-spinner{width:28px;height:28px;border:2.5px solid rgba(139,92,246,.1);border-top-color:rgba(139,92,246,.6);border-radius:50%;animation:spin .7s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.fade-enter-active,.fade-leave-active{transition:opacity .2s}
.fade-enter-from,.fade-leave-to{opacity:0}

/* Toast */
.pl-toast{position:fixed;bottom:90px;left:50%;transform:translateX(-50%);padding:10px 20px;border-radius:14px;background:rgba(139,92,246,.9);color:white;font-size:13px;font-weight:500;white-space:nowrap;z-index:200;box-shadow:0 4px 20px rgba(139,92,246,.3);backdrop-filter:blur(8px)}
</style>
