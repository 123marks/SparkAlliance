<template>
  <div class="auth-immersive" @mousemove="onMouseMove">
    <!-- 全屏背景层 -->
    <div class="bg-layer">
      <img src="/background/2.png" alt="" class="bg-image" />
      <div class="bg-gradient"></div>
    </div>

    <!-- Canvas 交互粒子 -->
    <canvas ref="particleCanvas" class="particle-canvas"></canvas>

    <!-- 浮动光斑 -->
    <div class="orb orb-1"></div>
    <div class="orb orb-2"></div>

    <!-- 导航 -->
    <router-link to="/" class="home-link">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
      返回官网
    </router-link>
    <router-link to="/" class="brand-mark">✦ Spark Alliance</router-link>

    <!-- 注册卡片 -->
    <main class="card-container">
      <div class="glass-card">
        <!-- 步骤指示器 -->
        <div class="stepper">
          <div class="step" :class="{ active: step >= 1, done: step > 1 }" @click="goStep(1)">
            <span>{{ step > 1 ? '✓' : '1' }}</span>
            <small>身份</small>
          </div>
          <div class="step-line" :class="{ active: step >= 2 }"></div>
          <div class="step" :class="{ active: step >= 2, done: step > 2 }" @click="goStep(2)">
            <span>{{ step > 2 ? '✓' : '2' }}</span>
            <small>账号</small>
          </div>
          <div class="step-line" :class="{ active: step >= 3 }"></div>
          <div class="step" :class="{ active: step >= 3 }">
            <span>3</span>
            <small>完善</small>
          </div>
        </div>

        <!-- Step 1: 身份选择 -->
        <Transition name="slide" mode="out-in">
          <div v-if="step === 1" key="s1">
            <div class="card-header">
              <h1>你是？</h1>
              <p class="subtitle">选择你的身份，我们将为你定制最佳体验</p>
            </div>
            <div class="id-list">
              <div
                v-for="id in identities" :key="id.value"
                class="id-card" :class="{ selected: form.identity === id.value }"
                @click="form.identity = id.value"
              >
                <span class="id-icon">{{ id.icon }}</span>
                <div><strong>{{ id.label }}</strong><p>{{ id.desc }}</p></div>
                <div v-if="form.identity === id.value" class="id-check">✓</div>
              </div>
            </div>
            <button class="primary-btn" :disabled="!form.identity" @click="step = 2">下一步 →</button>
          </div>
        </Transition>

        <!-- Step 2: 核心信息 -->
        <Transition name="slide" mode="out-in">
          <div v-if="step === 2" key="s2">
            <div class="card-header">
              <h1>创建账号</h1>
              <p class="subtitle">填写基本信息完成注册</p>
            </div>
            <form @submit.prevent class="reg-form">
              <!-- 昵称 -->
              <div class="field">
                <input type="text" id="r-nick" v-model="form.nickname" placeholder=" " maxlength="20" />
                <label for="r-nick">用户名 / 昵称 <span class="req">*</span></label>
                <div class="field-line"></div>
              </div>
              <!-- 手机号 -->
              <div class="field phone-field">
                <span class="phone-prefix">+86</span>
                <input type="tel" id="r-phone" v-model="form.phone" placeholder=" " maxlength="11" required />
                <label for="r-phone">手机号码 <span class="req">*</span></label>
                <div class="field-line"></div>
              </div>
              <!-- 邮箱 -->
              <div class="field">
                <input type="email" id="r-email" v-model="form.email" placeholder=" " />
                <label for="r-email">邮箱地址 <span class="req">*</span></label>
                <div class="field-line"></div>
              </div>
              <!-- 验证码 -->
              <div class="field code-row">
                <div class="field" style="flex:1">
                  <input type="text" id="r-code" v-model="form.emailCode" placeholder=" " maxlength="6" />
                  <label for="r-code">邮箱验证码 <span class="req">*</span></label>
                  <div class="field-line"></div>
                </div>
                <button type="button" class="code-btn" :disabled="!isEmailValid || codeCooldown > 0" @click="sendCode">
                  {{ codeCooldown > 0 ? `${codeCooldown}s` : '发送' }}
                </button>
              </div>
              <!-- 密码 -->
              <div class="field">
                <input :type="showPwd ? 'text' : 'password'" id="r-pwd" v-model="form.password" placeholder=" " maxlength="20" />
                <label for="r-pwd">密码 <span class="req">*</span></label>
                <button type="button" class="toggle-pwd" @click="showPwd = !showPwd">{{ showPwd ? '🙈' : '👁️' }}</button>
                <div class="field-line"></div>
              </div>
              <!-- 密码强度 -->
              <div v-if="form.password" class="pwd-meter">
                <div class="meter-track"><div class="meter-fill" :class="pwdStrength.level" :style="{ width: pwdStrength.pct + '%' }"></div></div>
                <span :class="pwdStrength.level">{{ pwdStrength.text }}</span>
              </div>
              <!-- 确认密码 -->
              <div class="field">
                <input :type="showPwd2 ? 'text' : 'password'" id="r-cpwd" v-model="form.confirmPwd" placeholder=" " />
                <label for="r-cpwd">确认密码 <span class="req">*</span></label>
                <button type="button" class="toggle-pwd" @click="showPwd2 = !showPwd2">{{ showPwd2 ? '🙈' : '👁️' }}</button>
                <div class="field-line"></div>
              </div>
              <span v-if="form.confirmPwd && form.password !== form.confirmPwd" class="hint-error">两次密码不一致</span>
            </form>
            <div class="btn-row">
              <button class="ghost-btn" @click="step = 1">← 返回</button>
              <button class="primary-btn" :disabled="!isStep2Ok" @click="step = 3">下一步 →</button>
            </div>
          </div>
        </Transition>

        <!-- Step 3: 补充信息 -->
        <Transition name="slide" mode="out-in">
          <div v-if="step === 3" key="s3">
            <div class="card-header">
              <h1>{{ form.identity === 'student' ? '学生信息' : form.identity === 'worker' ? '职场信息' : '个人信息' }}</h1>
              <p class="subtitle">选填信息，帮助我们为你提供更好的服务</p>
            </div>
            <form @submit.prevent class="reg-form">
              <template v-if="form.identity === 'student'">
                <div class="field">
                  <input type="text" id="r-uni" v-model="form.university" placeholder=" " list="uni-list" />
                  <label for="r-uni">学校名称</label>
                  <div class="field-line"></div>
                  <datalist id="uni-list"><option v-for="u in universities" :key="u" :value="u"></option></datalist>
                </div>
                <div class="field-2col">
                  <div class="field">
                    <select id="r-grade" v-model="form.grade" class="select-input">
                      <option value="" disabled selected hidden></option>
                      <option v-for="g in grades" :key="g" :value="g">{{ g }}</option>
                    </select>
                    <label for="r-grade" class="sel-label">年级</label>
                    <div class="field-line"></div>
                  </div>
                  <div class="field">
                    <input type="text" id="r-major" v-model="form.major" placeholder=" " list="major-list" />
                    <label for="r-major">专业</label>
                    <div class="field-line"></div>
                    <datalist id="major-list"><option v-for="m in majors" :key="m" :value="m"></option></datalist>
                  </div>
                </div>
              </template>
              <template v-if="form.identity === 'worker'">
                <div class="field">
                  <input type="text" id="r-comp" v-model="form.company" placeholder=" " />
                  <label for="r-comp">公司 / 组织</label>
                  <div class="field-line"></div>
                </div>
                <div class="field">
                  <input type="text" id="r-pos" v-model="form.position" placeholder=" " />
                  <label for="r-pos">职位</label>
                  <div class="field-line"></div>
                </div>
              </template>
              <template v-if="form.identity === 'freelancer'">
                <div class="field">
                  <input type="text" id="r-skill" v-model="form.skill" placeholder=" " />
                  <label for="r-skill">技能领域</label>
                  <div class="field-line"></div>
                </div>
                <div class="field">
                  <input type="text" id="r-city" v-model="form.city" placeholder=" " />
                  <label for="r-city">所在城市</label>
                  <div class="field-line"></div>
                </div>
              </template>
              <label class="agree">
                <input type="checkbox" v-model="form.agreed" />
                <span>我已阅读并同意 <router-link to="/terms">服务条款</router-link> 和 <router-link to="/privacy">隐私政策</router-link></span>
              </label>
            </form>

            <p v-if="errorMsg" class="error-toast">{{ errorMsg }}</p>
            <p v-if="successMsg" class="success-toast">{{ successMsg }}</p>

            <div class="btn-row">
              <button class="ghost-btn" @click="step = 2">← 返回</button>
              <button class="primary-btn submit" :disabled="!form.agreed || isLoading" @click="handleRegister">
                <span v-if="!isLoading">🚀 完成注册</span>
                <span v-else class="btn-spinner"></span>
              </button>
            </div>
            <div class="skip-link" @click="handleRegister" v-if="!isLoading">跳过此步，直接注册</div>
          </div>
        </Transition>

        <!-- 底部 -->
        <div class="card-footer">
          已有账号？<router-link to="/login" class="login-link">直接登录</router-link>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../../supabase'

