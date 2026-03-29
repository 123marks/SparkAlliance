<template>
  <div class="auth-layout">
    <!-- 左侧品牌面板 -->
    <div class="brand-panel">
      <div class="floating-decorator decor-1"></div>
      <div class="floating-decorator decor-2"></div>
      <div class="floating-decorator decor-3"></div>

      <div class="brand-content">
        <router-link to="/" class="logo">✦ Spark Alliance</router-link>
        <h2 class="slogan">让每一个青年<br />都能连接更大的世界</h2>
        <p class="desc">无论你是在校学生、职场新人还是自由职业者，星火联盟都为你提供 AI 驱动的学习、社交与成长平台。</p>

        <!-- 信任指标 -->
        <div class="trust-metrics">
          <div class="metric"><strong>20,000+</strong><span>注册用户</span></div>
          <div class="metric"><strong>500+</strong><span>合作企业</span></div>
          <div class="metric"><strong>99.9%</strong><span>服务可用性</span></div>
        </div>
      </div>
    </div>

    <!-- 右侧表单面板 -->
    <div class="form-panel">
      <div class="form-card">
        <!-- 步骤指示器 -->
        <div class="stepper">
          <div class="step-item" :class="{ active: currentStep >= 1, done: currentStep > 1 }" @click="goToStep(1)">
            <div class="step-circle">{{ currentStep > 1 ? '✓' : '1' }}</div>
            <span>选择身份</span>
          </div>
          <div class="step-line" :class="{ active: currentStep >= 2 }"></div>
          <div class="step-item" :class="{ active: currentStep >= 2, done: currentStep > 2 }" @click="goToStep(2)">
            <div class="step-circle">{{ currentStep > 2 ? '✓' : '2' }}</div>
            <span>账号信息</span>
          </div>
          <div class="step-line" :class="{ active: currentStep >= 3 }"></div>
          <div class="step-item" :class="{ active: currentStep >= 3 }">
            <div class="step-circle">3</div>
            <span>完善资料</span>
          </div>
        </div>

        <!-- Step 1: 身份选择 -->
        <Transition name="step-fade" mode="out-in">
          <div v-if="currentStep === 1" key="step1" class="step-content">
            <div class="form-header">
              <h2>你是？</h2>
              <p>选择最符合你当前状态的身份，我们将为你定制最佳体验</p>
            </div>
            <div class="identity-grid">
              <div
                v-for="id in identities"
                :key="id.value"
                class="identity-card"
                :class="{ selected: form.identity === id.value }"
                @click="form.identity = id.value"
              >
                <div class="id-icon">{{ id.icon }}</div>
                <h4>{{ id.label }}</h4>
                <p>{{ id.desc }}</p>
                <div class="id-check" v-if="form.identity === id.value">✓</div>
              </div>
            </div>
            <button class="next-btn" :disabled="!form.identity" @click="currentStep = 2">
              下一步 →
            </button>
          </div>
        </Transition>

        <!-- Step 2: 核心信息 -->
        <Transition name="step-fade" mode="out-in">
          <div v-if="currentStep === 2" key="step2" class="step-content">
            <div class="form-header">
              <h2>创建账号</h2>
              <p>填写你的基本信息以完成注册</p>
            </div>

            <form @submit.prevent class="auth-form">
              <!-- 昵称 -->
              <div class="form-group">
                <input type="text" id="reg-nickname" v-model="form.nickname" class="floating-input" placeholder=" " maxlength="20" />
                <label for="reg-nickname" class="floating-label">用户名 / 昵称 <span class="required">*</span></label>
                <span class="field-hint" v-if="form.nickname && form.nickname.length < 2">至少2个字符</span>
              </div>

              <!-- 手机号 -->
              <div class="form-group">
                <div class="phone-input-wrapper">
                  <span class="phone-prefix">+86</span>
                  <input type="tel" id="reg-phone" v-model="form.phone" class="floating-input phone-input" placeholder=" " maxlength="11" />
                  <label for="reg-phone" class="floating-label phone-label">手机号码</label>
                </div>
                <span class="field-hint error" v-if="form.phone && !isPhoneValid">请输入有效的11位手机号</span>
              </div>

              <!-- 邮箱 -->
              <div class="form-group">
                <input type="email" id="reg-email" v-model="form.email" class="floating-input" placeholder=" " />
                <label for="reg-email" class="floating-label">邮箱地址 <span class="required">*</span></label>
                <span class="field-hint error" v-if="form.email && !isEmailValid">邮箱格式不正确</span>
              </div>

              <!-- 邮箱验证码 -->
              <div class="form-group code-group">
                <input type="text" id="reg-code" v-model="form.emailCode" class="floating-input code-input" placeholder=" " maxlength="6" />
                <label for="reg-code" class="floating-label">邮箱验证码 <span class="required">*</span></label>
                <button type="button" class="send-code-btn" :disabled="!isEmailValid || codeCooldown > 0" @click="sendEmailCode">
                  {{ codeCooldown > 0 ? `${codeCooldown}s 后重发` : '发送验证码' }}
                </button>
              </div>

              <!-- 密码 -->
              <div class="form-group">
                <input :type="showPwd ? 'text' : 'password'" id="reg-password" v-model="form.password" class="floating-input" placeholder=" " maxlength="20" />
                <label for="reg-password" class="floating-label">密码 <span class="required">*</span></label>
                <button type="button" class="eye-btn" @click="showPwd = !showPwd">
                  <span>{{ showPwd ? '👀' : '👁️' }}</span>
                </button>
                <!-- 密码强度指示器 -->
                <div class="pwd-strength" v-if="form.password">
                  <div class="pwd-bar-track">
                    <div class="pwd-bar-fill" :style="{ width: pwdStrength.percent + '%' }" :class="pwdStrength.level"></div>
                  </div>
                  <span class="pwd-level-text" :class="pwdStrength.level">{{ pwdStrength.text }}</span>
                </div>
                <div class="pwd-rules" v-if="form.password">
                  <span :class="{ met: hasLength }">✓ 8-20位</span>
                  <span :class="{ met: hasUpper }">✓ 大写字母</span>
                  <span :class="{ met: hasLower }">✓ 小写字母</span>
                  <span :class="{ met: hasNumber }">✓ 数字</span>
                  <span :class="{ met: hasSpecial }">✓ 特殊字符</span>
                </div>
              </div>

              <!-- 确认密码 -->
              <div class="form-group">
                <input :type="showPwd2 ? 'text' : 'password'" id="reg-confirm" v-model="form.confirmPassword" class="floating-input" placeholder=" " />
                <label for="reg-confirm" class="floating-label">确认密码 <span class="required">*</span></label>
                <button type="button" class="eye-btn" @click="showPwd2 = !showPwd2">
                  <span>{{ showPwd2 ? '👀' : '👁️' }}</span>
                </button>
                <span class="field-hint error" v-if="form.confirmPassword && form.password !== form.confirmPassword">两次密码不一致</span>
              </div>
            </form>

            <div class="step-nav">
              <button class="back-btn" @click="currentStep = 1">← 返回</button>
              <button class="next-btn" :disabled="!isStep2Valid" @click="currentStep = 3">下一步 →</button>
            </div>
          </div>
        </Transition>

        <!-- Step 3: 补充信息 -->
        <Transition name="step-fade" mode="out-in">
          <div v-if="currentStep === 3" key="step3" class="step-content">
            <div class="form-header">
              <h2>{{ form.identity === 'student' ? '学生信息' : form.identity === 'worker' ? '职场信息' : '个人信息' }}</h2>
              <p>这些信息是选填的，但有助于我们为你提供更好的个性化服务</p>
            </div>

            <form @submit.prevent class="auth-form">
              <!-- 学生身份字段 -->
              <template v-if="form.identity === 'student'">
                <div class="form-group">
                  <input type="text" id="reg-university" v-model="form.university" class="floating-input" placeholder=" " list="uni-list" />
                  <label for="reg-university" class="floating-label">学校名称</label>
                  <datalist id="uni-list">
                    <option v-for="u in universities" :key="u" :value="u"></option>
                  </datalist>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <select id="reg-grade" v-model="form.grade" class="floating-input select-styled">
                      <option value="" disabled selected hidden></option>
                      <optgroup label="本科">
                        <option v-for="g in undergraduateGrades" :key="g" :value="g">{{ g }}</option>
                      </optgroup>
                      <optgroup label="研究生">
                        <option v-for="g in graduateGrades" :key="g" :value="g">{{ g }}</option>
                      </optgroup>
                      <optgroup label="其他">
                        <option value="已毕业">已毕业</option>
                        <option value="教职工">教职工</option>
                      </optgroup>
                    </select>
                    <label for="reg-grade" class="floating-label select-label">年级</label>
                    <span class="dropdown-icon">▼</span>
                  </div>
                  <div class="form-group">
                    <input type="text" id="reg-major" v-model="form.major" class="floating-input" placeholder=" " list="major-list" />
                    <label for="reg-major" class="floating-label">专业</label>
                    <datalist id="major-list">
                      <option v-for="m in popularMajors" :key="m" :value="m"></option>
                    </datalist>
                  </div>
                </div>
              </template>

              <!-- 职场身份字段 -->
              <template v-if="form.identity === 'worker'">
                <div class="form-group">
                  <input type="text" id="reg-company" v-model="form.company" class="floating-input" placeholder=" " />
                  <label for="reg-company" class="floating-label">公司 / 组织</label>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <input type="text" id="reg-position" v-model="form.position" class="floating-input" placeholder=" " />
                    <label for="reg-position" class="floating-label">职位</label>
                  </div>
                  <div class="form-group">
                    <select id="reg-industry" v-model="form.industry" class="floating-input select-styled">
                      <option value="" disabled selected hidden></option>
                      <option v-for="ind in industries" :key="ind" :value="ind">{{ ind }}</option>
                    </select>
                    <label for="reg-industry" class="floating-label select-label">行业</label>
                    <span class="dropdown-icon">▼</span>
                  </div>
                </div>
              </template>

              <!-- 自由职业字段 -->
              <template v-if="form.identity === 'freelancer'">
                <div class="form-group">
                  <input type="text" id="reg-skill" v-model="form.skill" class="floating-input" placeholder=" " />
                  <label for="reg-skill" class="floating-label">你的技能领域</label>
                </div>
                <div class="form-group">
                  <input type="text" id="reg-city" v-model="form.city" class="floating-input" placeholder=" " />
                  <label for="reg-city" class="floating-label">所在城市</label>
                </div>
              </template>

              <!-- 服务条款 -->
              <label class="agree-check">
                <input type="checkbox" v-model="form.agreed" />
                <span>我已阅读并同意 <router-link to="/terms" class="link">服务条款</router-link> 和 <router-link to="/privacy" class="link">隐私政策</router-link></span>
              </label>
            </form>

            <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
            <p v-if="successMsg" class="success-msg">{{ successMsg }}</p>

            <div class="step-nav">
              <button class="back-btn" @click="currentStep = 2">← 返回</button>
              <button class="submit-btn" :class="{ loading: isLoading }" :disabled="!form.agreed || isLoading" @click="handleRegister">
                <span v-if="!isLoading">🚀 完成注册</span>
                <span v-else class="spinner"></span>
              </button>
            </div>

            <div class="skip-step" @click="handleRegister" v-if="!isLoading">
              <span>跳过此步，直接完成注册</span>
            </div>
          </div>
        </Transition>

        <!-- 底部 -->
        <div class="auth-footer">
          已有账号？ <router-link to="/login" class="text-brand">直接登录</router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../../supabase'

