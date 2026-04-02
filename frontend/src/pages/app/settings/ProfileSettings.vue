<template>
  <div class="section">
    <h2>个人资料</h2>
    <p class="section-desc">管理个人信息、SparkID 和教育背景。</p>

    <!-- SparkID 卡片 — 唯一标识，用于添加好友 -->
    <div class="card sparkid-card">
      <div class="sparkid-header">
        <div>
          <div class="card-title" style="margin-bottom: 4px">SparkID</div>
          <span class="sparkid-hint">你的唯一标识，可通过 SparkID 添加好友。</span>
        </div>
        <button class="btn-copy" @click="copySparkId" type="button">
          {{ copyText }}
        </button>
      </div>
      <div class="sparkid-display">
        <span class="sparkid-value">{{ sparkId || '生成中...' }}</span>
      </div>
    </div>

    <!-- 头像 -->
    <div class="card">
      <div class="card-title">头像</div>
      <div class="avatar-row">
        <div class="avatar-preview">
          <img v-if="profile.avatarUrl" :src="profile.avatarUrl" alt="头像" />
          <span v-else class="avatar-placeholder">{{ profile.nickname?.charAt(0) || '🙂' }}</span>
        </div>
        <div class="avatar-actions">
          <label class="btn-sm primary">
            上传头像
            <input type="file" accept="image/jpeg,image/png,image/webp" hidden @change="handleAvatarUpload" />
          </label>
          <span class="hint">支持 JPG/PNG/WebP，最大 5MB</span>
        </div>
      </div>
    </div>

    <!-- 基本信息 -->
    <div class="card">
      <div class="card-title">基本信息</div>

      <div class="field">
        <label>
          昵称
          <span v-if="nicknameCooldownMsg" class="cooldown-hint">{{ nicknameCooldownMsg }}</span>
        </label>
        <input
          v-model="form.nickname"
          type="text"
          maxlength="20"
          placeholder="2-20个字符"
          :disabled="!!nicknameCooldownMsg"
        />
        <span class="field-sub">昵称修改后 30 天内不可再次更改，请谨慎修改。</span>
        <span v-if="nicknameError" class="field-error">{{ nicknameError }}</span>
      </div>

      <div class="field">
        <label>个人简介</label>
        <textarea v-model="form.bio" maxlength="200" rows="3" placeholder="介绍一下自己..."></textarea>
        <span class="counter">{{ form.bio.length }}/200</span>
      </div>

      <div class="field-row">
        <div class="field">
          <label>性别</label>
          <SparkSelect v-model="form.gender" :options="genderOptions" />
        </div>
        <div class="field">
          <label>生日</label>
          <input v-model="form.birthday" type="date" />
        </div>
      </div>

      <div class="field">
        <label>地区</label>
        <input v-model="form.location" type="text" placeholder="如：北京市海淀区" />
      </div>
    </div>

    <!-- 教育信息 -->
    <div class="card">
      <div class="card-title">教育信息</div>

      <div class="field-row">
        <div class="field">
          <label>学校</label>
          <input v-model="eduForm.university" type="text" placeholder="如：清华大学" />
        </div>
        <div class="field">
          <label>院系</label>
          <input v-model="eduForm.department" type="text" placeholder="如：计算机科学与技术系" />
        </div>
      </div>

      <div class="field-row">
        <div class="field">
          <label>专业</label>
          <input v-model="eduForm.major" type="text" placeholder="如：软件工程" />
        </div>
        <div class="field">
          <label>年级</label>
          <SparkSelect v-model="eduForm.grade" :options="gradeSelectOptions" />
        </div>
      </div>

      <div class="field-row">
        <div class="field">
          <label>学号 <span class="optional">选填</span></label>
          <input v-model="eduForm.studentId" type="text" placeholder="仅用于认证，不公开" />
        </div>
        <div class="field">
          <label>入学年份</label>
          <input v-model.number="eduForm.enrollmentYear" type="number" min="2010" max="2030" placeholder="如：2023" />
        </div>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="action-bar">
      <button class="btn-secondary" @click="resetForm" :disabled="!hasChanges" type="button">放弃修改</button>
      <button class="btn-primary" @click="handleSave" :disabled="!hasChanges || isSaving" type="button">
        {{ isSaving ? '保存中...' : '保存修改' }}
      </button>
    </div>

    <Transition name="fade">
      <div v-if="toast" class="toast" :class="toast.type">{{ toast.message }}</div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { useSettings } from '../../../composables/useSettings'
import { useAuth } from '../../../composables/useAuth'
import { supabase } from '../../../supabase'
import SparkSelect from '../../../components/SparkSelect.vue'

const { profile, education, updateProfile, updateEducation, settingsLoaded, loadSettings } = useSettings()
const { user } = useAuth()
const isSaving = ref(false)
const toast = ref<{ type: string; message: string } | null>(null)
const copyText = ref('复制')