const router = useRouter()

// ====== 状态 ======
const step = ref(1)
const showPwd = ref(false)
const showPwd2 = ref(false)
const isLoading = ref(false)
const errorMsg = ref('')
const successMsg = ref('')
const codeCooldown = ref(0)

const form = reactive({
  identity: '', nickname: '', phone: '', email: '', emailCode: '',
  password: '', confirmPwd: '',
  university: '', grade: '', major: '',
  company: '', position: '', industry: '',
  skill: '', city: '', agreed: false,
})

// ====== Canvas 粒子 ======
const particleCanvas = ref<HTMLCanvasElement | null>(null)
let animId = 0
let mX = 0, mY = 0

function onMouseMove(e: MouseEvent) { mX = e.clientX; mY = e.clientY }

function initParticles() {
  const c = particleCanvas.value; if (!c) return
  const ctx = c.getContext('2d'); if (!ctx) return
  let w = c.width = window.innerWidth, h = c.height = window.innerHeight
  const count = Math.min(60, Math.floor(w * h / 18000))
  const pts = Array.from({ length: count }, () => ({
    x: Math.random() * w, y: Math.random() * h,
    vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
    s: Math.random() * 1.8 + 0.5, a: Math.random() * 0.4 + 0.1,
    h: 220 + Math.random() * 50,
  }))
  function draw() {
    ctx!.clearRect(0, 0, w, h)
    for (const p of pts) {
      const dx = mX - p.x, dy = mY - p.y, d = Math.sqrt(dx * dx + dy * dy)
      if (d < 180) { p.vx += dx * 0.00006; p.vy += dy * 0.00006 }
      p.x += p.vx; p.y += p.vy
      if (p.x < 0 || p.x > w) p.vx *= -1
      if (p.y < 0 || p.y > h) p.vy *= -1
      ctx!.beginPath(); ctx!.arc(p.x, p.y, p.s, 0, Math.PI * 2)
      ctx!.fillStyle = `hsla(${p.h},65%,70%,${p.a})`; ctx!.fill()
    }
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
      const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y, d = Math.sqrt(dx * dx + dy * dy)
      if (d < 100) {
        ctx!.beginPath(); ctx!.moveTo(pts[i].x, pts[i].y); ctx!.lineTo(pts[j].x, pts[j].y)
        ctx!.strokeStyle = `hsla(230,55%,60%,${0.06 * (1 - d / 100)})`; ctx!.lineWidth = 0.4; ctx!.stroke()
      }
    }
    animId = requestAnimationFrame(draw)
  }
  draw()
  window.addEventListener('resize', () => { w = c.width = window.innerWidth; h = c.height = window.innerHeight })
}

