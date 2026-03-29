<template>
  <!-- 发布/编辑商品表单 -->
  <div class="pf-form">
    <h3>{{ isEdit ? '✏️ 编辑商品' : '📦 发布闲置' }}</h3>

    <!-- 图片上传 -->
    <div class="pf-section">
      <label class="pf-label">商品图片 <span class="pf-required">*</span> <span class="pf-hint">(最多9张，首图为封面)</span></label>
      <div class="pf-images">
        <div v-for="(url, i) in imageUrls" :key="i" class="pf-img-item">
          <img :src="url" class="pf-img-preview" />
          <button class="pf-img-remove" @click="removeImage(i)">✕</button>
          <span v-if="i === 0" class="pf-img-cover">封面</span>
        </div>
        <label v-if="imageUrls.length < 9" class="pf-img-add">
          <input type="file" accept="image/*" multiple @change="handleImageSelect" style="display:none" />
          <span class="pf-img-add-icon">📷</span>
          <span class="pf-img-add-text">{{ uploadingImg ? '上传中...' : '添加图片' }}</span>
        </label>
      </div>
    </div>

    <!-- 标题 -->
    <div class="pf-section">
      <label class="pf-label">商品标题 <span class="pf-required">*</span></label>
      <input v-model="form.title" class="pf-input" placeholder="简要描述你的商品（5-50字）" maxlength="50" />
      <span class="pf-counter">{{ form.title.length }}/50</span>
    </div>

    <!-- 描述 -->
    <div class="pf-section">
      <label class="pf-label">商品描述 <span class="pf-required">*</span></label>
      <textarea v-model="form.description" class="pf-textarea" rows="4" placeholder="详细描述商品的使用情况、购买渠道、转手原因等（20-500字）" maxlength="500"></textarea>
      <span class="pf-counter">{{ form.description.length }}/500</span>
    </div>

    <!-- 分类 -->
    <div class="pf-section">
      <label class="pf-label">商品分类 <span class="pf-required">*</span></label>
      <div class="pf-cat-grid">
        <button v-for="cat in categories" :key="cat.id" class="pf-cat-btn"
          :class="{ active: selectedParentCat === cat.id }" @click="selectParentCat(cat.id)">
          {{ cat.icon }} {{ cat.name }}
        </button>
      </div>
      <!-- 子分类 -->
      <div v-if="subCategories.length" class="pf-subcat-grid">
        <button v-for="sub in subCategories" :key="sub.id" class="pf-subcat-btn"
          :class="{ active: form.category_id === sub.id }" @click="form.category_id = sub.id">
          {{ sub.name }}
        </button>
      </div>
    </div>

    <!-- 成色 -->
    <div class="pf-section">
      <label class="pf-label">商品成色 <span class="pf-required">*</span></label>
      <div class="pf-condition-grid">
        <button v-for="(info, key) in conditionMap" :key="key" class="pf-cond-btn"
          :class="{ active: form.condition === key }"
          :style="{ '--cond-color': info.color }" @click="form.condition = key as string">
          {{ info.label }}
        </button>
      </div>
    </div>

    <!-- 价格 -->
    <div class="pf-section">
      <label class="pf-label">价格 <span class="pf-required">*</span></label>
      <div class="pf-price-row">
        <div class="pf-price-field">
          <span class="pf-price-symbol">¥</span>
          <input v-model.number="form.price" type="number" class="pf-input price" placeholder="出售价格" min="0" step="0.01" />
        </div>
        <div class="pf-price-field original">
          <span class="pf-price-label">原价</span>
          <input v-model.number="form.original_price" type="number" class="pf-input price" placeholder="选填" min="0" step="0.01" />
        </div>
      </div>
      <!-- AI定价建议 -->
      <div v-if="priceSuggestion" class="pf-ai-suggest">
        💡 {{ priceSuggestion.suggestion }}
      </div>
      <label class="pf-toggle">
        <input type="checkbox" v-model="form.is_negotiable" /> 接受议价
      </label>
    </div>

    <!-- 交易方式 -->
    <div class="pf-section">
      <label class="pf-label">交易方式 <span class="pf-required">*</span></label>
      <div class="pf-trade-grid">
        <button v-for="method in tradeMethods" :key="method" class="pf-trade-btn"
          :class="{ active: form.trade_method === method }" @click="form.trade_method = method">
          {{ method }}
        </button>
      </div>
      <input v-model="form.trade_location" class="pf-input mt" placeholder="交易地点说明（选填）" />
    </div>

    <!-- 标签 -->
    <div class="pf-section">
      <label class="pf-label">商品标签 <span class="pf-hint">(选填，突出卖点)</span></label>
      <div class="pf-quick-tags">
        <button v-for="tag in quickTags" :key="tag" class="pf-qtag"
          :class="{ active: form.tags.includes(tag) }" @click="toggleTag(tag)">
          {{ tag }}
        </button>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="pf-actions">
      <button class="pf-btn cancel" @click="$emit('cancel')">取消</button>
      <button class="pf-btn preview" @click="showPreview = true" :disabled="!canPublish">👁 预览</button>
      <button class="pf-btn draft" @click="$emit('submit', { ...getFormData(), status: 'draft' })">💾 草稿</button>
      <button class="pf-btn publish" :disabled="!canPublish || publishing" @click="$emit('submit', getFormData())">
        {{ publishing ? '发布中...' : '🚀 发布' }}
      </button>
    </div>

    <!-- 预览弹窗 -->
    <Teleport to="body">
      <div v-if="showPreview" class="pf-preview-overlay" @click.self="showPreview = false">
        <div class="pf-preview-card">
          <h4 class="pf-preview-title">📱 发布预览</h4>
          <div class="pf-preview-body">
            <div class="pf-pv-img-wrap">
              <img v-if="imageUrls.length" :src="imageUrls[0]" class="pf-pv-img" />
              <div v-else class="pf-pv-img pf-pv-no-img">📦</div>
            </div>
            <div class="pf-pv-info">
              <p class="pf-pv-name">{{ form.title || '(标题)' }}</p>
              <span class="pf-pv-price">¥{{ form.price || 0 }}</span>
              <span v-if="form.original_price" class="pf-pv-original">¥{{ form.original_price }}</span>
              <p class="pf-pv-desc">{{ form.description.slice(0, 80) || '(描述)' }}</p>
              <div class="pf-pv-tags">
                <span v-for="tag in form.tags" :key="tag" class="pf-pv-tag">{{ tag }}</span>
                <span v-if="form.is_negotiable" class="pf-pv-tag green">可议价</span>
              </div>
            </div>
          </div>
          <button class="pf-preview-close" @click="showPreview = false">关闭预览</button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { ShopCategory, ShopProduct } from '../../composables/useShop'
