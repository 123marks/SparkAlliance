<template>
  <div class="tarot-realm" :class="{ 'realm-drawing': phase === 'carousel' || phase === 'gesture' }">
    <!-- 宇宙粒子背景 -->
    <canvas ref="bgCanvas" class="bg-particles"></canvas>

    <!-- 魔法阵 -->
    <div class="magic-circle-container">
      <div class="magic-circle mc-1"></div>
      <div class="magic-circle mc-2"></div>
      <div class="magic-circle mc-3"></div>
      <svg class="pentagram-svg" viewBox="0 0 400 400">
        <circle cx="200" cy="200" r="180" fill="none" stroke="rgba(245,197,94,0.06)" stroke-width="0.5"/>
        <circle cx="200" cy="200" r="140" fill="none" stroke="rgba(139,92,246,0.06)" stroke-width="0.5" stroke-dasharray="4 8"/>
        <polygon :points="pentaPoints" fill="none" stroke="rgba(245,197,94,0.08)" stroke-width="0.5"/>
      </svg>
    </div>

    <!-- 顶部导航 -->
    <header class="realm-header">
      <button class="hdr-btn back" @click="handleBack" :title="phase === 'input' ? '返回上一页' : '返回上一步'">
        <span class="btn-icon">←</span>
      </button>
      <div class="hdr-center">
        <h1 class="realm-title">星火卡罗牌</h1>
        <p class="realm-sub">{{ subtitleText }}</p>
      </div>
      <button class="hdr-btn hist" @click="showHistory = !showHistory">
        <span class="btn-icon">{{ showHistory ? '✕' : '☰' }}</span>
      </button>
    </header>

    <!-- ====== 历史侧栏 ====== -->
    <Transition name="slide-right">
      <aside v-if="showHistory" class="history-panel">
        <div class="hp-header">
          <h3>抽牌记录</h3>
          <span class="hp-count" v-if="historyList.length">{{ historyList.length }} 条</span>
        </div>
        <div v-if="!historyList.length" class="hp-empty">
          <div class="empty-symbol">🌙</div>
          <p>还没有记录</p>
          <p class="empty-hint">去抽一张，让星火指引你</p>
        </div>
        <div class="hp-list" v-else>
          <div
            v-for="rec in historyList" :key="rec.id"
            class="hp-item"
            @click="viewingRec = rec; showHistory = false"
          >
            <div class="hpi-card" :style="{ '--card-glow': getCardGlow(rec.card_no) }">
              <span class="hpi-symbol">{{ getCardSymbol(rec.card_no) }}</span>
            </div>
            <div class="hpi-info">
              <div class="hpi-name">{{ rec.card_name }}</div>
              <div class="hpi-orient" :class="rec.is_reversed ? 'reversed' : 'upright'">
                {{ rec.is_reversed ? '逆位' : '正位' }}
              </div>
              <div class="hpi-q" v-if="rec.user_question">{{ rec.user_question.slice(0, 18) }}...</div>
              <div class="hpi-date">{{ fmtDate(rec.created_at) }}</div>
            </div>
          </div>
        </div>
      </aside>
    </Transition>

    <!-- ====== 主场景 ====== -->
    <main v-show="!showHistory" class="realm-stage">

      <!-- === 阶段1: 开始界面 === -->
      <section v-if="phase === 'input'" class="phase-input">
        <div class="input-scene">
          <!-- 浮动装饰牌 -->
          <div class="floating-cards">
            <div v-for="i in 5" :key="'fc'+i" class="float-card" :style="floatCardStyle(i)">
              <div class="fc-inner">
                <div class="fc-pattern"></div>
              </div>
            </div>
          </div>

          <!-- 中央面板 -->
          <div class="center-panel">
            <div class="mode-switch">
              <button :class="{ active: mode === 'question' }" @click="mode = 'question'">
                <span class="ms-icon">💭</span> 问题解读
              </button>
              <button :class="{ active: mode === 'daily' }" @click="mode = 'daily'">
                <span class="ms-icon">✦</span> 今日指引
              </button>
            </div>

            <div v-if="mode === 'question'" class="question-zone">
              <div class="qz-input-wrap">
                <textarea
                  v-model="question"
                  :placeholder="currentHint"
                  maxlength="500"
                  rows="3"
                  class="qz-textarea"
                ></textarea>
                <span class="qz-count">{{ question.length }}/500</span>
              </div>
              <div class="qz-hint">
                <span class="hint-dot"></span>
                试试问：{{ currentHint }}
              </div>
            </div>

            <div v-else class="daily-zone">
              <div class="daily-orb">
                <div class="orb-glow"></div>
                <span class="orb-text">✦</span>
              </div>
              <p class="daily-desc">无需提问，让星火为你揭示<br/><strong>{{ timePeriod }}</strong>的能量指引</p>
            </div>

            <!-- 抽牌方式 -->
            <div class="method-row">
              <button
                :class="{ active: method === 'carousel' }"
                @click="method = 'carousel'"
                class="method-btn"
              >
                <span class="mb-icon">◎</span>
                <span class="mb-text">旋转牌阵</span>
              </button>
              <button
                :class="{ active: method === 'gesture' }"
                @click="method = 'gesture'"
                class="method-btn"
              >
                <span class="mb-icon">✋</span>
                <span class="mb-text">手势抽牌</span>
              </button>
            </div>

            <button
              class="start-ritual"
              :disabled="mode === 'question' && !question.trim()"
              @click="startFlow"
            >
              <span class="sr-glow"></span>
              <span class="sr-text">开始解读</span>
            </button>
          </div>
        </div>
      </section>

      <!-- === 阶段2: 问题确认 === -->
      <section v-if="phase === 'confirm'" class="phase-confirm">
        <div v-if="aiAnalyzing" class="analyzing-orb">
          <div class="ao-ring r1"></div>
          <div class="ao-ring r2"></div>
          <div class="ao-ring r3"></div>
          <p class="ao-text">星火正在感应你的问题...</p>
        </div>

        <template v-else-if="breakdown">
          <div class="insight-card">
            <div class="ic-header">
              <span class="ic-icon">◈</span>
              <span>灵魂洞察</span>
            </div>
            <div class="ic-body">
              <div class="ic-row core">
                <span class="ic-label">核心</span>
                <span class="ic-value">{{ breakdown.core }}</span>
              </div>
              <div class="ic-row mood">
                <span class="ic-label">此刻的你</span>
                <span class="ic-value">{{ breakdown.mood }}</span>
              </div>
              <div class="ic-row refined">
                <span class="ic-label">内心真正在问</span>
                <span class="ic-value highlight">{{ breakdown.refined }}</span>
              </div>
              <div class="ic-row direction">
                <span class="ic-label">能量方向</span>
                <span class="ic-tag">{{ breakdown.direction }}</span>
              </div>
              <div v-if="breakdown.options?.length" class="ic-row options">
                <span class="ic-label">选择</span>
                <span class="ic-value">{{ breakdown.options.join(' vs ') }}</span>
              </div>
            </div>
          </div>

          <p class="disclaimer-line">卡罗牌解读仅供轻娱乐参考，不构成任何建议</p>

          <div class="confirm-actions">
            <button class="ca-btn primary" @click="proceedToDraw">满意，开始抽牌</button>
            <button class="ca-btn" @click="showRefine = !showRefine">补充说明</button>
          </div>

          <Transition name="fade-up">
            <div v-if="showRefine" class="refine-area">
              <textarea v-model="refineText" placeholder="告诉星火更多关于你的情况..." maxlength="200" rows="2"></textarea>
              <button class="refine-submit" @click="doRefine">重新感应</button>
            </div>
          </Transition>
        </template>
      </section>

      <!-- === 阶段3: 3D 旋转牌阵 === -->
      <section v-if="phase === 'carousel'" class="phase-carousel">
        <div class="carousel-space">
          <div class="cs-ring" :style="{ transform: `rotateX(12deg) rotateY(${ringAngle}deg)` }">
            <div
              v-for="(c, idx) in candidateCards" :key="c.no"
              class="cs-card"
              :class="{ chosen: !spinning && idx === selectedIdx, entering: spinning }"
              :style="csCardPos(idx)"
            >
              <div class="csc-face back">
                <div class="csc-pattern" :style="{ '--pattern-color': c.glow }">
                  <div class="csc-sigil">
                    <svg viewBox="0 0 60 60" class="sigil-svg">
                      <circle cx="30" cy="30" r="25" fill="none" stroke="currentColor" stroke-width="0.5" opacity="0.3"/>
                      <circle cx="30" cy="30" r="18" fill="none" stroke="currentColor" stroke-width="0.3" opacity="0.2"/>
                      <line x1="30" y1="5" x2="30" y2="55" stroke="currentColor" stroke-width="0.3" opacity="0.15"/>
                      <line x1="5" y1="30" x2="55" y2="30" stroke="currentColor" stroke-width="0.3" opacity="0.15"/>
                    </svg>
                  </div>
                  <span class="csc-no">{{ toRoman(c.no) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="spin-status">
          <p class="ss-text">{{ spinText }}</p>
          <div class="ss-rune" v-if="spinning">
            <span v-for="i in 3" :key="i" class="rune-dot" :style="{ animationDelay: `${i * 0.3}s` }"></span>
          </div>
        </div>

        <Transition name="fade-up">
          <button v-if="!spinning && selectedIdx >= 0" class="reveal-ritual" @click="revealCard">
            <span class="rr-glow"></span>
            翻开命运之牌
          </button>
        </Transition>
      </section>

      <!-- === 阶段3B: 手势模式 === -->
      <section v-if="phase === 'gesture'" class="phase-gesture">
        <video ref="videoEl" autoplay playsinline muted class="cam-hidden"></video>
        <canvas ref="canvasEl" class="cam-hidden"></canvas>

        <div class="gesture-space">
          <!-- 底部魔法阵 -->
          <div class="gs-magic-floor">
            <div class="gmf-ring gmf-outer"></div>
            <div class="gmf-ring gmf-inner"></div>
            <div class="gmf-runes">
              <span v-for="i in 12" :key="'r'+i" class="gmf-rune" :style="{ transform: `rotate(${i * 30}deg) translateY(-110px)` }">✦</span>
            </div>
          </div>

          <!-- 3D 扇形牌阵 -->
          <div class="gs-card-fan">
            <div
              v-for="(c, idx) in candidateCards" :key="'g'+c.no"
              class="gsf-card"
              :class="{ highlighted: idx === gestureHL, picked: idx === gesturePicked }"
              :style="gsfCardPos(idx)"
            >
              <div class="gsf-face">
                <div class="gsf-pattern" :style="{ '--glow': c.glow }">
                  <div class="gsf-sigil">◈</div>
                  <span class="gsf-no">{{ toRoman(c.no) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 手势光标 -->
          <div v-if="handDetected" class="gesture-cursor" :style="cursorPos">
            <div class="gc-core"></div>
            <div class="gc-ring"></div>
            <div class="gc-trail"></div>
          </div>
        </div>

        <!-- 手势提示 -->
        <div class="gesture-guide">
          <div class="gg-status" :class="{ detecting: handDetected, confirming: gestureConfirming }">
            <template v-if="!handDetected">
              <span class="gg-icon">✋</span>
              <span>请将手伸入镜头范围</span>
            </template>
            <template v-else-if="gestureConfirming">
              <span class="gg-icon pulse">✊</span>
              <span>握拳确认中... {{ Math.ceil((1500 - gestureTimer) / 1000) }}s</span>
              <div class="gg-progress">
                <div class="gg-bar" :style="{ width: gestureProgress + '%' }"></div>
              </div>
            </template>
            <template v-else>
              <span class="gg-icon">☝️</span>
              <span>移动食指选牌 · 握拳抽取</span>
            </template>
          </div>
        </div>
      </section>

      <!-- === 阶段4: 结果揭示 === -->
      <section v-if="phase === 'result' && pickedCard" class="phase-result">
        <div class="result-immersive">
          <!-- 顶部：卡牌居中展示 -->
          <div class="ri-card-section">
            <div class="result-card-wrap">
              <div class="rc-card" :class="{ flipped: cardFlipped }" :data-reversed="isReversed">
                <div class="rc-front" :style="{ '--card-glow': pickedCard.glow, '--c1': pickedCard.colors[0], '--c2': pickedCard.colors[1] }">
                  <div class="rcf-frame"></div>
                  <div class="rcf-starfield"></div>
                  <div class="rcf-corner tl">◈</div>
                  <div class="rcf-corner br">◈</div>
                  <div class="rcf-no">{{ toRoman(pickedCard.no) }}</div>
                  <div class="rcf-symbol">{{ pickedCard.symbol }}</div>
                  <div class="rcf-name-zh">{{ pickedCard.nameZh }}</div>
                  <div class="rcf-name-en">{{ pickedCard.nameEn }}</div>
                  <div class="rcf-orient" :class="isReversed ? 'rev' : 'upr'">
                    {{ isReversed ? '逆位' : '正位' }}
                  </div>
                  <div class="rcf-keywords">
                    <span v-for="kw in pickedCard.keywords.slice(0, 3)" :key="kw">{{ kw }}</span>
                  </div>
                </div>
                <div class="rc-back">
                  <div class="rcb-pattern">
                    <svg viewBox="0 0 120 190" class="rcb-svg">
                      <circle cx="60" cy="95" r="50" fill="none" stroke="rgba(245,197,94,0.1)" stroke-width="0.5"/>
                      <circle cx="60" cy="95" r="35" fill="none" stroke="rgba(139,92,246,0.08)" stroke-width="0.5"/>
                      <circle cx="60" cy="95" r="20" fill="none" stroke="rgba(245,197,94,0.06)" stroke-width="0.5"/>
                      <line x1="60" y1="20" x2="60" y2="170" stroke="rgba(245,197,94,0.06)" stroke-width="0.3"/>
                      <line x1="10" y1="95" x2="110" y2="95" stroke="rgba(245,197,94,0.06)" stroke-width="0.3"/>
                    </svg>
                    <span class="rcb-logo">SA</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 卡牌两侧关键词 -->
            <Transition name="fade-up">
              <div v-if="cardFlipped" class="keyword-wings">
                <div class="kw-left">
                  <span v-for="kw in pickedCard.keywords.slice(0, 2)" :key="kw" class="kw-tag">{{ kw }}</span>
                </div>
                <div class="kw-right">
                  <span v-for="kw in pickedCard.keywords.slice(2)" :key="kw" class="kw-tag">{{ kw }}</span>
                </div>
              </div>
            </Transition>
          </div>

          <!-- 底部：解读区 - 全宽居中 -->
          <Transition name="fade-up">
            <div v-if="cardFlipped" class="ri-reading-section">
              <div class="reading-panel">
                <div class="rp-header">
                  <span class="rph-icon">◈</span>
                  <span>星火解读</span>
                </div>
                <p class="rp-text">{{ displayedText }}<span v-if="isTyping" class="typing-cursor">|</span></p>
              </div>

              <Transition name="fade-up">
                <div v-if="!isTyping" class="result-actions">
                  <button class="ra-btn primary" @click="resetAll">再抽一张</button>
                  <button class="ra-btn" @click="shareToWall">分享到校园墙</button>
                  <button class="ra-btn" @click="copyReading">复制分享</button>
                  <button v-if="isStudyRelated" class="ra-btn accent" @click="syncSchedule">同步到日程</button>
                </div>
              </Transition>

              <p class="disclaimer-bottom">卡罗牌解读仅供轻娱乐参考</p>
            </div>
          </Transition>
        </div>
      </section>

      <!-- 错误 -->
      <section v-if="phase === 'error'" class="phase-error">
        <div class="err-orb">🌙</div>
        <p class="err-msg">{{ errorMsg }}</p>
        <button class="ca-btn primary" @click="phase = 'input'">返回</button>
      </section>
    </main>

    <!-- 历史详情弹窗 -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="viewingRec" class="modal-overlay" @click.self="viewingRec = null">
          <div class="modal-content">
            <div class="mc-header">
              <div class="mch-info">
                <span class="mch-symbol">{{ getCardSymbol(viewingRec.card_no) }}</span>
                <div>
                  <h3>{{ viewingRec.card_name }}</h3>
                  <span class="mch-meta">{{ fmtDate(viewingRec.created_at) }} · {{ viewingRec.is_reversed ? '逆位' : '正位' }}</span>
                </div>
              </div>
              <button class="mc-close" @click="viewingRec = null">✕</button>
            </div>

            <div class="mc-body">
              <div v-if="viewingRec.user_question" class="mcb-question">
                <span class="mcbq-label">你的问题</span>
                {{ viewingRec.user_question }}
              </div>
              <div class="mcb-reading">{{ viewingRec.ai_reading }}</div>

              <div class="mcb-followup">
                <h4>追问星火</h4>
                <div class="fu-list">
                  <div v-for="(fu, i) in viewingRec._followups || []" :key="i" class="fu-pair">
                    <div class="fu-q">{{ fu.q }}</div>
                    <div class="fu-a">{{ fu.a }}</div>
                  </div>
                </div>
                <div class="fu-input-row">
                  <input
                    v-model="followUpQ"
                    placeholder="基于这张牌继续提问..."
                    maxlength="100"
                    @keyup.enter="doFollowUpQuery"
                  />
                  <button @click="doFollowUpQuery" :disabled="followingUp || !followUpQ.trim()">
                    {{ followingUp ? '...' : '发送' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- 分享弹窗 -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showShareModal" class="modal-overlay" @click.self="showShareModal = false">
          <div class="modal-content compact">
            <h3 class="share-title">分享到校园墙</h3>
            <label class="share-toggle">
              <input type="checkbox" v-model="shareShowQ" />
              <span class="st-switch"></span>
              <span>公开我的问题</span>
            </label>
            <textarea v-model="shareCaption" placeholder="加一句心情..." maxlength="100" rows="2"></textarea>
            <div class="share-btns">
              <button class="ca-btn" @click="showShareModal = false">取消</button>
              <button class="ca-btn primary" @click="doShare">发布</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Toast -->
    <Transition name="toast">
      <div v-if="toast.show" class="realm-toast" :class="toast.type">{{ toast.msg }}</div>
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

const emit = defineEmits<{ 'back-to-calendar': [] }>()
const router = useRouter()
const { user } = useAuth()
const { analyzing: aiAnalyzing, doAnalyze, doReading, doDailyReading, doFollowUp, selectRelevantCards, pickOneCard } = useTarotAI()

type Phase = 'input' | 'confirm' | 'carousel' | 'gesture' | 'result' | 'error'
const phase = ref<Phase>('input')
const mode = ref<'question' | 'daily'>('question')
const method = ref<'carousel' | 'gesture'>('carousel')
const question = ref('')
const errorMsg = ref('')

const breakdown = ref<QuestionBreakdown | null>(null)
const showRefine = ref(false)
const refineText = ref('')

const candidateCards = ref<TarotCard[]>([])
const selectedIdx = ref(-1)
const pickedCard = ref<TarotCard | null>(null)
const isReversed = ref(false)

const ringAngle = ref(0)
const spinning = ref(false)
const spinText = ref('牌阵就绪...')
let spinRaf = 0

const videoEl = ref<HTMLVideoElement | null>(null)
const canvasEl = ref<HTMLCanvasElement | null>(null)
// 模板 ref 占位：隐藏 canvas 保留给手势帧处理扩展，避免 TS6133
void canvasEl
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

const cardFlipped = ref(false)
const readingText = ref('')
const displayedText = ref('')
const isTyping = ref(false)
let typeTimer = 0

const showHistory = ref(false)
const historyList = ref<any[]>([])
const viewingRec = ref<any>(null)
const followUpQ = ref('')
const followingUp = ref(false)

const showShareModal = ref(false)
const shareShowQ = ref(false)
const shareCaption = ref('')

const toast = reactive({ show: false, msg: '', type: 'success' as 'success' | 'error' })

const hints = [
  '这次期末能稳住吗？', '今晚吃火锅还是烤肉？',
  '这段感情值得继续吗？', '实习选大厂还是创业？',
  '最近总失眠怎么办？', '要不要参加这个社团？',
  '考研还是就业？', '该不该跟TA表白？',
]
const hintIdx = ref(0)
const currentHint = computed(() => hints[hintIdx.value])
let hintTimer = 0

const subtitleText = computed(() => {
  const texts: Record<Phase, string> = {
    input: '轻触一张牌，听听星火的声音',
    confirm: '星火正在感应你的内心',
    carousel: '命运之轮正在转动',
    gesture: '用手势从星火中抽取指引',
    result: '命运之牌已揭示',
    error: '星火暂时迷失了方向',
  }
  return texts[phase.value]
})

function getTimePeriod(): string {
  const h = new Date().getHours()
  if (h < 6) return '深夜'; if (h < 9) return '清晨'; if (h < 12) return '上午'
  if (h < 14) return '中午'; if (h < 18) return '下午'; if (h < 21) return '傍晚'; return '夜晚'
}
const timePeriod = computed(() => getTimePeriod())

const studyKws = ['学习', '考试', '期末', '考研', '论文', '成绩', '实习', '毕业', '高数']
const isStudyRelated = computed(() => question.value && studyKws.some(k => question.value.includes(k)))

const pentaPoints = computed(() => {
  const pts: string[] = []
  for (let i = 0; i < 5; i++) {
    const angle = (i * 72 - 90) * Math.PI / 180
    pts.push(`${200 + 120 * Math.cos(angle)},${200 + 120 * Math.sin(angle)}`)
  }
  return pts.join(' ')
})

// 背景粒子
const bgCanvas = ref<HTMLCanvasElement | null>(null)
let bgRaf = 0
interface Particle { x: number; y: number; vx: number; vy: number; size: number; alpha: number; color: string }
let particles: Particle[] = []

function initParticles() {
  const canvas = bgCanvas.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  canvas.width = window.innerWidth
  canvas.height = window.innerHeight

  const colors = ['rgba(139,92,246,', 'rgba(245,197,94,', 'rgba(99,102,241,', 'rgba(192,132,252,']
  particles = Array.from({ length: 60 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    vx: (Math.random() - 0.5) * 0.3,
    vy: (Math.random() - 0.5) * 0.3,
    size: Math.random() * 2 + 0.5,
    alpha: Math.random() * 0.5 + 0.1,
    color: colors[Math.floor(Math.random() * colors.length)],
  }))

  function animate() {
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    for (const p of particles) {
      p.x += p.vx; p.y += p.vy
      if (p.x < 0) p.x = canvas.width
      if (p.x > canvas.width) p.x = 0
      if (p.y < 0) p.y = canvas.height
      if (p.y > canvas.height) p.y = 0
      p.alpha += (Math.random() - 0.5) * 0.02
      p.alpha = Math.max(0.05, Math.min(0.6, p.alpha))
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fillStyle = `${p.color}${p.alpha})`
      ctx.fill()
    }
    bgRaf = requestAnimationFrame(animate)
  }
  animate()
}

// 浮动装饰牌
function floatCardStyle(i: number) {
  const positions = [
    { x: -280, y: -120, r: -25, d: 6 },
    { x: 260, y: -80, r: 20, d: 7 },
    { x: -200, y: 100, r: -15, d: 8 },
    { x: 220, y: 130, r: 12, d: 5 },
    { x: -50, y: -180, r: -8, d: 9 },
  ]
  const p = positions[i - 1] || positions[0]
  return {
    transform: `translate(${p.x}px, ${p.y}px) rotate(${p.r}deg)`,
    animationDuration: `${p.d}s`,
  }
}

function getCardGlow(cardNo: number): string {
  return TAROT_CARDS.find(c => c.no === cardNo)?.glow || 'rgba(139,92,246,0.5)'
}

function getCardSymbol(cardNo: number): string {
  return TAROT_CARDS.find(c => c.no === cardNo)?.symbol || '✦'
}

// 生命周期
onMounted(() => {
  hintTimer = window.setInterval(() => { hintIdx.value = (hintIdx.value + 1) % hints.length }, 3500)
  loadHistory()
  nextTick(() => initParticles())
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  clearInterval(hintTimer)
  cancelAnimationFrame(spinRaf)
  cancelAnimationFrame(gestureRaf)
  cancelAnimationFrame(bgRaf)
  stopCamera()
  window.removeEventListener('resize', handleResize)
})

function handleResize() {
  if (bgCanvas.value) {
    bgCanvas.value.width = window.innerWidth
    bgCanvas.value.height = window.innerHeight
  }
}

function handleBack() {
  if (viewingRec.value) {
    viewingRec.value = null
    return
  }
  if (showHistory.value) {
    showHistory.value = false
    return
  }
  if (phase.value === 'input') {
    emit('back-to-calendar')
    return
  }
  cancelAnimationFrame(spinRaf); cancelAnimationFrame(gestureRaf); stopCamera()
  clearInterval(typeTimer)
  spinning.value = false; isTyping.value = false
  if (phase.value === 'confirm') phase.value = 'input'
  else if (phase.value === 'carousel' || phase.value === 'gesture') {
    phase.value = mode.value === 'question' ? 'confirm' : 'input'
  } else phase.value = 'input'
}

// 开始流程
async function startFlow() {
  if (mode.value === 'question' && question.value.trim()) {
    phase.value = 'confirm'
    breakdown.value = null
    breakdown.value = await doAnalyze(question.value.trim())
  } else {
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

function proceedToDraw() {
  const dir = breakdown.value?.direction || '自我成长'
  candidateCards.value = selectRelevantCards(dir, 7)
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

// 3D 旋转牌阵
function csCardPos(idx: number) {
  const total = candidateCards.value.length
  const angle = (360 / total) * idx
  return {
    transform: `rotateY(${angle}deg) translateZ(280px)`,
    '--card-angle': `${angle}deg`,
  }
}

function startCarousel() {
  spinning.value = true; spinText.value = '星火为你指引...'
  const total = candidateCards.value.length
  const targetAngle = selectedIdx.value * (360 / total)
  const fullAngle = 360 * 4 + targetAngle
  const duration = 5000; const t0 = performance.now()

  function animate(now: number) {
    const p = Math.min((now - t0) / duration, 1)
    const e = 1 - Math.pow(1 - p, 4)
    ringAngle.value = -(e * fullAngle)
    if (p < 1) spinRaf = requestAnimationFrame(animate)
    else { spinning.value = false; spinText.value = '命运之牌已就位' }
  }
  spinRaf = requestAnimationFrame(animate)
}

async function revealCard() {
  pickedCard.value = candidateCards.value[selectedIdx.value]
  phase.value = 'result'; cardFlipped.value = false
  await nextTick()
  setTimeout(() => { cardFlipped.value = true }, 400)
  setTimeout(() => startReading(), 1500)
}

// 手势模式
function gsfCardPos(idx: number) {
  const total = candidateCards.value.length
  const spreadAngle = 120
  const startAngle = -spreadAngle / 2
  const step = spreadAngle / (total - 1 || 1)
  const angle = startAngle + step * idx
  const rad = angle * Math.PI / 180
  const radius = 200
  const x = Math.sin(rad) * radius
  const y = -Math.cos(rad) * radius * 0.3 + 50
  const z = -Math.abs(angle) * 0.8
  const scale = 1 - Math.abs(angle) / spreadAngle * 0.2

  return {
    transform: `translate3d(${x}px, ${y}px, ${z}px) rotateY(${angle * 0.3}deg) scale(${scale})`,
    '--fan-delay': `${idx * 0.1}s`,
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
    const indexTip = lm[8]
    cursorX.value = (1 - indexTip.x) * 100
    cursorY.value = indexTip.y * 100

    const total = candidateCards.value.length
    const cardIdx = Math.min(total - 1, Math.max(0, Math.floor((1 - indexTip.x) * total)))
    gestureHL.value = cardIdx

    const wrist = lm[0]
    const tips = [8, 12, 16, 20]
    const avgTipDist = tips.reduce((sum, t) => {
      const dx = lm[t].x - wrist.x
      const dy = lm[t].y - wrist.y
      return sum + Math.sqrt(dx * dx + dy * dy)
    }, 0) / tips.length
    const isCurling = avgTipDist < 0.15

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

// AI 解读
async function startReading() {
  isTyping.value = true; displayedText.value = ''
  const card = pickedCard.value!
  if (mode.value === 'daily') {
    readingText.value = await doDailyReading(card, isReversed.value)
  } else {
    readingText.value = await doReading(card, isReversed.value, question.value.trim(), breakdown.value?.options)
  }
  typeWriter(readingText.value)
  saveReading()
}

function typeWriter(text: string) {
  let i = 0
  typeTimer = window.setInterval(() => {
    if (i < text.length) { displayedText.value += text[i]; i++ }
    else { clearInterval(typeTimer); isTyping.value = false }
  }, 30)
}

// 数据库
async function saveReading() {
  if (!user.value || !pickedCard.value) return
  try {
    const { data: cardRow } = await supabase
      .from('tarot_cards').select('id')
      .eq('card_no', pickedCard.value.no).single()
    if (!cardRow) return
    await supabase.from('tarot_readings').insert({
      user_id: user.value.id, card_id: cardRow.id,
      reading_mode: mode.value, is_reversed: isReversed.value,
      user_question: mode.value === 'question' ? question.value.trim() : null,
      ai_reading: readingText.value,
    })
    loadHistory()
  } catch (e) { console.warn('保存记录失败:', e) }
}

async function doFollowUpQuery() {
  if (!viewingRec.value || !followUpQ.value.trim() || followingUp.value) return
  followingUp.value = true
  const answer = await doFollowUp(viewingRec.value.card_name, viewingRec.value.ai_reading || '', followUpQ.value.trim())
  if (!viewingRec.value._followups) viewingRec.value._followups = []
  viewingRec.value._followups.push({ q: followUpQ.value.trim(), a: answer })
  followUpQ.value = ''; followingUp.value = false
}

function resetAll() {
  phase.value = 'input'; pickedCard.value = null; cardFlipped.value = false
  readingText.value = ''; displayedText.value = ''; question.value = ''
  breakdown.value = null; selectedIdx.value = -1; ringAngle.value = 0
  gestureHL.value = -1; gesturePicked.value = -1; candidateCards.value = []
}

async function loadHistory() {
  if (!user.value) return
  const { data } = await supabase.from('tarot_readings')
    .select('id, card_id, is_reversed, user_question, ai_reading, created_at, tarot_cards(card_no, name_zh)')
    .eq('user_id', user.value.id)
    .order('created_at', { ascending: false }).limit(20)
  historyList.value = (data || []).map((r: any) => {
    const cardNo = r.tarot_cards?.card_no
    const card = typeof cardNo === 'number' ? TAROT_CARDS.find(c => c.no === cardNo) : null
    return { ...r, card_name: card?.nameZh || r.tarot_cards?.name_zh || '未知', card_no: cardNo ?? 0, _followups: [] }
  })
}

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
    await supabase.from('posts').insert({ author_id: user.value.id, author_name: authorName, content, category: 'tarot' })
    showShareModal.value = false; showToast('已分享到校园墙')
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
</script>

<style scoped>
/* ====== 全局基础 ====== */
.tarot-realm {
  width: 100%;
  min-height: calc(100vh - 56px);
  background: #06030f;
  overflow-x: hidden;
  overflow-y: auto;
  color: white;
  position: relative;
}

.tarot-realm::-webkit-scrollbar { width: 4px }
.tarot-realm::-webkit-scrollbar-thumb { background: rgba(139,92,246,0.15); border-radius: 2px }

.bg-particles {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

/* ====== 魔法阵背景 ====== */
.magic-circle-container {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 600px;
  height: 600px;
  z-index: 0;
  pointer-events: none;
}

.magic-circle {
  position: absolute;
  border-radius: 50%;
  inset: 0;
}

.mc-1 {
  border: 1px solid rgba(139,92,246,0.06);
  animation: mcRotate 40s linear infinite;
  background: conic-gradient(from 0deg, transparent, rgba(139,92,246,0.03), transparent, rgba(245,197,94,0.02), transparent);
  box-shadow: 0 0 60px rgba(139,92,246,0.03);
}

.mc-2 {
  inset: 60px;
  border: 1px dashed rgba(245,197,94,0.05);
  animation: mcRotate 25s linear infinite reverse;
  box-shadow: inset 0 0 40px rgba(245,197,94,0.02);
}

.mc-3 {
  inset: 120px;
  border: 1px solid rgba(99,102,241,0.05);
  animation: mcRotate 35s linear infinite;
}

.pentagram-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  animation: mcRotate 60s linear infinite;
}

@keyframes mcRotate { to { transform: rotate(360deg) } }

/* ====== 顶部导航 ====== */
.realm-header {
  position: relative;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: rgba(6, 3, 15, 0.6);
  backdrop-filter: blur(16px) saturate(1.2);
  -webkit-backdrop-filter: blur(16px) saturate(1.2);
  border-bottom: 1px solid rgba(139, 92, 246, 0.04);
}

.hdr-btn {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.04);
  background: rgba(255,255,255,0.02);
  color: rgba(255,255,255,0.4);
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  backdrop-filter: blur(8px);
}

.hdr-btn:hover {
  background: rgba(139, 92, 246, 0.08);
  color: rgba(196, 181, 253, 0.9);
  border-color: rgba(139, 92, 246, 0.15);
  box-shadow: 0 2px 10px rgba(139, 92, 246, 0.1);
}

.hdr-center {
  text-align: center;
}

.realm-title {
  font-size: 24px;
  font-weight: 800;
  letter-spacing: 8px;
  background: linear-gradient(135deg, #c4b5fd 0%, #fbbf24 40%, #c084fc 70%, #a78bfa 100%);
  background-size: 200% 200%;
  animation: titleShift 6s ease-in-out infinite;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0 0 12px rgba(245,197,94,0.15));
}
@keyframes titleShift {
  0%, 100% { background-position: 0% 50% }
  50% { background-position: 100% 50% }
}

.realm-sub {
  font-size: 11px;
  color: rgba(255,255,255,0.18);
  margin-top: 3px;
  letter-spacing: 3px;
}

/* ====== 历史侧栏 ====== */
.history-panel {
  position: absolute;
  top: 0;
  right: 0;
  width: 340px;
  max-width: 85vw;
  height: 100%;
  background: rgba(6, 3, 15, 0.95);
  backdrop-filter: blur(24px) saturate(1.3);
  -webkit-backdrop-filter: blur(24px) saturate(1.3);
  border-left: 1px solid rgba(139, 92, 246, 0.08);
  z-index: 100;
  padding: 24px 16px;
  overflow-y: auto;
  box-shadow: -8px 0 32px rgba(0, 0, 0, 0.4);
}

.hp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.hp-header h3 {
  font-size: 16px;
  color: rgba(255,255,255,0.8);
  font-weight: 700;
}

.hp-count {
  font-size: 11px;
  color: rgba(139,92,246,0.4);
  padding: 2px 8px;
  border-radius: 8px;
  background: rgba(139,92,246,0.06);
}

.hp-empty {
  text-align: center;
  padding: 60px 20px;
}

.empty-symbol {
  font-size: 40px;
  margin-bottom: 12px;
  opacity: 0.3;
}

.hp-empty p {
  color: rgba(255,255,255,0.2);
  font-size: 13px;
}

.empty-hint {
  margin-top: 4px;
  font-size: 11px !important;
  color: rgba(245,197,94,0.25) !important;
}

.hp-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 12px;
  cursor: pointer;
  margin-bottom: 4px;
  background: rgba(255,255,255,0.015);
  border: 1px solid rgba(255,255,255,0.02);
  transition: all 0.2s;
}

.hp-item:hover {
  background: rgba(139, 92, 246, 0.06);
  border-color: rgba(139, 92, 246, 0.12);
  box-shadow: 0 2px 12px rgba(139, 92, 246, 0.06);
  transform: translateX(-2px);
}

.hpi-card {
  width: 40px;
  height: 56px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(160deg, #0c0518, #150a2e);
  border: 1px solid rgba(245,197,94,0.08);
  box-shadow: 0 0 12px var(--card-glow, rgba(139,92,246,0.15));
  flex-shrink: 0;
}

.hpi-symbol {
  font-size: 18px;
}

.hpi-info {
  flex: 1;
  min-width: 0;
}

.hpi-name {
  font-size: 13px;
  font-weight: 600;
  color: rgba(255,255,255,0.7);
}

.hpi-orient {
  display: inline-block;
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 4px;
  margin-top: 2px;
}

.hpi-orient.upright {
  background: rgba(16,185,129,0.06);
  color: rgba(52,211,153,0.5);
}

.hpi-orient.reversed {
  background: rgba(245,158,11,0.06);
  color: rgba(251,191,36,0.5);
}

.hpi-q {
  font-size: 11px;
  color: rgba(255,255,255,0.2);
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hpi-date {
  font-size: 10px;
  color: rgba(255,255,255,0.1);
  margin-top: 2px;
}

/* ====== 主场景 ====== */
.realm-stage {
  position: relative;
  z-index: 1;
  min-height: calc(100vh - 130px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 40px 40px;
  width: 100%;
  box-sizing: border-box;
}

/* ====== 阶段1: 开始 ====== */
.phase-input {
  width: 100%;
  max-width: 580px;
  margin: 0 auto;
}

.input-scene {
  position: relative;
}

.floating-cards {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.float-card {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 50px;
  height: 75px;
  animation: floatCard ease-in-out infinite alternate;
  opacity: 0.15;
}

@keyframes floatCard {
  from { transform: var(--base-transform, translate(-200px, -100px)) translateY(0); }
  to { transform: var(--base-transform, translate(-200px, -100px)) translateY(-15px); }
}

.fc-inner {
  width: 100%;
  height: 100%;
  border-radius: 6px;
  background: linear-gradient(160deg, #0c0518, #150a2e);
  border: 1px solid rgba(245,197,94,0.08);
}

.fc-pattern {
  width: 100%;
  height: 100%;
  border-radius: 6px;
  background: radial-gradient(circle at center, rgba(139,92,246,0.05) 0%, transparent 70%);
}

.center-panel {
  position: relative;
  z-index: 1;
  background: linear-gradient(160deg, rgba(139, 92, 246, 0.03), rgba(255, 255, 255, 0.01), rgba(245, 197, 94, 0.015));
  border: 1px solid rgba(139, 92, 246, 0.08);
  border-radius: 24px;
  padding: 28px 24px;
  backdrop-filter: blur(24px) saturate(1.3);
  -webkit-backdrop-filter: blur(24px) saturate(1.3);
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.02), inset 0 1px 0 rgba(255, 255, 255, 0.03);
}

.mode-switch {
  display: flex;
  gap: 4px;
  background: rgba(255,255,255,0.015);
  border-radius: 14px;
  padding: 4px;
  margin-bottom: 20px;
}

.mode-switch button {
  flex: 1;
  padding: 12px 16px;
  border-radius: 11px;
  border: none;
  background: transparent;
  color: rgba(255,255,255,0.25);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.mode-switch button.active {
  background: rgba(139, 92, 246, 0.12);
  color: #c4b5fd;
  box-shadow: 0 2px 12px rgba(139, 92, 246, 0.15);
  text-shadow: 0 0 8px rgba(196, 181, 253, 0.2);
}

.ms-icon {
  font-size: 16px;
}

.question-zone {
  margin-bottom: 16px;
}

.qz-input-wrap {
  position: relative;
}

.qz-textarea {
  width: 100%;
  padding: 16px;
  border-radius: 14px;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(139,92,246,0.08);
  color: white;
  font-size: 14px;
  line-height: 1.7;
  outline: none;
  resize: none;
  box-sizing: border-box;
  transition: border-color 0.2s;
}

.qz-textarea:focus {
  border-color: rgba(139, 92, 246, 0.3);
  box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.06), 0 0 12px rgba(139, 92, 246, 0.04);
}

.qz-textarea::placeholder {
  color: rgba(255,255,255,0.12);
}

.qz-count {
  position: absolute;
  bottom: 8px;
  right: 12px;
  font-size: 10px;
  color: rgba(255,255,255,0.1);
}

.qz-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  font-size: 12px;
  color: rgba(245,197,94,0.3);
  animation: hintPulse 3s ease-in-out infinite;
}

.hint-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: rgba(245,197,94,0.3);
}

@keyframes hintPulse { 0%,100% { opacity: 0.3 } 50% { opacity: 0.7 } }

.daily-zone {
  text-align: center;
  padding: 20px 0;
  margin-bottom: 16px;
}

.daily-orb {
  position: relative;
  width: 60px;
  height: 60px;
  margin: 0 auto 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.orb-glow {
  position: absolute;
  inset: -10px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(245,197,94,0.1) 0%, transparent 70%);
  animation: orbPulse 3s ease-in-out infinite;
}

@keyframes orbPulse { 0%,100% { transform: scale(0.9); opacity: 0.5 } 50% { transform: scale(1.2); opacity: 1 } }

.orb-text {
  font-size: 28px;
  color: rgba(245,197,94,0.6);
  z-index: 1;
}

.daily-desc {
  color: rgba(255,255,255,0.25);
  font-size: 13px;
  line-height: 1.8;
}

.daily-desc strong {
  color: rgba(245,197,94,0.5);
}

.method-row {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.method-btn {
  flex: 1;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.03);
  background: rgba(255,255,255,0.015);
  color: rgba(255,255,255,0.25);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.method-btn.active {
  border-color: rgba(139,92,246,0.18);
  background: rgba(139,92,246,0.07);
  color: rgba(196,181,253,0.8);
  box-shadow: 0 2px 10px rgba(139,92,246,0.08);
}

.mb-icon { font-size: 16px }

.start-ritual {
  width: 100%;
  padding: 16px;
  border-radius: 16px;
  border: 1px solid rgba(139,92,246,0.2);
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  color: white;
  background: linear-gradient(135deg, #6d28d9, #7c3aed, #8b5cf6);
  position: relative;
  overflow: hidden;
  transition: all 0.3s;
  box-shadow: 0 4px 20px rgba(139,92,246,0.25);
  letter-spacing: 2px;
}

.start-ritual:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 40px rgba(139,92,246,0.45), 0 0 0 1px rgba(139,92,246,0.3), 0 0 20px rgba(139,92,246,0.15);
}
.start-ritual:active:not(:disabled) {
  transform: scale(0.98);
  transition-duration: 0.1s;
}

.start-ritual:disabled {
  opacity: 0.25;
  cursor: not-allowed;
}

.sr-glow {
  position: absolute;
  inset: -2px;
  background: linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.08) 50%, transparent 70%);
  animation: shimmer 3s infinite;
}

@keyframes shimmer { 0% { transform: translateX(-100%) } 100% { transform: translateX(100%) } }

/* ====== 阶段2: 确认 ====== */
.phase-confirm {
  width: 100%;
  max-width: 520px;
  margin: 0 auto;
}

.analyzing-orb {
  text-align: center;
  padding: 60px 0;
  position: relative;
}

.ao-ring {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
}

.ao-ring.r1 { width: 80px; height: 80px; border: 1px solid rgba(139,92,246,0.15); animation: aoPulse 2s ease-in-out infinite }
.ao-ring.r2 { width: 60px; height: 60px; border: 1px solid rgba(245,197,94,0.1); animation: aoPulse 2s ease-in-out infinite 0.3s }
.ao-ring.r3 { width: 40px; height: 40px; border: 1px solid rgba(139,92,246,0.12); animation: aoPulse 2s ease-in-out infinite 0.6s }

@keyframes aoPulse { 0%,100% { transform: translate(-50%,-50%) scale(0.8); opacity: 0.3 } 50% { transform: translate(-50%,-50%) scale(1.3); opacity: 1 } }

.ao-text {
  color: rgba(139,92,246,0.4);
  font-size: 13px;
  margin-top: 60px;
}

.insight-card {
  background: rgba(139,92,246,0.025);
  border: 1px solid rgba(139,92,246,0.08);
  border-radius: 18px;
  overflow: hidden;
  margin-bottom: 14px;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 4px 20px rgba(0,0,0,0.15), 0 0 8px rgba(139,92,246,0.03);
}

.ic-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 18px;
  background: rgba(139,92,246,0.03);
  border-bottom: 1px solid rgba(139,92,246,0.04);
  font-size: 13px;
  font-weight: 600;
  color: rgba(196,181,253,0.6);
}

.ic-icon { color: rgba(245,197,94,0.4) }

.ic-body { padding: 14px 18px }

.ic-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid rgba(255,255,255,0.02);
}

.ic-row:last-child { border-bottom: none }

.ic-label {
  font-size: 11px;
  color: rgba(139,92,246,0.35);
  min-width: 80px;
  font-weight: 600;
  padding-top: 2px;
}

.ic-value {
  font-size: 13px;
  color: rgba(255,255,255,0.55);
  line-height: 1.6;
}

.ic-value.highlight {
  color: rgba(245,197,94,0.65);
  font-weight: 500;
}

.ic-tag {
  font-size: 11px;
  padding: 3px 10px;
  border-radius: 8px;
  background: rgba(139,92,246,0.06);
  color: rgba(196,181,253,0.5);
}

.disclaimer-line {
  font-size: 10px;
  color: rgba(255,255,255,0.1);
  text-align: center;
  margin-bottom: 14px;
}

.confirm-actions {
  display: flex;
  gap: 8px;
}

.ca-btn {
  flex: 1;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.04);
  background: rgba(255,255,255,0.02);
  color: rgba(255,255,255,0.35);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.ca-btn:hover {
  background: rgba(255,255,255,0.05);
  color: rgba(255,255,255,0.6);
}

.ca-btn.primary {
  border: none;
  background: linear-gradient(135deg, #6d28d9, #8b5cf6, #7c3aed);
  color: white;
  box-shadow: 0 2px 12px rgba(139,92,246,0.2);
}

.ca-btn.primary:hover {
  box-shadow: 0 4px 20px rgba(139,92,246,0.35), 0 0 12px rgba(139,92,246,0.1);
  transform: translateY(-1px);
}
.ca-btn.primary:active {
  transform: scale(0.98);
}

.refine-area {
  margin-top: 12px;
}

.refine-area textarea {
  width: 100%;
  padding: 12px;
  border-radius: 10px;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.04);
  color: white;
  font-size: 12px;
  outline: none;
  resize: none;
  box-sizing: border-box;
}

.refine-submit {
  margin-top: 6px;
  padding: 8px 16px;
  border-radius: 8px;
  border: none;
  background: rgba(139,92,246,0.08);
  color: rgba(196,181,253,0.6);
  font-size: 12px;
  cursor: pointer;
}

/* ====== 阶段3: 旋转牌阵 ====== */
.phase-carousel {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.carousel-space {
  width: 100%;
  height: 460px;
  perspective: 1400px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cs-ring {
  width: 160px;
  height: 230px;
  position: relative;
  transform-style: preserve-3d;
}

.cs-card {
  position: absolute;
  width: 110px;
  height: 170px;
  transform-style: preserve-3d;
  backface-visibility: hidden;
  transition: filter 0.4s, box-shadow 0.4s;
}

.cs-card.chosen {
  filter: drop-shadow(0 0 30px rgba(245,197,94,0.7)) brightness(1.25);
  z-index: 10;
}

.csc-face.back {
  width: 100%;
  height: 100%;
  border-radius: 12px;
  position: relative;
  overflow: hidden;
}

.csc-pattern {
  width: 100%;
  height: 100%;
  border-radius: 12px;
  background: linear-gradient(160deg, #08021a 0%, #120830 50%, #0a0418 100%);
  border: 1px solid rgba(245,197,94,0.1);
  box-shadow: 0 4px 24px rgba(0,0,0,0.5), inset 0 0 30px rgba(0,0,0,0.4);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  position: relative;
}

.csc-pattern::before {
  content: '';
  position: absolute;
  inset: 5px;
  border: 1px solid rgba(245,197,94,0.05);
  border-radius: 8px;
}

.csc-pattern::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 30%, var(--pattern-color, rgba(139,92,246,0.08)) 0%, transparent 60%);
  border-radius: 12px;
}

.csc-sigil {
  width: 50px;
  height: 50px;
  color: rgba(245,197,94,0.12);
  z-index: 1;
}

.sigil-svg {
  width: 100%;
  height: 100%;
}

.csc-no {
  font-size: 10px;
  color: rgba(245,197,94,0.15);
  letter-spacing: 2px;
  z-index: 1;
}

.spin-status {
  margin-top: 16px;
  text-align: center;
}

.ss-text {
  font-size: 14px;
  color: rgba(139,92,246,0.4);
  font-weight: 500;
  letter-spacing: 2px;
}

.ss-rune {
  display: flex;
  gap: 6px;
  justify-content: center;
  margin-top: 8px;
}

.rune-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: rgba(245,197,94,0.4);
  animation: runePulse 1.2s ease-in-out infinite;
}

@keyframes runePulse { 0%,100% { opacity: 0.2; transform: scale(0.8) } 50% { opacity: 1; transform: scale(1.2) } }

.reveal-ritual {
  margin-top: 20px;
  padding: 14px 36px;
  border-radius: 20px;
  border: 1px solid rgba(245,197,94,0.15);
  background: rgba(245,197,94,0.03);
  color: rgba(245,197,94,0.6);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: all 0.3s;
  letter-spacing: 2px;
}

.reveal-ritual:hover {
  background: rgba(245,197,94,0.08);
  box-shadow: 0 0 30px rgba(245,197,94,0.15), 0 0 60px rgba(245,197,94,0.05);
  transform: translateY(-2px);
}
.reveal-ritual:active {
  transform: scale(0.98);
  transition-duration: 0.1s;
}

.rr-glow {
  position: absolute;
  inset: 0;
  background: linear-gradient(45deg, transparent 30%, rgba(245,197,94,0.06) 50%, transparent 70%);
  animation: shimmer 2.5s infinite;
}

/* ====== 阶段3B: 手势 ====== */
.phase-gesture {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.cam-hidden { display: none !important }

.gesture-space {
  width: 100%;
  height: 450px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  perspective: 900px;
}

.gs-magic-floor {
  position: absolute;
  bottom: 0;
  width: 300px;
  height: 300px;
}

.gmf-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
}

.gmf-outer {
  border: 1px solid rgba(245,197,94,0.06);
  animation: mcRotate 20s linear infinite;
  box-shadow: 0 0 30px rgba(245,197,94,0.02);
}

.gmf-inner {
  inset: 40px;
  border: 1px dashed rgba(139,92,246,0.05);
  animation: mcRotate 12s linear infinite reverse;
}

.gmf-runes {
  position: absolute;
  inset: 0;
  animation: mcRotate 30s linear infinite;
}

.gmf-rune {
  position: absolute;
  top: 50%;
  left: 50%;
  font-size: 8px;
  color: rgba(245,197,94,0.12);
  transform-origin: 0 0;
}

.gs-card-fan {
  position: absolute;
  top: 35%;
  display: flex;
  align-items: center;
  justify-content: center;
  transform-style: preserve-3d;
}

.gsf-card {
  position: relative;
  transition: all 0.3s ease;
  animation: fanEntry 0.6s ease backwards;
  animation-delay: var(--fan-delay);
}

@keyframes fanEntry { from { opacity: 0; transform: translateY(40px) scale(0.7) } }

.gsf-face {
  width: 90px;
  height: 140px;
  border-radius: 10px;
}

.gsf-pattern {
  width: 100%;
  height: 100%;
  border-radius: 10px;
  background: linear-gradient(160deg, #08021a 0%, #120830 50%, #0a0418 100%);
  border: 1px solid rgba(245,197,94,0.1);
  box-shadow: 0 4px 20px rgba(0,0,0,0.4);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  position: relative;
}

.gsf-sigil {
  font-size: 20px;
  color: rgba(245,197,94,0.1);
}

.gsf-no {
  font-size: 9px;
  color: rgba(245,197,94,0.12);
}

.gsf-card.highlighted {
  filter: drop-shadow(0 0 20px rgba(245,197,94,0.5)) brightness(1.2);
  transform: translateY(-16px) scale(1.1) !important;
}

.gsf-card.picked {
  filter: drop-shadow(0 0 35px rgba(245,197,94,0.8)) brightness(1.3);
  transform: translateY(-24px) scale(1.18) !important;
}

.gesture-cursor {
  position: absolute;
  pointer-events: none;
  transition: left 0.08s, top 0.08s;
  z-index: 20;
}

.gc-core {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(245,197,94,0.9), rgba(139,92,246,0.4));
  box-shadow: 0 0 20px rgba(245,197,94,0.5);
  animation: gcPulse 1.5s ease-in-out infinite;
}

@keyframes gcPulse { 0%,100% { transform: scale(1) } 50% { transform: scale(1.3) } }

.gc-ring {
  position: absolute;
  top: -8px;
  left: -8px;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 1px solid rgba(245,197,94,0.2);
  animation: gcRing 2s ease-in-out infinite;
}

@keyframes gcRing { 0%,100% { transform: scale(0.8); opacity: 0.5 } 50% { transform: scale(1.2); opacity: 0 } }

.gc-trail {
  position: absolute;
  top: -18px;
  left: -18px;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(245,197,94,0.08), transparent 70%);
}

.gesture-guide {
  width: 100%;
  max-width: 320px;
}

.gg-status {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
  font-size: 13px;
  color: rgba(255,255,255,0.3);
  flex-wrap: wrap;
}

.gg-icon { font-size: 18px }
.gg-icon.pulse { animation: gcPulse 1s infinite }

.gg-progress {
  width: 100%;
  height: 3px;
  background: rgba(255,255,255,0.04);
  border-radius: 2px;
  overflow: hidden;
  margin-top: 4px;
}

.gg-bar {
  height: 100%;
  background: linear-gradient(90deg, #a78bfa, #fbbf24);
  border-radius: 2px;
  transition: width 0.1s;
}

/* ====== 阶段4: 结果 ====== */
.phase-result {
  width: 100%;
  max-width: 960px;
  margin: 0 auto;
}

.result-immersive {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}

.ri-card-section {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
}

.result-card-wrap {
  perspective: 1200px;
}

.rc-card {
  width: 200px;
  height: 310px;
  position: relative;
  transform-style: preserve-3d;
  transition: transform 1.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.rc-card.flipped {
  transform: rotateY(180deg);
  filter: drop-shadow(0 0 30px rgba(245,197,94,0.25)) drop-shadow(0 0 60px rgba(139,92,246,0.1));
}

/* 逆位不翻转卡牌，只通过标签和边框颜色区分 */

.rc-front, .rc-back {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  border-radius: 16px;
}

.rc-front {
  transform: rotateY(180deg);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px;
  background: linear-gradient(160deg, var(--c1, #0c0518), #150a2e, var(--c2, #0c0518));
  border: 1.5px solid rgba(245,197,94,0.18);
  box-shadow: 0 0 40px var(--card-glow, rgba(139,92,246,0.2)), 0 0 80px rgba(245,197,94,0.05), inset 0 0 40px rgba(0,0,0,0.4);
}

.rcf-frame {
  position: absolute;
  inset: 7px;
  border: 1px solid rgba(245,197,94,0.1);
  border-radius: 11px;
}

.rcf-starfield {
  position: absolute;
  inset: 0;
  border-radius: 16px;
  background:
    radial-gradient(circle at 25% 25%, rgba(139,92,246,0.04) 0%, transparent 50%),
    radial-gradient(circle at 75% 75%, rgba(245,197,94,0.03) 0%, transparent 50%);
}

.rcf-corner {
  position: absolute;
  font-size: 10px;
  color: rgba(245,197,94,0.12);
  z-index: 1;
}

.rcf-corner.tl { top: 12px; left: 14px }
.rcf-corner.br { bottom: 12px; right: 14px }

.rcf-no {
  font-size: 14px;
  color: rgba(245,197,94,0.25);
  letter-spacing: 4px;
  z-index: 1;
}

.rcf-symbol {
  font-size: 52px;
  z-index: 1;
  filter: drop-shadow(0 0 20px var(--card-glow));
  animation: symbolFloat 4s ease-in-out infinite;
}

@keyframes symbolFloat { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-6px) } }

.rcf-name-zh {
  font-size: 28px;
  font-weight: 800;
  color: rgba(255,255,255,0.9);
  z-index: 1;
  letter-spacing: 8px;
  text-shadow: 0 0 20px rgba(139,92,246,0.3);
}

.rcf-name-en {
  font-size: 9px;
  color: rgba(245,197,94,0.2);
  z-index: 1;
  text-transform: uppercase;
  letter-spacing: 2px;
}

.rcf-orient {
  padding: 4px 14px;
  border-radius: 12px;
  font-size: 10px;
  font-weight: 600;
  z-index: 1;
}

.rcf-orient.upr {
  background: rgba(16,185,129,0.06);
  color: rgba(52,211,153,0.55);
  border: 1px solid rgba(16,185,129,0.08);
}

.rcf-orient.rev {
  background: rgba(245,158,11,0.06);
  color: rgba(251,191,36,0.55);
  border: 1px solid rgba(245,158,11,0.08);
}

.rcf-keywords {
  display: flex;
  gap: 4px;
  z-index: 1;
  margin-top: 4px;
}

.rcf-keywords span {
  font-size: 9px;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(255,255,255,0.03);
  color: rgba(255,255,255,0.2);
}

.rc-back {
  background: linear-gradient(160deg, #08021a 0%, #120830 50%, #0a0418 100%);
  border: 1.5px solid rgba(245,197,94,0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 24px rgba(0,0,0,0.5);
}

.rcb-pattern {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.rcb-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  animation: mcRotate 20s linear infinite;
}

.rcb-logo {
  font-size: 18px;
  font-weight: 800;
  color: rgba(245,197,94,0.06);
  letter-spacing: 4px;
  z-index: 1;
}

.keyword-wings {
  position: absolute;
  inset: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  pointer-events: none;
}

.kw-left, .kw-right {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.kw-left { align-items: flex-end; padding-right: 24px }
.kw-right { align-items: flex-start; padding-left: 24px }

.kw-tag {
  padding: 5px 14px;
  border-radius: 10px;
  font-size: 11px;
  background: rgba(245,197,94,0.03);
  border: 1px solid rgba(245,197,94,0.06);
  color: rgba(245,197,94,0.3);
  animation: kwFloat 0.6s ease backwards;
  white-space: nowrap;
}

@keyframes kwFloat { from { opacity: 0; transform: translateY(8px) } }

.ri-reading-section {
  width: 100%;
  max-width: 600px;
  animation: riseUp 0.6s ease;
}

@keyframes riseUp { from { opacity: 0; transform: translateY(20px) } }

.reading-panel {
  background: rgba(139,92,246,0.025);
  border: 1px solid rgba(139,92,246,0.06);
  border-radius: 16px;
  padding: 22px 26px;
  margin-bottom: 16px;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
}

.rp-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: rgba(139,92,246,0.4);
  margin-bottom: 12px;
}

.rph-icon { color: rgba(245,197,94,0.4) }

.rp-text {
  font-size: 14px;
  line-height: 2;
  color: rgba(255,255,255,0.6);
  white-space: pre-wrap;
}

.typing-cursor {
  color: #a78bfa;
  animation: blink 0.6s step-end infinite;
}

@keyframes blink { 50% { opacity: 0 } }

.result-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.ra-btn {
  flex: 1;
  min-width: 90px;
  padding: 10px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.04);
  background: rgba(255,255,255,0.015);
  color: rgba(255,255,255,0.35);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.ra-btn:hover {
  background: rgba(255,255,255,0.04);
  color: rgba(255,255,255,0.6);
  border-color: rgba(139,92,246,0.08);
}

.ra-btn.primary {
  border: none;
  background: linear-gradient(135deg, #6d28d9, #8b5cf6);
  color: white;
  box-shadow: 0 2px 10px rgba(139,92,246,0.2);
}
.ra-btn.primary:hover {
  box-shadow: 0 4px 18px rgba(139,92,246,0.3);
  transform: translateY(-1px);
}

.ra-btn.accent {
  background: rgba(59,130,246,0.04);
  border-color: rgba(59,130,246,0.08);
  color: rgba(96,165,250,0.6);
}

.disclaimer-bottom {
  text-align: center;
  font-size: 10px;
  color: rgba(255,255,255,0.08);
  margin-top: 12px;
}

/* ====== 错误 ====== */
.phase-error {
  text-align: center;
  padding: 50px 20px;
}

.err-orb { font-size: 48px; margin-bottom: 16px; opacity: 0.3 }
.err-msg { font-size: 14px; color: rgba(255,255,255,0.25); margin-bottom: 20px }

/* ====== 弹窗 ====== */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.65);
  backdrop-filter: blur(8px);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-content {
  background: rgba(12,10,24,0.97);
  backdrop-filter: blur(24px) saturate(1.3);
  -webkit-backdrop-filter: blur(24px) saturate(1.3);
  border: 1px solid rgba(139,92,246,0.08);
  border-radius: 20px;
  padding: 24px;
  width: 460px;
  max-width: 90vw;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 24px 64px rgba(0,0,0,0.5), 0 0 12px rgba(139,92,246,0.04);
}

.modal-content.compact {
  width: 380px;
}

.mc-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.mch-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.mch-symbol {
  font-size: 28px;
}

.mch-info h3 {
  font-size: 16px;
  color: white;
}

.mch-meta {
  font-size: 11px;
  color: rgba(255,255,255,0.2);
}

.mc-close {
  background: none;
  border: none;
  color: rgba(255,255,255,0.2);
  font-size: 18px;
  cursor: pointer;
  padding: 8px;
}

.mcb-question {
  font-size: 12px;
  color: rgba(139,92,246,0.4);
  padding: 10px;
  border-radius: 10px;
  background: rgba(139,92,246,0.03);
  margin-bottom: 12px;
}

.mcbq-label {
  display: block;
  font-size: 10px;
  color: rgba(139,92,246,0.25);
  margin-bottom: 4px;
}

.mcb-reading {
  font-size: 13px;
  line-height: 1.8;
  color: rgba(255,255,255,0.5);
  margin-bottom: 16px;
}

.mcb-followup h4 {
  font-size: 13px;
  color: rgba(139,92,246,0.4);
  margin-bottom: 10px;
  padding-top: 12px;
  border-top: 1px solid rgba(255,255,255,0.03);
}

.fu-pair { margin-bottom: 12px }

.fu-q {
  font-size: 12px;
  color: rgba(255,255,255,0.35);
  margin-bottom: 6px;
  padding-left: 10px;
  border-left: 2px solid rgba(139,92,246,0.1);
}

.fu-a {
  font-size: 13px;
  color: rgba(255,255,255,0.5);
  padding: 10px;
  border-radius: 10px;
  background: rgba(139,92,246,0.02);
  border: 1px solid rgba(139,92,246,0.04);
  line-height: 1.7;
}

.fu-input-row {
  display: flex;
  gap: 6px;
  margin-top: 10px;
}

.fu-input-row input {
  flex: 1;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.04);
  color: white;
  font-size: 12px;
  outline: none;
}

.fu-input-row button {
  padding: 10px 16px;
  border-radius: 10px;
  border: none;
  background: rgba(139,92,246,0.08);
  color: #a78bfa;
  font-size: 12px;
  cursor: pointer;
}

.fu-input-row button:disabled { opacity: 0.3 }

.share-title {
  font-size: 16px;
  color: white;
  margin-bottom: 14px;
}

.share-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: rgba(255,255,255,0.35);
  cursor: pointer;
  margin-bottom: 12px;
}

.share-toggle input { display: none }

.st-switch {
  width: 32px;
  height: 16px;
  border-radius: 8px;
  background: rgba(255,255,255,0.06);
  position: relative;
  transition: all 0.2s;
}

.st-switch::after {
  content: '';
  position: absolute;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: white;
  top: 2px;
  left: 2px;
  transition: all 0.2s;
}

.share-toggle input:checked + .st-switch { background: #8b5cf6 }
.share-toggle input:checked + .st-switch::after { left: 18px }

.modal-content textarea {
  width: 100%;
  padding: 10px;
  border-radius: 10px;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.04);
  color: white;
  font-size: 12px;
  outline: none;
  resize: none;
  box-sizing: border-box;
  margin-bottom: 12px;
}

.share-btns {
  display: flex;
  gap: 8px;
}

/* ====== Toast ====== */
.realm-toast {
  position: fixed;
  bottom: 32px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 28px;
  border-radius: 12px;
  font-size: 13px;
  z-index: 5000;
  backdrop-filter: blur(12px);
}

.realm-toast.success {
  background: rgba(16,185,129,0.06);
  color: #34d399;
  border: 1px solid rgba(16,185,129,0.06);
}

.realm-toast.error {
  background: rgba(239,68,68,0.06);
  color: #f87171;
  border: 1px solid rgba(239,68,68,0.06);
}

/* ====== 动画 ====== */
.toast-enter-active, .toast-leave-active { transition: all 0.3s }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translate(-50%, 16px) }

.slide-right-enter-active, .slide-right-leave-active { transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1) }
.slide-right-enter-from, .slide-right-leave-to { transform: translateX(100%); opacity: 0 }

.fade-up-enter-active, .fade-up-leave-active { transition: all 0.4s ease }
.fade-up-enter-from, .fade-up-leave-to { opacity: 0; transform: translateY(12px) }

.modal-enter-active, .modal-leave-active { transition: all 0.3s ease }
.modal-enter-from, .modal-leave-to { opacity: 0 }
.modal-enter-from .modal-content, .modal-leave-to .modal-content { transform: scale(0.95) translateY(10px) }

/* ====== 响应式 ====== */
@media (max-width: 640px) {
  .rc-card {
    width: 170px;
    height: 265px;
  }

  .rcf-name-zh { font-size: 24px }
  .rcf-symbol { font-size: 44px }

  .carousel-space { height: 370px }
  .cs-card { width: 90px; height: 140px }
  .gesture-space { height: 380px }

  .result-actions { flex-direction: column }
  .ra-btn { min-width: 100% }

  .magic-circle-container { width: 400px; height: 400px }

  .floating-cards { display: none }

  .keyword-wings { display: none }

  .ri-reading-section { padding: 0 8px }
}

@media (max-width: 400px) {
  .realm-stage { padding: 0 10px 40px }
  .rc-card { width: 155px; height: 240px }
}

@media (min-width: 900px) {
  .ri-reading-section {
    max-width: 680px;
  }
}

/* 翻牌金色光扫 */
.rc-card.flipped .rc-front::after {
  content: '';
  position: absolute;
  inset: -5px;
  background: linear-gradient(45deg, transparent 30%, rgba(245,197,94,0.12) 50%, transparent 70%);
  animation: cardGoldSweep 1.5s ease-out;
  pointer-events: none;
  border-radius: 16px;
  z-index: 10;
}
@keyframes cardGoldSweep {
  0% { transform: translateX(-100%); opacity: 1; }
  100% { transform: translateX(100%); opacity: 0; }
}

/* 卡背星图微弱闪烁 */
.csc-pattern::before {
  animation: cardBackTwinkle 3s ease-in-out infinite alternate;
}
@keyframes cardBackTwinkle {
  0% { border-color: rgba(245,197,94,0.03); }
  100% { border-color: rgba(245,197,94,0.08); }
}

/* 浮动牌入场 stagger */
.float-card {
  animation: floatCardIn 0.6s ease both;
}
.float-card:nth-child(1) { animation-delay: 0ms; }
.float-card:nth-child(2) { animation-delay: 120ms; }
.float-card:nth-child(3) { animation-delay: 240ms; }
.float-card:nth-child(4) { animation-delay: 360ms; }
.float-card:nth-child(5) { animation-delay: 480ms; }
@keyframes floatCardIn {
  from { opacity: 0; transform: translateY(20px) scale(0.8) rotate(-5deg); }
  to { opacity: 1; }
}

/* 解读文字打字机淡入 */
.mcb-reading {
  animation: readingFadeIn 0.8s ease both;
}
@keyframes readingFadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 选中牌星尘光效 */
.cs-card.chosen::after {
  content: '';
  position: absolute;
  inset: -8px;
  border-radius: 14px;
  background: radial-gradient(circle, rgba(245,197,94,0.15) 0%, transparent 60%);
  animation: chosenGlow 1.5s ease-in-out infinite alternate;
  pointer-events: none;
}
@keyframes chosenGlow {
  0% { opacity: 0.4; transform: scale(0.95); }
  100% { opacity: 1; transform: scale(1.05); }
}

/* 历史侧栏卡片 stagger */
.hp-item {
  animation: hpItemIn 0.3s ease both;
}
.hp-item:nth-child(1) { animation-delay: 0ms; }
.hp-item:nth-child(2) { animation-delay: 60ms; }
.hp-item:nth-child(3) { animation-delay: 120ms; }
.hp-item:nth-child(4) { animation-delay: 180ms; }
.hp-item:nth-child(5) { animation-delay: 240ms; }
@keyframes hpItemIn {
  from { opacity: 0; transform: translateX(10px); }
  to { opacity: 1; transform: translateX(0); }
}

@media (prefers-reduced-motion: reduce) {
  .float-card, .hp-item, .mcb-reading, .magic-circle, .pentagram-svg,
  .qz-hint, .orb-glow, .sr-glow, .rr-glow, .rune-dot, .ao-ring,
  .realm-title, .rcf-symbol, .cs-card.chosen::after { animation: none !important; }
  .rc-card { transition-duration: 0.01ms !important; }
  .hdr-btn, .hp-item, .mode-switch button, .method-btn, .start-ritual,
  .reveal-ritual, .ca-btn, .ra-btn { transition: none !important; }
}
</style>