const router = useRouter()

// ============ 状态 ============
const currentStep = ref(1)
const showPwd = ref(false)
const showPwd2 = ref(false)
const isLoading = ref(false)
const errorMsg = ref('')
const successMsg = ref('')
const codeCooldown = ref(0)

// 表单数据
const form = reactive({
  identity: '' as string,
  nickname: '',
  phone: '',
  email: '',
  emailCode: '',
  password: '',
  confirmPassword: '',
  // 学生字段
  university: '',
  grade: '',
  major: '',
  // 职场字段
  company: '',
  position: '',
  industry: '',
  // 自由职业字段
  skill: '',
  city: '',
  // 协议
  agreed: false,
})

// ============ 身份选项 ============
const identities = [
  { value: 'student', icon: '🎓', label: '在校学生', desc: '高校在读，享受专属学习资源与校园社区' },
  { value: 'worker', icon: '💼', label: '职场青年', desc: '已工作的年轻人，拓展人脉与技能成长' },
  { value: 'freelancer', icon: '🚀', label: '自由职业 / 创业者', desc: '独立创作者或创业中，寻找合作与灵感' },
]

// ============ 数据选项 ============
const universities = [
  '清华大学', '北京大学', '浙江大学', '复旦大学', '上海交通大学',
  '中国人民大学', '南京大学', '武汉大学', '华中科技大学', '中山大学',
  '同济大学', '东南大学', '四川大学', '厦门大学', '天津大学',
  '北京航空航天大学', '北京理工大学', '哈尔滨工业大学', '西安交通大学', '中国科学技术大学',
]

