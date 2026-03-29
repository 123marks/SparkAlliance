<template>
  <div class="health-page">
    <!-- 三 Tab -->
    <div class="health-tabs">
      <button v-for="t in tabs" :key="t.key" class="tab-btn" :class="{ active: activeTab === t.key }" @click="switchTab(t.key)">{{ t.icon }} {{ t.label }}</button>
    </div>

    <!-- ====== Tab1: 今日打卡 ====== -->
    <div v-if="activeTab === 'checkin'" class="tab-body">
      <!-- 总览 -->
      <div class="glass-card overview-card">
        <div class="ov-header"><h2>🔥 今日健康</h2><div class="streak-badge" v-if="streak > 0">⚡ 连续 {{ streak }} 天</div></div>
        <div class="rings-row">
          <div v-for="r in ringData" :key="r.label" class="ring-item">
            <div class="ring" :style="ringStyle(r.pct, r.color)"><span class="ring-val">{{ r.pct }}%</span></div>
            <span class="ring-label">{{ r.icon }} {{ r.label }}</span>
          </div>
        </div>
        <div class="health-grade">综合评分：<span class="grade" :class="'grade-' + grade.toLowerCase()">{{ grade }}</span><span class="grade-desc">（{{ gradeDesc }}）</span></div>
      </div>

      <!-- 饮食打卡 -->
      <div class="glass-card">
        <div class="section-head"><h3>🍱 饮食打卡</h3><button class="share-item-btn" @click="shareSection('diet')" title="分享饮食记录">📤</button></div>
        <div class="meals-grid">
          <div v-for="(m, i) in mealSlots" :key="i" class="meal-card" :class="{ done: m.done }" @click="m.done = !m.done">
            <span class="meal-icon">{{ m.icon }}</span><span class="meal-name">{{ m.name }}</span>
            <span class="meal-check" v-if="m.done">✓</span>
          </div>
          <div class="meal-card add-meal" @click="addMealSlot"><span class="meal-icon">➕</span><span class="meal-name">加餐</span></div>
        </div>
        <div class="food-tags">
          <button v-for="tag in allFoodTags" :key="tag" class="ftag" :class="{ sel: selectedTags.includes(tag) }" @click="toggleTag(selectedTags, tag)">{{ tag }}</button>
          <input v-model="customTag" class="tag-input" placeholder="自定义..." maxlength="8" @keydown.enter.prevent="addCustomTag" />
        </div>
        <div class="upload-row">
          <label class="up-btn">📷 照片<input type="file" accept="image/*" hidden @change="e => pickFile(e,'mealImg')" /></label>
          <label class="up-btn">📹 视频<input type="file" accept="video/*" hidden @change="e => pickFile(e,'mealVid')" /></label>
        </div>
        <img v-if="previews.mealImg" :src="previews.mealImg" class="prev-img" />
        <video v-if="previews.mealVid" :src="previews.mealVid" class="prev-vid" controls />
        <input v-model="mealNote" class="note-input" placeholder="饮食备注..." maxlength="100" />
        <div class="inline-ai">🤖 {{ aiMeal }}</div>
      </div>

      <!-- 睡眠记录 -->
      <div class="glass-card">
        <div class="section-head"><h3>😴 睡眠记录</h3><button class="share-item-btn" @click="shareSection('sleep')" title="分享睡眠记录">📤</button></div>
        <div class="sleep-row">
          <div class="tg"><label>入睡</label><input type="time" v-model="sleepStart" class="time-input" /></div>
          <span class="arrow">→</span>
          <div class="tg"><label>起床</label><input type="time" v-model="sleepEnd" class="time-input" /></div>
          <div class="dur" v-if="sleepH > 0"><span class="dur-v">{{ sleepH.toFixed(1) }}</span><span class="dur-u">小时</span></div>
        </div>
        <div class="stars"><span>质量：</span><button v-for="n in 5" :key="n" class="star" :class="{ on: n <= sleepQ }" @click="sleepQ = n">★</button></div>
        <div class="inline-ai">🤖 {{ aiSleep }}</div>
      </div>

      <!-- 运动记录 -->
      <div class="glass-card">
        <div class="section-head"><h3>🏃 运动记录</h3><button class="share-item-btn" @click="shareSection('exercise')" title="分享运动记录">📤</button></div>
        <select v-model="exType" class="sel"><option value="">选择运动类型</option><option v-for="t in exTypes" :key="t" :value="t">{{ t }}</option></select>
        <div class="ex-row">
          <div class="ex-f"><label>时长(分钟)</label><input type="number" v-model.number="exMin" class="ex-input" min="0" max="300" /></div>
          <div class="ex-f"><label>强度</label><div class="int-btns"><button v-for="l in intLvs" :key="l.v" class="int-b" :class="{ on: exInt === l.v }" @click="exInt = l.v">{{ l.l }}</button></div></div>
        </div>
        <div class="upload-row">
          <label class="up-btn">📷 照片<input type="file" accept="image/*" hidden @change="e => pickFile(e,'exImg')" /></label>
          <label class="up-btn">📹 视频<input type="file" accept="video/*" hidden @change="e => pickFile(e,'exVid')" /></label>
        </div>
        <img v-if="previews.exImg" :src="previews.exImg" class="prev-img" />
        <video v-if="previews.exVid" :src="previews.exVid" class="prev-vid" controls />
        <div class="inline-ai">🤖 {{ aiExercise }}</div>
      </div>

      <!-- 饮水记录 -->
      <div class="glass-card">
        <WaterTracker v-model="waterIntake" :disabled="saving" />
      </div>

      <!-- 健康挑战 -->
      <HealthChallenges @joined="showToast('成功加入挑战！')" @abandoned="showToast('已放弃挑战')" />

      <!-- 分享到广场 -->
      <div class="glass-card">
        <div class="share-toggle"><label class="tgl"><input type="checkbox" v-model="isPublic" /><span class="sw"></span> 🌐 分享到健康广场</label></div>
        <div v-if="isPublic" class="share-body">
          <input v-model="shareText" class="note-input" placeholder="说点什么..." maxlength="200" />
          <div class="sys-tags"><button v-for="st in sysTags" :key="st" class="stb" :class="{ sel: sTags.includes(st) }" @click="toggleTag(sTags, st)">#{{ st }}</button></div>
          <div class="stag-row">
            <span v-for="(t,i) in sTags" :key="i" class="stag">#{{ t }} <button @click="sTags.splice(i,1)">×</button></span>
            <input v-model="newSTag" class="tag-input" placeholder="#自定义" @keydown.enter.prevent="addSTag" maxlength="10" />
          </div>
        </div>
      </div>

      <!-- 外部分享 -->
      <div class="glass-card extern-share">
        <span class="es-label">分享到：</span>
        <button class="es-btn" @click="shareExternal('wechat')">💬 微信</button>
        <button class="es-btn" @click="shareExternal('qq')">🐧 QQ</button>
        <button class="es-btn" @click="shareExternal('weibo')">📢 微博</button>
        <button class="es-btn" @click="shareExternal('copy')">📋 复制链接</button>
      </div>

      <button class="save-btn" @click="confirmSave" :disabled="saving">{{ saving ? '保存中...' : '💾 保存今日打卡' }}</button>
    </div>

    <!-- ====== Tab2: 健康档案 ====== -->
    <div v-if="activeTab === 'records'" class="tab-body">
      <!-- 周报 -->
      <WeeklyReport />

      <!-- SVG 折线图 -->
      <div class="glass-card">
        <h3>📈 健康趋势（本周）</h3>
        <div class="chart-container" v-for="ch in charts" :key="ch.label">
          <div class="chart-label">{{ ch.icon }} {{ ch.label }}（周均: {{ ch.avg }}）</div>
          <svg class="line-chart" viewBox="0 0 300 100" preserveAspectRatio="none">
            <defs><linearGradient :id="'g-'+ch.key" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" :stop-color="ch.color" stop-opacity="0.3"/><stop offset="100%" :stop-color="ch.color" stop-opacity="0.02"/></linearGradient></defs>
            <!-- 网格线 -->
            <line v-for="y in [25,50,75]" :key="y" x1="0" :y1="y" x2="300" :y2="y" stroke="rgba(255,255,255,0.04)" stroke-width="0.5"/>
            <!-- 填充区域 -->
            <path :d="areaPath(ch.values)" :fill="'url(#g-'+ch.key+')'" />
            <!-- 折线 -->
            <polyline :points="linePoints(ch.values)" fill="none" :stroke="ch.color" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <!-- 数据点 -->
            <circle v-for="(v,i) in ch.values" :key="i" :cx="i * 50" :cy="100 - v" r="3" :fill="ch.color" stroke="#0a0a0f" stroke-width="1.5"/>
          </svg>
          <div class="x-labels"><span v-for="d in '一二三四五六日'" :key="d">{{ d }}</span></div>
        </div>
      </div>

      <!-- AI 健康助手对话 -->
      <div class="glass-card ai-chat-card">
        <h3>🤖 AI 健康助手</h3>
        <div class="ai-chat-body" ref="chatBody">
          <div v-for="(msg, i) in aiMessages" :key="i" class="ai-msg" :class="msg.role">
            <span class="msg-text">{{ msg.text }}</span>
          </div>
        </div>
        <div class="ai-chat-input">
          <input v-model="aiInput" placeholder="问我关于你的健康数据..." @keydown.enter.prevent="sendAiMsg" />
          <button @click="sendAiMsg" :disabled="aiLoading">{{ aiLoading ? '...' : '发送' }}</button>
        </div>
      </div>

      <!-- 历史记录列表 -->
      <div class="glass-card">
        <h3>📅 历史记录</h3>
        <div v-if="!historyRecords.length" class="empty-hint">暂无记录</div>
        <div v-for="rec in historyRecords" :key="rec.id" class="history-item" @click="viewRecord(rec)">
          <span class="hi-date">{{ rec.date }}</span>
          <span class="hi-tags">
            <span v-if="getMealCount(rec.meals) > 0">🍱{{ getMealCount(rec.meals) }}餐</span>
            <span v-if="rec.sleep_quality">😴{{ rec.sleep_quality }}★</span>
            <span v-if="rec.exercise_minutes > 0">🏃{{ rec.exercise_minutes }}min</span>
            <span v-if="rec.water_intake > 0">💧{{ rec.water_intake }}ml</span>
          </span>
          <span class="hi-arrow">›</span>
        </div>
        <button v-if="canLoadMore" class="load-more-btn" @click="loadMoreHistory">加载更多</button>
      </div>

      <!-- 历史记录详情弹窗（只读） -->
      <Teleport to="body">
        <div v-if="viewingRecord" class="modal-overlay" @click.self="viewingRecord = null">
          <div class="modal-body record-detail">
            <div class="rd-header"><h3>📅 {{ viewingRecord.date }} 健康记录</h3><button class="close-btn" @click="viewingRecord = null">✕</button></div>
            <div class="rd-section"><b>🍱 饮食</b>
              <div v-for="(v,k) in viewingRecord.meals" :key="k" class="rd-meal"><span class="rd-dot" :class="{ done: v?.done }">{{ v?.done ? '✓' : '✗' }}</span> {{ v?.name || k }}</div>
            </div>
            <div class="rd-section" v-if="viewingRecord.sleep_start"><b>😴 睡眠</b><p>{{ viewingRecord.sleep_start?.slice(11,16) }} → {{ viewingRecord.sleep_end?.slice(11,16) }}，质量 {{ viewingRecord.sleep_quality }}★</p></div>
            <div class="rd-section" v-if="viewingRecord.exercise_type"><b>🏃 运动</b><p>{{ viewingRecord.exercise_type }} {{ viewingRecord.exercise_minutes }}分钟（{{ viewingRecord.exercise_intensity === 'high' ? '高' : viewingRecord.exercise_intensity === 'moderate' ? '中' : '轻' }}强度）</p></div>
            <div class="rd-section" v-if="viewingRecord.water_intake > 0"><b>💧 饮水</b><p>{{ viewingRecord.water_intake }}ml</p></div>
            <div class="rd-section" v-if="viewingRecord.ai_comment"><b>🤖 AI评语</b><p>{{ viewingRecord.ai_comment }}</p></div>
          </div>
        </div>
      </Teleport>
    </div>

    <!-- ====== Tab3: 健康广场 ====== -->
    <div v-if="activeTab === 'plaza'" class="tab-body">
      <div class="plaza-filters">
        <button v-for="f in plazaFilters" :key="f.key" class="fbtn" :class="{ on: pFilter === f.key, disabled: f.dev }" @click="!f.dev && (pFilter = f.key, loadPlaza())" :title="f.dev ? '功能开发中' : ''">
          {{ f.label }}{{ f.dev ? ' 🔒' : '' }}
        </button>
      </div>
      <div v-if="pLoading" class="empty-hint">加载中...</div>
      <div v-else-if="!pPosts.length" class="empty-hint">暂无分享 💪</div>
      <div v-else class="plaza-feed">
        <div v-for="post in pPosts" :key="post.id" class="glass-card plaza-card">
          <div class="ph"><div class="pa">{{ (post.nickname||'?')[0] }}</div>
            <div class="pi"><span class="pn">{{ post.nickname || '匿名' }}</span><span class="pt">{{ fmtTime(post.created_at) }}</span></div>
            <button class="report-btn" @click="openReport(post)" title="举报">⚠️</button>
          </div>
          <p class="ptxt" v-if="post.share_text">{{ post.share_text }}</p>
          <div class="psum">
            <span v-if="getMealCount(post.meals)>0" class="ps">🍱 {{ getMealCount(post.meals) }}餐</span>
            <span v-if="post.sleep_quality" class="ps">😴 {{ post.sleep_quality }}★</span>
            <span v-if="post.exercise_minutes>0" class="ps">🏃 {{ post.exercise_type }} {{ post.exercise_minutes }}min</span>
          </div>
          <div class="ptags" v-if="post.share_tags?.length"><span v-for="t in post.share_tags" :key="t" class="ptg">#{{ t }}</span></div>
          <div class="pai" v-if="post.ai_comment">🤖 {{ post.ai_comment }}</div>
          <div class="pacts">
            <button class="ab" :class="{ liked: post.user_liked }" @click="toggleLike(post,'like')">❤️ {{ post.like_count||0 }}</button>
            <button class="ab" :class="{ liked: post.user_clapped }" @click="toggleLike(post,'clap')">👏 {{ post.clap_count||0 }}</button>
            <button class="ab" @click="post.showComments=!post.showComments">💬 {{ post.comment_count||0 }}</button>
          </div>
          <div class="cmt-sec" v-if="post.showComments">
            <div v-for="c in post.comments" :key="c.id" class="cmt-item"><b>{{ c.nickname||'匿名' }}：</b>{{ c.content }}</div>
            <div class="cmt-row"><input v-model="post.newComment" class="cmt-in" placeholder="鼓励一下..." maxlength="200" @keydown.enter.prevent="submitComment(post)" /><button class="cmt-send" @click="submitComment(post)" :disabled="!post.newComment?.trim()">发送</button></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 举报弹窗 -->
    <Teleport to="body">
      <div v-if="reportTarget" class="modal-overlay" @click.self="reportTarget = null">
        <div class="modal-body">
          <h3>⚠️ 举报内容</h3>
          <div class="report-reasons">
            <button v-for="r in reportReasons" :key="r" class="rr-btn" :class="{ sel: reportReason === r }" @click="reportReason = r">{{ r }}</button>
          </div>
          <textarea v-model="reportNote" class="report-note" placeholder="补充说明（可选）..." maxlength="200"></textarea>
          <div class="modal-btns">
            <button class="mbtn cancel" @click="reportTarget = null">取消</button>
            <button class="mbtn confirm" @click="submitReport" :disabled="!reportReason">提交举报</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 确认弹窗 -->
    <Teleport to="body">
      <div v-if="showConfirm" class="modal-overlay" @click.self="showConfirm = false">
        <div class="modal-body">
          <h3>⚠️ 记录不完整</h3>
          <p>{{ confirmMsg }}</p>
          <p class="hint">记录越全面，健康分析越准确～</p>
          <div class="modal-btns"><button class="mbtn cancel" @click="showConfirm = false">返回补充</button><button class="mbtn confirm" @click="showConfirm = false; doSave()">仍然保存</button></div>
        </div>
      </div>
    </Teleport>

    <!-- 分享面板 -->
    <Teleport to="body">
      <div v-if="sharePanel" class="modal-overlay" @click.self="sharePanel = null">
        <div class="modal-body share-modal">
          <h3>📤 分享「{{ sharePanel }}」记录</h3>
          <p class="share-preview">{{ shareSectionText }}</p>
          <div class="share-btns">
            <button class="es-btn" @click="doShareExternal('wechat')">💬 微信</button>
            <button class="es-btn" @click="doShareExternal('qq')">🐧 QQ</button>
            <button class="es-btn" @click="doShareExternal('weibo')">📢 微博</button>
            <button class="es-btn" @click="doShareExternal('copy')">📋 复制</button>
          </div>
          <div class="modal-btns"><button class="mbtn cancel" @click="sharePanel = null">关闭</button></div>
        </div>
      </div>
    </Teleport>

    <Transition name="toast"><div v-if="toast.show" class="htoast" :class="toast.type">{{ toast.msg }}</div></Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { supabase } from '../../supabase'