// ====== SparkID — 基于用户注册时间生成的唯一标识 ======
// 规则：SA + 注册年份后2位 + 随机6位字母数字（类似淘宝旺旺号、闲鱼ID）
const sparkId = computed(() => {
  if (!user.value) return ''
  // 从 user.id (UUID) 中提取前8位作为唯一标识
  const uid = user.value.id.replace(/-/g, '').slice(0, 8).toUpperCase()
  const year = user.value.created_at
    ? new Date(user.value.created_at).getFullYear().toString().slice(2)
    : '26'
  return `SA${year}${uid}`
})

async function copySparkId() {
  if (!sparkId.value) return
  try {
    await navigator.clipboard.writeText(sparkId.value)
    copyText.value = '已复制 ✓'
    setTimeout(() => { copyText.value = '复制' }, 2000)
  } catch {
    // 降级方案
    const ta = document.createElement('textarea')
    ta.value = sparkId.value
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    copyText.value = '已复制 ✓'
    setTimeout(() => { copyText.value = '复制' }, 2000)
  }
}

// ====== 昵称冷却期控制 ======
const NICKNAME_COOLDOWN_KEY = 'spark-nickname-last-change'
const NICKNAME_COOLDOWN_DAYS = 30

const nicknameCooldownMsg = ref('')
const nicknameError = ref('')

function checkNicknameCooldown() {
  const lastChange = localStorage.getItem(NICKNAME_COOLDOWN_KEY)
  if (!lastChange) return
  const elapsed = Date.now() - parseInt(lastChange)
  const remaining = NICKNAME_COOLDOWN_DAYS * 86400000 - elapsed
  if (remaining > 0) {
    const days = Math.ceil(remaining / 86400000)
    nicknameCooldownMsg.value = `(${days}天后可修改)`
  }
}

function validateNickname(name: string): string {
  if (name.length < 2) return '昵称至少2个字符'
  if (name.length > 20) return '昵称最多20个字符'
  if (/^\s+$/.test(name)) return '昵称不能为纯空格'
  return ''
}

// ====== 表单 ======
const form = reactive({
  nickname: '', bio: '', gender: 'secret' as string, birthday: '' as string | null, location: '',
})
const eduForm = reactive({
  university: '', department: '', major: '', grade: '' as string,
  studentId: '', enrollmentYear: null as number | null,
})

let originalForm = ''
let originalEduForm = ''

function snapshotForm() {
  originalForm = JSON.stringify(form)
  originalEduForm = JSON.stringify(eduForm)
}

const hasChanges = computed(() => {
  return JSON.stringify(form) !== originalForm || JSON.stringify(eduForm) !== originalEduForm
})

function resetForm() {
  Object.assign(form, JSON.parse(originalForm))
  Object.assign(eduForm, JSON.parse(originalEduForm))
}

const genderOptions = [
  { value: 'secret', label: '保密' },
  { value: 'male', label: '男' },
  { value: 'female', label: '女' },
  { value: 'other', label: '其他' },
]

const gradeSelectOptions = [
  { value: '', label: '请选择' },
  ...['大一', '大二', '大三', '大四', '研一', '研二', '研三', '博一', '博二', '博三', '已毕业', '教职工'].map(g => ({ value: g, label: g })),
]

function showToast(type: string, message: string) {
  toast.value = { type, message }
  setTimeout(() => { toast.value = null }, 3000)
}

async function handleSave() {
  if (form.nickname !== JSON.parse(originalForm).nickname) {
    const err = validateNickname(form.nickname)
    if (err) { nicknameError.value = err; return }
    nicknameError.value = ''
    if (nicknameCooldownMsg.value) {
      showToast('error', '昵称修改冷却期内，暂时无法修改')
      return
    }
  }

  isSaving.value = true
  const profileSuccess = await updateProfile({
    nickname: form.nickname, bio: form.bio,
    gender: form.gender as 'male' | 'female' | 'other' | 'secret',
    birthday: form.birthday || null, location: form.location,
  })
  const eduSuccess = await updateEducation(eduForm)
  isSaving.value = false

  if (profileSuccess && eduSuccess) {
    if (form.nickname !== JSON.parse(originalForm).nickname) {
      localStorage.setItem(NICKNAME_COOLDOWN_KEY, String(Date.now()))
      checkNicknameCooldown()
    }
    snapshotForm()
    showToast('success', '资料已保存')
  } else {
    showToast('error', '保存失败，请稍后重试')
  }
}