const undergraduateGrades = ['大一', '大二', '大三', '大四', '大五']
const graduateGrades = ['研一', '研二', '研三', '博一', '博二', '博三', '博四', '博五']

const popularMajors = [
  '计算机科学与技术', '软件工程', '电子信息工程', '数据科学与大数据技术',
  '金融学', '经济学', '工商管理', '会计学', '法学', '英语',
  '临床医学', '机械工程', '土木工程', '建筑学', '通信工程',
  '汉语言文学', '新闻学', '视觉传达设计', '数字媒体技术', '人工智能',
]

const industries = [
  '互联网/科技', '金融/银行', '教育/培训', '医疗/健康', '房地产/建筑',
  '制造业', '传媒/广告', '零售/电商', '政府/事业单位', '咨询/服务',
  '能源/环保', '文化/娱乐', '法律', '农业', '其他',
]

// ============ 校验逻辑 ============
const isPhoneValid = computed(() => /^1[3-9]\d{9}$/.test(form.phone))
const isEmailValid = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))

// 密码规则
const hasLength = computed(() => form.password.length >= 8 && form.password.length <= 20)
const hasUpper = computed(() => /[A-Z]/.test(form.password))
const hasLower = computed(() => /[a-z]/.test(form.password))
const hasNumber = computed(() => /\d/.test(form.password))
const hasSpecial = computed(() => /[@$!%*#?&._\-]/.test(form.password))

// 密码强度计算
const pwdStrength = computed(() => {
  let score = 0
  if (hasLength.value) score++
  if (hasUpper.value) score++
  if (hasLower.value) score++
  if (hasNumber.value) score++
  if (hasSpecial.value) score++

  if (score <= 2) return { percent: 25, level: 'weak', text: '弱' }
  if (score <= 3) return { percent: 50, level: 'fair', text: '中' }
  if (score <= 4) return { percent: 75, level: 'good', text: '强' }
  return { percent: 100, level: 'strong', text: '非常强' }
})

// Step 2 整体验证
const isStep2Valid = computed(() => {
  return form.nickname.length >= 2
    && isEmailValid.value
    && form.emailCode.length === 6
    && hasLength.value && hasUpper.value && hasLower.value && hasNumber.value
    && form.password === form.confirmPassword
})

// ============ 方法 ============
const goToStep = (step: number) => {
  // 只能回退，不能跳过验证前进
  if (step < currentStep.value) currentStep.value = step
}

// 发送邮箱验证码
const sendEmailCode = async () => {
  if (!isEmailValid.value || codeCooldown.value > 0) return

  // 启动倒计时
  codeCooldown.value = 60
  const timer = setInterval(() => {
    codeCooldown.value--
    if (codeCooldown.value <= 0) clearInterval(timer)
  }, 1000)

  // 实际对接：调用 Supabase 或后端 API 发送验证码
  // 目前模拟：前端提示已发送
  console.log('验证码已发送至:', form.email)
}

// 提交注册
const handleRegister = async () => {
  if (isLoading.value) return

  // 最后一步可以跳过补充信息，但必须同意条款
  if (!form.agreed) {
    form.agreed = true // 跳过时自动同意
  }

  isLoading.value = true
  errorMsg.value = ''
  successMsg.value = ''

  try {
    // 调用 Supabase 注册
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          nickname: form.nickname,
          identity: form.identity,
          phone: form.phone || undefined,
          university: form.university || undefined,
          grade: form.grade || undefined,
          major: form.major || undefined,
          company: form.company || undefined,
          position: form.position || undefined,
          industry: form.industry || undefined,
          skill: form.skill || undefined,
          city: form.city || undefined,
        }
      }
    })

    if (error) {
      errorMsg.value = '注册失败: ' + error.message
    } else {
      successMsg.value = '🎉 注册成功！请检查邮箱完成验证。'
      setTimeout(() => router.push('/login'), 2000)
    }
  } catch (e: any) {
    errorMsg.value = '注册失败: ' + (e.message || '网络错误')
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
/* 整体布局 */
.auth-layout { display: flex; min-height: 100vh; width: 100%; }

/* 左侧品牌 */
.brand-panel { flex: 0 0 50%; position: relative; background: linear-gradient(135deg, #0a0a0f 0%, #1e1b4b 50%, #0f172a 100%); display: flex; align-items: center; justify-content: center; padding: 60px; overflow: hidden; }
.floating-decorator { position: absolute; border-radius: 50%; filter: blur(100px); z-index: 1; animation: float 12s ease-in-out infinite; }
.decor-1 { top: 5%; left: 15%; width: 350px; height: 350px; background: rgba(139, 92, 246, 0.12); }
.decor-2 { bottom: 10%; right: 10%; width: 450px; height: 450px; background: rgba(79, 142, 247, 0.12); animation-delay: -4s; }
.decor-3 { top: 50%; left: 50%; width: 300px; height: 300px; background: rgba(249, 115, 22, 0.08); animation-delay: -8s; }
@keyframes float { 0%, 100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-25px) scale(1.04); } }

.brand-content { position: relative; z-index: 2; color: white; max-width: 520px; }
.logo { font-size: 20px; font-weight: 800; color: var(--color-brand-blue); display: block; margin-bottom: 40px; text-decoration: none; }
.slogan { font-size: 42px; font-weight: 800; line-height: 1.25; margin-bottom: 20px; }
.desc { font-size: 16px; color: var(--color-text-secondary); line-height: 1.7; margin-bottom: 40px; }

.trust-metrics { display: flex; gap: 32px; }
.metric { display: flex; flex-direction: column; }
.metric strong { font-size: 22px; font-weight: 800; background: var(--gradient-brand); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.metric span { font-size: 12px; color: var(--color-text-muted); margin-top: 2px; }

/* 右侧表单 */
.form-panel { flex: 0 0 50%; background: var(--color-bg-primary); display: flex; align-items: flex-start; justify-content: center; padding: 40px; overflow-y: auto; }
.form-card { width: 100%; max-width: 480px; margin-top: 24px; }

/* 步骤指示器 */
.stepper { display: flex; align-items: center; justify-content: center; margin-bottom: 32px; gap: 0; }
.step-item { display: flex; flex-direction: column; align-items: center; gap: 6px; cursor: pointer; }
.step-circle { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; background: rgba(255,255,255,0.05); border: 2px solid rgba(255,255,255,0.1); color: var(--color-text-muted); transition: all 0.3s; }
.step-item.active .step-circle { background: var(--gradient-brand); border-color: transparent; color: white; }
.step-item.done .step-circle { background: #10b981; border-color: transparent; color: white; }
.step-item span { font-size: 11px; color: var(--color-text-muted); }
.step-item.active span { color: white; font-weight: 600; }
.step-line { width: 48px; height: 2px; background: rgba(255,255,255,0.08); margin: 0 8px; margin-bottom: 18px; transition: background 0.3s; }
.step-line.active { background: var(--gradient-brand); }

/* 表单头部 */
.form-header { margin-bottom: 24px; }
.form-header h2 { font-size: 26px; font-weight: 700; margin-bottom: 6px; }
.form-header p { color: var(--color-text-secondary); font-size: 14px; line-height: 1.5; }

/* 身份选择卡片 */
.identity-grid { display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px; }
.identity-card { position: relative; padding: 18px 20px; border: 2px solid rgba(255,255,255,0.06); border-radius: 14px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 14px; background: rgba(255,255,255,0.02); }
.identity-card:hover { border-color: rgba(139,92,246,0.3); background: rgba(139,92,246,0.04); }
.identity-card.selected { border-color: rgba(139,92,246,0.5); background: rgba(139,92,246,0.08); }
.id-icon { font-size: 28px; flex-shrink: 0; }
.identity-card h4 { font-size: 15px; font-weight: 600; margin-bottom: 2px; }
.identity-card p { font-size: 12px; color: var(--color-text-muted); line-height: 1.4; }
.id-check { position: absolute; top: 12px; right: 14px; width: 22px; height: 22px; background: var(--gradient-brand); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; color: white; }

/* 表单控件 */
.auth-form { display: flex; flex-direction: column; gap: 18px; }
.form-group { position: relative; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.floating-input { width: 100%; padding: 16px; padding-top: 24px; padding-bottom: 8px; background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; color: white; font-size: 15px; transition: all 0.25s; outline: none; }
.floating-input:focus { border-color: var(--color-brand-blue); box-shadow: 0 0 0 3px rgba(79, 142, 247, 0.12); background: rgba(79, 142, 247, 0.04); }
.floating-label { position: absolute; top: 16px; left: 16px; color: var(--color-text-secondary); pointer-events: none; transition: all 0.2s ease-out; font-size: 15px; }
.floating-input:focus ~ .floating-label, .floating-input:not(:placeholder-shown) ~ .floating-label, .select-styled:valid ~ .select-label { opacity: 0.85; transform: translateY(-8px) scale(0.75); transform-origin: left top; color: var(--color-brand-blue); }
.required { color: #f43f5e; }
.field-hint { font-size: 11px; color: var(--color-text-muted); margin-top: 4px; display: block; }
.field-hint.error { color: #f43f5e; }

/* 手机号输入 */
.phone-input-wrapper { position: relative; }
.phone-prefix { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); font-size: 14px; color: var(--color-text-secondary); z-index: 2; font-weight: 600; }
.phone-input { padding-left: 52px !important; }
.phone-label { left: 52px !important; }

/* 验证码 */
.code-group { display: flex; gap: 10px; align-items: flex-start; }
.code-input { flex: 1; }
.send-code-btn { flex-shrink: 0; height: 50px; padding: 0 16px; background: rgba(139,92,246,0.12); border: 1px solid rgba(139,92,246,0.2); border-radius: 12px; color: #c4b5fd; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
.send-code-btn:hover:not(:disabled) { background: rgba(139,92,246,0.2); }
.send-code-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* 密码查看按钮 */
.eye-btn { position: absolute; right: 14px; top: 16px; background: transparent; border: none; color: var(--color-text-secondary); cursor: pointer; font-size: 16px; }

/* 密码强度 */
.pwd-strength { display: flex; align-items: center; gap: 8px; margin-top: 6px; }
.pwd-bar-track { flex: 1; height: 4px; background: rgba(255,255,255,0.06); border-radius: 2px; overflow: hidden; }
.pwd-bar-fill { height: 100%; border-radius: 2px; transition: width 0.3s, background 0.3s; }
.pwd-bar-fill.weak { background: #ef4444; }
.pwd-bar-fill.fair { background: #f97316; }
.pwd-bar-fill.good { background: #3b82f6; }
.pwd-bar-fill.strong { background: #10b981; }
.pwd-level-text { font-size: 11px; font-weight: 600; }
.pwd-level-text.weak { color: #ef4444; }
.pwd-level-text.fair { color: #f97316; }
.pwd-level-text.good { color: #3b82f6; }
.pwd-level-text.strong { color: #10b981; }

/* 密码规则 */
.pwd-rules { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
.pwd-rules span { font-size: 11px; color: var(--color-text-muted); opacity: 0.5; transition: all 0.2s; }
.pwd-rules span.met { color: #10b981; opacity: 1; }

/* select */
.select-styled { appearance: none; cursor: pointer; }
.select-styled option { background: var(--color-bg-secondary); color: white; }
.dropdown-icon { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); font-size: 10px; color: var(--color-text-muted); pointer-events: none; }

/* 服务条款 */
.agree-check { display: flex; align-items: flex-start; gap: 8px; font-size: 13px; color: var(--color-text-secondary); cursor: pointer; line-height: 1.5; }
.agree-check input { margin-top: 3px; accent-color: var(--color-brand-blue); }
.link { color: var(--color-brand-blue); font-weight: 600; }

/* 导航按钮 */
.step-nav { display: flex; justify-content: space-between; gap: 12px; margin-top: 24px; }
.back-btn { padding: 12px 24px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; color: var(--color-text-secondary); font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.15s; }
.back-btn:hover { background: rgba(255,255,255,0.08); color: white; }
.next-btn { flex: 1; padding: 14px 24px; background: var(--gradient-brand); border: none; border-radius: 12px; color: white; font-size: 15px; font-weight: 700; cursor: pointer; transition: transform 0.15s, box-shadow 0.15s; }
.next-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(139,92,246,0.3); }
.next-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
.submit-btn { flex: 1; padding: 14px 24px; background: var(--gradient-brand); border: none; border-radius: 12px; color: white; font-size: 15px; font-weight: 700; cursor: pointer; transition: transform 0.15s; display: flex; align-items: center; justify-content: center; }
.submit-btn:hover:not(:disabled) { transform: translateY(-2px); }
.submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.submit-btn.loading { pointer-events: none; }

.skip-step { text-align: center; margin-top: 16px; font-size: 13px; color: var(--color-text-muted); cursor: pointer; transition: color 0.15s; }
.skip-step:hover { color: var(--color-brand-blue); }

/* 消息 */
.error-msg { color: #ef4444; font-size: 13px; margin-top: 8px; }
.success-msg { color: #10b981; font-size: 13px; margin-top: 8px; }

/* spinner */
.spinner { width: 20px; height: 20px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* 底部 */
.auth-footer { text-align: center; font-size: 14px; color: var(--color-text-secondary); margin-top: 32px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.04); }
.text-brand { color: var(--color-brand-blue); font-weight: 600; }

/* 步骤切换动画 */
.step-fade-enter-active, .step-fade-leave-active { transition: opacity 0.25s, transform 0.25s; }
.step-fade-enter-from { opacity: 0; transform: translateX(20px); }
.step-fade-leave-to { opacity: 0; transform: translateX(-20px); }

/* 响应式 */
@media (max-width: 900px) {
  .brand-panel { display: none; }
  .form-panel { flex: 0 0 100%; }
  .form-row { grid-template-columns: 1fr; }
}
</style>
