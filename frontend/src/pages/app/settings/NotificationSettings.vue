<template>
  <div class="section">
    <h2>通知设置</h2>
    <p class="section-desc">管理消息提醒、免打扰和邮件摘要。</p>

    <div class="card">
      <div class="card-title">消息通知</div>
      <div v-for="item in messageItems" :key="item.key" class="setting-row">
        <div class="setting-info">
          <span class="setting-label">{{ item.label }}</span>
          <span class="setting-hint">{{ item.hint }}</span>
        </div>
        <label class="toggle">
          <input
            type="checkbox"
            :checked="notifications[item.key]"
            @change="updateToggle(item.key, ($event.target as HTMLInputElement).checked)"
          />
          <span class="toggle-slider"></span>
        </label>
      </div>
    </div>

    <div class="card">
      <div class="card-title">免打扰模式</div>
      <div class="setting-row">
        <div class="setting-info">
          <span class="setting-label">开启免打扰</span>
          <span class="setting-hint">暂停推送消息，专注处理当前事务。</span>
        </div>
        <label class="toggle">
          <input
            type="checkbox"
            :checked="notifications.doNotDisturb"
            @change="updateDoNotDisturb(($event.target as HTMLInputElement).checked)"
          />
          <span class="toggle-slider"></span>
        </label>
      </div>

      <Transition name="slide">
        <div v-if="notifications.doNotDisturb" class="dnd-schedule">
          <div class="field-row">
            <div class="field">
              <label>开始时间</label>
              <input :value="notifications.doNotDisturbStart || ''" type="time" @change="updateTime('doNotDisturbStart', ($event.target as HTMLInputElement).value || null)" />
            </div>
            <div class="field">
              <label>结束时间</label>
              <input :value="notifications.doNotDisturbEnd || ''" type="time" @change="updateTime('doNotDisturbEnd', ($event.target as HTMLInputElement).value || null)" />
            </div>
          </div>
          <span class="dnd-hint">留空表示全天免打扰。</span>
        </div>
      </Transition>
    </div>

    <div class="card">
      <div class="card-title">邮件摘要</div>
      <div class="setting-row">
        <div class="setting-info">
          <span class="setting-label">摘要频率</span>
          <span class="setting-hint">通过邮件接收关键动态汇总。</span>
        </div>
        <SparkSelect
          :model-value="notifications.emailDigest"
          :options="digestOptions"
          @update:model-value="updateDigest(String($event) as NotificationData['emailDigest'])"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSettings } from '../../../composables/useSettings'
import type { NotificationData } from '../../../types/settings'
import SparkSelect from '../../../components/SparkSelect.vue'

const { notifications, updateNotifications } = useSettings()

type ToggleNotificationKey = 'message' | 'comment' | 'like' | 'follow' | 'system' | 'schedule'
type DndTimeKey = 'doNotDisturbStart' | 'doNotDisturbEnd'

const messageItems: Array<{ key: ToggleNotificationKey; label: string; hint: string }> = [
  { key: 'message', label: '私信通知', hint: '收到私信时提醒我。' },
  { key: 'comment', label: '评论通知', hint: '有人评论我的内容时提醒。' },
  { key: 'like', label: '点赞通知', hint: '内容获得共鸣时提醒。' },
  { key: 'follow', label: '关注通知', hint: '有人关注我时提醒。' },
  { key: 'system', label: '系统通知', hint: '系统公告和安全提醒。' },
  { key: 'schedule', label: '日程提醒', hint: '重要日程开始前提醒。' },
]

const digestOptions = [
  { value: 'realtime', label: '实时推送' },
  { value: 'daily', label: '每日摘要' },
  { value: 'off', label: '关闭' },
]

function save(data: Partial<NotificationData>) {
  updateNotifications(data)
}

function updateToggle(key: ToggleNotificationKey, value: boolean) {
  save({ [key]: value } as Partial<NotificationData>)
}

function updateDoNotDisturb(value: boolean) {
  save({ doNotDisturb: value })
}

function updateTime(key: DndTimeKey, value: string | null) {
  save({ [key]: value } as Partial<NotificationData>)
}

function updateDigest(value: NotificationData['emailDigest']) {
  save({ emailDigest: value })
}
</script>

<style scoped>
.section { display: flex; flex-direction: column; gap: 20px; }
.section h2 { margin: 0; font-size: 20px; font-weight: 800; color: var(--color-text-primary); }
.section-desc { margin: -8px 0 4px; font-size: 13px; color: var(--color-text-muted); }
.card { background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 24px; }
.card-title { margin-bottom: 20px; font-size: 15px; font-weight: 700; color: var(--color-text-primary); }
.setting-row { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 14px 0; border-bottom: 1px solid var(--color-border); }
.setting-row:last-child { border-bottom: none; }
.setting-info { display: flex; flex-direction: column; gap: 2px; }
.setting-label { font-size: 14px; color: var(--color-text-primary); font-weight: 500; }
.setting-hint { font-size: 12px; color: var(--color-text-muted); }
.toggle { position: relative; display: inline-block; width: 44px; height: 24px; flex-shrink: 0; }
.toggle input { display: none; }
.toggle-slider { position: absolute; inset: 0; border-radius: 24px; background: var(--color-bg-card-hover); cursor: pointer; transition: 0.3s; }
.toggle-slider::before { content: ''; position: absolute; left: 3px; bottom: 3px; width: 18px; height: 18px; border-radius: 50%; background: rgba(255, 255, 255, 0.5); transition: 0.3s; }
.toggle input:checked + .toggle-slider { background: rgba(139, 92, 246, 0.5); }
.toggle input:checked + .toggle-slider::before { transform: translateX(20px); background: white; }

.dnd-schedule { padding-top: 16px; }
.field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.field { display: flex; flex-direction: column; gap: 6px; }
.field label { font-size: 13px; font-weight: 600; color: var(--color-text-secondary); }
.field input { padding: 8px 12px; border-radius: 8px; background: var(--color-bg-card); border: 1px solid var(--color-border); color: var(--color-text-primary); font-size: 13px; outline: none; }
.dnd-hint { display: block; margin-top: 8px; font-size: 11px; color: var(--color-text-muted); }
.slide-enter-active, .slide-leave-active { transition: all 0.25s ease; }
.slide-enter-from, .slide-leave-to { opacity: 0; max-height: 0; overflow: hidden; }
.slide-enter-to, .slide-leave-from { max-height: 180px; }
@media (max-width: 640px) { .field-row { grid-template-columns: 1fr; } }
</style>
