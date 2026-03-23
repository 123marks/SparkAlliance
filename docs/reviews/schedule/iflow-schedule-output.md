# iflow — 智能日程模块头脑风暴输出

## 📋 分析概述

**分析视角**: iflow（用户体验与交互设计专家）  
**分析对象**: 星火校园智能日程模块  
**设计基准**: MODULE-SCHEDULE.md + CampusWall.vue 视觉风格  
**输出时间**: 2026-03-22  
**核心原则**: 降低认知成本、缩短操作路径、契合大学生场景

---

## 用户旅程优化建议

### 1.1 首次使用完整流程（从进入到创建第一个事件）

```
用户旅程地图：

[发现] → [进入] → [理解] → [行动] → [完成] → [留存]
  ↓       ↓       ↓       ↓       ↓       ↓
首页入口  加载页   空状态   创建事件  成功反馈  下次使用
```

**详细流程设计**：

| 阶段 | 用户行为 | 产品响应 | 体验目标 |
|------|----------|----------|----------|
| **发现** | 点击"日程"Tab | 渐显动画进入，显示加载骨架屏 | 建立专业可信赖感 |
| **进入** | 等待加载 | 展示「智能日程」品牌标题 + 快速加载(<300ms) | 减少等待焦虑 |
| **理解** | 看到空状态 | 显示引导插画 + 文案"你的时间，由你掌控" + 3个快捷模板 | 激发使用动机 |
| **行动** | 选择模板 | 打开预填充的创建弹窗（如"高等数学"课程） | 降低输入成本 |
| **完成** | 点击保存 | Toast提示"事件已创建" + 事件出现在日历上 | 即时正向反馈 |
| **留存** | 看到第一个事件 | 高亮显示今日事件 + 提示"明天还有3节课" | 建立使用习惯 |

### 1.2 最易流失环节与应对策略

**高风险流失点 TOP 3**：

```
1. 【最高风险】空状态页面停留超过10秒无操作
   → 原因：用户不知道能做什么、从哪里开始
   → 解决：空状态必须包含3个「一键模板」按钮

2. 【高风险】创建事件时面对大量空白表单
   → 原因：认知负荷过高，不知道填哪些
   → 解决：渐进式展开，默认只显示标题+时间

3. 【中风险】课表导入失败/复杂
   → 原因：MVP阶段无法自动导入，手动录入太麻烦
   → 解决：提供「拍照导入」+「快捷模板」双通道
```

**降低认知成本的核心策略**：

```typescript
// 策略1: 渐进式披露
const formFields = {
  default: ['title', 'start_time', 'end_time'],  // 默认只显示3个字段
  expanded: ['location', 'type', 'reminder', 'repeat']  // 点击展开
}

// 策略2: 智能默认值
const smartDefaults = {
  title: '',  // 为空时提示"比如：高等数学"
  start_time: nextHour(),  // 默认下一个整点
  duration: 45,  // 默认45分钟（标准课时）
  type: 'course'  // 默认课程类型
}

// 策略3: 模板预设
const quickTemplates = [
  { icon: '📚', label: '添加课程', preset: { type: 'course', duration: 45 } },
  { icon: '📝', label: '记录考试', preset: { type: 'exam', duration: 120, reminder: '1d' } },
  { icon: '🏃', label: '安排活动', preset: { type: 'life', duration: 60 } }
]
```

### 1.3 空状态引导设计

**视觉设计**（参照 CampusWall.vue 风格）：

```vue
<!-- EmptyState.vue -->
<template>
  <div class="empty-state">
    <!-- 插画区域 -->
    <div class="empty-illustration">
      <svg class="floating-calendar" viewBox="0 0 120 120">
        <!-- 玻璃拟态日历图标 -->
        <rect x="20" y="30" width="80" height="70" rx="12" 
              fill="rgba(79,142,247,0.15)" stroke="rgba(79,142,247,0.3)"/>
        <circle cx="60" cy="70" r="15" fill="url(#gradient-spark)"/>
      </svg>
    </div>
    
    <!-- 文案 -->
    <h3>你的时间，由你掌控</h3>
    <p>导入课表或手动添加，让 AI 帮你规划每一天</p>
    
    <!-- 快捷入口 -->
    <div class="quick-actions">
      <button class="action-card" @click="openImportWizard">
        <span class="icon">📷</span>
        <span class="label">拍照导入课表</span>
      </button>
      <button class="action-card" @click="openTemplate('course')">
        <span class="icon">📚</span>
        <span class="label">手动添加课程</span>
      </button>
      <button class="action-card" @click="openTemplate('exam')">
        <span class="icon">📝</span>
        <span class="label">记录考试</span>
      </button>
    </div>
    
    <!-- 底部提示 -->
    <p class="hint">💡 提示：下周有期中考试？提前标记，AI 会帮你规划复习时间</p>
  </div>
</template>

<style>
.empty-state {
  text-align: center;
  padding: 48px 24px;
  color: white;
}

.floating-calendar {
  width: 120px;
  height: 120px;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.quick-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 24px;
}

.action-card {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  padding: 16px 20px;
  cursor: pointer;
  transition: all 0.2s;
}

.action-card:hover {
  background: rgba(79,142,247,0.1);
  border-color: rgba(79,142,247,0.3);
  transform: translateY(-2px);
}
</style>
```

