<template>
  <!-- 学长认证申请弹窗 -->
  <Transition name="fade">
    <div v-if="visible" class="ma-overlay" @click.self="$emit('close')">
      <div class="ma-panel">
        <h3 class="ma-title">🎓 申请成为学长</h3>
        <p class="ma-desc">分享你的经验，帮助学弟学妹成长，获得贡献积分和认证</p>

        <!-- 昵称 -->
        <label class="ma-label">展示名称 *</label>
        <input v-model="form.display_name" class="ma-input" placeholder="其他同学能看到的名字" maxlength="30" />

        <!-- 院校+专业 -->
        <div class="ma-row">
          <div class="ma-col">
            <label class="ma-label">院校</label>
            <input v-model="form.university" class="ma-input" placeholder="如：清华大学" maxlength="50" />
          </div>
          <div class="ma-col">
            <label class="ma-label">专业</label>
            <input v-model="form.major" class="ma-input" placeholder="如：计算机科学" maxlength="50" />
          </div>
        </div>

        <!-- 年级 -->
        <label class="ma-label">年级</label>
        <select v-model="form.grade" class="ma-input">
          <option value="">请选择</option>
          <option v-for="g in grades" :key="g" :value="g">{{ g }}</option>
        </select>

        <!-- 个人简介 -->
        <label class="ma-label">个人简介</label>
        <textarea v-model="form.bio" class="ma-textarea" rows="2" placeholder="一段话介绍你的经历和优势..." maxlength="300"></textarea>

        <!-- 擅长领域 -->
        <label class="ma-label">擅长领域（点击选择）</label>
        <div class="ma-area-grid">
          <button
            v-for="area in areaOptions"
            :key="area.value"
            class="ma-area-btn"
            :class="{ active: form.expertise_areas.includes(area.value) }"
            @click="toggleArea(area.value)"
          >
            {{ area.label }}
          </button>
        </div>

        <!-- 擅长标签 -->
        <label class="ma-label">擅长标签（最多选10个）</label>
        <div class="ma-tags-grid">
          <button
            v-for="tag in HOT_TAGS"
            :key="tag"
            class="ma-tag-btn"
            :class="{ active: form.expertise_tags.includes(tag) }"
            @click="toggleTag(tag)"
          >
            {{ tag }}
          </button>
        </div>

        <!-- 认证材料 -->
        <label class="ma-label">认证材料（学生证/成绩单/获奖证书，可选）</label>
        <label class="ma-upload">
          <input type="file" accept="image/*" multiple @change="handleFileSelect" style="display:none" />
          📎 {{ proofFiles.length ? `已选${proofFiles.length}个文件` : '点击上传证明材料' }}
        </label>

        <!-- 操作 -->
        <div class="ma-actions">
          <button class="ma-cancel" @click="$emit('close')">取消</button>
          <button class="ma-submit" :disabled="!isValid || submitting" @click="handleSubmit">
            {{ submitting ? '提交中...' : '🚀 提交申请' }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useMentor, HOT_TAGS } from '../../composables/useMentor'

defineProps<{ visible: boolean }>()
const emit = defineEmits<{
  close: []
  applied: []
}>()

const { applyForMentor } = useMentor()
const submitting = ref(false)
const proofFiles = ref<File[]>([])

const form = reactive({
  display_name: '',
  university: '',
  major: '',
  grade: '',
  bio: '',
  expertise_areas: [] as string[],
  expertise_tags: [] as string[],
})

const grades = ['大一', '大二', '大三', '大四', '研一', '研二', '研三', '博士', '已毕业']

const areaOptions = [
  { value: 'academic', label: '📚 学习经验' },
  { value: 'life', label: '🏠 生活指南' },
  { value: 'career', label: '💼 职业发展' },
  { value: 'postgrad', label: '🎓 考研留学' },
]

const isValid = computed(() =>
  form.display_name.trim().length >= 2 &&
  form.expertise_areas.length > 0 &&
  form.expertise_tags.length > 0
)