import { CONDITION_MAP, TRADE_METHODS, QUICK_TAGS } from '../../composables/useShop'
import { useShop } from '../../composables/useShop'

const props = defineProps<{
  categories: ShopCategory[]
  editProduct?: ShopProduct | null
  publishing?: boolean
}>()

defineEmits<{
  cancel: []
  submit: [data: Record<string, unknown>]
}>()

const { uploadProductImage, getAIPriceSuggestion } = useShop()

const isEdit = computed(() => !!props.editProduct)
const conditionMap = CONDITION_MAP
const tradeMethods = TRADE_METHODS
const quickTags = QUICK_TAGS

// 表单数据
const form = ref({
  title: props.editProduct?.title || '',
  description: props.editProduct?.description || '',
  category_id: props.editProduct?.category_id || null as number | null,
  condition: props.editProduct?.condition || 'good',
  price: props.editProduct?.price || 0,
  original_price: props.editProduct?.original_price || null as number | null,
  trade_method: props.editProduct?.trade_method || '校内面交',
  trade_location: props.editProduct?.trade_location || '',
  is_negotiable: props.editProduct?.is_negotiable ?? true,
  tags: [...(props.editProduct?.tags || [])],
})

const imageUrls = ref<string[]>([...(props.editProduct?.images || [])])
const uploadingImg = ref(false)
const selectedParentCat = ref<number | null>(null)
const showPreview = ref(false)

// AI定价建议
const priceSuggestion = ref<{ avgPrice: number; minPrice: number; maxPrice: number; suggestion: string } | null>(null)

// 子分类
const subCategories = computed(() => {
  if (!selectedParentCat.value) return []
  const parent = props.categories.find(c => c.id === selectedParentCat.value)
  return parent?.children || []
})

// 分类选择
function selectParentCat(id: number) {
  selectedParentCat.value = id
  const parent = props.categories.find(c => c.id === id)
  // 如果没有子分类，直接选父分类
  if (!parent?.children?.length) {
    form.value.category_id = id
  } else {
    form.value.category_id = null
  }
}

// 图片上传
async function handleImageSelect(e: Event) {
  const input = e.target as HTMLInputElement
  if (!input.files?.length) return
  uploadingImg.value = true
  const files = Array.from(input.files).slice(0, 9 - imageUrls.value.length)
  for (const file of files) {
    const url = await uploadProductImage(file)
    if (url) imageUrls.value.push(url)
  }
  uploadingImg.value = false
  input.value = ''
}

function removeImage(i: number) {
  imageUrls.value.splice(i, 1)
}