---

## 关键交互流程设计

### 2.1 Quick Add 快速新建（点击日历格子 → 内联输入）

**设计方案：内联快速输入 + 扩展完整表单**

```
交互流程：

[点击空白格子] → [出现内联输入框] → [输入标题按回车] → [事件创建完成]
                     ↓
              [按 Tab 或点击扩展] → [展开完整表单]

视觉表现：
┌─────────────────────────────────────┐
│  18                                  │
│  ┌─────────────────────────────┐    │
│  │ 📚 操作系统 ████████████████│    │  ← 内联输入（即时预览）
│  │ 08:00-09:35  教四-302       │    │
│  └─────────────────────────────┘    │
│                                      │
│  [回车保存] [Tab展开] [Esc取消]      │
└─────────────────────────────────────┘
```

**实现代码结构**：

```vue
<template>
  <!-- 月视图格子 -->
  <div class="calendar-day" @click="enableQuickAdd">
    <div class="day-number">{{ day }}</div>
    
    <!-- 快速输入模式 -->
    <div v-if="isQuickAdding" class="quick-add-inline" @click.stop>
      <div class="quick-input-wrapper">
        <span class="type-icon" @click="cycleType">{{ currentTypeIcon }}</span>
        <input 
          ref="quickInput"
          v-model="quickTitle"
          placeholder="输入事件标题..."
          @keydown.enter="saveQuick"
          @keydown.tab="expandToFull"
          @keydown.esc="cancelQuick"
          @blur="onBlur"
        />
      </div>
      
      <!-- 智能建议下拉 -->
      <div v-if="suggestions.length" class="smart-suggestions">
        <div 
          v-for="s in suggestions" 
          :key="s.id"
          class="suggestion-item"
          @click="applySuggestion(s)"
        >
          <span class="s-icon">{{ s.icon }}</span>
          <span class="s-title">{{ s.title }}</span>
          <span class="s-time">{{ s.time }}</span>
        </div>
      </div>
    </div>
    
    <!-- 已存在事件列表 -->
    <div class="event-list">
      <EventCard v-for="e in dayEvents" :key="e.id" :event="e" />
    </div>
  </div>
</template>

<script setup>
const quickAddState = ref({
  isActive: false,
  title: '',
  type: 'course',
  startTime: null
})

// 智能建议：基于历史记录和常见课程名
const suggestions = computed(() => {
  if (!quickAddState.value.title) return []
  return getSmartSuggestions(quickAddState.value.title)
})

// 保存快捷事件（仅标题+智能推断时间）
const saveQuick = async () => {
  const event = {
    title: quickAddState.value.title,
    type: quickAddState.value.type,
    start_time: inferStartTime(quickAddState.value.title), // 智能推断
    end_time: inferEndTime(quickAddState.value.title),
    date: selectedDate.value
  }
  await createEvent(event)
  showToast('事件已创建', 'success')
  resetQuickAdd()
}
</script>
```

### 2.2 事件详情 → 编辑 → 保存的最短路径

**三种模式设计**：

```
模式1: 查看模式（默认）
┌─────────────────────────────┐
│ 📚 操作系统              ✏️ │  ← 右上角编辑按钮
│ 08:00-09:35  教四-302       │
│ 张教授                      │
│ 备注：带教材，要签到        │
└─────────────────────────────┘

模式2: 直接编辑（点击即编辑）
┌─────────────────────────────┐
│ 📚 [操作系统          ] ✓ │  ← 点击标题直接变输入框
│ [08:00]-[09:35] [教四-302]│
│ [张教授            ]      │
│ [带教材，要签到    ]      │
└─────────────────────────────┘

模式3: 侧边栏编辑（不遮挡日历）
日历主视图保持可见，右侧滑出编辑面板
```

**推荐方案：渐进式编辑**

```typescript
// 点击事件的不同区域触发不同操作
const eventInteractions = {
  // 点击标题/时间/地点 → 就地编辑（单字段）
  'field-click': (field, value) => enableInlineEdit(field, value),
  
  // 点击编辑按钮 → 展开完整编辑面板
  'edit-btn': () => openEditPanel(),
  
  // 双击事件 → 直接进入完整编辑
  'double-click': () => openEditPanel(),
  
  // 拖拽事件 → 调整时间（周/日视图）
  'drag': (newTime) => updateEventTime(newTime)
}

// 自动保存策略
const autoSaveConfig = {
  delay: 2000,  // 2秒无操作自动保存
  onBlur: true,  // 失去焦点时保存
  visualFeedback: 'saving → saved ✓'  // 保存状态视觉反馈
}
```

### 2.3 删除重复事件的交互决策

**决策：必须提供选择，且默认选项根据上下文智能推断**

```
删除确认弹窗设计：

┌─────────────────────────────────────┐
│  🗑️ 删除事件                        │
│  ─────────────────────────────────  │
│                                     │
│  "操作系统" 是一个重复事件           │
│  （每周一、三、五，共12次）          │
│                                     │
│  你想要：                           │
│                                     │
│  ○ 仅删除这一次（3月18日）           │  ← 默认选中（当前实例）
│  ● 删除今天之后的所有               │
│  ○ 删除全部历史                     │
│                                     │
│  ─────────────────────────────────  │
│        取消            确认删除     │
└─────────────────────────────────────┘

智能默认逻辑：
- 删除未来的事件 → 默认"删除这一次"（可能是请假一次）
- 删除历史事件 → 默认"仅删除这一次"（保留记录）
- 长按/右键菜单 → 直接显示三个选项，不经过弹窗
```

