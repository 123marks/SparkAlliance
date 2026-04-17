<template>
  <div v-if="visible" class="ftm-overlay" @click.self="emit('close')">
    <div class="ftm-panel">
      <!-- 顶部：标题 + 关闭 -->
      <div class="ftm-header">
        <div class="ftm-title">
          <span class="ftm-title-icon">🏷️</span>
          好友标签组管理
        </div>
        <button class="ftm-close" @click="emit('close')" aria-label="关闭">✕</button>
      </div>

      <!-- 分栏：左标签列表 | 右成员编辑 -->
      <div class="ftm-body">
        <!-- 左侧：标签列表 + 新建 -->
        <aside class="ftm-left">
          <div class="ftm-search">
            <input
              v-model="tagSearch"
              placeholder="搜索标签名称…"
              class="ftm-search-input"
            />
          </div>

          <div class="ftm-new-tag">
            <input
              v-model="newTagName"
              placeholder="+ 新建标签（回车）"
              class="ftm-new-tag-input"
              maxlength="12"
              @keydown.enter.prevent="handleCreateTag"
            />
            <button
              v-if="newTagName.trim()"
              class="ftm-new-tag-btn"
              @click="handleCreateTag"
            >
              创建
            </button>
          </div>

          <div class="ftm-tag-list">
            <div
              v-for="tag in filteredTags"
              :key="tag.id"
              :class="['ftm-tag-item', { active: selectedTagId === tag.id }]"
              @click="selectedTagId = tag.id"
            >
              <span
                class="ftm-tag-color"
                :style="{ background: tag.color }"
              />
              <div class="ftm-tag-meta">
                <div class="ftm-tag-name">{{ tag.name }}</div>
                <div class="ftm-tag-count">{{ tag.members.length }} 人</div>
              </div>
              <button
                class="ftm-tag-delete"
                title="删除标签"
                @click.stop="handleDeleteTag(tag.id)"
              >
                🗑
              </button>
            </div>
            <div v-if="!filteredTags.length" class="ftm-empty">
              还没有标签，新建一个试试
            </div>
          </div>
        </aside>

        <!-- 右侧：当前标签详情 -->
        <section class="ftm-right" v-if="currentTag">
          <!-- 标签元信息编辑 -->
          <div class="ftm-detail-head">
            <div class="ftm-detail-field">
              <label>名称</label>
              <input
                :value="currentTag.name"
                @change="handleRenameTag(currentTag.id, ($event.target as HTMLInputElement).value)"
                class="ftm-detail-input"
                maxlength="12"
              />
            </div>

            <div class="ftm-detail-field">
              <label>颜色</label>
              <div class="ftm-color-row">
                <button
                  v-for="c in COLOR_PRESETS"
                  :key="c"
                  class="ftm-color-dot"
                  :class="{ active: currentTag.color === c }"
                  :style="{ background: c }"
                  @click="handleSetColor(currentTag.id, c)"
                />
              </div>
            </div>

            <div class="ftm-detail-field">
              <label>标签权重</label>
              <input
                type="number"
                :value="currentTag.priority"
                min="0"
                max="999"
                @change="handleSetTagPriority(currentTag.id, Number(($event.target as HTMLInputElement).value))"
                class="ftm-detail-input ftm-priority-input"
              />
            </div>
          </div>

          <!-- 成员搜索 + 添加 -->
          <div class="ftm-section-title">
            <span>成员 ({{ currentMembers.length }})</span>
            <button class="ftm-add-member-btn" @click="showMemberPicker = !showMemberPicker">
              {{ showMemberPicker ? '收起' : '+ 添加成员' }}
            </button>
          </div>

          <div class="ftm-member-search">
            <input
              v-model="memberSearch"
              placeholder="搜索成员（按昵称/备注/SparkID）…"
              class="ftm-search-input"
            />
          </div>

          <!-- 成员选择器 -->
          <transition name="ftm-fade">
            <div v-if="showMemberPicker" class="ftm-member-picker">
              <div class="ftm-picker-hint">选择要加入 {{ currentTag.name }} 的好友：</div>
              <div class="ftm-picker-grid">
                <button
                  v-for="f in candidateFriends"
                  :key="f.spark_id"
                  class="ftm-picker-chip"
                  @click="handleAddMember(currentTag.id, f.spark_id)"
                >
                  <span class="ftm-picker-avatar">{{ f.avatar }}</span>
                  <span class="ftm-picker-name">{{ f.remark || f.nickname }}</span>
                </button>
                <div v-if="!candidateFriends.length" class="ftm-empty">
                  所有好友都已加入
                </div>
              </div>
            </div>
          </transition>

          <!-- 成员列表（按首字母分组） -->
          <div class="ftm-member-list">
            <div
              v-for="group in memberGroupsByLetter"
              :key="group.letter"
              class="ftm-letter-group"
            >
              <div class="ftm-letter-header">{{ group.letter }}</div>
              <div
                v-for="m in group.members"
                :key="m.spark_id"
                class="ftm-member-row"
              >
                <span class="ftm-member-avatar">{{ m.avatar }}</span>
                <div class="ftm-member-meta">
                  <div class="ftm-member-name">
                    {{ m.remark || m.nickname }}
                    <span v-if="memberPriority(m.spark_id) > 0" class="ftm-priority-badge">
                      ★{{ memberPriority(m.spark_id) }}
                    </span>
                  </div>
                  <div class="ftm-member-sub">@{{ m.spark_id }}</div>
                </div>
                <div class="ftm-member-actions">
                  <input
                    type="number"
                    :value="memberPriority(m.spark_id)"
                    min="0"
                    max="99"
                    class="ftm-priority-input"
                    title="优先级（越大越靠前）"
                    @change="handleSetMemberPriority(currentTag.id, m.spark_id, Number(($event.target as HTMLInputElement).value))"
                  />
                  <button
                    class="ftm-remove-btn"
                    title="从标签移除"
                    @click="handleRemoveMember(currentTag.id, m.spark_id)"
                  >
                    移除
                  </button>
                </div>
              </div>
            </div>

            <div v-if="!currentMembers.length" class="ftm-empty">
              这个标签还没有成员
            </div>
          </div>
        </section>

        <section v-else class="ftm-right ftm-empty-pane">
          <div class="ftm-empty-text">
            从左侧选择一个标签查看与编辑成员，或创建新标签
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * FriendTagManager — 好友标签组完整管理
 *
 * 功能：
 * 1. 创建 / 重命名 / 删除标签
 * 2. 标签内成员增删
 * 3. 成员优先级标记（★）
 * 4. 搜索索引（标签名、成员）
 * 5. 首字母分组排序
 * 6. 标签权重、颜色自定义
 */
