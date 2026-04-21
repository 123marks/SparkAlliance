<template>
  <!-- 微信式资料卡弹窗 -->
  <Transition name="pp-fade">
    <div v-if="visible" class="pp-overlay" @click.self="close">
      <div class="pp-card" :class="{ 'pp-right': position === 'right' }">
        <!-- 头部：头像 + 基本信息 + 右上角⋯ -->
        <div class="pp-header">
          <SparkAvatar
            :avatar="profile.avatar"
            :avatar-url="profile.avatar_url"
            :name="profile.nickname"
            size="lg"
            clickable
            @click="showAvatarPreview = true"
          />
          <div class="pp-info">
            <div class="pp-name-row">
              <h3>{{ displayName }}</h3>
              <div class="pp-more-wrap">
                <button type="button" class="pp-more-btn" @click.stop="showMoreMenu = !showMoreMenu">⋯</button>
                <Transition name="pp-fade">
                  <div v-if="showMoreMenu" class="pp-more-menu">
                    <button @click="startEditRemark">📝 设置备注</button>
                    <button @click="emit('action', 'permissions')">🔐 设置星火域权限</button>
                    <button @click="emit('action', 'recommend')">👤 推荐给朋友</button>
                    <button @click="emit('action', 'star')">⭐ 设为星标朋友</button>
                    <button class="warn" @click="emit('action', 'block')">🚫 加入黑名单</button>
                  </div>
                </Transition>
              </div>
            </div>
            <p class="pp-sub">昵称：{{ profile.nickname }}</p>
            <p class="pp-sub">星火ID：{{ profile.spark_id }}</p>
            <p v-if="profile.bio" class="pp-sub">{{ profile.bio }}</p>
          </div>
        </div>

        <!-- 备注编辑区 -->
        <div v-if="editingRemark" class="pp-section">
          <div class="pp-remark-edit">
            <input v-model="remarkInput" placeholder="输入备注..." maxlength="20" @keydown.enter="saveRemark" autofocus />
            <div class="pp-remark-btns">
              <button @click="editingRemark = false">取消</button>
              <button class="primary" @click="saveRemark">保存</button>
            </div>
          </div>
        </div>

        <!-- 信息行 -->
        <div class="pp-section">
          <div class="pp-row">
            <span class="pp-label">备注</span>
            <span class="pp-val" @click="startEditRemark">{{ profile.remark || profile.nickname }}<span class="pp-edit-hint">✎</span></span>
          </div>
        </div>

        <div class="pp-section">
          <div class="pp-row clickable" @click="emit('action', 'moments')">
            <span class="pp-label">星火域</span>
            <div class="pp-moments-preview">
              <span v-for="i in Math.min(momentCount, 4)" :key="i" class="pp-moment-dot">📝</span>
            </div>
            <span class="pp-arrow">›</span>
          </div>
        </div>

        <div class="pp-section">
          <div class="pp-row">
            <span class="pp-label">来源</span>
            <span class="pp-val">通过星火ID添加</span>
          </div>
        </div>

        <!-- 底部操作按钮 -->
        <div class="pp-actions">
          <button class="pp-act-btn primary" @click="emit('action', 'chat')">
            <span class="pp-act-icon">💬</span>
            <span>发消息</span>
          </button>
          <button class="pp-act-btn" @click="emit('action', 'voice')">
            <span class="pp-act-icon">📞</span>
            <span>语言聊天</span>
          </button>
          <button class="pp-act-btn" @click="emit('action', 'video')">
            <span class="pp-act-icon">📹</span>
            <span>视频聊天</span>
          </button>
        </div>
      </div>

      <!-- 头像放大预览 -->
      <Transition name="pp-fade">
        <div v-if="showAvatarPreview" class="pp-avatar-preview" @click="showAvatarPreview = false">
          <SparkAvatar
            :avatar="profile.avatar"
            :avatar-url="profile.avatar_url"
            :name="profile.nickname"
            size="xl"
          />
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import SparkAvatar from './SparkAvatar.vue'

export interface ProfileData {
  spark_id: string
  nickname: string
  avatar: string
  avatar_url?: string
  remark?: string
  bio?: string
}

const props = withDefaults(defineProps<{
  visible: boolean
  profile: ProfileData
  momentCount?: number
  position?: 'center' | 'right'
}>(), {
  momentCount: 0,
  position: 'center',
})

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'action', action: string): void
  (e: 'update-remark', remark: string): void
}>()

const showMoreMenu = ref(false)
const showAvatarPreview = ref(false)
const editingRemark = ref(false)
const remarkInput = ref('')

const displayName = computed(() => {
  if (props.profile.remark && props.profile.remark !== props.profile.nickname) {
    return `${props.profile.remark}（${props.profile.nickname}）`
  }
  return props.profile.nickname
})

function close() {
  showMoreMenu.value = false
  showAvatarPreview.value = false
  editingRemark.value = false
  emit('close')
}

function startEditRemark() {
  showMoreMenu.value = false
  remarkInput.value = props.profile.remark || ''
  editingRemark.value = true
}

function saveRemark() {
  emit('update-remark', remarkInput.value.trim())
  editingRemark.value = false
}
</script>