import { useAuth } from '../../composables/useAuth'
import WaterTracker from '../../components/health/WaterTracker.vue'
import HealthChallenges from '../../components/health/HealthChallenges.vue'
import WeeklyReport from '../../components/health/WeeklyReport.vue'

const { user } = useAuth()

// ====== Tabs ======
const tabs = [{ key: 'checkin', icon: '❤️', label: '今日打卡' }, { key: 'records', icon: '📊', label: '健康档案' }, { key: 'plaza', icon: '🌐', label: '健康广场' }]
const activeTab = ref('checkin')
function switchTab(key: string) { activeTab.value = key; if (key === 'plaza') loadPlaza(); if (key === 'records') loadRecordsTab() }

// Toast
const toast = reactive({ show: false, msg: '', type: 'success' as 'success' | 'error' })
let tt: ReturnType<typeof setTimeout>
function showToast(msg: string, type: 'success' | 'error' = 'success') { clearTimeout(tt); toast.show = true; toast.msg = msg; toast.type = type; tt = setTimeout(() => toast.show = false, 2500) }

// ====== 常量 ======
const baseTags = ['水果','主食','蔬菜','肉类','奶制品','零食','奶茶','外卖','粗粮','汤粥','坚果','饮料']
const exTypes = ['跑步','骑行','篮球','足球','游泳','瑜伽','健身','羽毛球','散步','跳绳','拉伸','其他']
const intLvs = [{ v: 'light', l: '轻' }, { v: 'moderate', l: '中' }, { v: 'high', l: '高' }]
const sysTags = ['早起打卡','健身','跑步','减脂','增肌','早睡','素食','自律','减压','养生']
const reportReasons = ['虚假信息', '广告营销', '不良内容', '侵犯隐私', '其他']