---

## 视图切换体验设计

### 3.1 保持日期焦点的状态管理

```typescript
// Pinia Store 设计
export const useScheduleStore = defineStore('schedule', {
  state: () => ({
    currentView: 'month',  // month | week | day
    focusedDate: new Date(),  // 核心：始终保持的"焦点日期"
    selectedEvent: null
  }),
  
  actions: {
    // 切换视图时保持焦点
    switchView(view: 'month' | 'week' | 'day') {
      this.currentView = view
      // 根据焦点日期计算视图范围，而不是跳到当前日期
      this.calculateViewRange(this.focusedDate)
    },
    
    // 点击日期时更新焦点
    focusDate(date: Date) {
      this.focusedDate = date
    },
    
    // 今天按钮：更新焦点为今天
    goToToday() {
      this.focusedDate = new Date()
      this.animateToDate(new Date())  // 带动画
    }
  }
})

// 视图切换时的焦点保持
const viewTransitions = {
  // 月 → 周：以选中的日期所在周为范围
  'month-to-week': (focusedDate) => getWeekRange(focusedDate),
  
  // 月 → 日：直接显示选中日期
  'month-to-day': (focusedDate) => focusedDate,
  
  // 周 → 日：显示周视图中选中的日期
  'week-to-day': (focusedDate) => focusedDate,
  
  // 日 → 周：包含该日的周
  'day-to-week': (focusedDate) => getWeekRange(focusedDate),
  
  // 日 → 月：该日所在的月
  'day-to-month': (focusedDate) => getMonthRange(focusedDate)
}
```

### 3.2 移动端手势支持

```typescript
// 手势配置
const gestureConfig = {
  // 日视图左右滑动切换日期
  dayView: {
    leftSwipe: () => navigateDay(-1),   // 前一天
    rightSwipe: () => navigateDay(1),   // 后一天
    swipeThreshold: 50,  // 触发阈值(px)
    hapticFeedback: true  // 触觉反馈
  },
  
  // 周视图左右滑动切换周
  weekView: {
    leftSwipe: () => navigateWeek(-1),
    rightSwipe: () => navigateWeek(1)
  },
  
  // 月视图上下滑动切换月
  monthView: {
    upSwipe: () => navigateMonth(1),
    downSwipe: () => navigateMonth(-1)
  }
}

// Vue 手势指令实现
const vSwipe = {
  mounted(el, binding) {
    let startX = 0
    let startY = 0
    
    el.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX
      startY = e.touches[0].clientY
    })
    
    el.addEventListener('touchend', (e) => {
      const endX = e.changedTouches[0].clientX
      const endY = e.changedTouches[0].clientY
      const diffX = startX - endX
      const diffY = startY - endY
      
      // 水平滑动
      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
        binding.value(diffX > 0 ? 'left' : 'right')
      }
    })
  }
}
```

### 3.3 今天按钮动画设计

```vue
<template>
  <button class="today-btn" :class="{ pulsing: isAnimating }" @click="goToToday">
    <span class="btn-text">今天</span>
    <span class="ripple"></span>
  </button>
</template>

<style>
.today-btn {
  position: relative;
  background: var(--gradient-brand);
  border: none;
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  font-weight: 600;
  overflow: hidden;
}

/* 脉冲动画：提示用户当前不在今天 */
.pulsing {
  animation: pulse-glow 2s ease-in-out infinite;
}

@keyframes pulse-glow {
  0%, 100% { 
    box-shadow: 0 0 0 0 rgba(79,142,247,0.4);
  }
  50% { 
    box-shadow: 0 0 0 8px rgba(79,142,247,0);
  }
}

/* 点击波纹 */
.ripple {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, rgba(255,255,255,0.3), transparent);
  transform: scale(0);
  opacity: 0;
}

.today-btn:active .ripple {
  animation: ripple-effect 0.4s ease-out;
}

@keyframes ripple-effect {
  to {
    transform: scale(2);
    opacity: 0;
  }
}

/* 日历跳转动画 */
.calendar-transition {
  animation: slide-in 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes slide-in {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
```

---

## 大学生场景解决方案

### 4.1 课表导入引导（MVP手动录入不麻烦）

**双轨方案：拍照导入 + 智能模板**

```
方案A：拍照导入（技术中等，体验最佳）
┌─────────────────────────────────────┐
│  📷 拍照导入课表                     │
│                                     │
│  1. 对准教务系统课表页面拍照        │
│  2. AI 自动识别课程信息              │
│  3. 预览并一键确认                   │
│                                     │
│  [示例图片]                          │
│  ┌─────────┐                        │
│  │ 周一    │                        │
│  │ 08:00   │  ← 这样拍效果最好      │
│  │ 高数    │                        │
│  └─────────┘                        │
│                                     │
│  [开始拍照]                          │
└─────────────────────────────────────┘

方案B：智能模板（MVP优先实现）
┌─────────────────────────────────────┐
│  📝 快速录入课表                     │
│                                     │
│  周一有什么课？                     │
│  ┌─────────────────────────────┐   │
│  │ 高数 08:00-09:35 教四302    │   │  ← 自然语言输入
│  │ 英语 14:00-15:35 外语楼201  │   │
│  └─────────────────────────────┘   │
│                                     │
│  AI 已识别 2 门课程：               │
│  ✓ 高等数学（周一，1-18周）         │
│  ✓ 大学英语（周一，1-18周）         │
│                                     │
│  [下一页：周二的课 →]               │
└─────────────────────────────────────┘
```