<style scoped>
.pp-overlay{position:fixed;inset:0;z-index:200;background:rgba(0,0,0,.4);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center}
.pp-card{position:relative;width:380px;max-height:85vh;overflow-y:auto;background:rgba(14,11,28,.97);border:1px solid rgba(255,255,255,.06);border-radius:18px;box-shadow:0 16px 64px rgba(0,0,0,.5);padding:0}
.pp-card.pp-right{position:fixed;right:0;top:0;bottom:0;border-radius:0;border-left:1px solid rgba(255,255,255,.06)}

/* 头部 */
.pp-header{display:flex;gap:14px;padding:20px;border-bottom:1px solid rgba(255,255,255,.03)}
.pp-info{flex:1;min-width:0}
.pp-name-row{display:flex;align-items:center;justify-content:space-between}
.pp-name-row h3{margin:0;font-size:16px;color:white;font-weight:700;min-width:0}
.pp-more-wrap{position:relative;flex-shrink:0}
.pp-more-btn{background:none;border:none;color:rgba(255,255,255,.25);font-size:16px;cursor:pointer;padding:4px 8px;border-radius:6px;transition:all .12s}.pp-more-btn:hover{background:rgba(255,255,255,.04);color:rgba(255,255,255,.5)}
.pp-sub{font-size:11px;color:rgba(255,255,255,.2);margin:3px 0 0}

/* 更多菜单：锚定在 ⋯ 按钮下方，避免相对整屏右上角错位 */
.pp-more-menu{position:absolute;right:0;top:calc(100% + 6px);background:rgba(30,28,44,.98);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:4px;box-shadow:0 8px 32px rgba(0,0,0,.5);min-width:160px;z-index:20}
.pp-more-menu button{display:flex;width:100%;gap:6px;padding:8px 14px;border:none;background:none;color:rgba(255,255,255,.5);font-size:12px;cursor:pointer;border-radius:7px;transition:all .12s}.pp-more-menu button:hover{background:rgba(139,92,246,.06);color:rgba(139,92,246,.7)}
.pp-more-menu button.warn{color:rgba(239,68,68,.5)}.pp-more-menu button.warn:hover{background:rgba(239,68,68,.06);color:rgba(239,68,68,.8)}

/* 备注编辑 */
.pp-remark-edit{padding:4px 16px 8px}
.pp-remark-edit input{width:100%;padding:8px 12px;border:1px solid rgba(139,92,246,.15);border-radius:8px;background:rgba(255,255,255,.02);color:white;font-size:12px;outline:none;box-sizing:border-box}.pp-remark-edit input:focus{border-color:rgba(139,92,246,.3)}
.pp-remark-btns{display:flex;gap:6px;justify-content:flex-end;margin-top:6px}
.pp-remark-btns button{padding:4px 14px;border-radius:6px;border:1px solid rgba(255,255,255,.05);background:none;color:rgba(255,255,255,.3);font-size:11px;cursor:pointer;transition:all .12s}.pp-remark-btns button.primary{background:linear-gradient(135deg,#8b5cf6,#6d28d9);color:white;border:none}

/* 信息行 */
.pp-section{border-bottom:1px solid rgba(255,255,255,.02);padding:2px 0}
.pp-row{display:flex;align-items:center;padding:12px 20px;font-size:12px;color:rgba(255,255,255,.4)}
.pp-row.clickable{cursor:pointer;border-radius:0;transition:all .12s}.pp-row.clickable:hover{background:rgba(255,255,255,.015)}
.pp-label{width:56px;flex-shrink:0;color:rgba(255,255,255,.2);font-size:11px}
.pp-val{flex:1;color:rgba(255,255,255,.5);cursor:pointer;display:flex;align-items:center;gap:4px}
.pp-edit-hint{font-size:10px;color:rgba(255,255,255,.08);transition:color .12s}.pp-val:hover .pp-edit-hint{color:rgba(139,92,246,.4)}
.pp-arrow{color:rgba(255,255,255,.1);font-size:16px}
.pp-moments-preview{display:flex;gap:4px;flex:1;margin:0 8px}
.pp-moment-dot{font-size:14px}

/* 底部操作 */
.pp-actions{display:flex;gap:12px;justify-content:center;padding:20px}
.pp-act-btn{display:flex;flex-direction:column;align-items:center;gap:6px;padding:14px 18px;border-radius:12px;border:1px solid rgba(255,255,255,.04);background:rgba(255,255,255,.015);color:rgba(255,255,255,.35);font-size:11px;cursor:pointer;transition:all .15s;min-width:75px}
.pp-act-btn:hover{background:rgba(139,92,246,.04);border-color:rgba(139,92,246,.08);color:rgba(139,92,246,.6)}
.pp-act-btn.primary{background:rgba(139,92,246,.06);border-color:rgba(139,92,246,.1);color:rgba(139,92,246,.7)}
.pp-act-icon{font-size:22px}

/* 头像放大预览 */
.pp-avatar-preview{position:fixed;inset:0;z-index:300;background:rgba(0,0,0,.8);display:flex;align-items:center;justify-content:center}

/* 动画 */
.pp-fade-enter-active,.pp-fade-leave-active{transition:opacity .2s ease}
.pp-fade-enter-from,.pp-fade-leave-to{opacity:0}
</style>