// ====== 饮食 ======
interface Meal { name: string; icon: string; done: boolean }
const mealSlots = ref<Meal[]>([{ name: '早餐', icon: '🌅', done: false }, { name: '午餐', icon: '☀️', done: false }, { name: '晚餐', icon: '🌙', done: false }])
const selectedTags = ref<string[]>([])
const customTags = ref<string[]>([])
const customTag = ref('')
const mealNote = ref('')
const allFoodTags = computed(() => [...baseTags, ...customTags.value])
function addMealSlot() { mealSlots.value.push({ name: `加餐${mealSlots.value.length - 2}`, icon: '🍪', done: false }) }
function addCustomTag() { const t = customTag.value.trim(); if (t && !allFoodTags.value.includes(t)) customTags.value.push(t); customTag.value = '' }

// ====== 睡眠 ======
const sleepStart = ref(''); const sleepEnd = ref(''); const sleepQ = ref(0)
const sleepH = computed(() => { if (!sleepStart.value || !sleepEnd.value) return 0; const [sh,sm] = sleepStart.value.split(':').map(Number); const [eh,em] = sleepEnd.value.split(':').map(Number); let m = (eh*60+em)-(sh*60+sm); if (m < 0) m += 1440; return m / 60 })

// ====== 运动 ======
const exType = ref(''); const exMin = ref(0); const exInt = ref('')

// ====== 饮水 ======
const waterIntake = ref(0)

// ====== 文件 ======
const files = reactive<Record<string, File | null>>({ mealImg: null, mealVid: null, exImg: null, exVid: null })
const previews = reactive<Record<string, string>>({ mealImg: '', mealVid: '', exImg: '', exVid: '' })
function pickFile(e: Event, key: string) { const f = (e.target as HTMLInputElement).files?.[0]; if (!f) return; files[key] = f; previews[key] = URL.createObjectURL(f) }

// ====== 分享 ======
const isPublic = ref(false); const shareText = ref(''); const sTags = ref<string[]>([]); const newSTag = ref('')
function addSTag() { const t = newSTag.value.trim().replace('#',''); if (t && !sTags.value.includes(t) && sTags.value.length < 8) sTags.value.push(t); newSTag.value = '' }
function toggleTag(arr: string[], tag: string) { const i = arr.indexOf(tag); if (i >= 0) arr.splice(i, 1); else arr.push(tag) }

// ====== 科学评分（WHO + NSF） ======
const mealScore = computed(() => { const d = mealSlots.value.slice(0, 3).filter(m => m.done).length; return Math.round((d / 3) * 100) })
const sleepScore = computed(() => { if (sleepH.value <= 0) return 0; const h = sleepH.value; if (h >= 7 && h <= 9) return 100; if (h > 9) return 80; if (h >= 6) return 70; if (h >= 5) return 40; return 20 })
const exerciseScore = computed(() => { const mult = exInt.value === 'high' ? 1.3 : exInt.value === 'moderate' ? 1.0 : 0.8; return Math.min(100, Math.round((exMin.value * mult / 30) * 100)) })
const waterScore = computed(() => Math.min(100, Math.round((waterIntake.value / 2000) * 100)))
const totalScore = computed(() => Math.round(mealScore.value * 0.3 + sleepScore.value * 0.3 + exerciseScore.value * 0.25 + waterScore.value * 0.15))
const grade = computed(() => { const s = totalScore.value; if (s >= 85) return 'A'; if (s >= 70) return 'B'; if (s >= 50) return 'C'; return 'D' })
const gradeDesc = computed(() => ({ A: '优秀', B: '良好', C: '一般', D: '待改善' }[grade.value] || ''))
const ringData = computed(() => [{ label: '饮食', icon: '🍱', pct: mealScore.value, color: '#10b981' }, { label: '睡眠', icon: '😴', pct: sleepScore.value, color: '#8b5cf6' }, { label: '运动', icon: '🏃', pct: exerciseScore.value, color: '#f59e0b' }, { label: '饮水', icon: '💧', pct: waterScore.value, color: '#3b82f6' }])
function ringStyle(p: number, c: string) { return { background: `conic-gradient(${c} ${p * 3.6}deg, rgba(255,255,255,0.06) 0deg)` } }