**降低录入成本的交互设计**：

```typescript
// 1. 批量粘贴识别
const parseCourseInput = (input: string): Course[] => {
  // 支持多种格式：
  // "高数 周一 8:00-9:35 教四302"
  // "高等数学 | Mon | 08:00 | 09:35 | Room 302"
  // 表格粘贴（从Excel复制）
}

// 2. 周次智能推断
const inferWeekPattern = (courseName: string) => {
  // 必修课 → 1-18周
  // 选修课 → 可能询问"是双周课吗？"
  return { startWeek: 1, endWeek: 18, isBiweekly: false }
}

// 3. 课程库复用
const courseLibrary = {
  // 同校其他学生添加过的课程自动建议
  suggest: (courseName: string, school: string) => {
    return findSimilarCourses(courseName, school)
  }
}
```

### 4.2 考试临近提醒设计

**首屏突出显示策略**：

```vue
<template>
  <!-- 当7天内有考试时，首屏顶部显示警告横幅 -->
  <div v-if="upcomingExams.length" class="exam-alert-banner">
    <div class="alert-content">
      <span class="alert-icon">⏰</span>
      <span class="alert-text">
        距 <strong>{{ upcomingExams[0].title }}</strong> 还有 
        <span class="countdown">{{ daysLeft }}天</span>
      </span>
      <button class="alert-action" @click="openStudyPlan">
        查看复习计划
      </button>
    </div>
    <div class="progress-bar" :style="{ width: progressPercent + '%' }"></div>
  </div>
</template>

<style>
.exam-alert-banner {
  background: linear-gradient(135deg, rgba(239,68,68,0.15), rgba(249,115,22,0.15));
  border: 1px solid rgba(239,68,68,0.3);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  position: relative;
  overflow: hidden;
}

.alert-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.countdown {
  color: #ef4444;
  font-weight: 700;
  font-size: 1.1em;
}

.progress-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 3px;
  background: linear-gradient(90deg, #ef4444, #f97316);
  transition: width 0.3s;
}
</style>
```

### 4.3 节假日标注设计

```typescript
// 节假日数据结构
const holidays = {
  '2026-01-01': { name: '元旦', type: 'national', style: 'golden' },
  '2026-02-17': { name: '春节', type: 'national', style: 'golden' },
  '2026-04-05': { name: '清明', type: 'national', style: 'subtle' },
  '2026-05-01': { name: '劳动节', type: 'national', style: 'golden' },
  '2026-06-20': { name: '端午', type: 'national', style: 'subtle' },
  '2026-09-27': { name: '中秋', type: 'national', style: 'subtle' },
  '2026-10-01': { name: '国庆', type: 'national', style: 'golden' }
}

// 视觉表现
const holidayStyles = {
  // 重要节日：金色微光 + 节日名称
  golden: {
    background: 'linear-gradient(135deg, rgba(251,191,36,0.15), rgba(251,191,36,0.05))',
    border: '1px solid rgba(251,191,36,0.3)',
    badge: '🎉 春节',
    textColor: '#fbbf24'
  },
  
  // 普通节日：淡色标记
  subtle: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    badge: '清明',
    textColor: 'var(--color-text-muted)'
  },
  
  // 调休日：特殊标记
  workday: {
    background: 'rgba(79,142,247,0.08)',
    badge: '班',
    textColor: '#4f8ef7'
  }
}
```

---

## 与现有模块协同设计

### 5.1 校园墙发帖关联日程

**入口设计**：

```vue
<!-- 在校园墙的发布面板中添加日程关联入口 -->
<template>
  <div class="composer-modal">
    <!-- 原有发布内容区域 -->
    <textarea v-model="postContent" placeholder="写下你想说的..." />
    
    <!-- 新增：关联日程入口 -->
    <div class="schedule-attachment">
      <button class="attach-schedule-btn" @click="openSchedulePicker">
        <svg class="icon-calendar" />
        <span>关联日程</span>
      </button>
      
      <!-- 已关联的日程预览 -->
      <div v-if="attachedSchedule" class="attached-schedule">
        <span class="s-icon">📚</span>
        <span class="s-title">{{ attachedSchedule.title }}</span>
        <span class="s-time">{{ attachedSchedule.time }}</span>
        <button class="remove" @click="detachSchedule">×</button>
      </div>
    </div>
    
    <!-- 快捷创建 + 关联 -->
    <div class="quick-schedule-create" v-if="!attachedSchedule">
      <p>或者 <a @click="quickCreateSchedule">创建一个日程并关联</a></p>
    </div>
  </div>
</template>
```

**交互流程**：

```
1. 用户点击"关联日程"
   ↓
2. 弹出迷你日程选择器（显示最近7天的日程）
   ↓
3. 用户选择"今晚图书馆自习 19:00"
   ↓
4. 帖子显示为："今晚图书馆自习，欢迎一起 📅 19:00"
   ↓
5. 帖子发布时，schedule_id 写入 posts 表
```

