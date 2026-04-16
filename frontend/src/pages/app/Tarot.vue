<template>
  <div class="tarot-v2">
    <!-- 魔法阵背景 -->
    <div class="magic-bg">
      <div class="magic-ring r1"></div>
      <div class="magic-ring r2"></div>
      <span v-for="i in 25" :key="'sp'+i" class="sparkle" :style="sparklePos(i)"></span>
    </div>

    <!-- 顶部标题 -->
    <header class="tarot-hd">
      <!-- 返回按钮（非 input 阶段显示） -->
      <button v-if="phase !== 'input' && !showHistory" class="back-btn" @click="goBack">← 返回</button>
      <h1 class="tarot-title">🔮 星火卡罗牌</h1>
      <p class="tarot-sub">轻触一张牌，听听星火的声音</p>
      <button class="hist-btn" @click="showHistory = !showHistory">
        {{ showHistory ? '✕ 关闭' : '📜 历史' }}
      </button>
    </header>

    <!-- ====== 历史抽屉 ====== -->
    <Transition name="drawer">
      <div v-if="showHistory" class="history-drawer">
        <h3>📜 抽牌记录</h3>
        <div v-if="!historyList.length" class="empty">还没有记录，去抽一张吧 ✨</div>
        <div v-for="rec in historyList" :key="rec.id" class="hist-item" @click="viewingRec = rec">
          <div class="hi-card-mini" :style="miniCardStyle(rec)">
            <span class="hi-no">{{ toRoman(rec.card_no || 0) }}</span>
          </div>
          <div class="hi-info">
            <b>{{ rec.card_name }} {{ rec.is_reversed ? '(逆位)' : '(正位)' }}</b>
            <span class="hi-q" v-if="rec.user_question">💭 {{ rec.user_question.slice(0, 20) }}</span>
            <span class="hi-date">{{ fmtDate(rec.created_at) }}</span>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ====== 主内容区 ====== -->
    <main v-if="!showHistory" class="main-area">

      <!-- ===== 阶段1: 引导输入 ===== -->
      <section v-if="phase === 'input'" class="sec-input">
        <div class="mode-tabs">
          <button :class="{ active: mode === 'question' }" @click="mode = 'question'">💭 问题解读</button>
          <button :class="{ active: mode === 'daily' }" @click="mode = 'daily'">🌅 今日指引</button>
        </div>

        <div v-if="mode === 'question'" class="q-area">
          <textarea v-model="question" :placeholder="currentHint" maxlength="500" rows="3"></textarea>
          <span class="cc">{{ question.length }}/500</span>
          <div class="hint-float">💡 试试问：{{ currentHint }}</div>
        </div>
        <div v-else class="daily-tip">
          <p>✨ 无需提问，让星火为你揭示{{ timePeriod }}的能量指引</p>
        </div>

        <!-- 选择抽牌方式 -->
        <div class="method-tabs">
          <button :class="{ active: method === 'carousel' }" @click="method = 'carousel'">🎠 旋转牌阵</button>
          <button :class="{ active: method === 'gesture' }" @click="method = 'gesture'">✋ 手势抽牌</button>
        </div>

        <button class="start-btn" :disabled="mode === 'question' && !question.trim()" @click="startFlow">
          ✨ 开始解读
        </button>
      </section>

      <!-- ===== 阶段2: 问题确认 ===== -->
      <section v-if="phase === 'confirm'" class="sec-confirm">
        <div v-if="aiAnalyzing" class="analyzing">
          <div class="pulse-ring"></div>
          <p>🧠 AI 正在理解你的问题...</p>
        </div>
        <template v-else-if="breakdown">
          <div class="bd-card">
            <div class="bd-row"><span class="bd-label">🎯 核心问题</span><span>{{ breakdown.core }}</span></div>
            <div class="bd-row"><span class="bd-label">🔍 关键方向</span><span>{{ breakdown.direction }}</span></div>
            <div class="bd-row"><span class="bd-label">💭 情绪氛围</span><span>{{ breakdown.mood }}</span></div>
            <div class="bd-row"><span class="bd-label">✍️ 优化表述</span><span>{{ breakdown.refined }}</span></div>
            <div class="bd-row" v-if="breakdown.options?.length">
              <span class="bd-label">🔀 提取选项</span>
              <span>{{ breakdown.options.join(' vs ') }}</span>
            </div>
          </div>
          <p class="disclaimer-sm">⚠️ 卡罗牌解读仅供轻娱乐参考，不构成任何建议</p>
          <div class="confirm-acts">
            <button class="btn-go" @click="proceedToDraw">✅ 满意，开始</button>
            <button class="btn-refine" @click="showRefine = !showRefine">✏️ 补充说明</button>
          </div>
          <div v-if="showRefine" class="refine-box">
            <textarea v-model="refineText" placeholder="补充说明..." maxlength="200" rows="2"></textarea>
            <button @click="doRefine">🔄 重新理解</button>
          </div>
        </template>
      </section>

      <!-- ===== 阶段3A: 3D 旋转牌阵（只旋转候选牌）===== -->
      <section v-if="phase === 'carousel'" class="sec-carousel">
        <div class="carousel-scene">
          <div class="carousel-ring" :style="{ transform: `rotateY(${ringAngle}deg)` }">
            <div
              v-for="(c, idx) in candidateCards" :key="c.no"
              class="c-card"
              :class="{ chosen: !spinning && idx === selectedIdx }"
              :style="cardPos(idx)"
            >
              <div class="c-back">
                <div class="c-inner-border"></div>
                <img src="/spark-logo.png" class="c-logo" alt="SA" />
              </div>
            </div>
          </div>
        </div>
        <p class="spin-txt">{{ spinText }}</p>
        <button v-if="!spinning && selectedIdx >= 0" class="reveal-btn" @click="revealCard">
          🎴 翻开星火之牌
        </button>
      </section>

      <!-- ===== 阶段3B: 手势模式（全新设计）===== -->
      <section v-if="phase === 'gesture'" class="sec-gesture">
        <!-- 隐藏的摄像头（不显示画面）-->
        <video ref="videoEl" autoplay playsinline muted class="cam-hidden"></video>
        <canvas ref="canvasEl" class="cam-hidden"></canvas>

        <!-- 3D牌阵区域 -->
        <div class="gesture-stage">
          <!-- 旋转魔法阵 -->
          <div class="pentagram">
            <div class="penta-ring penta-outer"></div>
            <div class="penta-ring penta-inner"></div>
            <img src="/spark-logo.png" class="penta-logo" alt="SA" />
          </div>

          <!-- 3D弧形候选牌 -->
          <div class="fan-3d">
            <div
              v-for="(c, idx) in candidateCards" :key="'g'+c.no"
              class="fan-card-3d"
              :class="{ hl: idx === gestureHL, picked: idx === gesturePicked }"
              :style="fan3dPos(idx)"
            >
              <div class="c-back-3d">
                <div class="c-inner-border"></div>
                <img src="/spark-logo.png" class="c-logo" alt="SA" />
              </div>
            </div>
          </div>

          <!-- 星火光标 -->
          <div v-if="handDetected" class="spark-cursor" :style="cursorPos">
            <div class="spark-core"></div>
            <div class="spark-trail"></div>
          </div>
        </div>

        <!-- 状态提示 -->
        <div class="gesture-hint">
          <p v-if="!handDetected">👋 请将手放入镜头范围内</p>
          <p v-else-if="gestureConfirming">✊ 手指收拢中... {{ Math.ceil((1500 - gestureTimer) / 1000) }}s</p>
          <p v-else>☝️ 移动手指选牌 · 握拳/手指内缩揭牌</p>
        </div>

        <!-- 确认进度 -->
        <div v-if="gestureConfirming" class="g-progress">
          <div class="g-bar" :style="{ width: gestureProgress + '%' }"></div>
        </div>
      </section>

      <!-- ===== 阶段4: 结果展示 ===== -->
      <section v-if="phase === 'result' && pickedCard" class="sec-result">
        <div class="rv-wrapper">
          <div class="rv-card" :class="{ flipped: cardFlipped, reversed: isReversed }">
            <!-- 正面 -->
            <div class="rv-front" :style="{ borderColor: pickedCard.glow + '44' }">
              <div class="rv-gold-frame"></div>
              <div class="rv-starfield"></div>
              <div class="rv-corner tl">◈</div>
              <div class="rv-corner br">◈</div>
              <div class="rv-no">{{ toRoman(pickedCard.no) }}</div>
              <div class="rv-symbol" :style="{ color: pickedCard.glow }">{{ pickedCard.symbol }}</div>
              <div class="rv-name-zh">{{ pickedCard.nameZh }}</div>
              <div class="rv-name-en">{{ pickedCard.nameEn }}</div>
              <div class="rv-orient" :class="isReversed ? 'rev' : 'upr'">
                {{ isReversed ? '逆位' : '正位' }}
              </div>
            </div>
            <!-- 背面 -->
            <div class="rv-back">
              <div class="c-inner-border"></div>
              <img src="/spark-logo.png" class="c-logo lg" alt="SA" />
            </div>
          </div>
        </div>

        <div v-if="cardFlipped" class="reading-zone">
          <div class="r-header">🤖 星火解读</div>
          <p class="r-text">{{ displayedText }}<span v-if="isTyping" class="cursor">|</span></p>
          <div v-if="!isTyping" class="kw-cloud">
            <span v-for="kw in pickedCard.keywords" :key="kw" class="kw">{{ kw }}</span>
          </div>
          <p v-if="!isTyping" class="disclaimer">⚠️ 以上内容仅供轻娱乐参考</p>
        </div>

        <div v-if="!isTyping && cardFlipped" class="result-acts">
          <button class="ra primary" @click="resetAll">🔄 再抽一张</button>
          <button class="ra" @click="shareToWall">🌐 分享到校园墙</button>
          <button class="ra" @click="copyReading">📋 复制分享</button>
          <button v-if="isStudyRelated" class="ra sched" @click="syncSchedule">📅 同步到日程</button>
        </div>
      </section>

      <!-- 错误 -->
      <section v-if="phase === 'error'" class="sec-error">
        <div class="err-icon">🌙</div>
        <p>{{ errorMsg }}</p>
        <button class="ra primary" @click="phase = 'input'">返回</button>
      </section>
    </main>

    <!-- 历史详情弹窗（含追问功能）-->
    <Teleport to="body">
      <div v-if="viewingRec" class="modal-mask" @click.self="viewingRec = null">
        <div class="modal-box">
          <div class="modal-top">
            <h3>🔮 {{ viewingRec.card_name }}</h3>
            <button @click="viewingRec = null">✕</button>
          </div>
          <p class="modal-date">{{ fmtDate(viewingRec.created_at) }} · {{ viewingRec.is_reversed ? '逆位' : '正位' }}</p>
          <p v-if="viewingRec.user_question" class="modal-q">💭 {{ viewingRec.user_question }}</p>
          <p class="modal-r">{{ viewingRec.ai_reading }}</p>

          <!-- 追问区 -->
          <div class="followup-zone">
            <h4>💬 追问星火</h4>
            <div v-for="(fu, i) in viewingRec._followups || []" :key="i" class="fu-item">
              <p class="fu-q">🙋 {{ fu.q }}</p>
              <p class="fu-a">🔮 {{ fu.a }}</p>
            </div>
            <div class="fu-input">
              <input v-model="followUpQ" placeholder="基于这张牌继续提问..." maxlength="100" @keyup.enter="doFollowUpQuery" />
              <button @click="doFollowUpQuery" :disabled="followingUp || !followUpQ.trim()">
                {{ followingUp ? '...' : '发送' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 分享弹窗 -->
    <Teleport to="body">
      <div v-if="showShareModal" class="modal-mask" @click.self="showShareModal = false">
        <div class="modal-box">
          <h3>🌐 分享到校园墙</h3>
          <label class="toggle-row">
            <input type="checkbox" v-model="shareShowQ" /><span class="sw"></span> 公开我的问题
          </label>
          <textarea v-model="shareCaption" placeholder="加一句心情..." maxlength="100" rows="2"></textarea>
          <div class="modal-btns">
            <button class="mb cancel" @click="showShareModal = false">取消</button>
            <button class="mb ok" @click="doShare">发布</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Toast -->
    <Transition name="toast">
      <div v-if="toast.show" class="htoast" :class="toast.type">{{ toast.msg }}</div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../../supabase'
import { useAuth } from '../../composables/useAuth'
import { TAROT_CARDS, type TarotCard } from '../../data/tarotCards'
import { useTarotAI, type QuestionBreakdown } from '../../composables/useTarotAI'

const router = useRouter()
const { user } = useAuth()
const { analyzing: aiAnalyzing, doAnalyze, doReading, doDailyReading, doFollowUp, selectRelevantCards, pickOneCard } = useTarotAI()

// ====== 状态 ======
type Phase = 'input' | 'confirm' | 'carousel' | 'gesture' | 'result' | 'error'
const phase = ref<Phase>('input')
const mode = ref<'question' | 'daily'>('question')
const method = ref<'carousel' | 'gesture'>('carousel')
const question = ref('')
const errorMsg = ref('')

// 问题确认
const breakdown = ref<QuestionBreakdown | null>(null)
const showRefine = ref(false)
const refineText = ref('')

// 候选牌（从22张中筛选的语义相关牌）
const candidateCards = ref<TarotCard[]>([])
const selectedIdx = ref(-1)
const pickedCard = ref<TarotCard | null>(null)
const isReversed = ref(false)

// 旋转牌阵
const ringAngle = ref(0)
const spinning = ref(false)
const spinText = ref('牌阵就绪...')
let spinRaf = 0

// 手势模式
const videoEl = ref<HTMLVideoElement | null>(null)
const handDetected = ref(false)
const gestureHL = ref(-1)
const gesturePicked = ref(-1)
const gestureConfirming = ref(false)
const gestureProgress = ref(0)
const gestureTimer = ref(0)
const cursorX = ref(50)
const cursorY = ref(50)
let gestureStream: MediaStream | null = null
let handLandmarker: any = null
let gestureRaf = 0
let confirmStart = 0

// 结果
const cardFlipped = ref(false)
const readingText = ref('')
const displayedText = ref('')
const isTyping = ref(false)
let typeTimer = 0

// 历史
const showHistory = ref(false)
const historyList = ref<any[]>([])
const viewingRec = ref<any>(null)
const followUpQ = ref('')
const followingUp = ref(false)

// 分享
const showShareModal = ref(false)
const shareShowQ = ref(false)
const shareCaption = ref('')

// Toast
const toast = reactive({ show: false, msg: '', type: 'success' as 'success' | 'error' })

// 引导提示
const hints = ['这次期末能稳住吗？', '今晚吃火锅还是烤肉？', '这段感情值得继续吗？', '实习选大厂还是创业？', '最近总失眠怎么办？', '要不要参加这个社团？']
const hintIdx = ref(0)
const currentHint = computed(() => hints[hintIdx.value])
let hintTimer = 0

// 时段
function getTimePeriod(): string {
  const h = new Date().getHours()
  if (h < 6) return '深夜'; if (h < 9) return '清晨'; if (h < 12) return '上午'
  if (h < 14) return '中午'; if (h < 18) return '下午'; if (h < 21) return '傍晚'; return '夜晚'
}
const timePeriod = computed(() => getTimePeriod())

// 学业关键词
const studyKws = ['学习', '考试', '期末', '考研', '论文', '成绩', '实习', '毕业', '高数']
const isStudyRelated = computed(() => question.value && studyKws.some(k => question.value.includes(k)))

// ====== 生命周期 ======
onMounted(() => {
  hintTimer = window.setInterval(() => { hintIdx.value = (hintIdx.value + 1) % hints.length }, 3000)
  loadHistory()
})
onUnmounted(() => {
  clearInterval(hintTimer); cancelAnimationFrame(spinRaf); cancelAnimationFrame(gestureRaf); stopCamera()
})

// ====== 返回按钮 ======
function goBack() {
  // 清理正在进行的操作
  cancelAnimationFrame(spinRaf); cancelAnimationFrame(gestureRaf); stopCamera()
  clearInterval(typeTimer)
  spinning.value = false; isTyping.value = false

  if (phase.value === 'confirm') { phase.value = 'input' }
  else if (phase.value === 'carousel' || phase.value === 'gesture') {
    phase.value = mode.value === 'question' ? 'confirm' : 'input'
  }
  else if (phase.value === 'result') { phase.value = 'input' }
  else { phase.value = 'input' }
}

// ====== 开始流程 ======
async function startFlow() {
  if (mode.value === 'question' && question.value.trim()) {
    phase.value = 'confirm'
    breakdown.value = null
    breakdown.value = await doAnalyze(question.value.trim())
  } else {
    // 今日指引：直接选牌
    proceedToDraw()
  }
}

async function doRefine() {
  if (!refineText.value.trim()) return
  const combined = question.value.trim() + '。补充：' + refineText.value.trim()
  breakdown.value = null
  breakdown.value = await doAnalyze(combined)
  showRefine.value = false; refineText.value = ''
}

// 进入抽牌
function proceedToDraw() {
  // 根据方向筛选候选牌
  const dir = breakdown.value?.direction || '自我成长'
  candidateCards.value = selectRelevantCards(dir, 7)
  // 预选一张
  const { card, isReversed: rev } = pickOneCard(candidateCards.value)
  selectedIdx.value = candidateCards.value.indexOf(card)
  isReversed.value = rev

  if (method.value === 'carousel') {
    phase.value = 'carousel'
    nextTick(() => startCarousel())
  } else {
    phase.value = 'gesture'
    nextTick(() => startGesture())
  }
}

// ====== 3D 旋转（只转候选牌）======
function cardPos(idx: number) {
  const total = candidateCards.value.length
  const angle = (360 / total) * idx
  return { transform: `rotateY(${angle}deg) translateZ(280px)` }
}

function startCarousel() {
  spinning.value = true; spinText.value = '星火为你指引...'
  const total = candidateCards.value.length
  const targetAngle = selectedIdx.value * (360 / total)
  const fullAngle = 360 * 3 + targetAngle
  const duration = 4500; const t0 = performance.now()

  function animate(now: number) {
    const p = Math.min((now - t0) / duration, 1)
    const e = 1 - Math.pow(1 - p, 4)
    ringAngle.value = -(e * fullAngle)
    if (p < 1) { spinRaf = requestAnimationFrame(animate) }
    else { spinning.value = false; spinText.value = '✨ 命运之牌已就位' }
  }
  spinRaf = requestAnimationFrame(animate)
}

async function revealCard() {
  pickedCard.value = candidateCards.value[selectedIdx.value]
  phase.value = 'result'; cardFlipped.value = false
  await nextTick()
  setTimeout(() => { cardFlipped.value = true }, 300)
  setTimeout(() => startReading(), 1200)
}

// ====== 手势模式（V3.5 3D弧形）======
function fan3dPos(idx: number) {
  const total = candidateCards.value.length
  const spread = 140 // 弧形展开宽度
  const startX = -spread / 2
  const step = spread / (total - 1 || 1)
  const x = startX + step * idx
  // 3D透视：中间的牌离得近且大，两侧的牌远且小
  const centerDist = Math.abs(idx - (total - 1) / 2) / ((total - 1) / 2)
  const z = -centerDist * 80 // 越远离中心 z 越小
  const rotY = (idx - (total - 1) / 2) * 12  // 向外旋转
  const scale = 1 - centerDist * 0.15
  return {
    transform: `translateX(${x}px) translateZ(${z}px) rotateY(${rotY}deg) scale(${scale})`,
    '--fan-delay': `${idx * 0.08}s`,
    zIndex: total - Math.abs(idx - Math.floor(total / 2)),
  }
}

const cursorPos = computed(() => ({
  left: `${cursorX.value}%`, top: `${cursorY.value}%`,
}))

async function startGesture() {
  try {
    gestureStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 320, height: 240 } })
    if (videoEl.value) {
      videoEl.value.srcObject = gestureStream
      // 等待视频流准备好后再初始化 MediaPipe
      await new Promise<void>(resolve => {
        videoEl.value!.addEventListener('loadeddata', () => resolve(), { once: true })
      })
    }
    const { FilesetResolver, HandLandmarker } = await import('@mediapipe/tasks-vision')
    const vision = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm')
    handLandmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
        delegate: 'GPU',
      },
      runningMode: 'VIDEO', numHands: 1,
    })
    detectHand()
  } catch (e: any) {
    console.error('手势初始化失败:', e)
    errorMsg.value = '摄像头或手势识别不可用，请使用旋转牌阵模式'; phase.value = 'error'
  }
}