// ====== 数据 ======
const identities = [
  { value: 'student', icon: '🎓', label: '在校学生', desc: '高校在读，享受专属学习资源' },
  { value: 'worker', icon: '💼', label: '职场青年', desc: '已工作，拓展人脉与技能成长' },
  { value: 'freelancer', icon: '🚀', label: '自由职业 / 创业者', desc: '独立创作者，寻找合作与灵感' },
]
const universities = ['清华大学','北京大学','浙江大学','复旦大学','上海交通大学','中国人民大学','南京大学','武汉大学','华中科技大学','中山大学','同济大学','四川大学','厦门大学','哈尔滨工业大学','西安交通大学']
const grades = ['大一','大二','大三','大四','大五','研一','研二','研三','博一','博二','博三','已毕业']
const majors = ['计算机科学与技术','软件工程','电子信息工程','数据科学','金融学','工商管理','法学','临床医学','人工智能','机械工程']

// ====== 校验 ======
const isPhoneValid = computed(() => /^1[3-9]\d{9}$/.test(form.phone))
const isEmailValid = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
const hasLen = computed(() => form.password.length >= 8 && form.password.length <= 20)
const hasUp = computed(() => /[A-Z]/.test(form.password))
const hasLow = computed(() => /[a-z]/.test(form.password))
const hasNum = computed(() => /\d/.test(form.password))
const hasSp = computed(() => /[@$!%*#?&._\-]/.test(form.password))

const pwdStrength = computed(() => {
  let s = 0; if (hasLen.value) s++; if (hasUp.value) s++; if (hasLow.value) s++; if (hasNum.value) s++; if (hasSp.value) s++
  if (s <= 2) return { pct: 25, level: 'weak', text: '弱' }
  if (s <= 3) return { pct: 50, level: 'fair', text: '中' }
  if (s <= 4) return { pct: 75, level: 'good', text: '强' }
  return { pct: 100, level: 'strong', text: '非常强' }
})

const isStep2Ok = computed(() =>
  form.nickname.length >= 2 && isPhoneValid.value && isEmailValid.value
  && form.emailCode.length === 6 && hasLen.value && hasUp.value && hasLow.value && hasNum.value
  && form.password === form.confirmPwd
)

// ====== 方法 ======
function goStep(s: number) { if (s < step.value) step.value = s }

function sendCode() {
  if (!isEmailValid.value || codeCooldown.value > 0) return
  codeCooldown.value = 60
  const t = setInterval(() => { codeCooldown.value--; if (codeCooldown.value <= 0) clearInterval(t) }, 1000)
}

async function handleRegister() {
  if (isLoading.value) return
  if (!form.agreed) form.agreed = true
  isLoading.value = true; errorMsg.value = ''; successMsg.value = ''
  try {
    const { error } = await supabase.auth.signUp({
      email: form.email, password: form.password,
      options: { data: {
        nickname: form.nickname, identity: form.identity, phone: form.phone || undefined,
        university: form.university || undefined, grade: form.grade || undefined, major: form.major || undefined,
        company: form.company || undefined, position: form.position || undefined,
        skill: form.skill || undefined, city: form.city || undefined,
      }}
    })
    if (error) { errorMsg.value = '注册失败: ' + error.message }
    else { successMsg.value = '🎉 注册成功！请检查邮箱完成验证。'; setTimeout(() => router.push('/login'), 2000) }
  } catch (e: any) { errorMsg.value = '注册失败: ' + (e.message || '网络错误') }
  finally { isLoading.value = false }
}

// ====== 生命周期 ======
onMounted(() => { initParticles() })
onBeforeUnmount(() => { cancelAnimationFrame(animId) })
</script>

<style scoped>
/* 全屏容器 */
.auth-immersive { position: relative; width: 100vw; min-height: 100vh; display: flex; align-items: center; justify-content: center; overflow-y: auto; padding: 40px 20px; }

/* 背景 */
.bg-layer { position: fixed; inset: 0; z-index: 0; }
.bg-image { width: 100%; height: 100%; object-fit: cover; filter: brightness(0.55) saturate(1.3); animation: bg-drift 30s ease-in-out infinite alternate; }
@keyframes bg-drift { 0% { transform: scale(1.05); } 100% { transform: scale(1.12) translate(-2%,-1%); } }
.bg-gradient { position: absolute; inset: 0; background: radial-gradient(ellipse at 40% 50%, rgba(10,10,20,0.3) 0%, transparent 60%), linear-gradient(to bottom, rgba(10,10,20,0.5) 0%, rgba(10,10,20,0.3) 50%, rgba(10,10,20,0.6) 100%); }

/* Canvas */
.particle-canvas { position: fixed; inset: 0; z-index: 1; pointer-events: none; }

/* 光斑 */
.orb { position: fixed; border-radius: 50%; filter: blur(80px); z-index: 1; pointer-events: none; animation: orb-float 12s ease-in-out infinite; }
.orb-1 { top: 10%; left: 15%; width: 280px; height: 280px; background: rgba(99,102,241,0.1); }
.orb-2 { bottom: 15%; right: 10%; width: 220px; height: 220px; background: rgba(139,92,246,0.08); animation-delay: -5s; }
@keyframes orb-float { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(15px,-10px) scale(1.04)} }

/* 导航 */
.home-link { position: fixed; top: 28px; left: 32px; z-index: 10; display: flex; align-items: center; gap: 4px; font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.5); text-decoration: none; transition: color 0.2s; }
.home-link:hover { color: white; }
.brand-mark { position: fixed; top: 28px; right: 32px; z-index: 10; font-size: 15px; font-weight: 800; color: rgba(255,255,255,0.6); text-decoration: none; transition: color 0.2s; }
.brand-mark:hover { color: white; }

