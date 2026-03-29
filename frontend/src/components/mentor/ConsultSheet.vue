<template>
  <!-- 发起咨询弹窗 -->
  <Transition name="fade">
    <div v-if="visible" class="cs-overlay" @click.self="$emit('close')">
      <div class="cs-panel">
        <h3 class="cs-title">💬 发起一对一咨询</h3>
        <p class="cs-desc">选择你需要咨询的领域，描述你的问题，AI将为你匹配最合适的学长</p>

        <!-- 分类选择 -->
        <div class="cs-categories">
          <button
            v-for="cat in ARTICLE_CATEGORIES"
            :key="cat.value"
            class="cs-cat-btn"
            :class="{ active: form.category === cat.value }"
            @click="form.category = cat.value"
          >
            {{ cat.label }}
          </button>
        </div>

        <!-- 标题 -->
        <input v-model="form.title" class="cs-input" placeholder="一句话概括你的问题" maxlength="100" />

        <!-- 详细描述 -->
        <textarea v-model="form.description" class="cs-textarea" rows="4" placeholder="详细描述你遇到的问题或想咨询的内容...
提示：描述越详细，AI匹配越精准" maxlength="1000"></textarea>

        <!-- 咨询类型 -->
        <div class="cs-type-row">
          <span class="cs-type-label">咨询方式</span>
          <div class="cs-types">
            <button v-for="t in consultTypes" :key="t.value" class="cs-type-btn" :class="{ active: form.consult_type === t.value }" @click="form.consult_type = t.value">
              {{ t.icon }} {{ t.label }}
              <span v-if="t.price" class="cs-price">{{ t.price }}</span>
            </button>
          </div>
        </div>

        <!-- 操作 -->
        <div class="cs-actions">
          <button class="cs-cancel" @click="$emit('close')">取消</button>
          <button class="cs-submit" :disabled="!isValid || submitting" @click="handleSubmit">
            {{ submitting ? 'AI 匹配中...' : '🚀 提交并AI匹配' }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useMentor, ARTICLE_CATEGORIES } from '../../composables/useMentor'
import type { ArticleCategory } from '../../composables/useMentor'

defineProps<{ visible: boolean }>()
const emit = defineEmits<{
  close: []
  submitted: [consultId: string]
}>()

const { createConsultation } = useMentor()

const form = reactive({
  title: '',
  description: '',
  category: 'academic' as ArticleCategory,
  consult_type: 'text' as 'text' | 'voice' | 'video' | 'offline',
})

const submitting = ref(false)

const consultTypes: { value: 'text' | 'voice' | 'video' | 'offline'; label: string; icon: string; price: string }[] = [
  { value: 'text', label: '文字', icon: '💬', price: '免费' },
  { value: 'voice', label: '语音', icon: '🎙️', price: '' },
  { value: 'video', label: '视频', icon: '📹', price: '' },
  { value: 'offline', label: '线下', icon: '🤝', price: '' },
]

const isValid = computed(() =>
  form.title.trim().length >= 3 && form.description.trim().length >= 10
)

async function handleSubmit() {
  if (!isValid.value || submitting.value) return
  submitting.value = true
  const consult = await createConsultation({
    title: form.title.trim(),
    description: form.description.trim(),
    category: form.category,
    consult_type: form.consult_type,
  })
  submitting.value = false
  if (consult) {
    emit('submitted', consult.id)
    // 重置表单
    form.title = ''
    form.description = ''
  }
}
</script>

<style scoped>
.cs-overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px}
.cs-panel{width:100%;max-width:460px;background:linear-gradient(160deg,#0d0b1e,#12102a);border:1px solid rgba(139,92,246,.12);border-radius:20px;padding:24px}
.cs-title{font-size:18px;font-weight:700;color:rgba(255,255,255,.85);margin:0 0 6px;text-align:center}
.cs-desc{font-size:12px;color:rgba(255,255,255,.3);text-align:center;margin:0 0 18px;line-height:1.5}

.cs-categories{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px}
.cs-cat-btn{padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,.05);background:rgba(255,255,255,.02);color:rgba(255,255,255,.4);font-size:12px;cursor:pointer;transition:all .2s;text-align:left}
.cs-cat-btn.active{background:rgba(139,92,246,.1);border-color:rgba(139,92,246,.2);color:rgba(139,92,246,.8)}

.cs-input,.cs-textarea{width:100%;padding:10px 14px;border-radius:12px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.03);color:white;font-size:13px;outline:none;box-sizing:border-box;margin-bottom:10px;font-family:inherit}
.cs-input:focus,.cs-textarea:focus{border-color:rgba(139,92,246,.2)}
.cs-textarea{resize:none}
.cs-input::placeholder,.cs-textarea::placeholder{color:rgba(255,255,255,.2)}

.cs-type-row{margin-bottom:16px}
.cs-type-label{font-size:12px;color:rgba(255,255,255,.35);display:block;margin-bottom:8px}
.cs-types{display:flex;gap:6px}
.cs-type-btn{flex:1;padding:8px;border-radius:10px;border:1px solid rgba(255,255,255,.05);background:rgba(255,255,255,.02);color:rgba(255,255,255,.35);font-size:11px;cursor:pointer;transition:all .2s;text-align:center}
.cs-type-btn.active{background:rgba(139,92,246,.1);border-color:rgba(139,92,246,.2);color:rgba(139,92,246,.8)}
.cs-price{display:block;font-size:9px;margin-top:2px;color:rgba(34,197,94,.5)}

.cs-actions{display:flex;gap:10px}
.cs-cancel,.cs-submit{flex:1;padding:12px;border-radius:12px;font-size:13px;font-weight:600;cursor:pointer;border:none}
.cs-cancel{background:rgba(255,255,255,.03);color:rgba(255,255,255,.4)}
.cs-submit{background:linear-gradient(135deg,#6d28d9,#8b5cf6);color:white}
.cs-submit:disabled{opacity:.3;cursor:default}

.fade-enter-active,.fade-leave-active{transition:opacity .2s}
.fade-enter-from,.fade-leave-to{opacity:0}
</style>