function detectHand() {
  if (!handLandmarker || !videoEl.value || videoEl.value.readyState < 2) {
    gestureRaf = requestAnimationFrame(detectHand); return
  }
  const result = handLandmarker.detectForVideo(videoEl.value, performance.now())
  if (result.landmarks?.length > 0) {
    handDetected.value = true
    const lm = result.landmarks[0]
    const indexTip = lm[8] // 食指尖
    cursorX.value = (1 - indexTip.x) * 100 // 镜像
    cursorY.value = indexTip.y * 100

    // 食指 x 映射到牌的索引
    const total = candidateCards.value.length
    const cardIdx = Math.min(total - 1, Math.max(0, Math.floor((1 - indexTip.x) * total)))
    gestureHL.value = cardIdx

    // 手指内缩检测：指尖到掌根距离 < 阈值（手指收拢趋势）
    const wrist = lm[0]
    const tips = [8, 12, 16, 20]
    const avgTipDist = tips.reduce((sum, t) => {
      const dx = lm[t].x - wrist.x
      const dy = lm[t].y - wrist.y
      return sum + Math.sqrt(dx * dx + dy * dy)
    }, 0) / tips.length
    const isCurling = avgTipDist < 0.15 // 指尖距掌根很近 = 手指内缩

    if (isCurling) {
      if (!gestureConfirming.value) { gestureConfirming.value = true; confirmStart = performance.now() }
      gestureTimer.value = performance.now() - confirmStart
      gestureProgress.value = Math.min(100, (gestureTimer.value / 1500) * 100)
      if (gestureTimer.value >= 1500) {
        gesturePicked.value = cardIdx; selectedIdx.value = cardIdx
        isReversed.value = Math.random() < 0.4; stopCamera(); revealCard(); return
      }
    } else { gestureConfirming.value = false; gestureProgress.value = 0; gestureTimer.value = 0 }
  } else { handDetected.value = false; gestureConfirming.value = false }
  gestureRaf = requestAnimationFrame(detectHand)
}