// 标签切换
function toggleTag(tag: string) {
  const idx = form.value.tags.indexOf(tag)
  if (idx >= 0) form.value.tags.splice(idx, 1)
  else if (form.value.tags.length < 5) form.value.tags.push(tag)
}

// 校验
const canPublish = computed(() =>
  form.value.title.length >= 5 &&
  form.value.description.length >= 20 &&
  form.value.price > 0 &&
  imageUrls.value.length >= 1
)

// 获取提交数据
function getFormData() {
  return {
    ...form.value,
    images: imageUrls.value,
    status: 'active',
  }
}

// 分类或成色变化时获取AI定价建议
watch([() => form.value.category_id, () => form.value.condition], async ([catId, cond]) => {
  if (catId && cond && form.value.title.length >= 3) {
    priceSuggestion.value = await getAIPriceSuggestion(catId, cond, form.value.title)
  }
}, { immediate: false })
</script>

<style scoped>
.pf-form{padding:4px 0}
.pf-form h3{font-size:16px;font-weight:600;color:rgba(255,255,255,.8);margin:0 0 16px;text-align:center}

.pf-section{margin-bottom:14px}
.pf-label{display:block;font-size:12px;font-weight:600;color:rgba(255,255,255,.5);margin-bottom:6px}
.pf-required{color:rgba(239,68,68,.6)}
.pf-hint{font-weight:400;color:rgba(255,255,255,.2);font-size:10px}

.pf-input{width:100%;padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.03);color:white;font-size:13px;outline:none;box-sizing:border-box;font-family:inherit}
.pf-input:focus{border-color:rgba(79,142,247,.2)}
.pf-input::placeholder{color:rgba(255,255,255,.15)}
.pf-input.mt{margin-top:6px}
.pf-textarea{width:100%;padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.03);color:white;font-size:13px;outline:none;box-sizing:border-box;font-family:inherit;resize:none;line-height:1.6}
.pf-textarea:focus{border-color:rgba(79,142,247,.2)}
.pf-textarea::placeholder{color:rgba(255,255,255,.15)}
.pf-counter{display:block;text-align:right;font-size:10px;color:rgba(255,255,255,.15);margin-top:2px}

/* 图片 */
.pf-images{display:flex;flex-wrap:wrap;gap:6px}
.pf-img-item{position:relative;width:72px;height:72px;border-radius:10px;overflow:hidden}
.pf-img-preview{width:100%;height:100%;object-fit:cover}
.pf-img-remove{position:absolute;top:2px;right:2px;width:18px;height:18px;border-radius:50%;background:rgba(0,0,0,.6);border:none;color:white;font-size:10px;cursor:pointer;display:flex;align-items:center;justify-content:center}
.pf-img-cover{position:absolute;bottom:0;left:0;right:0;background:rgba(79,142,247,.8);color:white;font-size:9px;text-align:center;padding:1px 0}
.pf-img-add{width:72px;height:72px;border-radius:10px;border:2px dashed rgba(79,142,247,.15);display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;gap:2px;transition:all .2s}
.pf-img-add:hover{border-color:rgba(79,142,247,.3);background:rgba(79,142,247,.03)}
.pf-img-add-icon{font-size:18px}
.pf-img-add-text{font-size:9px;color:rgba(255,255,255,.2)}

/* 分类 */
.pf-cat-grid{display:flex;flex-wrap:wrap;gap:4px}
.pf-cat-btn{padding:6px 12px;border-radius:8px;border:1px solid rgba(255,255,255,.05);background:rgba(255,255,255,.02);color:rgba(255,255,255,.4);font-size:11px;cursor:pointer;transition:all .2s}
.pf-cat-btn.active{background:rgba(79,142,247,.1);border-color:rgba(79,142,247,.2);color:rgba(79,142,247,.8)}
.pf-subcat-grid{display:flex;flex-wrap:wrap;gap:3px;margin-top:6px}
.pf-subcat-btn{padding:4px 10px;border-radius:6px;border:1px solid rgba(255,255,255,.04);background:rgba(255,255,255,.015);color:rgba(255,255,255,.3);font-size:10px;cursor:pointer;transition:all .2s}
.pf-subcat-btn.active{background:rgba(79,142,247,.08);border-color:rgba(79,142,247,.15);color:rgba(79,142,247,.7)}

/* 成色 */
.pf-condition-grid{display:flex;gap:4px}
.pf-cond-btn{flex:1;padding:8px 4px;border-radius:8px;border:1px solid rgba(255,255,255,.05);background:rgba(255,255,255,.02);color:rgba(255,255,255,.3);font-size:11px;cursor:pointer;transition:all .2s;text-align:center}
.pf-cond-btn.active{background:color-mix(in srgb, var(--cond-color) 10%, transparent);border-color:color-mix(in srgb, var(--cond-color) 25%, transparent);color:var(--cond-color)}