async function handleAvatarUpload(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (file.size > 5 * 1024 * 1024) { showToast('error', '图片大小不能超过 5MB'); return }

  const ext = file.name.split('.').pop() || 'jpg'
  const filePath = `avatars/${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('public').upload(filePath, file, { upsert: true })
  if (error) { showToast('error', '头像上传失败'); return }

  const { data: urlData } = supabase.storage.from('public').getPublicUrl(filePath)
  const success = await updateProfile({ avatarUrl: urlData.publicUrl })
  showToast(success ? 'success' : 'error', success ? '头像已更新' : '头像更新失败')
}

onBeforeRouteLeave((_to, _from, next) => {
  if (hasChanges.value) {
    next(window.confirm('你有未保存的修改，确定要离开吗？'))
  } else { next() }
})

function handleBeforeUnload(e: BeforeUnloadEvent) {
  if (hasChanges.value) { e.preventDefault(); e.returnValue = '' }
}

onMounted(async () => {
  if (!settingsLoaded.value) await loadSettings()
  form.nickname = profile.value.nickname
  form.bio = profile.value.bio
  form.gender = profile.value.gender
  form.birthday = profile.value.birthday
  form.location = profile.value.location

  eduForm.university = education.value.university
  eduForm.department = education.value.department
  eduForm.major = education.value.major
  eduForm.grade = education.value.grade
  eduForm.studentId = education.value.studentId
  eduForm.enrollmentYear = education.value.enrollmentYear

  snapshotForm()
  checkNicknameCooldown()
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
})
</script>

<style scoped>
.section { display: flex; flex-direction: column; gap: 20px; }
.section h2 { font-size: 20px; font-weight: 800; color: var(--color-text-primary); margin: 0; }
.section-desc { font-size: 13px; color: var(--color-text-muted); margin: -8px 0 4px; }
.card { background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 24px; }
.card-title { font-size: 15px; font-weight: 700; color: var(--color-text-primary); margin-bottom: 20px; }

/* SparkID 卡片 */
.sparkid-card { background: linear-gradient(135deg, rgba(79,142,247,0.06), rgba(139,92,246,0.04)); border-color: rgba(79,142,247,0.12); }
.sparkid-header { display: flex; justify-content: space-between; align-items: flex-start; }
.sparkid-hint { font-size: 12px; color: var(--color-text-muted); }
.sparkid-display { margin-top: 16px; padding: 14px 18px; border-radius: var(--radius-md); background: rgba(0,0,0,0.2); border: 1px solid rgba(79,142,247,0.1); }
.sparkid-value { font-size: 20px; font-weight: 800; font-family: 'JetBrains Mono', 'SF Mono', monospace; letter-spacing: 2px; background: var(--gradient-brand); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.btn-copy { padding: 6px 14px; border-radius: 10px; font-size: 12px; font-weight: 600; background: rgba(79,142,247,0.1); border: 1px solid rgba(79,142,247,0.2); color: #60a5fa; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
.btn-copy:hover { background: rgba(79,142,247,0.2); }

/* 头像区 */
.avatar-row { display: flex; align-items: center; gap: 20px; }
.avatar-preview { width: 72px; height: 72px; border-radius: 50%; overflow: hidden; background: var(--color-bg-card-hover); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.avatar-preview img { width: 100%; height: 100%; object-fit: cover; }
.avatar-placeholder { font-size: 28px; }
.avatar-actions { display: flex; flex-direction: column; gap: 6px; }
.btn-sm { display: inline-flex; align-items: center; justify-content: center; padding: 6px 16px; border-radius: 10px; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s; border: none; }
.btn-sm.primary { background: var(--gradient-brand); color: white; }
.hint { font-size: 11px; color: var(--color-text-muted); }

/* 表单字段 */
.field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; position: relative; }
.field:last-child { margin-bottom: 0; }
.field label { font-size: 13px; font-weight: 600; color: var(--color-text-secondary); display: flex; align-items: center; gap: 8px; }
.optional { font-weight: 400; color: var(--color-text-muted); font-size: 11px; }
.cooldown-hint { font-size: 11px; font-weight: 400; color: #f97316; }
.field-sub { font-size: 11px; color: var(--color-text-muted); }
.field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.field textarea { resize: none; line-height: 1.5; }
.counter { position: absolute; right: 0; bottom: -18px; font-size: 11px; color: var(--color-text-muted); }
.field-error { font-size: 12px; color: #f43f5e; }

/* 操作按钮栏 */
.action-bar { display: flex; justify-content: flex-end; gap: 12px; padding-top: 8px; position: sticky; bottom: 24px; z-index: 10; }
.btn-primary { display: inline-flex; align-items: center; justify-content: center; padding: 10px 28px; border-radius: 12px; font-size: 14px; font-weight: 600; background: var(--gradient-brand); color: white; border: none; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 16px rgba(79,142,247,0.2); }
.btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 24px rgba(79,142,247,0.3); }
.btn-primary:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
.btn-secondary { padding: 10px 20px; border-radius: 12px; font-size: 14px; font-weight: 600; background: transparent; border: 1px solid var(--color-border); color: var(--color-text-secondary); cursor: pointer; transition: all 0.2s; }
.btn-secondary:hover:not(:disabled) { border-color: var(--color-border-hover); color: var(--color-text-primary); }
.btn-secondary:disabled { opacity: 0.3; cursor: not-allowed; }

/* Toast */
.toast { position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%); padding: 10px 20px; border-radius: 12px; font-size: 13px; font-weight: 600; z-index: 300; }
.toast.success { background: rgba(16,185,129,0.9); color: white; }
.toast.error { background: rgba(244,63,94,0.9); color: white; }
.fade-enter-active, .fade-leave-active { transition: all 0.25s; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translate(-50%, 8px); }

@media (max-width: 640px) { .field-row { grid-template-columns: 1fr; } }
</style>