function stopCamera() {
  cancelAnimationFrame(gestureRaf)
  gestureStream?.getTracks().forEach(t => t.stop()); gestureStream = null
}

// ====== AI 解读 + 逐字打印 ======
async function startReading() {
  isTyping.value = true; displayedText.value = ''
  const card = pickedCard.value!
  if (mode.value === 'daily') {
    readingText.value = await doDailyReading(card, isReversed.value)
  } else {
    readingText.value = await doReading(card, isReversed.value, question.value.trim(), breakdown.value?.options)
  }
  typeWriter(readingText.value)
  saveReading() // 保存到数据库
}

function typeWriter(text: string) {
  let i = 0
  typeTimer = window.setInterval(() => {
    if (i < text.length) { displayedText.value += text[i]; i++ }
    else { clearInterval(typeTimer); isTyping.value = false }
  }, 35)
}

// ====== 保存到数据库 + 刷新历史 ======
async function saveReading() {
  if (!user.value || !pickedCard.value) return
  try {
    const { data: cardRow } = await supabase
      .from('tarot_cards')
      .select('id')
      .eq('card_no', pickedCard.value.no)
      .single()

    if (!cardRow) {
      console.warn('找不到对应的卡牌记录, card_no:', pickedCard.value.no)
      return
    }

    await supabase.from('tarot_readings').insert({
      user_id: user.value.id,
      card_id: cardRow.id,
      reading_mode: mode.value,
      is_reversed: isReversed.value,
      user_question: mode.value === 'question' ? question.value.trim() : null,
      ai_reading: readingText.value,
    })
    loadHistory()
  } catch (e) { console.warn('保存记录失败:', e) }
}