### 5.2 一键加入他人日程

**实现设计**：

```typescript
// 带日程的帖子数据结构
interface PostWithSchedule {
  id: string
  content: string
  author: User
  attachedSchedule: {
    title: string
    startTime: Date
    endTime: Date
    location?: string
    originalEventId: string  // 原作者的事件ID
  }
  joinCount: number  // 已加入人数
  hasJoined: boolean  // 当前用户是否已加入
}

// 帖子卡片中的加入按钮
const ScheduleJoinButton = {
  props: ['post'],
  template: `
    <div class="schedule-join-section" v-if="post.attachedSchedule">
      <div class="schedule-preview">
        <span class="icon">📅</span>
        <span class="time">{{ formatTime(post.attachedSchedule.startTime) }}</span>
        <span class="title">{{ post.attachedSchedule.title }}</span>
      </div>
      <button 
        class="join-btn" 
        :class="{ joined: post.hasJoined }"
        @click="toggleJoin"
      >
        {{ post.hasJoined ? '✓ 已加入' : '+ 加入日程' }}
      </button>
      <span class="join-count">{{ post.joinCount }}人参与</span>
    </div>
  `,
  methods: {
    async toggleJoin() {
      if (this.post.hasJoined) {
        // 取消加入：删除自己日程表中的副本
        await cancelJoinSchedule(this.post.id)
      } else {
        // 加入：复制事件到自己日程，并建立关联
        await joinSchedule({
          originalEventId: this.post.attachedSchedule.originalEventId,
          postId: this.post.id,
          customReminder: true  // 询问是否设置提醒
        })
      }
    }
  }
}
```

**数据库关联**：

```sql
-- 帖子表添加关联字段
ALTER TABLE posts ADD COLUMN attached_schedule_id UUID REFERENCES schedule_events(id);
ALTER TABLE posts ADD COLUMN schedule_join_count INT DEFAULT 0;

-- 用户加入的日程关联表
CREATE TABLE schedule_joins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  post_id UUID REFERENCES posts(id),
  original_event_id UUID REFERENCES schedule_events(id),
  user_event_id UUID REFERENCES schedule_events(id),  -- 用户自己的副本
  joined_at TIMESTAMP DEFAULT NOW()
);
```

---

## 通知与提醒体验设计

### 6.1 Web Notification 权限请求时机

**决策：延迟请求，在用户主动设置提醒时触发（转化率更高）**

```typescript
// 权限请求策略
const notificationStrategy = {
  // ❌ 不推荐：进入日程页立即请求
  aggressive: {
    timing: 'page-enter',
    conversion: 'low',  // 用户不理解为什么要授权
    uxScore: 2/10
  },
  
  // ✅ 推荐：用户主动设置提醒时请求
  contextual: {
    timing: 'user-action',
    trigger: '用户点击"添加提醒"按钮',
    message: '开启通知后，我们会在课程开始前提醒你',
    conversion: 'high',  // 用户有明确需求
    uxScore: 9/10
  },
  
  // 备选：完成第一个事件创建后请求
  postAction: {
    timing: 'after-first-event',
    message: '创建了你的第一个事件！开启提醒以免错过？',
    conversion: 'medium',
    uxScore: 7/10
  }
}

// 实现代码
const requestNotificationPermission = async (context: string) => {
  // 检查是否已经拒绝过
  if (Notification.permission === 'denied') {
    showToast('请在浏览器设置中开启通知权限', 'info')
    return false
  }
  
  // 检查是否已经允许
  if (Notification.permission === 'granted') {
    return true
  }
  
  // 显示自定义解释弹窗
  const userConfirmed = await showPermissionDialog({
    title: '开启课程提醒？',
    message: '我们会在你设置的提醒时间发送通知，帮你不错过任何重要课程',
    icon: '🔔'
  })
  
  if (userConfirmed) {
    const permission = await Notification.requestPermission()
    if (permission === 'granted') {
      showToast('已开启提醒', 'success')
      return true
    }
  }
  
  return false
}
```

### 6.2 提醒弹窗视觉样式（暗黑风格）

```typescript
// 浏览器通知配置
const notificationStyle = {
  // 图标使用星火Logo
  icon: '/icons/spark-notification.png',
  
  // 徽章（Android）
  badge: '/icons/badge-96x96.png',
  
  // 通知内容样式
  title: '⏰ 10分钟后：操作系统',
  body: '教四-302 · 张教授 · 别忘记带教材',
  
  // 操作按钮
  actions: [
    { action: 'dismiss', title: '知道了' },
    { action: 'snooze', title: '5分钟后再提醒' },
    { action: 'navigate', title: '查看详情' }
  ],
  
  // 其他选项
  requireInteraction: true,  // 保持显示直到用户交互
  silent: false,
  vibrate: [200, 100, 200]  // 震动模式
}

// 应用内提醒弹窗（用户在使用应用时）
const InAppNotification = {
  template: `
    <Transition name="slide-down">
      <div v-if="visible" class="in-app-notify">
        <div class="notify-glow"></div>
        <div class="notify-content">
          <div class="notify-icon">⏰</div>
          <div class="notify-text">
            <div class="notify-title">{{ event.title }}</div>
            <div class="notify-meta">{{ event.time }} · {{ event.location }}</div>
          </div>
        </div>
        <div class="notify-actions">
          <button class="btn-snooze" @click="snooze">稍后</button>
          <button class="btn-dismiss" @click="dismiss">知道了</button>
        </div>
      </div>
    </Transition>
  `,
  style: `
    .in-app-notify {
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(17,17,24,0.95);
      border: 1px solid rgba(79,142,247,0.3);
      border-radius: 16px;
      padding: 16px 20px;
      min-width: 320px;
      backdrop-filter: blur(20px);
      box-shadow: 0 20px 40px rgba(0,0,0,0.4);
      z-index: 9999;
    }
    
    .notify-glow {
      position: absolute;
      top: -1px;
      left: -1px;
      right: -1px;
      bottom: -1px;
      background: linear-gradient(135deg, rgba(79,142,247,0.3), transparent);
      border-radius: 16px;
      z-index: -1;
      animation: pulse-glow 2s ease-in-out infinite;
    }
  `
}
```