import { ref, computed } from 'vue'
import type { FriendTag, Friend } from '../../composables/useCompanion'
import { useCompanion } from '../../composables/useCompanion'

const props = defineProps<{
  visible: boolean
  initialTagId?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const companion = useCompanion()
const {
  friends,
  friendTags,
  createTag,
  renameTag,
  deleteTag,
  addMemberToTag,
  removeMemberFromTag,
  setMemberPriority,
  getMemberPriority,
  setTagPriority,
  setTagColor,
} = companion

const COLOR_PRESETS = [
  '#8b5cf6', '#4f8ef7', '#10b981', '#f97316',
  '#ec4899', '#14b8a6', '#eab308', '#64748b',
]

const tagSearch = ref('')
const memberSearch = ref('')
const newTagName = ref('')
const selectedTagId = ref<string>(props.initialTagId || '')
const showMemberPicker = ref(false)

const filteredTags = computed(() => {
  const kw = tagSearch.value.trim().toLowerCase()
  let list = [...friendTags.value]
  if (kw) list = list.filter(t => t.name.toLowerCase().includes(kw))
  return list.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority
    return a.name.localeCompare(b.name, 'zh-CN')
  })
})

const currentTag = computed<FriendTag | undefined>(() =>
  friendTags.value.find(t => t.id === selectedTagId.value)
)

const currentMembers = computed<Friend[]>(() => {
  const t = currentTag.value
  if (!t) return []
  return friends.value.filter(f => t.members.includes(f.spark_id))
})