// ====== 历史追问 ======
async function doFollowUpQuery() {
  if (!viewingRec.value || !followUpQ.value.trim() || followingUp.value) return
  followingUp.value = true
  const answer = await doFollowUp(viewingRec.value.card_name, viewingRec.value.ai_reading || '', followUpQ.value.trim())
  // 追加到本地记录
  if (!viewingRec.value._followups) viewingRec.value._followups = []
  viewingRec.value._followups.push({ q: followUpQ.value.trim(), a: answer })
  followUpQ.value = ''
  followingUp.value = false
}

// ====== 重置 ======
function resetAll() {
  phase.value = 'input'; pickedCard.value = null; cardFlipped.value = false
  readingText.value = ''; displayedText.value = ''; question.value = ''
  breakdown.value = null; selectedIdx.value = -1; ringAngle.value = 0
  gestureHL.value = -1; gesturePicked.value = -1; candidateCards.value = []
}

// ====== 历史加载 ======
async function loadHistory() {
  if (!user.value) return
  const { data } = await supabase.from('tarot_readings')
    .select('id, card_id, is_reversed, user_question, ai_reading, created_at, tarot_cards(card_no, name_zh)')
    .eq('user_id', user.value.id)
    .order('created_at', { ascending: false }).limit(20)
  historyList.value = (data || []).map((r: any) => {
    const cardNo = r.tarot_cards?.card_no
    const card = typeof cardNo === 'number' ? TAROT_CARDS.find(c => c.no === cardNo) : null
    return {
      ...r,
      card_name: card?.nameZh || r.tarot_cards?.name_zh || '未知',
      card_no: cardNo ?? 0,
      _followups: [],
    }
  })
}