/* 价格 */
.pf-price-row{display:flex;gap:8px}
.pf-price-field{flex:1;display:flex;align-items:center;gap:4px}
.pf-price-field.original{flex:0.7}
.pf-price-symbol{font-size:16px;font-weight:700;color:#f97316}
.pf-price-label{font-size:11px;color:rgba(255,255,255,.2);white-space:nowrap}
.pf-input.price{text-align:left}
.pf-ai-suggest{margin-top:6px;padding:8px 10px;border-radius:8px;background:rgba(79,142,247,.05);border:1px solid rgba(79,142,247,.08);font-size:11px;color:rgba(79,142,247,.6)}
.pf-toggle{display:flex;align-items:center;gap:6px;font-size:12px;color:rgba(255,255,255,.35);margin-top:6px;cursor:pointer}
.pf-toggle input{accent-color:rgba(79,142,247,.6)}

/* 交易方式 */
.pf-trade-grid{display:flex;gap:4px;flex-wrap:wrap}
.pf-trade-btn{padding:6px 14px;border-radius:8px;border:1px solid rgba(255,255,255,.05);background:rgba(255,255,255,.02);color:rgba(255,255,255,.3);font-size:11px;cursor:pointer;transition:all .2s}
.pf-trade-btn.active{background:rgba(79,142,247,.1);border-color:rgba(79,142,247,.2);color:rgba(79,142,247,.8)}

/* 标签 */
.pf-quick-tags{display:flex;flex-wrap:wrap;gap:4px}
.pf-qtag{padding:4px 10px;border-radius:6px;border:1px solid rgba(255,255,255,.04);background:rgba(255,255,255,.015);color:rgba(255,255,255,.25);font-size:10px;cursor:pointer;transition:all .2s}
.pf-qtag.active{background:rgba(249,115,22,.08);border-color:rgba(249,115,22,.15);color:rgba(249,115,22,.7)}

.pf-actions{display:flex;gap:6px;margin-top:16px}
.pf-btn{flex:1;padding:12px;border-radius:12px;border:none;font-size:12px;font-weight:600;cursor:pointer;transition:all .2s}
.pf-btn.cancel{background:rgba(255,255,255,.03);color:rgba(255,255,255,.3)}
.pf-btn.preview{background:rgba(139,92,246,.06);color:rgba(139,92,246,.6)}
.pf-btn.draft{background:rgba(255,255,255,.05);color:rgba(255,255,255,.4)}
.pf-btn.publish{background:linear-gradient(135deg,#4F8EF7,#6366f1);color:white;flex:2}
.pf-btn:disabled{opacity:.3;cursor:default}

/* 预览弹窗 */
.pf-preview-overlay{position:fixed;inset:0;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;z-index:500;backdrop-filter:blur(4px)}
.pf-preview-card{background:rgba(22,18,50,.95);border:1px solid rgba(79,142,247,.15);border-radius:18px;padding:20px;max-width:320px;width:90vw;box-shadow:0 16px 60px rgba(0,0,0,.4)}
.pf-preview-title{text-align:center;font-size:14px;font-weight:600;color:rgba(255,255,255,.6);margin:0 0 14px}
.pf-preview-body{border-radius:14px;overflow:hidden;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.05)}
.pf-pv-img-wrap{overflow:hidden}
.pf-pv-img{width:100%;aspect-ratio:1;object-fit:cover;display:block}
.pf-pv-no-img{width:100%;aspect-ratio:1;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.02);font-size:36px}
.pf-pv-info{padding:12px}
.pf-pv-name{font-size:14px;font-weight:500;color:rgba(255,255,255,.7);margin:0 0 4px;line-height:1.4}
.pf-pv-price{font-size:18px;font-weight:700;color:#f97316}
.pf-pv-original{font-size:11px;color:rgba(255,255,255,.2);text-decoration:line-through;margin-left:6px}
.pf-pv-desc{font-size:11px;color:rgba(255,255,255,.35);margin:6px 0 4px;line-height:1.5}
.pf-pv-tags{display:flex;gap:3px;flex-wrap:wrap}
.pf-pv-tag{padding:1px 6px;border-radius:4px;background:rgba(79,142,247,.08);color:rgba(79,142,247,.5);font-size:9px}
.pf-pv-tag.green{background:rgba(34,197,94,.08);color:rgba(34,197,94,.5)}
.pf-preview-close{width:100%;padding:10px;border-radius:10px;border:none;background:rgba(255,255,255,.04);color:rgba(255,255,255,.4);font-size:12px;cursor:pointer;margin-top:12px;transition:all .2s}
.pf-preview-close:hover{background:rgba(255,255,255,.06)}
</style>