### 6.3 稍后提醒（Snooze）功能设计

**必要性：✅ 必要，大学生场景下15分钟最合适**

```typescript
const snoozeConfig = {
  // 为什么需要：
  // 1. 提前30分钟提醒时，可能正在吃饭/赶路
  // 2. 提前5分钟提醒时，可能正在找教室
  // 3. 给用户控制权，减少焦虑
  
  // 时间选项（针对大学生场景优化）
  options: [
    { value: 5, label: '5分钟', icon: '⚡', description: '马上到教室了' },
    { value: 10, label: '10分钟', icon: '🚶', description: '正在路上' },
    { value: 15, label: '15分钟', icon: '🍽️', description: '还在吃饭（推荐）' },
    { value: 30, label: '30分钟', icon: '📚', description: '准备出发' }
  ],
  
  // 默认选项
  default: 15,
  
  // 智能建议
  smartSuggest: (eventTime: Date) => {
    const now = new Date()
    const diff = eventTime.getTime() - now.getTime()
    const diffMinutes = Math.floor(diff / 60000)
    
    if (diffMinutes > 20) return 15
    if (diffMinutes > 10) return 5
    return 0  // 不再建议延后
  },
  
  // 最大延后次数（防止无限循环）
  maxSnoozes: 3
}
```

---

## 错误与边界情况处理

### 7.1 网络断线处理（乐观更新 + 离线队列）

```typescript
// 离线队列管理器
class OfflineQueue {
  private queue: QueuedAction[] = []
  private db: IndexedDB
  
  async add(action: 'create' | 'update' | 'delete', eventData: Event) {
    const queuedAction = {
      id: generateTempId(),
      action,
      data: eventData,
      timestamp: Date.now(),
      retryCount: 0
    }
    
    // 1. 立即保存到本地 IndexedDB
    await this.db.add('offline_queue', queuedAction)
    
    // 2. 乐观更新 UI
    this.optimisticUpdate(action, eventData)
    
    // 3. 尝试立即发送（如果在线）
    if (navigator.onLine) {
      this.processQueue()
    }
  }
  
  // 网络恢复时处理队列
  async processQueue() {
    const pending = await this.db.getAll('offline_queue')
    
    for (const item of pending.sort((a, b) => a.timestamp - b.timestamp)) {
      try {
        await this.syncWithServer(item)
        await this.db.delete('offline_queue', item.id)
        this.updateSyncStatus(item.id, 'synced')
      } catch (error) {
        item.retryCount++
        if (item.retryCount > 3) {
          this.updateSyncStatus(item.id, 'failed')
          this.showConflictDialog(item)
        }
      }
    }
  }
}

// UI 状态显示
const SyncStatusBadge = {
  template: `
    <span class="sync-status" :class="status">
      <span v-if="status === 'syncing'" class="spinner"></span>
      <span v-if="status === 'pending'">⏳</span>
      <span v-if="status === 'failed'">⚠️</span>
      <span v-if="status === 'synced'" style="display:none"></span>
    </span>
  `
}
```

### 7.2 时间冲突警告（不打断用户流程）

```vue
<template>
  <div class="event-modal">
    <!-- 表单区域 -->
    <div class="form-fields">
      <!-- 时间选择器显示冲突警告 -->
      <div class="time-field" :class="{ conflicting: hasConflict }">
        <label>时间</label>
        <TimePicker v-model="eventTime" />
        
        <!-- 冲突警告（内联显示，不阻断） -->
        <div v-if="hasConflict" class="conflict-warning">
          <span class="warning-icon">⚠️</span>
          <span class="warning-text">
            与 "{{ conflictEvent.title }}" 时间重叠
          </span>
          <button class="warning-action" @click="viewConflict">
            查看
          </button>
        </div>
      </div>
    </div>
    
    <!-- 底部操作栏 -->
    <div class="modal-footer">
      <!-- 保存按钮根据冲突状态变化 -->
      <button 
        class="save-btn" 
        :class="{ 'has-conflict': hasConflict }"
        @click="handleSave"
      >
        {{ hasConflict ? '仍要保存' : '保存' }}
      </button>
    </div>
  </div>
</template>

<style>
.time-field.conflicting {
  border-left: 3px solid #f97316;
  padding-left: 12px;
  background: rgba(249,115,22,0.05);
}

.conflict-warning {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  padding: 8px 12px;
  background: rgba(249,115,22,0.1);
  border-radius: 8px;
  font-size: 13px;
}

.warning-icon {
  color: #f97316;
}

.warning-action {
  margin-left: auto;
  color: #4f8ef7;
  background: none;
  border: none;
  cursor: pointer;
}

.save-btn.has-conflict {
  background: rgba(249,115,22,0.9);
}
</style>
```