function toggleArea(value: string) {
  const idx = form.expertise_areas.indexOf(value)
  if (idx >= 0) form.expertise_areas.splice(idx, 1)
  else form.expertise_areas.push(value)
}

function toggleTag(tag: string) {
  const idx = form.expertise_tags.indexOf(tag)
  if (idx >= 0) form.expertise_tags.splice(idx, 1)
  else if (form.expertise_tags.length < 10) form.expertise_tags.push(tag)
}

function handleFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files) proofFiles.value = Array.from(input.files)
}

async function handleSubmit() {
  if (!isValid.value || submitting.value) return
  submitting.value = true
  const success = await applyForMentor({
    display_name: form.display_name.trim(),
    bio: form.bio.trim() || undefined,
    university: form.university.trim() || undefined,
    major: form.major.trim() || undefined,
    grade: form.grade || undefined,
    expertise_areas: form.expertise_areas,
    expertise_tags: form.expertise_tags,
    proofFiles: proofFiles.value.length ? proofFiles.value : undefined,
  })
  submitting.value = false
  if (success) emit('applied')
}
</script>

<style scoped>
.ma-overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px;overflow-y:auto}
.ma-panel{width:100%;max-width:480px;max-height:90vh;overflow-y:auto;background:linear-gradient(160deg,#0d0b1e,#12102a);border:1px solid rgba(139,92,246,.12);border-radius:20px;padding:24px}
.ma-title{font-size:18px;font-weight:700;color:rgba(255,255,255,.85);margin:0 0 6px;text-align:center}
.ma-desc{font-size:12px;color:rgba(255,255,255,.3);text-align:center;margin:0 0 18px}

.ma-label{display:block;font-size:12px;color:rgba(255,255,255,.35);margin:10px 0 5px;font-weight:500}
.ma-input,.ma-textarea{width:100%;padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.03);color:white;font-size:13px;outline:none;box-sizing:border-box;font-family:inherit}
.ma-input:focus,.ma-textarea:focus{border-color:rgba(139,92,246,.2)}
.ma-textarea{resize:none}
.ma-input::placeholder,.ma-textarea::placeholder{color:rgba(255,255,255,.2)}
select.ma-input{appearance:none;-webkit-appearance:none}

.ma-row{display:flex;gap:10px}
.ma-col{flex:1}

.ma-area-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.ma-area-btn{padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,.05);background:rgba(255,255,255,.02);color:rgba(255,255,255,.35);font-size:11px;cursor:pointer;transition:all .2s}
.ma-area-btn.active{background:rgba(139,92,246,.1);border-color:rgba(139,92,246,.2);color:rgba(139,92,246,.8)}

.ma-tags-grid{display:flex;flex-wrap:wrap;gap:5px}
.ma-tag-btn{padding:3px 8px;border-radius:6px;border:1px solid rgba(255,255,255,.05);background:rgba(255,255,255,.02);color:rgba(255,255,255,.3);font-size:10px;cursor:pointer;transition:all .2s}
.ma-tag-btn.active{background:rgba(139,92,246,.1);border-color:rgba(139,92,246,.15);color:rgba(139,92,246,.7)}

.ma-upload{display:flex;align-items:center;justify-content:center;padding:16px;border-radius:12px;border:2px dashed rgba(139,92,246,.12);background:rgba(139,92,246,.03);cursor:pointer;margin-bottom:14px;font-size:13px;color:rgba(255,255,255,.3);transition:all .2s}
.ma-upload:hover{border-color:rgba(139,92,246,.25)}

.ma-actions{display:flex;gap:10px;margin-top:6px}
.ma-cancel,.ma-submit{flex:1;padding:12px;border-radius:12px;font-size:13px;font-weight:600;cursor:pointer;border:none}
.ma-cancel{background:rgba(255,255,255,.03);color:rgba(255,255,255,.4)}
.ma-submit{background:linear-gradient(135deg,#6d28d9,#8b5cf6);color:white}
.ma-submit:disabled{opacity:.3;cursor:default}

.fade-enter-active,.fade-leave-active{transition:opacity .2s}
.fade-enter-from,.fade-leave-to{opacity:0}
</style>