const candidateFriends = computed<Friend[]>(() => {
  const t = currentTag.value
  if (!t) return []
  const kw = memberSearch.value.trim().toLowerCase()
  return friends.value
    .filter(f => !t.members.includes(f.spark_id))
    .filter(f => {
      if (!kw) return true
      return (
        f.nickname.toLowerCase().includes(kw)
        || f.spark_id.toLowerCase().includes(kw)
        || (f.remark || '').toLowerCase().includes(kw)
      )
    })
})

const memberGroupsByLetter = computed(() => {
  const t = currentTag.value
  if (!t) return []
  const kw = memberSearch.value.trim().toLowerCase()
  let list = currentMembers.value
  if (kw) {
    list = list.filter(f =>
      f.nickname.toLowerCase().includes(kw)
      || f.spark_id.toLowerCase().includes(kw)
      || (f.remark || '').toLowerCase().includes(kw)
    )
  }

  // 先按优先级降序（优先级 > 0 的先置顶）
  const prioritized = [...list].sort((a, b) => {
    const pa = getMemberPriority(t.id, a.spark_id)
    const pb = getMemberPriority(t.id, b.spark_id)
    return pb - pa
  })

  // 再按首字母分组
  const groups = new Map<string, Friend[]>()
  // 先加"★"置顶组：优先级 > 0 的
  const starred = prioritized.filter(f => getMemberPriority(t.id, f.spark_id) > 0)
  if (starred.length) groups.set('★', starred)

  // 其余按首字母（拼音或 Unicode）
  const rest = prioritized.filter(f => getMemberPriority(t.id, f.spark_id) <= 0)
  for (const f of rest) {
    const raw = (f.remark || f.nickname)[0] || '#'
    let letter: string
    if (/[A-Za-z]/.test(raw)) letter = raw.toUpperCase()
    else if (/[\u4e00-\u9fa5]/.test(raw)) letter = pinyinFirstLetter(raw)
    else letter = '#'
    if (!groups.has(letter)) groups.set(letter, [])
    groups.get(letter)!.push(f)
  }

  return [...groups.entries()]
    .sort(([a], [b]) => {
      if (a === '★') return -1
      if (b === '★') return 1
      if (a === '#') return 1
      if (b === '#') return -1
      return a.localeCompare(b)
    })
    .map(([letter, members]) => ({
      letter,
      members: letter === '★'
        ? members
        : [...members].sort((x, y) => (x.remark || x.nickname).localeCompare(y.remark || y.nickname, 'zh-CN')),
    }))
})

/** 简易中文 → 拼音首字母映射（覆盖常见首字） */
function pinyinFirstLetter(ch: string): string {
  const code = ch.charCodeAt(0)
  // 常用汉字拼音首字母分段表（粗略但够用作分组）
  const ranges: { max: number; letter: string }[] = [
    { max: 0x4e02, letter: '#' }, // fallback start
    { max: 0x4f81, letter: 'A' },
    { max: 0x544e, letter: 'B' },
    { max: 0x5608, letter: 'C' },
    { max: 0x5864, letter: 'D' },
    { max: 0x5b6b, letter: 'E' },
    { max: 0x5ee2, letter: 'F' },
    { max: 0x6084, letter: 'G' },
    { max: 0x6363, letter: 'H' },
    { max: 0x65fd, letter: 'J' },
    { max: 0x6846, letter: 'K' },
    { max: 0x6b56, letter: 'L' },
    { max: 0x6f91, letter: 'M' },
    { max: 0x7088, letter: 'N' },
    { max: 0x714f, letter: 'O' },
    { max: 0x73c9, letter: 'P' },
    { max: 0x78ca, letter: 'Q' },
    { max: 0x79ba, letter: 'R' },
    { max: 0x7f22, letter: 'S' },
    { max: 0x81ff, letter: 'T' },
    { max: 0x8446, letter: 'W' },
    { max: 0x886e, letter: 'X' },
    { max: 0x8c4b, letter: 'Y' },
    { max: 0x9fff, letter: 'Z' },
  ]
  for (const r of ranges) {
    if (code <= r.max) return r.letter
  }
  return '#'
}

function memberPriority(sparkId: string): number {
  if (!currentTag.value) return 0
  return getMemberPriority(currentTag.value.id, sparkId)
}

function handleCreateTag() {
  const name = newTagName.value.trim()
  if (!name) return
  const color = COLOR_PRESETS[friendTags.value.length % COLOR_PRESETS.length]
  const tag = createTag(name, color)
  newTagName.value = ''
  selectedTagId.value = tag.id
}