// ====== 分享 & 工具 ======
function shareToWall() { shareCaption.value = ''; shareShowQ.value = false; showShareModal.value = true }
async function doShare() {
  if (!user.value || !pickedCard.value) return
  try {
    const { data: profile } = await supabase.from('spark_profiles')
      .select('nickname').eq('user_id', user.value.id).maybeSingle()
    const authorName = profile?.nickname || user.value.email?.split('@')[0] || '同学'

    const content = [
      `🔮 ${pickedCard.value.nameZh} ${isReversed.value ? '(逆位)' : '(正位)'}`,
      shareShowQ.value && question.value ? `💭 ${question.value}` : '',
      `🤖 ${readingText.value.slice(0, 120)}...`,
      shareCaption.value ? `💬 ${shareCaption.value}` : '',
    ].filter(Boolean).join('\n')
    await supabase.from('posts').insert({
      author_id: user.value.id,
      author_name: authorName,
      content,
      category: 'tarot',
    })
    showShareModal.value = false; showToast('已分享到校园墙 ✨')
  } catch { showToast('分享失败', 'error') }
}
function copyReading() {
  if (!pickedCard.value) return
  const t = `🔮 星火卡罗牌\n${pickedCard.value.nameZh} ${isReversed.value ? '(逆位)' : '(正位)'}\n${readingText.value}\n⚠️ 仅供娱乐参考`
  navigator.clipboard.writeText(t).then(() => showToast('已复制'))
}
function syncSchedule() {
  if (!pickedCard.value) return
  router.push(`/app/schedule?action=create&title=${encodeURIComponent('塔罗建议：' + pickedCard.value.nameZh)}&notes=${encodeURIComponent(readingText.value.slice(0, 80))}&source=tarot`)
}
function showToast(msg: string, type: 'success' | 'error' = 'success') {
  toast.show = true; toast.msg = msg; toast.type = type
  setTimeout(() => toast.show = false, 2500)
}
function fmtDate(ts: string) {
  const d = new Date(ts)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
function toRoman(n: number): string {
  const m: [number, string][] = [[21,'XXI'],[20,'XX'],[19,'XIX'],[18,'XVIII'],[17,'XVII'],[16,'XVI'],[15,'XV'],[14,'XIV'],[13,'XIII'],[12,'XII'],[11,'XI'],[10,'X'],[9,'IX'],[8,'VIII'],[7,'VII'],[6,'VI'],[5,'V'],[4,'IV'],[3,'III'],[2,'II'],[1,'I'],[0,'0']]
  return m.find(([v]) => v === n)?.[1] || String(n)
}
function sparklePos(i: number) {
  return { left: `${Math.random()*100}%`, top: `${Math.random()*100}%`, animationDelay: `${i*0.3}s`, animationDuration: `${3+Math.random()*4}s` }
}
function miniCardStyle(rec: any) {
  const card = TAROT_CARDS.find(c => c.no === rec.card_no)
  if (!card) return {}
  return { borderColor: card.glow }
}
</script>

<style scoped>
.tarot-v2{max-width:720px;margin:0 auto;padding:20px 16px 80px;min-height:85vh;position:relative;overflow:hidden}
.main-area{position:relative;z-index:1}
.magic-bg{position:fixed;inset:0;pointer-events:none;z-index:0;display:flex;align-items:center;justify-content:center}
.magic-ring{position:absolute;border-radius:50%}
.magic-ring.r1{width:600px;height:600px;border:1px solid rgba(139,92,246,.06);animation:rs 30s linear infinite;background:conic-gradient(from 0deg,transparent,rgba(139,92,246,.03),transparent,rgba(245,197,94,.02),transparent)}
.magic-ring.r2{width:400px;height:400px;border:1px dashed rgba(245,197,94,.05);animation:rs 20s linear infinite reverse}
@keyframes rs{to{transform:rotate(360deg)}}
.sparkle{position:absolute;width:3px;height:3px;border-radius:50%;background:rgba(245,197,94,.4);animation:sf ease-in-out infinite;opacity:0}
@keyframes sf{0%{opacity:0;transform:translateY(0) scale(0)}50%{opacity:.6;transform:translateY(-40px) scale(1)}100%{opacity:0;transform:translateY(-80px) scale(.3)}}
.tarot-hd{text-align:center;margin-bottom:24px;position:relative;z-index:1}
.tarot-title{font-size:28px;font-weight:800;letter-spacing:3px;background:linear-gradient(135deg,#c4b5fd,#fbbf24,#a78bfa);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.tarot-sub{font-size:13px;color:rgba(255,255,255,.25);margin-top:2px}
.hist-btn{position:absolute;right:0;top:0;padding:6px 14px;border-radius:16px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.03);color:rgba(255,255,255,.35);font-size:12px;cursor:pointer}
.back-btn{position:absolute;left:0;top:0;padding:6px 14px;border-radius:16px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.03);color:rgba(255,255,255,.35);font-size:12px;cursor:pointer;transition:all .2s}
.back-btn:hover{background:rgba(255,255,255,.08);color:white}
.mode-tabs,.method-tabs{display:flex;gap:6px;margin-bottom:16px;background:rgba(255,255,255,.02);border-radius:10px;padding:3px}
.mode-tabs button,.method-tabs button{flex:1;padding:10px;border-radius:8px;border:none;background:transparent;color:rgba(255,255,255,.3);font-size:13px;font-weight:600;cursor:pointer;transition:all .2s}
.mode-tabs button.active,.method-tabs button.active{background:rgba(139,92,246,.12);color:#a78bfa}
.q-area{position:relative;margin-bottom:14px}
.q-area textarea{width:100%;padding:14px;border-radius:12px;background:rgba(255,255,255,.03);border:1px solid rgba(139,92,246,.1);color:white;font-size:14px;line-height:1.6;outline:none;resize:none;box-sizing:border-box}
.q-area textarea:focus{border-color:rgba(139,92,246,.3)}
.q-area textarea::placeholder{color:rgba(255,255,255,.15)}
.cc{position:absolute;bottom:6px;right:10px;font-size:11px;color:rgba(255,255,255,.15)}
.hint-float{font-size:12px;color:rgba(245,197,94,.4);margin-top:6px;animation:hp 3s ease-in-out infinite}
@keyframes hp{0%,100%{opacity:.3}50%{opacity:.7}}
.daily-tip{text-align:center;padding:24px 0;margin-bottom:14px}
.daily-tip p{color:rgba(255,255,255,.25);font-size:14px}
.start-btn{width:100%;padding:14px;border-radius:12px;border:none;font-size:16px;font-weight:700;cursor:pointer;color:white;background:linear-gradient(135deg,#6d28d9,#8b5cf6);box-shadow:0 4px 24px rgba(139,92,246,.35);transition:all .3s;position:relative;overflow:hidden}
.start-btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 30px rgba(139,92,246,.5)}
.start-btn:disabled{opacity:.3;cursor:not-allowed}
.start-btn::before{content:'';position:absolute;inset:-2px;background:linear-gradient(45deg,transparent,rgba(255,255,255,.1),transparent);animation:sh 3s infinite}
@keyframes sh{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}
.analyzing{text-align:center;padding:50px 0}
.pulse-ring{width:50px;height:50px;border-radius:50%;margin:0 auto 16px;border:2px solid rgba(139,92,246,.3);animation:pr 1.5s ease-in-out infinite}
@keyframes pr{0%,100%{transform:scale(.9);opacity:.5}50%{transform:scale(1.2);opacity:1}}
.analyzing p{color:rgba(139,92,246,.6);font-size:14px}
.bd-card{background:rgba(139,92,246,.04);border:1px solid rgba(139,92,246,.08);border-radius:14px;padding:16px;margin-bottom:12px}
.bd-row{display:flex;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.03)}
.bd-row:last-child{border-bottom:none}
.bd-label{color:rgba(139,92,246,.5);font-size:12px;min-width:85px;font-weight:600}
.bd-row span:last-child{color:rgba(255,255,255,.6);font-size:13px}
.disclaimer-sm{font-size:11px;color:rgba(245,158,11,.35);text-align:center;margin-bottom:12px}
.confirm-acts{display:flex;gap:8px}
.btn-go,.btn-refine{flex:1;padding:11px;border-radius:10px;border:none;font-size:13px;font-weight:600;cursor:pointer}
.btn-go{background:linear-gradient(135deg,#6d28d9,#8b5cf6);color:white}
.btn-refine{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);color:rgba(255,255,255,.4)}
.refine-box{margin-top:10px}
.refine-box textarea{width:100%;padding:10px;border-radius:8px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);color:white;font-size:12px;outline:none;resize:none;box-sizing:border-box}
.refine-box button{margin-top:6px;padding:6px 16px;border-radius:6px;border:none;background:rgba(139,92,246,.1);color:#a78bfa;font-size:12px;cursor:pointer}
.sec-carousel{display:flex;flex-direction:column;align-items:center}
.carousel-scene{width:100%;height:380px;perspective:1200px;display:flex;align-items:center;justify-content:center}
.carousel-ring{width:120px;height:200px;position:relative;transform-style:preserve-3d}
.c-card{position:absolute;width:90px;height:140px;transform-style:preserve-3d;backface-visibility:hidden;transition:filter .3s}
.c-card.chosen{filter:drop-shadow(0 0 25px rgba(245,197,94,.7)) brightness(1.2);z-index:10}
.c-back{width:100%;height:100%;border-radius:10px;position:relative;background:linear-gradient(160deg,#0c0518,#150a2e,#0c0518);border:1.5px solid rgba(245,197,94,.15);box-shadow:0 2px 16px rgba(0,0,0,.6),inset 0 0 20px rgba(0,0,0,.3)}
.c-inner-border{position:absolute;inset:5px;border:1px solid rgba(245,197,94,.08);border-radius:7px}
.c-logo{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:30px;height:30px;opacity:.15;filter:grayscale(1) brightness(2)}
.c-logo.lg{width:50px;height:50px;opacity:.2}
.spin-txt{margin-top:12px;font-size:13px;color:rgba(139,92,246,.5);font-weight:500;animation:tp 2s ease-in-out infinite;text-align:center}
@keyframes tp{0%,100%{opacity:.3}50%{opacity:.8}}
.reveal-btn{margin-top:16px;padding:12px 32px;border-radius:24px;border:1.5px solid rgba(245,197,94,.2);background:rgba(245,197,94,.05);color:rgba(245,197,94,.7);font-size:14px;font-weight:600;cursor:pointer;transition:all .3s;animation:gb 2s ease-in-out infinite}
.reveal-btn:hover{background:rgba(245,197,94,.1);box-shadow:0 0 20px rgba(245,197,94,.2)}
@keyframes gb{0%,100%{box-shadow:0 0 8px rgba(245,197,94,.05)}50%{box-shadow:0 0 18px rgba(245,197,94,.2)}}
.cam-hidden{display:none!important}
.sec-gesture{display:flex;flex-direction:column;align-items:center;gap:20px}
.gesture-stage{width:100%;height:420px;position:relative;display:flex;align-items:center;justify-content:center;perspective:800px}
.pentagram{position:absolute;bottom:10px;width:280px;height:280px}
.penta-ring{position:absolute;inset:0;border-radius:50%}
.penta-outer{border:1.5px solid rgba(245,197,94,.1);animation:rs 15s linear infinite;box-shadow:0 0 20px rgba(245,197,94,.03)}
.penta-inner{inset:30px;border:1px dashed rgba(139,92,246,.08);animation:rs 10s linear infinite reverse}
.penta-logo{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:50px;height:50px;opacity:.06;filter:grayscale(1) brightness(2);animation:rs 20s linear infinite}
.fan-3d{position:absolute;top:40%;display:flex;align-items:center;justify-content:center;transform-style:preserve-3d}
.fan-card-3d{position:relative;transition:all .3s;animation:f3d .6s ease backwards;animation-delay:var(--fan-delay)}
@keyframes f3d{from{opacity:0;transform:translateX(0) translateZ(-100px) scale(.7)}}
.c-back-3d{width:85px;height:135px;border-radius:10px;position:relative;background:linear-gradient(160deg,#0c0518,#150a2e,#0c0518);border:1.5px solid rgba(245,197,94,.15);box-shadow:0 4px 20px rgba(0,0,0,.5),inset 0 0 15px rgba(0,0,0,.3)}
.fan-card-3d.hl{filter:drop-shadow(0 0 18px rgba(245,197,94,.6)) brightness(1.2);transform:translateY(-12px) scale(1.08)}
.fan-card-3d.picked{filter:drop-shadow(0 0 30px rgba(245,197,94,.9)) brightness(1.3);transform:translateY(-20px) scale(1.15)}
.spark-cursor{position:absolute;pointer-events:none;transition:left .08s,top .08s;z-index:20}
.spark-core{width:16px;height:16px;border-radius:50%;background:radial-gradient(circle,rgba(245,197,94,.9),rgba(139,92,246,.4));box-shadow:0 0 15px rgba(245,197,94,.5),0 0 30px rgba(139,92,246,.3);animation:sp 1.5s ease-in-out infinite}
@keyframes sp{0%,100%{transform:scale(1);box-shadow:0 0 15px rgba(245,197,94,.5)}50%{transform:scale(1.3);box-shadow:0 0 25px rgba(245,197,94,.8)}}
.spark-trail{position:absolute;top:50%;left:50%;width:40px;height:40px;margin:-20px 0 0 -20px;border-radius:50%;background:radial-gradient(circle,rgba(245,197,94,.1),transparent 70%)}
.gesture-hint{text-align:center}
.gesture-hint p{font-size:13px;color:rgba(255,255,255,.35)}
.g-progress{width:200px;height:4px;background:rgba(255,255,255,.05);border-radius:2px;overflow:hidden}
.g-bar{height:100%;background:linear-gradient(90deg,#a78bfa,#fbbf24);border-radius:2px;transition:width .1s}
.sec-result{display:flex;flex-direction:column;align-items:center;gap:18px}
.rv-wrapper{perspective:1000px}
.rv-card{width:180px;height:290px;position:relative;transform-style:preserve-3d;transition:transform .8s cubic-bezier(.4,0,.2,1)}
.rv-card.flipped{transform:rotateY(180deg)}
.rv-card.reversed.flipped{transform:rotateY(180deg) rotate(180deg)}
.rv-front,.rv-back{position:absolute;inset:0;backface-visibility:hidden;border-radius:14px}
.rv-front{transform:rotateY(180deg);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:20px;background:linear-gradient(160deg,#0c0518,#150a2e,#0c0518);border:1.5px solid rgba(245,197,94,.2);box-shadow:0 0 30px rgba(139,92,246,.15),inset 0 0 30px rgba(0,0,0,.4)}
.rv-back{background:linear-gradient(160deg,#0c0518,#150a2e,#0c0518);border:1.5px solid rgba(245,197,94,.15);display:flex;align-items:center;justify-content:center;overflow:hidden}
.rv-gold-frame{position:absolute;inset:6px;border:1px solid rgba(245,197,94,.12);border-radius:9px;pointer-events:none}
.rv-starfield{position:absolute;inset:0;background:radial-gradient(circle at 30% 30%,rgba(139,92,246,.03) 0%,transparent 50%),radial-gradient(circle at 70% 70%,rgba(245,197,94,.02) 0%,transparent 50%)}
.rv-corner{position:absolute;font-size:10px;color:rgba(245,197,94,.15);z-index:1}
.rv-corner.tl{top:10px;left:12px}
.rv-corner.br{bottom:10px;right:12px}
.rv-no{font-size:16px;font-weight:300;color:rgba(245,197,94,.3);letter-spacing:4px;z-index:1}
.rv-symbol{font-size:44px;z-index:1;filter:drop-shadow(0 0 20px currentColor);animation:sf2 3s ease-in-out infinite}
@keyframes sf2{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
.rv-name-zh{font-size:26px;font-weight:800;color:rgba(255,255,255,.9);z-index:1;letter-spacing:6px;text-shadow:0 0 20px rgba(139,92,246,.3)}
.rv-name-en{font-size:10px;color:rgba(245,197,94,.25);z-index:1;text-transform:uppercase;letter-spacing:2px}
.rv-orient{padding:4px 12px;border-radius:12px;font-size:10px;font-weight:600;z-index:1}
.rv-orient.upr{background:rgba(16,185,129,.08);color:rgba(52,211,153,.6);border:1px solid rgba(16,185,129,.1)}
.rv-orient.rev{background:rgba(245,158,11,.08);color:rgba(251,191,36,.6);border:1px solid rgba(245,158,11,.1)}
.reading-zone{width:100%;background:rgba(139,92,246,.03);border:1px solid rgba(139,92,246,.06);border-radius:14px;padding:18px;box-sizing:border-box;animation:fu .5s ease}
@keyframes fu{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
.r-header{font-size:13px;font-weight:600;color:rgba(139,92,246,.5);margin-bottom:10px}
.r-text{font-size:14px;line-height:1.8;color:rgba(255,255,255,.6);white-space:pre-wrap}
.cursor{color:#a78bfa;animation:bk .6s step-end infinite}
@keyframes bk{50%{opacity:0}}
.kw-cloud{display:flex;flex-wrap:wrap;gap:5px;margin-top:12px}
.kw{padding:3px 10px;border-radius:10px;font-size:11px;background:rgba(245,197,94,.04);border:1px solid rgba(245,197,94,.08);color:rgba(245,197,94,.4)}
.disclaimer{margin-top:12px;font-size:10px;color:rgba(255,255,255,.15);text-align:center}
.result-acts{display:flex;gap:6px;flex-wrap:wrap;width:100%}
.ra{flex:1;min-width:100px;padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,.05);background:rgba(255,255,255,.02);color:rgba(255,255,255,.4);font-size:12px;font-weight:600;cursor:pointer;transition:all .2s}
.ra:hover{background:rgba(255,255,255,.06);color:white}
.ra.primary{border:none;background:linear-gradient(135deg,#6d28d9,#8b5cf6);color:white}
.ra.sched{background:rgba(59,130,246,.06);border-color:rgba(59,130,246,.1);color:rgba(96,165,250,.7)}
.sec-error{text-align:center;padding:50px 20px}
.err-icon{font-size:40px;margin-bottom:14px}
.sec-error p{font-size:14px;color:rgba(255,255,255,.3);margin-bottom:16px}
.history-drawer h3{font-size:16px;color:white;margin-bottom:12px}
.hist-item{display:flex;align-items:center;gap:10px;padding:10px;border-radius:10px;cursor:pointer;margin-bottom:4px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.03);transition:all .15s}
.hist-item:hover{background:rgba(255,255,255,.05)}
.hi-card-mini{width:36px;height:52px;border-radius:6px;display:flex;align-items:center;justify-content:center;background:linear-gradient(160deg,#0c0518,#150a2e);border:1px solid rgba(245,197,94,.1)}
.hi-no{font-size:9px;color:rgba(245,197,94,.2)}
.hi-info{display:flex;flex-direction:column;gap:1px;flex:1}
.hi-info b{font-size:13px;color:rgba(255,255,255,.7)}
.hi-q{font-size:11px;color:rgba(139,92,246,.3)}
.hi-date{font-size:11px;color:rgba(255,255,255,.15)}
.empty{text-align:center;padding:30px 0;color:rgba(255,255,255,.2);font-size:13px}
.followup-zone{margin-top:14px;border-top:1px solid rgba(255,255,255,.04);padding-top:12px}
.followup-zone h4{font-size:13px;color:rgba(139,92,246,.5);margin-bottom:8px}
.fu-item{margin-bottom:10px}
.fu-q{font-size:12px;color:rgba(255,255,255,.4);margin-bottom:4px}
.fu-a{font-size:13px;color:rgba(255,255,255,.55);padding:8px;border-radius:8px;background:rgba(139,92,246,.03);border:1px solid rgba(139,92,246,.05);line-height:1.6}
.fu-input{display:flex;gap:6px}
.fu-input input{flex:1;padding:8px 10px;border-radius:8px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.05);color:white;font-size:12px;outline:none}
.fu-input button{padding:8px 14px;border-radius:8px;border:none;background:rgba(139,92,246,.1);color:#a78bfa;font-size:12px;cursor:pointer}
.fu-input button:disabled{opacity:.3}
.modal-mask{position:fixed;inset:0;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);z-index:2000;display:flex;align-items:center;justify-content:center}
.modal-box{background:#0d0d14;border:1px solid rgba(255,255,255,.05);border-radius:18px;padding:22px;width:420px;max-width:90vw;max-height:80vh;overflow-y:auto}
.modal-box h3{font-size:16px;color:white}
.modal-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
.modal-top button{background:none;border:none;color:rgba(255,255,255,.25);font-size:18px;cursor:pointer}
.modal-date{font-size:11px;color:rgba(255,255,255,.2);margin-bottom:8px}
.modal-q{font-size:12px;color:rgba(139,92,246,.4);margin-bottom:8px;padding:6px;border-radius:6px;background:rgba(139,92,246,.03)}
.modal-r{font-size:13px;line-height:1.7;color:rgba(255,255,255,.5)}
.toggle-row{display:flex;align-items:center;gap:8px;cursor:pointer;font-size:12px;color:rgba(255,255,255,.4);margin-bottom:10px}
.toggle-row input{display:none}
.sw{width:32px;height:16px;border-radius:8px;background:rgba(255,255,255,.08);position:relative;transition:all .2s}
.sw::after{content:'';position:absolute;width:12px;height:12px;border-radius:50%;background:white;top:2px;left:2px;transition:all .2s}
.toggle-row input:checked+.sw{background:#8b5cf6}
.toggle-row input:checked+.sw::after{left:18px}
.modal-box textarea{width:100%;padding:8px;border-radius:8px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.05);color:white;font-size:12px;outline:none;resize:none;box-sizing:border-box;margin-bottom:10px}
.modal-btns{display:flex;gap:8px}
.mb{flex:1;padding:8px;border-radius:8px;font-size:13px;cursor:pointer}
.mb.cancel{border:1px solid rgba(255,255,255,.06);background:transparent;color:rgba(255,255,255,.4)}
.mb.ok{border:none;background:linear-gradient(135deg,#6d28d9,#8b5cf6);color:white;font-weight:600}
.htoast{position:fixed;bottom:28px;left:50%;transform:translateX(-50%);padding:10px 24px;border-radius:10px;font-size:13px;z-index:5000;backdrop-filter:blur(12px)}
.htoast.success{background:rgba(16,185,129,.08);color:#34d399;border:1px solid rgba(16,185,129,.08)}
.htoast.error{background:rgba(239,68,68,.08);color:#f87171;border:1px solid rgba(239,68,68,.08)}
.toast-enter-active,.toast-leave-active{transition:all .3s}
.toast-enter-from,.toast-leave-to{opacity:0;transform:translate(-50%,16px)}
.drawer-enter-active,.drawer-leave-active{transition:all .3s ease}
.drawer-enter-from,.drawer-leave-to{opacity:0;transform:translateX(16px)}
@media(max-width:500px){.tarot-v2{padding:10px 8px 60px}.carousel-scene{height:320px}.c-card{width:70px;height:110px}.rv-card{width:160px;height:260px}.rv-name-zh{font-size:22px}.gesture-stage{height:350px}.pentagram{width:250px;height:250px}.result-acts{flex-direction:column}.ra{min-width:100%}}
</style>