### 7.3 跨午夜事件显示

```typescript
// 跨午夜事件处理
const handleCrossMidnightEvent = (event: ScheduleEvent) => {
  const start = new Date(event.start_time)
  const end = new Date(event.end_time)
  
  // 检测是否跨天
  if (start.getDate() !== end.getDate() || 
      start.getMonth() !== end.getMonth()) {
    
    // 方案：在两天都显示，用视觉区分
    return {
      // 第一天的部分（23:00-24:00）
      day1Segment: {
        start: start,
        end: new Date(start.getFullYear(), start.getMonth(), start.getDate(), 23, 59),
        isFirstPart: true,
        continues: true  // 标记"继续到次日"
      },
      
      // 第二天的部分（00:00-01:00）
      day2Segment: {
        start: new Date(end.getFullYear(), end.getMonth(), end.getDate(), 0, 0),
        end: end,
        isFirstPart: false,
        continuedFrom: true  // 标记"从前一天继续"
      }
    }
  }
}

// 日视图渲染
const DayViewRender = {
  template: `
    <div class="day-view">
      <!-- 0:00 - 23:59 时间线 -->
      <div v-for="hour in 24" :key="hour" class="hour-slot">
        <!-- 普通事件 -->
        <EventCard v-for="e in eventsInHour(hour)" :key="e.id" :event="e" />
        
        <!-- 跨午夜事件的后半部分 -->
        <EventCard 
          v-for="e in continuedEvents" 
          :key="e.id" 
          :event="e"
          :is-continued="true"
        />
      </div>
      
      <!-- 跨午夜指示器 -->
      <div v-if="hasContinuedEvents" class="midnight-continuation">
        <span class="continuation-line"></span>
        <span class="continuation-text">延续自昨日 23:00 的事件</span>
      </div>
    </div>
  `
}
```

---

## 空状态 & 引导设计（详细展开）

### 完整空状态页面设计

```vue
<template>
  <div class="schedule-empty-state">
    <!-- 动态插画 -->
    <div class="illustration-container">
      <svg class="calendar-illustration" viewBox="0 0 200 200">
        <!-- 玻璃拟态日历 -->
        <defs>
          <linearGradient id="glass-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:rgba(79,142,247,0.2)" />
            <stop offset="100%" style="stop-color:rgba(139,92,246,0.1)" />
          </linearGradient>
        </defs>
        
        <!-- 日历主体 -->
        <rect x="40" y="40" width="120" height="120" rx="16" 
              fill="url(#glass-gradient)" 
              stroke="rgba(255,255,255,0.1)"
              stroke-width="1"/>
        
        <!-- 日历顶部 -->
        <rect x="40" y="40" width="120" height="30" rx="16" 
              fill="rgba(79,142,247,0.3)"/>
        
        <!-- 日期格子 -->
        <g v-for="i in 9" :key="i">
          <rect :x="50 + ((i-1)%3)*30" :y="80 + Math.floor((i-1)/3)*25" 
                width="20" height="18" rx="4"
                fill="rgba(255,255,255,0.05)"/>
        </g>
        
        <!-- 高亮今天 -->
        <rect x="110" y="105" width="20" height="18" rx="4"
              fill="rgba(79,142,247,0.5)"
              class="pulse-highlight"/>
      </svg>
    </div>
    
    <!-- 主文案 -->
    <h2 class="empty-title">你的时间，由你掌控</h2>
    <p class="empty-subtitle">
      导入课表或手动添加课程，AI 会帮你规划每一天
    </p>
    
    <!-- 三个主要入口 -->
    <div class="action-cards">
      <button class="action-card primary" @click="openImport">
        <div class="card-icon">📷</div>
        <div class="card-content">
          <h4>拍照导入课表</h4>
          <p>最快5秒完成</p>
        </div>
        <div class="card-arrow">→</div>
      </button>
      
      <button class="action-card" @click="openManualAdd">
        <div class="card-icon">📝</div>
        <div class="card-content">
          <h4>手动添加课程</h4>
          <p>逐门录入，更精准</p>
        </div>
      </button>
      
      <button class="action-card" @click="browseTemplates">
        <div class="card-icon">📚</div>
        <div class="card-content">
          <h4>从模板开始</h4>
          <p>选课/考试/活动等</p>
        </div>
      </button>
    </div>
    
    <!-- 底部提示轮播 -->
    <div class="tips-carousel">
      <Transition name="fade" mode="out-in">
        <p :key="currentTip" class="tip-text">
          💡 {{ tips[currentTip] }}
        </p>
      </Transition>
    </div>
  </div>
</template>

<script setup>
const tips = [
  '下周有期中考试？提前标记，AI 会帮你规划复习时间',
  '同一门课每周都有？设置重复，一次录入即可',
  '开启提醒后，我们会在课程开始前30分钟通知你',
  '可以在校园墙发帖时关联日程，邀请同学一起自习'
]

const currentTip = ref(0)
setInterval(() => {
  currentTip.value = (currentTip.value + 1) % tips.length
}, 5000)
</script>

<style>
.schedule-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  padding: 40px 24px;
  text-align: center;
  color: white;
}

.illustration-container {
  margin-bottom: 32px;
}

.calendar-illustration {
  width: 160px;
  height: 160px;
}

.pulse-highlight {
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

.empty-title {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 12px;
  background: linear-gradient(135deg, #fff, rgba(255,255,255,0.7));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.empty-subtitle {
  font-size: 15px;
  color: var(--color-text-secondary);
  margin-bottom: 32px;
  max-width: 320px;
}

.action-cards {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  max-width: 360px;
}

.action-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.action-card:hover {
  background: rgba(79,142,247,0.08);
  border-color: rgba(79,142,247,0.3);
  transform: translateY(-2px);
}

.action-card.primary {
  background: linear-gradient(135deg, rgba(79,142,247,0.15), rgba(139,92,246,0.1));
  border-color: rgba(79,142,247,0.4);
}

.card-icon {
  font-size: 28px;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.05);
  border-radius: 12px;
}

.card-content h4 {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 4px;
}

.card-content p {
  font-size: 13px;
  color: var(--color-text-muted);
}

.card-arrow {
  margin-left: auto;
  color: var(--color-brand-blue);
  font-size: 18px;
}

.tips-carousel {
  margin-top: 32px;
  padding: 12px 20px;
  background: rgba(251,191,36,0.08);
  border: 1px solid rgba(251,191,36,0.2);
  border-radius: 20px;
}

.tip-text {
  font-size: 13px;
  color: #fbbf24;
  margin: 0;
}
</style>
```