function handleRenameTag(tagId: string, newName: string) {
  const name = newName.trim()
  if (!name) return
  renameTag(tagId, name)
}

function handleDeleteTag(tagId: string) {
  const tag = friendTags.value.find(t => t.id === tagId)
  if (!tag) return
  if (!confirm(`确定删除标签「${tag.name}」？成员关系会被清除（好友本身不会被删除）`)) return
  deleteTag(tagId)
  if (selectedTagId.value === tagId) selectedTagId.value = ''
}

function handleAddMember(tagId: string, friendId: string) {
  addMemberToTag(tagId, friendId)
}

function handleRemoveMember(tagId: string, friendId: string) {
  removeMemberFromTag(tagId, friendId)
}

function handleSetMemberPriority(tagId: string, friendId: string, priority: number) {
  const clean = Math.max(0, Math.min(99, Math.round(priority || 0)))
  setMemberPriority(tagId, friendId, clean)
}

function handleSetTagPriority(tagId: string, priority: number) {
  const clean = Math.max(0, Math.min(999, Math.round(priority || 0)))
  setTagPriority(tagId, clean)
}

function handleSetColor(tagId: string, color: string) {
  setTagColor(tagId, color)
}
</script>

<style scoped>
.ftm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(8px);
  z-index: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.ftm-panel {
  width: min(920px, 100%);
  height: min(720px, 92vh);
  background: rgba(18, 18, 28, 0.92);
  border: 1px solid rgba(139, 92, 246, 0.18);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 80px rgba(0, 0, 0, 0.6);
  overflow: hidden;
}

.ftm-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.ftm-title {
  font-size: 16px;
  font-weight: 600;
  color: white;
  display: flex;
  align-items: center;
  gap: 8px;
}

.ftm-title-icon { font-size: 18px; }

.ftm-close {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  font-size: 18px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: all 0.2s;
}
.ftm-close:hover { background: rgba(255, 255, 255, 0.08); color: white; }

.ftm-body {
  flex: 1;
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 0;
  overflow: hidden;
}

/* 左侧：标签列表 */
.ftm-left {
  display: flex;
  flex-direction: column;
  border-right: 1px solid rgba(255, 255, 255, 0.05);
  padding: 12px;
  overflow: hidden;
}

.ftm-search { margin-bottom: 10px; }
.ftm-search-input {
  width: 100%;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.02);
  color: rgba(255, 255, 255, 0.85);
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s;
}
.ftm-search-input:focus { border-color: rgba(139, 92, 246, 0.3); }

.ftm-new-tag {
  display: flex;
  gap: 6px;
  margin-bottom: 10px;
}
.ftm-new-tag-input {
  flex: 1;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px dashed rgba(139, 92, 246, 0.2);
  background: rgba(139, 92, 246, 0.03);
  color: rgba(255, 255, 255, 0.85);
  font-size: 13px;
  outline: none;
}
.ftm-new-tag-input:focus { border-color: rgba(139, 92, 246, 0.5); }

.ftm-new-tag-btn {
  padding: 6px 12px;
  border-radius: 8px;
  border: none;
  background: linear-gradient(135deg, #8b5cf6, #6366f1);
  color: white;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s;
}
.ftm-new-tag-btn:hover { transform: translateY(-1px); }

.ftm-tag-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ftm-tag-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s;
  border: 1px solid transparent;
}
.ftm-tag-item:hover {
  background: rgba(255, 255, 255, 0.03);
}
.ftm-tag-item.active {
  background: rgba(139, 92, 246, 0.12);
  border-color: rgba(139, 92, 246, 0.25);
}

.ftm-tag-color {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.ftm-tag-meta { flex: 1; min-width: 0; }
.ftm-tag-name {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ftm-tag-count {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.35);
  margin-top: 2px;
}

.ftm-tag-delete {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.3);
  font-size: 14px;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 4px;
  opacity: 0;
  transition: all 0.2s;
}
.ftm-tag-item:hover .ftm-tag-delete { opacity: 1; }
.ftm-tag-delete:hover { background: rgba(244, 63, 94, 0.15); color: #f43f5e; }

/* 右侧：详情 */
.ftm-right {
  padding: 16px 20px;
  overflow-y: auto;
}

.ftm-empty-pane {
  display: flex;
  align-items: center;
  justify-content: center;
}
.ftm-empty-text {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.35);
  text-align: center;
  padding: 40px;
}