/* 卡片容器 */
.card-container { position: relative; z-index: 5; width: 460px; max-width: 94vw; animation: card-enter 0.5s ease-out; }
@keyframes card-enter { from { opacity:0; transform:translateY(20px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }

/* 玻璃卡片 */
.glass-card { padding: 36px 32px 28px; background: rgba(15,15,25,0.6); backdrop-filter: blur(40px) saturate(1.4); -webkit-backdrop-filter: blur(40px) saturate(1.4); border: 1px solid rgba(255,255,255,0.07); border-radius: 24px; box-shadow: 0 20px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04); }

/* 步骤 */
.stepper { display: flex; align-items: center; justify-content: center; margin-bottom: 28px; gap: 0; }
.step { display: flex; flex-direction: column; align-items: center; gap: 4px; cursor: pointer; }
.step span { width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; background: rgba(255,255,255,0.05); border: 2px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.3); transition: all 0.25s; }
.step.active span { background: linear-gradient(135deg,#7c3aed,#3b82f6); border-color: transparent; color: white; }
.step.done span { background: #10b981; border-color: transparent; color: white; }
.step small { font-size: 10px; color: rgba(255,255,255,0.35); }
.step.active small { color: white; font-weight: 600; }
.step-line { width: 40px; height: 2px; background: rgba(255,255,255,0.06); margin: 0 8px; margin-bottom: 16px; transition: background 0.3s; }
.step-line.active { background: linear-gradient(90deg,#7c3aed,#3b82f6); }

/* 头部 */
.card-header { margin-bottom: 24px; }
.card-header h1 { font-size: 24px; font-weight: 700; color: white; margin: 0 0 6px; }
.subtitle { font-size: 13px; color: rgba(255,255,255,0.4); margin: 0; }

/* 身份卡片 */
.id-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; }
.id-card { position: relative; display: flex; align-items: center; gap: 14px; padding: 16px; border: 1px solid rgba(255,255,255,0.06); border-radius: 14px; cursor: pointer; transition: all 0.2s; background: rgba(255,255,255,0.02); }
.id-card:hover { border-color: rgba(139,92,246,0.25); background: rgba(139,92,246,0.04); }
.id-card.selected { border-color: rgba(139,92,246,0.4); background: rgba(139,92,246,0.08); }
.id-icon { font-size: 26px; flex-shrink: 0; }
.id-card strong { font-size: 14px; display: block; margin-bottom: 2px; color: white; }
.id-card p { font-size: 12px; color: rgba(255,255,255,0.45); margin: 0; line-height: 1.4; }
.id-check { position: absolute; top: 10px; right: 12px; width: 20px; height: 20px; background: linear-gradient(135deg,#7c3aed,#3b82f6); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; color: white; }

/* 表单 */
.reg-form { display: flex; flex-direction: column; gap: 16px; }
.field { position: relative; }
.field input, .select-input { width: 100%; padding: 16px 14px 8px; background: rgba(255,255,255,0.04); border: none; border-radius: 12px; color: white; font-size: 14px; outline: none; transition: background 0.2s; appearance: none; }
.field input:focus, .select-input:focus { background: rgba(255,255,255,0.07); }
.field label, .sel-label { position: absolute; top: 12px; left: 14px; font-size: 13px; color: rgba(255,255,255,0.35); pointer-events: none; transition: all 0.2s; }
.field input:focus ~ label, .field input:not(:placeholder-shown) ~ label, .select-input:valid ~ .sel-label { transform: translateY(-8px) scale(0.75); transform-origin: left; color: rgba(167,139,250,0.9); }
.req { color: #f43f5e; }
.field-line { position: absolute; bottom: 0; left: 14px; right: 14px; height: 2px; background: rgba(255,255,255,0.05); border-radius: 1px; overflow: hidden; }
.field-line::after { content:''; position: absolute; inset: 0; background: linear-gradient(90deg,#a78bfa,#60a5fa); transform: scaleX(0); transform-origin: left; transition: transform 0.3s; }
.field input:focus ~ .field-line::after, .select-input:focus ~ .field-line::after { transform: scaleX(1); }

/* 手机 / 验证码 */
.phone-field .phone-prefix { position: absolute; left: 14px; top: 14px; font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.5); z-index: 1; }
.phone-field input { padding-left: 48px; }
.phone-field label { left: 48px; }
.code-row { display: flex; gap: 8px; align-items: flex-start; }
.code-btn { flex-shrink: 0; height: 48px; padding: 0 16px; background: rgba(139,92,246,0.12); border: 1px solid rgba(139,92,246,0.2); border-radius: 12px; color: #c4b5fd; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.code-btn:hover:not(:disabled) { background: rgba(139,92,246,0.2); }
.code-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.toggle-pwd { position: absolute; right: 12px; top: 12px; background: none; border: none; font-size: 15px; cursor: pointer; opacity: 0.4; transition: opacity 0.15s; }
.toggle-pwd:hover { opacity: 0.7; }

/* 密码强度 */
.pwd-meter { display: flex; align-items: center; gap: 8px; }
.meter-track { flex: 1; height: 3px; background: rgba(255,255,255,0.05); border-radius: 2px; overflow: hidden; }
.meter-fill { height: 100%; border-radius: 2px; transition: width 0.3s, background 0.3s; }
.meter-fill.weak { background: #ef4444; } .meter-fill.fair { background: #f97316; } .meter-fill.good { background: #3b82f6; } .meter-fill.strong { background: #10b981; }
.pwd-meter span { font-size: 11px; font-weight: 600; }
.pwd-meter span.weak { color: #ef4444; } .pwd-meter span.fair { color: #f97316; } .pwd-meter span.good { color: #3b82f6; } .pwd-meter span.strong { color: #10b981; }

.hint-error { font-size: 12px; color: #fca5a5; }
.field-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

/* 条款 */
.agree { display: flex; align-items: flex-start; gap: 8px; font-size: 12px; color: rgba(255,255,255,0.45); cursor: pointer; line-height: 1.5; }
.agree input { margin-top: 2px; accent-color: #8b5cf6; }
.agree a { color: #a78bfa; font-weight: 600; }

/* 按钮 */
.btn-row { display: flex; gap: 10px; margin-top: 20px; }
.ghost-btn { padding: 12px 20px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; color: rgba(255,255,255,0.6); font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.15s; }
.ghost-btn:hover { background: rgba(255,255,255,0.08); color: white; }
.primary-btn { flex: 1; padding: 13px; background: linear-gradient(135deg,#7c3aed,#3b82f6); border: none; border-radius: 12px; color: white; font-size: 15px; font-weight: 700; cursor: pointer; transition: transform 0.15s, box-shadow 0.15s; display: flex; align-items: center; justify-content: center; }
.primary-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(124,58,237,0.3); }
.primary-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
.primary-btn.submit { padding: 14px; }
.btn-spinner { display: inline-block; width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.skip-link { text-align: center; margin-top: 12px; font-size: 12px; color: rgba(255,255,255,0.35); cursor: pointer; transition: color 0.15s; }
.skip-link:hover { color: #a78bfa; }

/* 消息 */
.error-toast { padding: 10px 14px; border-radius: 10px; background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.2); color: #fca5a5; font-size: 13px; margin: 8px 0 0; text-align: center; }
.success-toast { padding: 10px 14px; border-radius: 10px; background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.2); color: #6ee7b7; font-size: 13px; margin: 8px 0 0; text-align: center; }

/* 底部 */
.card-footer { text-align: center; margin-top: 20px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.04); font-size: 13px; color: rgba(255,255,255,0.4); }
.login-link { color: #a78bfa; font-weight: 600; text-decoration: none; margin-left: 4px; }

/* 步骤动画 */
.slide-enter-active, .slide-leave-active { transition: opacity 0.2s, transform 0.2s; }
.slide-enter-from { opacity: 0; transform: translateX(16px); }
.slide-leave-to { opacity: 0; transform: translateX(-16px); }

/* 响应式 */
@media (max-width: 520px) {
  .card-container { width: 94vw; }
  .glass-card { padding: 28px 20px 22px; }
  .card-header h1 { font-size: 20px; }
  .home-link { top: 12px; left: 12px; }
  .brand-mark { top: 12px; right: 12px; font-size: 13px; }
  .field-2col { grid-template-columns: 1fr; }
}
</style>