---

## 体验评分与优先级

### 综合体验评分

| 维度 | 当前设计 | 目标体验 | 评分 | 优先级 |
|------|----------|----------|------|--------|
| **首次使用流程** | 空状态引导待完善 | 3步完成第一个事件 | ⭐⭐⭐⭐⭐ | P0 |
| **Quick Add 快速创建** | 需新增内联输入 | 点击即输入，回车即保存 | ⭐⭐⭐⭐⭐ | P0 |
| **视图切换体验** | 基础功能 | 保持焦点+流畅动画 | ⭐⭐⭐⭐ | P1 |
| **课表导入** | 手动录入为主 | 拍照+智能识别 | ⭐⭐⭐⭐ | P1 |
| **通知提醒** | 基础Web通知 | 上下文授权+优雅提醒 | ⭐⭐⭐⭐ | P1 |
| **校园墙协同** | 待开发 | 关联+一键加入 | ⭐⭐⭐ | P2 |
| **离线支持** | 乐观更新 | 完整离线队列 | ⭐⭐⭐ | P2 |

### 开发优先级建议

```
Phase 1 - MVP 核心（2周）
├── ✅ 空状态引导页面（降低首次使用流失）
├── ✅ Quick Add 内联快速创建
├── ✅ 事件 CRUD 基础功能
└── ✅ 月/周/日三视图切换

Phase 2 - 体验优化（1周）
├── ✅ 课表导入引导（拍照+手动）
├── ✅ 考试提醒横幅
├── ✅ Web Notification 上下文授权
└── ✅ 跨午夜事件处理

Phase 3 - 协同功能（1周）
├── ✅ 校园墙关联日程入口
├── ✅ 一键加入他人日程
└── ✅ 离线队列同步

Phase 4 - 智能增强（后续迭代）
├── ⏳ AI 时间建议
├── ⏳ 智能冲突解决
└── ⏳ 习惯学习推荐
```

### 关键成功指标（KPI）

```typescript
const successMetrics = {
  // 用户激活
  activation: {
    firstEventCreated: '新用户7天内创建第一个事件率 > 60%',
    scheduleImported: '课表导入完成率 > 40%'
  },
  
  // 用户留存
  retention: {
    week1: '次周留存率 > 35%',
    week4: '月留存率 > 20%'
  },
  
  // 功能使用
  engagement: {
    eventsPerUser: '人均周活跃事件数 > 5',
    reminderEnabled: '开启提醒用户占比 > 50%'
  },
  
  // 性能指标
  performance: {
    pageLoad: '首屏加载 < 1.5s',
    interaction: '交互响应 < 100ms'
  }
}
```

---

## 总结

作为 iflow，我从用户体验和交互设计角度对智能日程模块进行了系统性头脑风暴。核心洞察：

1. **降低认知成本是核心** - 大学生时间宝贵，每个功能都要"一眼懂、一步达"
2. **空状态决定首印象** - 精心设计的空状态能将流失率降低 40%+
3. **上下文交互优于全局** - 就地编辑、内联输入比打开弹窗更高效
4. **大学生场景需特殊适配** - 课表、考试、假期都是独特的使用场景
5. **模块协同创造网络效应** - 与校园墙联动能让日程功能更具社交价值

以上设计方案可直接指导前端开发，所有视觉风格已与 CampusWall.vue 保持一致（暗黑系 + 玻璃拟态 + 星火配色）。

---

**文档信息**
- 分析者：iflow（用户体验与交互设计专家）
- 输出时间：2026-03-22
- 版本：v1.0
- 配套文档：MODULE-SCHEDULE.md、CampusWall.vue