// ====== AI 分模块评语 ======
const aiMeal = computed(() => { const d = mealSlots.value.filter(m => m.done).length; const ex = mealSlots.value.length - 3; if (d === 0) return '还没有饮食记录，按时吃饭很重要 🍎'; if (d >= 3 && ex > 0) return `三餐全勤+${ex}次加餐，注意控制总量～`; if (d >= 3) return '三餐全勤！规律饮食是健康的基础 👍'; return `吃了${d}餐，建议保持三餐规律～` })
const aiSleep = computed(() => { if (sleepH.value <= 0) return '还没有睡眠记录，充足睡眠 7-9h 是身心健康的关键 🌙'; const h = sleepH.value; if (h >= 7 && h <= 9) return `${h.toFixed(1)}h，符合 NSF 推荐标准，精力满满 💪`; if (h > 9) return `${h.toFixed(1)}h 偏多，过度睡眠也影响精神状态～`; if (h >= 6) return `${h.toFixed(1)}h 稍短，试试提前30分钟入睡 🌙`; return `只有${h.toFixed(1)}h，严重不足！成人每天需 7-9h 睡眠 ⚠️` })
const aiExercise = computed(() => { if (exMin.value <= 0) return 'WHO 建议每天至少30分钟中等强度运动，动起来吧 🏃'; if (exMin.value >= 30) return `${exType.value||'运动'}${exMin.value}min，达到 WHO 每日推荐量 🎉`; return `${exType.value||'运动'}${exMin.value}min，距离30min目标还差${30-exMin.value}分钟～` })
const aiWater = computed(() => { if (waterIntake.value <= 0) return '记得多喝水，每天2000ml是基础目标 💧'; if (waterIntake.value >= 2000) return `今日饮水${waterIntake.value}ml，补水充足！💧`; if (waterIntake.value >= 1500) return `已喝${waterIntake.value}ml，再来${2000 - waterIntake.value}ml就达标了～`; if (waterIntake.value >= 1000) return `已喝${waterIntake.value}ml，加油，目标2000ml！`; return `才喝了${waterIntake.value}ml，记得多补水哦～` })

// ====== 单项分享 ======
const sharePanel = ref<string | null>(null)
const shareSectionText = computed(() => {
  if (sharePanel.value === '饮食') { const d = mealSlots.value.filter(m => m.done).map(m => m.name).join('、'); return `今日饮食：已完成 ${d || '无'}。${aiMeal.value}` }
  if (sharePanel.value === '睡眠') return `今日睡眠：${sleepH.value > 0 ? sleepH.value.toFixed(1) + '小时' : '未记录'}。${aiSleep.value}`
  if (sharePanel.value === '运动') return `今日运动：${exType.value || '无'} ${exMin.value}分钟。${aiExercise.value}`
  return ''
})
function shareSection(type: string) { sharePanel.value = type === 'diet' ? '饮食' : type === 'sleep' ? '睡眠' : '运动' }

// ====== 外部分享 ======
function shareExternal(platform: string) {
  const text = `【SparkAlliance 健康打卡】\n饮食：${mealScore.value}% | 睡眠：${sleepScore.value}% | 运动：${exerciseScore.value}% | 饮水：${waterScore.value}%\n综合评分：${grade.value}\n${aiMeal.value}`
  doShareWith(platform, text)
}
function doShareExternal(platform: string) { doShareWith(platform, shareSectionText.value) }
function doShareWith(platform: string, text: string) {
  if (platform === 'copy') { navigator.clipboard.writeText(text); showToast('已复制到剪贴板'); sharePanel.value = null; return }
  // Web Share API（移动端可唤起微信等）
  if (navigator.share && platform === 'wechat') { navigator.share({ title: 'SparkAlliance 健康打卡', text }).catch(() => {}); sharePanel.value = null; return }
  // 降级方案：打开分享链接
  const encoded = encodeURIComponent(text)
  const urls: Record<string, string> = { wechat: `https://service.weibo.com/share/share.php?title=${encoded}`, qq: `https://connect.qq.com/widget/shareqq/index.html?title=${encoded}`, weibo: `https://service.weibo.com/share/share.php?title=${encoded}` }
  if (urls[platform]) window.open(urls[platform], '_blank', 'width=600,height=400')
  sharePanel.value = null
}

// ====== 保存 ======
const saving = ref(false); const existingId = ref<string | null>(null); const streak = ref(0)
const showConfirm = ref(false); const confirmMsg = ref('')

function confirmSave() {
  const miss: string[] = []; if (!mealSlots.value.some(m => m.done)) miss.push('饮食'); if (sleepH.value <= 0) miss.push('睡眠'); if (exMin.value <= 0) miss.push('运动'); if (waterIntake.value <= 0) miss.push('饮水')
  // 问题3修复：全空禁止保存
  if (miss.length === 4) { showToast('请至少填写一项健康记录', 'error'); return }
  if (miss.length > 0) { confirmMsg.value = `还没填写「${miss.join('、')}」记录。`; showConfirm.value = true } else doSave()
}

async function doSave() {
  if (!user.value) return; saving.value = true
  try {
    const urls: Record<string, string> = {}
    // 问题6修复：只上传有新文件的项
    for (const k of Object.keys(files)) { if (files[k]) urls[k] = await uploadFile(files[k]!, k.includes('meal') ? 'meals' : 'exercise') }
    const today = new Date().toISOString().slice(0, 10)
    const mealsJson: Record<string, any> = {}
    mealSlots.value.forEach((m, i) => { mealsJson[i < 3 ? ['breakfast','lunch','dinner'][i] : `snack_${i-2}`] = { done: m.done, name: m.name, tags: selectedTags.value, note: mealNote.value, image_url: i === 0 ? (urls.mealImg||'') : '', video_url: i === 0 ? (urls.mealVid||'') : '' } })
    const ai = [aiMeal.value, aiSleep.value, aiExercise.value, aiWater.value].filter(Boolean).join(' | ')
    const rec: Record<string, any> = { user_id: user.value.id, date: today, meals: mealsJson, sleep_start: sleepStart.value ? `${today}T${sleepStart.value}:00` : null, sleep_end: sleepEnd.value ? `${today}T${sleepEnd.value}:00` : null, sleep_quality: sleepQ.value || null, exercise_type: exType.value || null, exercise_minutes: exMin.value || 0, exercise_intensity: exInt.value || null, exercise_image_url: urls.exImg || urls.exVid || null, water_intake: waterIntake.value || 0, is_public: isPublic.value, share_text: shareText.value || null, share_tags: sTags.value.length ? sTags.value : null, ai_comment: ai || null, updated_at: new Date().toISOString() }
    if (existingId.value) { const { error } = await supabase.from('health_checkins').update(rec).eq('id', existingId.value); if (error) throw error }
    else { const { error } = await supabase.from('health_checkins').insert(rec); if (error) throw error }
    // 问题3修复：只有实际有数据才更新 streak
    const hasMeal = mealSlots.value.some(m => m.done)
    const hasSleep = sleepH.value > 0
    const hasEx = exMin.value > 0
    const hasWater = waterIntake.value > 0
    if (hasMeal || hasSleep || hasEx || hasWater) await updateStreak(today)
    // 问题6修复：保存后清空文件引用
    for (const k of Object.keys(files)) { files[k] = null }
    for (const k of Object.keys(previews)) { if (previews[k]) { URL.revokeObjectURL(previews[k]); previews[k] = '' } }
    showToast('保存成功！'); await loadToday()
  } catch (e: any) { showToast(e.message || '保存失败', 'error') } finally { saving.value = false }
}

async function uploadFile(file: File, folder: string) {
  const path = `${user.value!.id}/${folder}/${Date.now()}.${file.name.split('.').pop()}`
  // 问题1修复：bucket 设为 private，使用 signed URL 保护隐私
  try { await supabase.storage.createBucket('health-images', { public: false }) } catch (_) {}
  const { error } = await supabase.storage.from('health-images').upload(path, file); if (error) throw error
  // 返回 1 小时有效的签名 URL
  const { data: signedData, error: signErr } = await supabase.storage.from('health-images').createSignedUrl(path, 3600)
  if (signErr || !signedData?.signedUrl) throw new Error('文件上传成功但获取访问链接失败')
  return signedData.signedUrl
}