.ftm-detail-head {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 16px;
  align-items: end;
  padding-bottom: 16px;
  margin-bottom: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.ftm-detail-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ftm-detail-field label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  font-weight: 500;
}

.ftm-detail-input {
  padding: 7px 10px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.02);
  color: rgba(255, 255, 255, 0.9);
  font-size: 13px;
  outline: none;
  width: 100%;
}
.ftm-detail-input:focus { border-color: rgba(139, 92, 246, 0.3); }

.ftm-priority-input {
  width: 60px;
  padding: 5px 8px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.02);
  color: rgba(255, 255, 255, 0.85);
  font-size: 12px;
  text-align: center;
  outline: none;
}

.ftm-color-row {
  display: flex;
  gap: 6px;
}

.ftm-color-dot {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
  padding: 0;
}
.ftm-color-dot:hover { transform: scale(1.1); }
.ftm-color-dot.active {
  border-color: rgba(255, 255, 255, 0.8);
  box-shadow: 0 0 8px currentColor;
}

.ftm-section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 600;
  margin-bottom: 10px;
}

.ftm-add-member-btn {
  padding: 5px 12px;
  border-radius: 6px;
  border: 1px solid rgba(139, 92, 246, 0.25);
  background: rgba(139, 92, 246, 0.08);
  color: rgba(139, 92, 246, 0.9);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}
.ftm-add-member-btn:hover {
  background: rgba(139, 92, 246, 0.18);
  color: white;
}

.ftm-member-search { margin-bottom: 10px; }

.ftm-member-picker {
  margin-bottom: 12px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px dashed rgba(139, 92, 246, 0.2);
  border-radius: 8px;
}

.ftm-picker-hint {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.45);
  margin-bottom: 8px;
}

.ftm-picker-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.ftm-picker-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.03);
  color: rgba(255, 255, 255, 0.75);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}
.ftm-picker-chip:hover {
  background: rgba(139, 92, 246, 0.15);
  border-color: rgba(139, 92, 246, 0.35);
  color: white;
}

.ftm-picker-avatar { font-size: 14px; }

.ftm-member-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ftm-letter-group { display: flex; flex-direction: column; gap: 4px; }

.ftm-letter-header {
  font-size: 11px;
  font-weight: 700;
  color: rgba(139, 92, 246, 0.7);
  padding: 0 4px 4px;
  border-bottom: 1px solid rgba(139, 92, 246, 0.12);
  margin-bottom: 4px;
  letter-spacing: 0.5px;
}

.ftm-member-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border-radius: 8px;
  transition: background 0.15s;
}
.ftm-member-row:hover { background: rgba(255, 255, 255, 0.02); }

.ftm-member-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.04);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}

.ftm-member-meta { flex: 1; min-width: 0; }
.ftm-member-name {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
}
.ftm-priority-badge {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 999px;
  background: linear-gradient(135deg, #eab308, #f97316);
  color: white;
  font-weight: 600;
}
.ftm-member-sub {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.3);
  margin-top: 1px;
}

.ftm-member-actions { display: flex; align-items: center; gap: 6px; }

.ftm-remove-btn {
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid rgba(244, 63, 94, 0.18);
  background: rgba(244, 63, 94, 0.06);
  color: rgba(244, 63, 94, 0.85);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}
.ftm-remove-btn:hover {
  background: rgba(244, 63, 94, 0.18);
  color: white;
}

.ftm-empty {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.3);
  padding: 14px 10px;
  text-align: center;
}

.ftm-fade-enter-active,
.ftm-fade-leave-active {
  transition: all 0.2s;
}
.ftm-fade-enter-from,
.ftm-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* 响应式：窄屏下改为堆叠 */
@media (max-width: 720px) {
  .ftm-body { grid-template-columns: 1fr; }
  .ftm-left { border-right: none; border-bottom: 1px solid rgba(255, 255, 255, 0.05); max-height: 40%; }
  .ftm-detail-head { grid-template-columns: 1fr; }
}
</style>