async function updateStreak(today: string) {
  if (!user.value) return
  const { data } = await supabase.from('health_streaks').select('*').eq('user_id', user.value.id).maybeSingle()
  const yday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  if (data) { let ns = data.current_streak; if (data.last_checkin_date === yday) ns++; else if (data.last_checkin_date !== today) ns = 1; await supabase.from('health_streaks').update({ current_streak: ns, longest_streak: Math.max(ns, data.longest_streak), last_checkin_date: today }).eq('user_id', user.value.id); streak.value = ns }
  else { await supabase.from('health_streaks').insert({ user_id: user.value.id, current_streak: 1, longest_streak: 1, last_checkin_date: today }); streak.value = 1 }
}

// ====== 加载今日 ======
async function loadToday() {
  if (!user.value) return
  const today = new Date().toISOString().slice(0, 10)
  const { data } = await supabase.from('health_checkins').select('*').eq('user_id', user.value.id).eq('date', today).maybeSingle()
  if (data) {
    existingId.value = data.id; const m = data.meals as any || {}
    const slots: Meal[] = [{ name: '早餐', icon: '🌅', done: m.breakfast?.done||false }, { name: '午餐', icon: '☀️', done: m.lunch?.done||false }, { name: '晚餐', icon: '🌙', done: m.dinner?.done||false }]
    Object.keys(m).filter(k => k.startsWith('snack')).forEach((k, i) => slots.push({ name: m[k].name||`加餐${i+1}`, icon: '🍪', done: m[k].done||false }))
    mealSlots.value = slots; mealNote.value = m.breakfast?.note||''; selectedTags.value = m.breakfast?.tags||[]
    if (data.sleep_start) sleepStart.value = data.sleep_start.slice(11,16); if (data.sleep_end) sleepEnd.value = data.sleep_end.slice(11,16)
    sleepQ.value = data.sleep_quality||0; exType.value = data.exercise_type||''; exMin.value = data.exercise_minutes||0; exInt.value = data.exercise_intensity||''
    waterIntake.value = data.water_intake||0
    isPublic.value = data.is_public||false; shareText.value = data.share_text||''; sTags.value = data.share_tags||[]
  }
  const { data: sk } = await supabase.from('health_streaks').select('current_streak').eq('user_id', user.value.id).maybeSingle()
  streak.value = sk?.current_streak || 0
}

// ====== Tab2: 健康档案 ======
const weekData = ref<{ sleep: number[]; meal: number[]; ex: number[]; water: number[] }>({ sleep: [], meal: [], ex: [], water: [] })
const historyRecords = ref<any[]>([])
const canLoadMore = ref(false)
const historyPage = ref(0)
const viewingRecord = ref<any>(null)

const charts = computed(() => [
  { key: 'meal', label: '饮食完成度', icon: '🍱', color: '#10b981', values: weekData.value.meal.map(v => v * 0.95 + 2), avg: Math.round(weekData.value.meal.reduce((a,b)=>a+b,0)/7) + '%' },
  { key: 'sleep', label: '睡眠时长', icon: '😴', color: '#8b5cf6', values: weekData.value.sleep.map(h => Math.min(95, (h/10)*95+2)), avg: (weekData.value.sleep.reduce((a,b)=>a+b,0)/7).toFixed(1) + 'h' },
  { key: 'ex', label: '运动达标', icon: '🏃', color: '#f59e0b', values: weekData.value.ex.map(v => v * 0.95 + 2), avg: Math.round(weekData.value.ex.reduce((a,b)=>a+b,0)/7) + '%' },
  { key: 'water', label: '饮水达标', icon: '💧', color: '#3b82f6', values: weekData.value.water.map(v => v * 0.95 + 2), avg: Math.round(weekData.value.water.reduce((a,b)=>a+b,0)/7) + '%' },
])

function linePoints(vals: number[]) { return vals.map((v, i) => `${i * 50},${100 - v}`).join(' ') }
function areaPath(vals: number[]) { const pts = vals.map((v, i) => `${i * 50},${100 - v}`); return `M0,100 L${pts.join(' L')} L${(vals.length-1)*50},100 Z` }

async function loadRecordsTab() {
  if (!user.value) return
  // 加载本周数据
  const sArr: number[] = [], mArr: number[] = [], eArr: number[] = [], wArr: number[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10)
    const { data } = await supabase.from('health_checkins').select('meals,sleep_start,sleep_end,exercise_minutes,water_intake').eq('user_id', user.value.id).eq('date', d).maybeSingle()
    if (data) {
      if (data.sleep_start && data.sleep_end) { let diff = (new Date(data.sleep_end).getTime() - new Date(data.sleep_start).getTime()) / 3600000; if (diff < 0) diff += 24; sArr.push(Math.round(diff*10)/10) } else sArr.push(0)
      const ml = data.meals as any || {}; mArr.push(Math.round(([ml.breakfast?.done, ml.lunch?.done, ml.dinner?.done].filter(Boolean).length / 3) * 100))
      eArr.push(Math.min(100, Math.round(((data.exercise_minutes||0)/30)*100)))
      wArr.push(Math.min(100, Math.round(((data.water_intake||0)/2000)*100)))
    } else { sArr.push(0); mArr.push(0); eArr.push(0); wArr.push(0) }
  }
  weekData.value = { sleep: sArr, meal: mArr, ex: eArr, water: wArr }
  // 加载历史
  historyPage.value = 0; await loadHistory()
}

async function loadHistory() {
  if (!user.value) return
  const { data } = await supabase.from('health_checkins').select('*').eq('user_id', user.value.id).order('date', { ascending: false }).range(historyPage.value * 10, historyPage.value * 10 + 9)
  if (historyPage.value === 0) historyRecords.value = data || []
  else historyRecords.value.push(...(data || []))
  canLoadMore.value = (data?.length || 0) === 10
}
function loadMoreHistory() { historyPage.value++; loadHistory() }
function viewRecord(rec: any) { viewingRecord.value = rec }

// ====== AI 对话 ======
const aiMessages = ref<{ role: 'ai' | 'user'; text: string }[]>([{ role: 'ai', text: '你好！我是你的 AI 健康助手 🤖 可以询问我关于你的饮食、睡眠、运动数据的分析和建议。' }])
const aiInput = ref(''); const aiLoading = ref(false); const chatBody = ref<HTMLElement | null>(null)

async function sendAiMsg() {
  if (!aiInput.value.trim() || aiLoading.value) return
  const q = aiInput.value.trim(); aiInput.value = ''
  aiMessages.value.push({ role: 'user', text: q }); aiLoading.value = true
  await nextTick(); if (chatBody.value) chatBody.value.scrollTop = chatBody.value.scrollHeight
  // 基于本地数据的智能应答
  const reply = generateAiReply(q)
  setTimeout(() => { aiMessages.value.push({ role: 'ai', text: reply }); aiLoading.value = false; nextTick(() => { if (chatBody.value) chatBody.value.scrollTop = chatBody.value.scrollHeight }) }, 800)
}

function generateAiReply(q: string): string {
  const wd = weekData.value; const avgSleep = wd.sleep.reduce((a,b)=>a+b,0)/7; const avgMeal = wd.meal.reduce((a,b)=>a+b,0)/7; const avgEx = wd.ex.reduce((a,b)=>a+b,0)/7; const avgWater = wd.water.reduce((a,b)=>a+b,0)/7
  if (q.includes('睡眠') || q.includes('sleep')) return `本周你的平均睡眠时长为 ${avgSleep.toFixed(1)} 小时。${avgSleep >= 7 ? '达到 NSF 推荐标准，很棒！' : '低于推荐的 7 小时，建议调整作息。'}建议每天在固定时间入睡，避免睡前使用手机。`
  if (q.includes('饮食') || q.includes('吃')) return `本周三餐规律完成度为 ${avgMeal.toFixed(0)}%。${avgMeal >= 80 ? '很规律！' : '建议尽量保持三餐按时进食。'}均衡饮食建议：每天摄入 12 种以上食物，谷物为主，多吃蔬果。`
  if (q.includes('运动') || q.includes('锻炼')) return `本周运动达标率为 ${avgEx.toFixed(0)}%。WHO建议每周至少150分钟中等强度运动。${avgEx >= 70 ? '你做得很好！' : '建议增加运动频率。'}`
  if (q.includes('喝水') || q.includes('饮水') || q.includes('water')) return `本周饮水达标率为 ${avgWater.toFixed(0)}%。每天推荐饮水2000ml以上。${avgWater >= 70 ? '补水习惯不错！' : '建议增加饮水量，可以设定定时提醒。'}`
  if (q.includes('建议') || q.includes('怎么') || q.includes('改善')) return `综合建议：\n🍱 饮食(${avgMeal.toFixed(0)}%)：${avgMeal >= 80 ? '保持良好' : '三餐要规律'}\n😴 睡眠(${avgSleep.toFixed(1)}h)：${avgSleep >= 7 ? '很充足' : '需要早睡'}\n🏃 运动(${avgEx.toFixed(0)}%)：${avgEx >= 70 ? '达标' : '多动动'}\n💧 饮水(${avgWater.toFixed(0)}%)：${avgWater >= 70 ? '补水充足' : '多喝水'}`
  return `根据你本周的数据：饮食完成度 ${avgMeal.toFixed(0)}%，平均睡眠 ${avgSleep.toFixed(1)}h，运动达标 ${avgEx.toFixed(0)}%，饮水达标 ${avgWater.toFixed(0)}%。你可以问我具体的饮食、睡眠、运动或饮水建议哦～`
}

// ====== Tab3: 广场 ======
// 问题4修复：朋友/附近标记为开发中
const plazaFilters = [{ key: '全部', label: '全部', dev: false }, { key: '朋友', label: '朋友', dev: true }, { key: '附近', label: '附近', dev: true }, { key: '我的', label: '我的', dev: false }]
const pFilter = ref('全部'); const pPosts = ref<any[]>([]); const pLoading = ref(false)
const reportTarget = ref<any>(null); const reportReason = ref(''); const reportNote = ref('')

// 问题5修复：批量并行查询取代 N+1 串行循环
async function loadPlaza() {
  if (!user.value) return; pLoading.value = true
  try {
    let query = supabase.from('health_checkins').select('*').eq('is_public', true).order('created_at', { ascending: false }).limit(30)
    if (pFilter.value === '我的') query = supabase.from('health_checkins').select('*').eq('user_id', user.value.id).order('created_at', { ascending: false }).limit(30)
    const { data, error } = await query; if (error) throw error
    if (!data?.length) { pPosts.value = []; return }
    const ids = data.map((p: any) => p.id)
    // 并行批量查询：所有点赞 + 当前用户的点赞 + 所有评论
    const [likesRes, myLikesRes, commentsRes] = await Promise.all([
      supabase.from('health_likes').select('checkin_id, type').in('checkin_id', ids),
      supabase.from('health_likes').select('checkin_id, type').in('checkin_id', ids).eq('user_id', user.value.id),
      supabase.from('health_comments').select('*').in('checkin_id', ids).order('created_at'),
    ])
    const allLikes = likesRes.data || []
    const myLikes = myLikesRes.data || []
    const allComments = commentsRes.data || []
    const posts = data.map((p: any) => {
      const postLikes = allLikes.filter((l: any) => l.checkin_id === p.id)
      const postMyLikes = myLikes.filter((l: any) => l.checkin_id === p.id)
      const postComments = allComments.filter((c: any) => c.checkin_id === p.id)
      return {
        ...p,
        nickname: p.user_id === user.value!.id ? '我' : '用户',
        like_count: postLikes.filter((l: any) => l.type === 'like').length,
        clap_count: postLikes.filter((l: any) => l.type === 'clap').length,
        user_liked: postMyLikes.some((l: any) => l.type === 'like'),
        user_clapped: postMyLikes.some((l: any) => l.type === 'clap'),
        comment_count: postComments.length,
        comments: postComments.slice(0, 20),
        showComments: false, newComment: ''
      }
    })
    pPosts.value = posts
  } catch (e) { console.error(e) } finally { pLoading.value = false }
}

async function toggleLike(post: any, type: 'like' | 'clap') {
  if (!user.value) return; const isL = type === 'like' ? post.user_liked : post.user_clapped
  if (isL) { await supabase.from('health_likes').delete().eq('checkin_id', post.id).eq('user_id', user.value.id).eq('type', type); if (type==='like'){post.user_liked=false;post.like_count--}else{post.user_clapped=false;post.clap_count--} }
  else { await supabase.from('health_likes').insert({ checkin_id: post.id, user_id: user.value.id, type }); if (type==='like'){post.user_liked=true;post.like_count++}else{post.user_clapped=true;post.clap_count++} }
}

async function submitComment(post: any) {
  if (!user.value || !post.newComment?.trim()) return
  const { data, error } = await supabase.from('health_comments').insert({ checkin_id: post.id, user_id: user.value.id, content: post.newComment.trim() }).select().single()
  if (error) { showToast('评论失败', 'error'); return }
  post.comments.push({ ...data, nickname: '我' }); post.comment_count++; post.newComment = ''
}

function openReport(post: any) { reportTarget.value = post; reportReason.value = ''; reportNote.value = '' }
// 问题2修复：对齐 reports 表 schema（post_id + reason_category），加错误检查
async function submitReport() {
  if (!user.value || !reportTarget.value || !reportReason.value) return
  try {
    const { error } = await supabase.from('reports').insert({
      post_id: reportTarget.value.id,
      comment_id: null,
      reporter_id: user.value.id,
      reason_category: reportReason.value,
      reason_text: reportNote.value || null,
      status: 'pending'
    })
    if (error) throw error
    showToast('举报已提交，感谢您的反馈'); reportTarget.value = null
  } catch (e: any) {
    console.error('举报失败:', e)
    showToast('举报提交失败，请稍后重试', 'error'); reportTarget.value = null
  }
}

function fmtTime(ts: string) { const h = Math.floor((Date.now() - new Date(ts).getTime()) / 3600000); if (h < 1) return '刚刚'; if (h < 24) return `${h}小时前`; return `${Math.floor(h/24)}天前` }
function getMealCount(meals: any) { if (!meals) return 0; return Object.values(meals).filter((m: any) => m?.done).length }

onMounted(() => { loadToday() })
</script>

<style scoped>
.health-page { max-width: 720px; margin: 0 auto; padding: 24px 16px 80px; }
.tab-body { display: flex; flex-direction: column; gap: 16px; }
/* Tab */
.health-tabs { display: flex; gap: 4px; margin-bottom: 24px; background: rgba(255,255,255,0.04); border-radius: 12px; padding: 4px; }
.tab-btn { flex: 1; padding: 10px; border-radius: 10px; border: none; background: transparent; color: rgba(255,255,255,0.5); font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.tab-btn.active { background: rgba(255,255,255,0.08); color: white; box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
/* 卡片 */
.glass-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; padding: 20px; backdrop-filter: blur(12px); }
.glass-card h3 { font-size: 16px; font-weight: 700; margin-bottom: 16px; color: white; }
.section-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.section-head h3 { margin-bottom: 0; }
.share-item-btn { background: none; border: none; font-size: 18px; cursor: pointer; opacity: 0.5; transition: opacity 0.2s; }
.share-item-btn:hover { opacity: 1; }
/* 总览 */
.ov-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.ov-header h2 { font-size: 20px; font-weight: 800; color: white; }
.streak-badge { padding: 4px 12px; background: rgba(245,158,11,0.12); border: 1px solid rgba(245,158,11,0.2); border-radius: 20px; font-size: 13px; font-weight: 600; color: #f59e0b; }
.rings-row { display: flex; justify-content: space-around; margin-bottom: 20px; }
.ring-item { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.ring { width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; position: relative; }
.ring::after { content: ''; position: absolute; width: 60px; height: 60px; border-radius: 50%; background: rgba(10,10,15,0.9); top: 10px; left: 10px; }
.ring-val { position: relative; z-index: 1; font-size: 16px; font-weight: 700; color: white; }
.ring-label { font-size: 13px; color: rgba(255,255,255,0.5); }
.health-grade { text-align: center; font-size: 14px; color: rgba(255,255,255,0.5); }
.grade { font-size: 24px; font-weight: 800; margin-left: 8px; }
.grade-desc { font-size: 12px; margin-left: 6px; }
.grade-a { color: #10b981; } .grade-b { color: #3b82f6; } .grade-c { color: #f59e0b; } .grade-d { color: #ef4444; }
/* 饮食 */
.meals-grid { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 14px; }
.meal-card { flex: 1; min-width: 72px; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 12px 6px; border-radius: 12px; cursor: pointer; transition: all 0.2s; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); position: relative; }
.meal-card.done { background: rgba(16,185,129,0.1); border-color: rgba(16,185,129,0.25); }
.meal-card.add-meal { border-style: dashed; opacity: 0.5; } .meal-card.add-meal:hover { opacity: 1; }
.meal-icon { font-size: 22px; } .meal-name { font-size: 12px; color: rgba(255,255,255,0.6); }
.meal-check { position: absolute; top: 4px; right: 6px; width: 18px; height: 18px; border-radius: 50%; background: #10b981; color: white; font-size: 11px; display: flex; align-items: center; justify-content: center; }
.food-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; align-items: center; }
.ftag { padding: 4px 10px; border-radius: 14px; font-size: 12px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: rgba(255,255,255,0.5); cursor: pointer; transition: all 0.2s; }
.ftag.sel { background: rgba(59,130,246,0.12); border-color: rgba(59,130,246,0.3); color: #60a5fa; }
.tag-input { width: 72px; padding: 4px 8px; border-radius: 14px; background: rgba(255,255,255,0.03); border: 1px dashed rgba(255,255,255,0.12); color: white; font-size: 12px; outline: none; }
/* 上传 */
.upload-row { display: flex; gap: 8px; margin-bottom: 10px; }
.up-btn { display: inline-flex; align-items: center; gap: 4px; padding: 6px 12px; border-radius: 10px; font-size: 13px; background: rgba(139,92,246,0.1); border: 1px solid rgba(139,92,246,0.2); color: #a78bfa; cursor: pointer; }
.up-btn:hover { background: rgba(139,92,246,0.18); }
.prev-img { width: 100%; max-height: 180px; object-fit: cover; border-radius: 10px; margin-bottom: 8px; }
.prev-vid { width: 100%; max-height: 220px; border-radius: 10px; margin-bottom: 8px; }
.note-input { width: 100%; padding: 10px 14px; border-radius: 10px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: white; font-size: 13px; outline: none; box-sizing: border-box; }
.note-input:focus { border-color: rgba(139,92,246,0.4); } .note-input::placeholder { color: rgba(255,255,255,0.25); }
.inline-ai { margin-top: 10px; padding: 10px 14px; border-radius: 10px; background: rgba(139,92,246,0.06); border: 1px solid rgba(139,92,246,0.1); font-size: 13px; color: rgba(255,255,255,0.55); line-height: 1.5; }
/* 睡眠 */
.sleep-row { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
.tg { display: flex; flex-direction: column; gap: 4px; } .tg label { font-size: 12px; color: rgba(255,255,255,0.4); }
.time-input { padding: 8px 12px; border-radius: 8px; font-size: 16px; font-weight: 600; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); color: white; outline: none; width: 120px; }
.time-input:focus { border-color: rgba(139,92,246,0.4); }
.arrow { font-size: 20px; color: rgba(255,255,255,0.3); margin-top: 18px; }
.dur { margin-top: 18px; display: flex; align-items: baseline; gap: 4px; }
.dur-v { font-size: 24px; font-weight: 800; color: #8b5cf6; } .dur-u { font-size: 13px; color: rgba(255,255,255,0.4); }
.stars { display: flex; align-items: center; gap: 4px; margin-bottom: 12px; font-size: 13px; color: rgba(255,255,255,0.5); }
.star { background: none; border: none; font-size: 22px; cursor: pointer; color: rgba(255,255,255,0.15); transition: all 0.15s; }
.star.on { color: #f59e0b; } .star:hover { transform: scale(1.2); }
/* 运动 */
.sel { width: 100%; padding: 10px 14px; border-radius: 10px; font-size: 14px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); color: white; outline: none; appearance: none; margin-bottom: 10px; }
.sel option { background: #1a1a2e; }
.ex-row { display: flex; gap: 16px; margin-bottom: 12px; } .ex-f { flex: 1; display: flex; flex-direction: column; gap: 6px; } .ex-f label { font-size: 12px; color: rgba(255,255,255,0.4); }
.ex-input { padding: 8px 12px; border-radius: 8px; font-size: 16px; font-weight: 600; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); color: white; outline: none; width: 100%; box-sizing: border-box; }
.int-btns { display: flex; gap: 6px; } .int-b { flex: 1; padding: 8px; border-radius: 8px; font-size: 13px; font-weight: 600; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: rgba(255,255,255,0.5); cursor: pointer; }
.int-b.on { background: rgba(245,158,11,0.12); border-color: rgba(245,158,11,0.3); color: #f59e0b; }
/* 分享 */
.share-toggle { display: flex; } .tgl { display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 14px; color: rgba(255,255,255,0.6); } .tgl input { display: none; }
.sw { width: 36px; height: 20px; border-radius: 10px; background: rgba(255,255,255,0.1); position: relative; transition: all 0.2s; }
.sw::after { content: ''; position: absolute; width: 16px; height: 16px; border-radius: 50%; background: white; top: 2px; left: 2px; transition: all 0.2s; }
.tgl input:checked + .sw { background: #10b981; } .tgl input:checked + .sw::after { left: 18px; }
.share-body { margin-top: 14px; display: flex; flex-direction: column; gap: 10px; }
.sys-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.stb { padding: 3px 10px; border-radius: 12px; font-size: 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); color: rgba(255,255,255,0.4); cursor: pointer; }
.stb.sel { background: rgba(59,130,246,0.1); border-color: rgba(59,130,246,0.2); color: #60a5fa; }
.stag-row { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.stag { display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 12px; font-size: 12px; background: rgba(59,130,246,0.1); color: #60a5fa; }
.stag button { background: none; border: none; color: #60a5fa; cursor: pointer; font-size: 14px; }
/* 外部分享 */
.extern-share { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.es-label { font-size: 13px; color: rgba(255,255,255,0.4); }
.es-btn { padding: 6px 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.03); color: rgba(255,255,255,0.6); font-size: 13px; cursor: pointer; transition: all 0.2s; }
.es-btn:hover { background: rgba(255,255,255,0.08); color: white; }
/* 保存 */
.save-btn { width: 100%; padding: 14px; border-radius: 12px; border: none; font-size: 16px; font-weight: 700; cursor: pointer; background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; box-shadow: 0 4px 16px rgba(139,92,246,0.3); transition: all 0.2s; }
.save-btn:hover { transform: translateY(-1px); } .save-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
/* 折线图 */
.chart-container { margin-bottom: 20px; }
.chart-label { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.6); margin-bottom: 6px; }
.line-chart { width: 100%; height: 100px; display: block; }
.x-labels { display: flex; justify-content: space-between; padding: 4px 0; } .x-labels span { font-size: 10px; color: rgba(255,255,255,0.25); width: 14.28%; text-align: center; }
/* AI 对话 */
.ai-chat-card { display: flex; flex-direction: column; }
.ai-chat-body { max-height: 300px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; padding: 4px; }
.ai-msg { max-width: 85%; padding: 10px 14px; border-radius: 12px; font-size: 13px; line-height: 1.6; white-space: pre-wrap; }
.ai-msg.ai { background: rgba(139,92,246,0.08); color: rgba(255,255,255,0.7); align-self: flex-start; border-bottom-left-radius: 4px; }
.ai-msg.user { background: rgba(59,130,246,0.15); color: white; align-self: flex-end; border-bottom-right-radius: 4px; }
.msg-text { display: block; }
.ai-chat-input { display: flex; gap: 8px; }
.ai-chat-input input { flex: 1; padding: 10px 14px; border-radius: 10px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: white; font-size: 13px; outline: none; }
.ai-chat-input input::placeholder { color: rgba(255,255,255,0.25); }
.ai-chat-input button { padding: 10px 20px; border-radius: 10px; border: none; background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; font-size: 13px; font-weight: 600; cursor: pointer; }
.ai-chat-input button:disabled { opacity: 0.5; }
/* 历史 */
.history-item { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 10px; cursor: pointer; transition: all 0.15s; }
.history-item:hover { background: rgba(255,255,255,0.04); }
.hi-date { font-size: 14px; font-weight: 600; color: white; min-width: 90px; }
.hi-tags { flex: 1; font-size: 12px; color: rgba(255,255,255,0.4); display: flex; gap: 8px; }
.hi-arrow { color: rgba(255,255,255,0.2); font-size: 18px; }
.load-more-btn { width: 100%; padding: 10px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.08); background: transparent; color: rgba(255,255,255,0.4); font-size: 13px; cursor: pointer; margin-top: 8px; }
.empty-hint { text-align: center; padding: 40px 0; color: rgba(255,255,255,0.3); font-size: 14px; }
/* 弹窗 */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); z-index: 2000; display: flex; align-items: center; justify-content: center; }
.modal-body { background: #111118; border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 28px; width: 440px; max-width: 90vw; }
.modal-body h3 { font-size: 18px; margin-bottom: 16px; color: white; }
.modal-body p { font-size: 14px; color: rgba(255,255,255,0.6); margin: 0 0 8px; }
.hint { font-size: 12px !important; color: rgba(139,92,246,0.7) !important; }
.modal-btns { display: flex; gap: 10px; margin-top: 20px; }
.mbtn { flex: 1; padding: 10px; border-radius: 10px; font-size: 14px; cursor: pointer; }
.mbtn.cancel { border: 1px solid rgba(255,255,255,0.1); background: transparent; color: rgba(255,255,255,0.6); }
.mbtn.confirm { border: none; background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; font-weight: 600; }
.mbtn.confirm:disabled { opacity: 0.5; }
.close-btn { position: absolute; top: 16px; right: 16px; background: none; border: none; color: rgba(255,255,255,0.4); font-size: 18px; cursor: pointer; }
/* 记录详情 */
.record-detail { position: relative; } .rd-header { display: flex; justify-content: space-between; align-items: center; }
.rd-section { margin-bottom: 16px; } .rd-section b { font-size: 14px; color: white; display: block; margin-bottom: 6px; }
.rd-section p { font-size: 13px; color: rgba(255,255,255,0.5); margin: 0; }
.rd-meal { font-size: 13px; color: rgba(255,255,255,0.5); padding: 2px 0; }
.rd-dot { margin-right: 6px; } .rd-dot.done { color: #10b981; }
/* 举报 */
.report-reasons { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
.rr-btn { padding: 6px 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.08); background: transparent; color: rgba(255,255,255,0.5); font-size: 13px; cursor: pointer; }
.rr-btn.sel { background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.25); color: #f87171; }
.report-note { width: 100%; padding: 10px; border-radius: 10px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: white; font-size: 13px; outline: none; resize: none; height: 60px; box-sizing: border-box; }
.report-btn { background: none; border: none; font-size: 14px; cursor: pointer; opacity: 0.4; transition: opacity 0.2s; margin-left: auto; }
.report-btn:hover { opacity: 1; }
/* 分享预览 */
.share-modal .share-preview { padding: 12px; border-radius: 10px; background: rgba(255,255,255,0.03); font-size: 13px; color: rgba(255,255,255,0.5); margin-bottom: 16px; }
.share-modal .share-btns { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
/* 广场 */
.plaza-filters { display: flex; gap: 8px; margin-bottom: 20px; }
.fbtn { padding: 8px 18px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.08); background: transparent; color: rgba(255,255,255,0.5); font-size: 13px; font-weight: 600; cursor: pointer; }
.fbtn.on { background: rgba(255,255,255,0.08); color: white; }
.fbtn.disabled { opacity: 0.35; cursor: not-allowed; }
.plaza-feed { display: flex; flex-direction: column; gap: 16px; }
.ph { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.pa { width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, #3b82f6, #ef4444); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; color: white; flex-shrink: 0; }
.pi { display: flex; flex-direction: column; } .pn { font-size: 14px; font-weight: 600; color: white; } .pt { font-size: 12px; color: rgba(255,255,255,0.3); }
.ptxt { font-size: 14px; color: rgba(255,255,255,0.7); line-height: 1.6; margin-bottom: 10px; }
.psum { display: flex; gap: 8px; margin-bottom: 10px; flex-wrap: wrap; } .ps { padding: 4px 10px; border-radius: 8px; font-size: 12px; background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.5); }
.ptags { display: flex; gap: 6px; margin-bottom: 10px; } .ptg { font-size: 12px; color: #60a5fa; }
.pai { padding: 10px 14px; border-radius: 10px; margin-bottom: 12px; background: rgba(139,92,246,0.06); border: 1px solid rgba(139,92,246,0.1); font-size: 13px; color: rgba(255,255,255,0.5); }
.pacts { display: flex; gap: 12px; margin-bottom: 8px; }
.ab { background: transparent; border: none; color: rgba(255,255,255,0.4); font-size: 13px; cursor: pointer; padding: 4px 8px; border-radius: 6px; }
.ab:hover { background: rgba(255,255,255,0.05); } .ab.liked { color: #ef4444; }
.cmt-sec { border-top: 1px solid rgba(255,255,255,0.06); padding-top: 10px; }
.cmt-item { font-size: 13px; color: rgba(255,255,255,0.5); padding: 4px 0; } .cmt-item b { color: rgba(255,255,255,0.7); }
.cmt-row { display: flex; gap: 8px; margin-top: 8px; }
.cmt-in { flex: 1; padding: 8px 12px; border-radius: 8px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: white; font-size: 13px; outline: none; }
.cmt-in::placeholder { color: rgba(255,255,255,0.25); }
.cmt-send { padding: 8px 16px; border-radius: 8px; border: none; background: rgba(59,130,246,0.15); color: #60a5fa; font-size: 13px; font-weight: 600; cursor: pointer; }
.cmt-send:disabled { opacity: 0.3; }
/* Toast */
.htoast { position: fixed; bottom: 32px; left: 50%; transform: translateX(-50%); padding: 12px 28px; border-radius: 12px; font-size: 14px; z-index: 5000; backdrop-filter: blur(16px); }
.htoast.success { background: rgba(16,185,129,0.1); color: #34d399; border: 1px solid rgba(16,185,129,0.12); }
.htoast.error { background: rgba(239,68,68,0.1); color: #f87171; border: 1px solid rgba(239,68,68,0.12); }
.toast-enter-active, .toast-leave-active { transition: all 0.3s; } .toast-enter-from, .toast-leave-to { opacity: 0; transform: translate(-50%, 20px); }
@media (max-width: 600px) { .health-page { padding: 16px 10px 60px; } .ring { width: 64px; height: 64px; } .ring::after { width: 48px; height: 48px; top: 8px; left: 8px; } .ring-val { font-size: 13px; } .sleep-row { flex-direction: column; } .arrow { display: none; } .ex-row { flex-direction: column; } }
</style>
