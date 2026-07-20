<template>
  <div class="app-home" :class="{ 'is-visual-fixture': isVisualFixture }">
    <section class="hero">
      <!-- 参考图主视觉：发光轨道星球插画 -->
      <div class="planet-img-wrap">
        <img src="/dashboard/hero-banner.png" alt="" class="planet-img" />
      </div>
      <!-- 一线天/星空线 -->
      <div class="hero-horizon"></div>
      <!-- 星云层 -->
      <div class="hero-nebula-core"></div>
      <div class="hero-nebula-mid"></div>
      <!-- 星点 -->
      <div class="hero-stars">
        <span v-for="i in 45" :key="'hs'+i" class="h-star" :class="{ 'h-star-bright': i % 7 === 0 }" :style="{ left: `${((i * 7.3 + 13) % 95) + 2}%`, top: `${((i * 11.1 + 5) % 90) + 3}%`, animationDelay: `${i * 0.28}s`, animationDuration: `${1.8 + (i % 5) * 0.5}s`, width: `${1 + (i % 4)}px`, height: `${1 + (i % 4)}px` }"></span>
      </div>
      <!-- 流星 -->
      <div class="hero-meteors">
        <span class="meteor" style="top:18%;left:60%;animation-delay:0s"></span>
        <span class="meteor" style="top:35%;left:75%;animation-delay:3.5s"></span>
        <span class="meteor" style="top:10%;left:45%;animation-delay:7s"></span>
      </div>
      <!-- 内容 -->
      <div class="hero-left">
        <span v-if="isVisualFixture" class="fixture-label">开发视觉数据</span>
        <h1 class="hero-greeting">{{ greeting }}，SparkAlliance <span class="hero-sparkle">✦</span></h1>
        <p class="hero-date">{{ currentDate }}</p>
        <p class="hero-insight">AI 洞察：{{ aiInsight }}</p>
        <div class="hero-pills">
          <span class="hero-pill" v-for="pill in heroPills" :key="pill.label">
            <span class="pill-indicator" :class="pill.trend"></span>
            {{ pill.label }}
          </span>
        </div>
      </div>
      <div class="hero-right">
        <button class="btn hero-ghost" type="button" @click="loadDashboard"><span class="refresh-icon" :class="{ spinning: isRefreshing }">⟳</span> 刷新主控台</button>
        <router-link to="/app/schedule?module=planner" class="btn hero-primary">去完成规划 →</router-link>
      </div>
      <div class="hero-orbit-note" aria-hidden="true">
        <span class="hero-orbit-mark">✦</span>
        <span>连接每个火花，照亮清晰的下一步</span>
      </div>
      <div class="hero-pagination" aria-hidden="true"><span></span><span class="active"></span><span></span></div>
    </section>

    <!-- 第二行：统计卡片（6列） -->
    <section ref="statsObserverTarget" class="stats-strip">
      <div v-for="(stat, idx) in miniStats" :key="stat.label" class="stat-chip" :style="{ animationDelay: `${0.1 + idx * 0.05}s` }">
        <div v-if="stat.asset" class="stat-icon stat-icon-art" :style="{ background: stat.color + '14' }">
          <img :src="stat.asset" alt="" width="34" height="34" loading="lazy" />
        </div>
        <div v-else class="stat-icon" :style="{ color: stat.color, background: stat.color + '18' }" v-html="stat.svg"></div>
        <div class="stat-text">
          <strong><span class="stat-value" :data-target="stat.value">{{ statsVisible ? stat.value : '0' }}</span><sub v-if="stat.sub && stat.value !== '—' && stat.value !== '...'" class="stat-unit">{{ stat.sub }}</sub></strong>
          <span class="stat-label">{{ stat.label }}</span>
          <span class="stat-sub-info">{{ statSubInfo[idx] }}</span>
        </div>
      </div>
    </section>

    <!-- 第三行：闭环行动 + 今日日程 + 规划推进（三栏） -->
    <section class="row-3col">
      <div class="card">
        <div class="card-head">
          <h3>今日优先处理 <span class="card-badge">闭环行动</span></h3>
          <router-link to="/app/schedule?module=planner" class="more-link">查看全部 →</router-link>
        </div>
        <router-link v-for="action in dashboardActions" :key="action.id" :to="action.to" class="action-card" :class="`tone-${action.emphasis}`">
          <span class="action-icon" v-html="actionIconMarkup[action.emphasis]"></span>
          <div class="action-copy">
            <strong>{{ action.title }}</strong>
            <span>{{ action.description }}</span>
          </div>
          <div class="action-right">
            <span class="priority-tag" :class="`p-${action.emphasis}`">{{ action.emphasis === 'high' ? '高优先级' : action.emphasis === 'medium' ? '中优先级' : '低优先级' }}</span>
            <span class="action-cta">去处理</span>
          </div>
        </router-link>
        <p v-if="dashboardActions.length === 0" class="empty">今天暂无紧急事项，专注你最重要的目标吧。</p>
      </div>
      <div class="card">
        <div class="card-head">
          <h3>今日日程</h3>
          <router-link to="/app/schedule" class="more-link">管理日程 →</router-link>
        </div>
        <div class="list">
          <p v-if="sectionStates.schedule === 'loading'" class="empty state-message">正在同步今日日程...</p>
          <p v-else-if="sectionStates.schedule === 'error'" class="empty state-message is-error">日程暂时无法同步，请刷新重试。</p>
          <p v-else-if="sectionStates.schedule === 'unavailable'" class="empty state-message">登录后即可查看今日日程。</p>
          <template v-else>
            <router-link v-for="(event, idx) in todaySchedule" :key="event.id" :to="`/app/schedule?view=day&date=${getLocalDate()}`" class="list-item list-item-link" :style="{ animationDelay: `${0.3 + idx * 0.05}s` }">
              <span class="dot" :class="event.kind"></span>
              <div>
                <strong>{{ event.title }}</strong>
                <span>{{ event.time }}</span>
              </div>
              <span v-if="event.status === 'active'" class="status-tag active">进行中</span>
              <span v-else-if="event.status === 'upcoming'" class="status-tag upcoming">即将开始</span>
              <span v-else-if="event.status === 'ended'" class="status-tag ended">已结束</span>
              <span v-else class="status-tag pending">待开始</span>
            </router-link>
            <p v-if="todaySchedule.length === 0" class="empty">今天还没有安排，去日程页规划一下吧。</p>
            <router-link v-if="todaySchedule.length > 0" to="/app/schedule" class="card-bottom-link">查看完整日程 →</router-link>
          </template>
        </div>
      </div>
      <div ref="plannerObserverTarget" class="card">
        <div class="card-head">
          <h3>规划推进</h3>
          <router-link to="/app/schedule?module=planner" class="more-link">查看全部 →</router-link>
        </div>
        <div class="planner-list">
          <p v-if="sectionStates.planner === 'loading'" class="empty state-message">正在同步规划进度...</p>
          <p v-else-if="sectionStates.planner === 'error'" class="empty state-message is-error">规划数据暂时不可用，请刷新重试。</p>
          <p v-else-if="sectionStates.planner === 'unavailable'" class="empty state-message">登录后即可同步规划进度。</p>
          <div v-for="task in todayPlannerTasks" :key="task.id" class="planner-item">
            <div class="pi-top">
              <span class="pi-dot" :class="{ overdue: task.isOverdue }"></span>
              <strong>{{ task.title }}</strong>
              <span class="pi-status" :class="task.isOverdue ? 'st-overdue' : 'st-progress'">{{ task.isOverdue ? '已逾期' : '进行中' }}</span>
            </div>
            <div class="pi-bar-row">
              <div class="pi-bar"><div class="pi-bar-fill" :class="{ unavailable: task.progress == null }" :style="{ width: plannerVisible && task.progress != null ? task.progress + '%' : '0%' }"></div></div>
              <span class="pi-pct">{{ task.progress == null ? '待拆解' : task.progress + '%' }}</span>
              <span class="pi-eta">{{ task.remainingDays == null ? '待安排' : task.remainingDays < 0 ? '已逾期 ' + Math.abs(task.remainingDays) + ' 天' : '剩余 ' + task.remainingDays + ' 天' }}</span>
            </div>
            <span class="pi-meta">{{ task.meta }}</span>
          </div>
          <p v-if="sectionStates.planner !== 'loading' && sectionStates.planner !== 'error' && sectionStates.planner !== 'unavailable' && todayPlannerTasks.length === 0" class="empty">今天没有待处理任务，适合开始一个新的目标。</p>
        </div>
      </div>
    </section>

    <!-- 第四行：购物动态 + 快速笔记 + 本周执行率 + AI建议（四栏） -->
    <section class="row-4col">
      <div class="card">
        <div class="card-head">
          <h3>购物动态</h3>
          <router-link to="/app/shop" class="more-link">去处理 →</router-link>
        </div>
        <p v-if="sectionStates.shop === 'loading'" class="empty state-message">正在同步购物动态...</p>
        <p v-else-if="sectionStates.shop === 'error'" class="empty state-message is-error">部分交易数据暂时不可用，请刷新重试。</p>
        <p v-else-if="sectionStates.shop === 'unavailable'" class="empty state-message">登录后即可同步购物动态。</p>
        <template v-else>
          <div class="shop-stats">
            <div><span class="shop-stat-icon tone-purple" v-html="dashboardIconMarkup.shop"></span><strong>{{ dashboardSnapshot.activeListings }}</strong><span>在售商品</span></div>
            <div><span class="shop-stat-icon tone-green" v-html="dashboardIconMarkup.package"></span><strong>{{ dashboardSnapshot.pendingTransactions }}</strong><span>待处理交易</span></div>
            <div><span class="shop-stat-icon tone-red" v-html="dashboardIconMarkup.message"></span><strong>{{ dashboardSnapshot.unreadShopMessages }}</strong><span>未读消息</span></div>
          </div>
          <div class="signal-list">
            <div v-for="signal in shopSignals" :key="signal" class="signal">{{ signal }}</div>
          </div>
        </template>
      </div>
      <div class="card note-card">
        <div class="card-head">
          <h3>快速笔记</h3>
          <span v-if="noteSaved" class="saved">已保存</span>
        </div>
        <textarea v-model="quickNote" class="note-textarea" rows="2" placeholder="随时记录你的想法、灵感与待办..." @input="saveNote"></textarea>
        <div class="note-actions">
          <span>{{ quickNote.length }} 字 · 已自动保存</span>
          <div class="note-buttons">
            <button class="btn ghost" type="button" @click="clearNote" :disabled="!quickNote.trim()">清空</button>
            <button class="btn primary" type="button" @click="convertNoteToTask" :disabled="!quickNote.trim() || convertingNote">{{ convertingNote ? '...' : '转为今日任务' }}</button>
          </div>
        </div>
      </div>
      <div ref="progressObserverTarget" class="card progress-card">
        <div class="card-head">
          <h3>本周执行率</h3>
        </div>
        <p v-if="sectionStates.weekly === 'loading'" class="empty state-message">正在统计本周执行率...</p>
        <p v-else-if="sectionStates.weekly === 'error'" class="empty state-message is-error">本周任务统计暂时不可用。</p>
        <p v-else-if="sectionStates.weekly === 'unavailable'" class="empty state-message">登录后即可查看本周执行率。</p>
        <template v-else>
        <div class="ring-wrap">
          <svg viewBox="0 0 120 120" class="ring">
            <defs>
              <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#8b5cf6" />
                <stop offset="100%" stop-color="#10b981" />
              </linearGradient>
            </defs>
            <circle class="ring-bg" cx="60" cy="60" r="50" />
            <circle class="ring-fg" cx="60" cy="60" r="50" :stroke-dashoffset="progressVisible ? ringOffset : 314.16" />
          </svg>
          <div class="ring-label">
            <strong>{{ progressVisible ? weeklyProgress.percent : 0 }}%</strong>
            <span>执行率</span>
          </div>
        </div>
        <div class="progress-detail">
          <span class="pd-done"><span class="pd-dot done"></span>已完成 {{ dashboardSnapshot.weeklyCompletedTasks }}</span>
          <span class="pd-prog"><span class="pd-dot prog"></span>进行中 {{ dashboardSnapshot.weeklyInProgressTasks }}</span>
          <span class="pd-warn"><span class="pd-dot warn"></span>未开始 {{ dashboardSnapshot.weeklyNotStartedTasks }}</span>
        </div>
        <p class="progress-trend">{{ weeklyProgress.summary }}</p>
        </template>
      </div>
      <div class="card ai-card">
        <div class="card-head">
          <h3>AI 今日建议</h3>
          <button class="more-link plain-btn" type="button" @click="refreshAiTips">换一批</button>
        </div>
        <div class="ai-tips">
          <div v-for="tip in aiTips" :key="tip" class="ai-tip"><span class="ai-bullet">•</span><span>{{ tip }}</span></div>
        </div>
      </div>
    </section>

    <!-- 第五行：成长 + 徽章 + 灵感 + 热榜（四栏） -->
    <section class="row-4col">
      <!-- 成长进度 -->
      <div class="card growth-card">
        <div class="card-head"><h3>成长进度</h3></div>
        <div class="growth-level">
          <div class="gl-avatar">
            <img v-if="user?.user_metadata?.avatar_url" :src="user.user_metadata.avatar_url" class="gl-avatar-img" />
            <span v-else class="gl-icon" v-html="dashboardIconMarkup.spark"></span>
          </div>
          <div class="gl-info">
            <div class="gl-name">Lv.{{ userLevel }} <span class="gl-title">{{ userName === '同学' ? '星火探索者' : userName }}</span></div>
            <div class="gl-xp">{{ userXP }} / {{ nextLevelXP }} XP</div>
            <div class="gl-bar"><div class="gl-bar-fill" :style="{ width: xpPercent + '%' }"></div></div>
          </div>
        </div>
        <div class="gl-stats">
          <div><strong>连续 {{ dashboardSnapshot.streakDays }} 天</strong><span>连续天数</span></div>
          <div><strong>本周 {{ dashboardSnapshot.weeklyCompletedTasks }} 项</strong><span>完成任务</span></div>
        </div>
        <p class="gl-hint">再获取 {{ nextLevelXP - userXP }} XP 升级！</p>
      </div>
      <!-- 成就徽章 -->
      <div class="card badge-card">
        <div class="card-head"><h3>成就徽章</h3><router-link to="/app/profile" class="more-link">查看全部</router-link></div>
        <div class="badge-row">
          <div v-for="badge in achievementBadges" :key="badge.label" class="badge-item-v2" :class="badge.earned ? 'earned' : 'locked'" :title="badge.hint">
            <div class="badge-circle"><img :src="badge.src" alt="" /></div>
            <span>{{ badge.label }}</span>
          </div>
        </div>
      </div>
      <div class="card quote-card">
        <div class="card-head">
          <h3>每日灵感</h3>
          <button class="more-link plain-btn" type="button" @click="refreshQuote">换一条</button>
        </div>
        <div :class="{ 'quote-fade-out': quoteTransition }">
          <span class="quote-tag">{{ currentQuote.tag }}</span>
          <blockquote>{{ currentQuote.text }}</blockquote>
          <cite>— {{ currentQuote.author }}</cite>
        </div>
      </div>
      <div class="card campus-card">
        <div class="card-head">
          <h3>校园热榜</h3>
          <router-link to="/app/wall" class="more-link">查看全部 →</router-link>
        </div>
        <p v-if="sectionStates.campus === 'loading'" class="empty state-message">正在同步校园热榜...</p>
        <p v-else-if="sectionStates.campus === 'error'" class="empty state-message is-error">校园热榜暂时不可用。</p>
        <p v-else-if="sectionStates.campus === 'unavailable'" class="empty state-message">登录后即可查看校园热榜。</p>
        <div v-else-if="campusHighlights.length > 0" class="campus-list">
          <div v-for="(post, idx) in campusHighlights.slice(0, 3)" :key="post.id" class="campus-hot-item">
            <span class="hot-rank">{{ idx + 1 }}</span>
            <div class="hot-info"><strong>{{ post.preview.slice(0, 22) }}</strong><span>{{ post.heat }}</span></div>
          </div>
        </div>
        <p v-else class="empty">暂无热榜数据</p>
      </div>
    </section>

    <section class="shortcuts">
      <h2>探索更多</h2>
      <div class="shortcut-grid">
        <router-link v-for="feature in coreFeatures" :key="feature.title" :to="feature.to" class="shortcut-card">
          <div class="shortcut-icon" :style="{ background: feature.bg }" v-html="feature.svg"></div>
          <div>
            <strong>{{ feature.title }}</strong>
            <span>{{ feature.desc }}</span>
          </div>
          <span class="shortcut-arrow">→</span>
        </router-link>
      </div>
    </section>

    <!-- 底部栏 — 版权/帮助/链接 -->
    <footer class="home-footer">
      <div class="footer-links">
        <router-link to="/app/settings/about">关于我们</router-link>
        <span>·</span>
        <router-link to="/app/feedback">帮助与反馈</router-link>
        <span>·</span>
        <router-link to="/terms">服务条款</router-link>
        <span>·</span>
        <router-link to="/privacy-policy">隐私政策</router-link>
      </div>
      <p class="footer-copy">© 2026 Spark Alliance 星火联盟 · 让每一个火花都能汇聚成照亮前路的星辰</p>
    </footer>

    <!-- 星芒快捷中心 -->
    <button ref="quickCenterTrigger" class="spark-fab" :class="{ active: showQuickCenter }" type="button" @click="toggleQuickCenter" aria-label="星芒快捷中心" :aria-expanded="showQuickCenter" aria-controls="dashboard-quick-center">
      <svg viewBox="0 0 24 24" class="fab-star"><path d="M12 2l2.09 6.26L20.18 9l-4.64 4.14L16.73 20 12 16.77 7.27 20l1.19-6.86L3.82 9l6.09-.74z" fill="currentColor"/></svg>
    </button>
    <Transition name="qc">
      <div v-if="showQuickCenter" class="quick-center">
        <div id="dashboard-quick-center" ref="quickCenterPanel" class="qc-panel" role="dialog" aria-modal="false" aria-label="星芒快捷中心" tabindex="-1">
          <div class="qc-brand qc-stagger" style="--stagger: 0">
            <div>
              <h2>星芒快捷中心</h2>
              <p>常用操作、提醒与灵感入口</p>
            </div>
            <button class="qc-close" type="button" @click="closeQuickCenter" aria-label="关闭">✕</button>
          </div>
          <div class="qc-welcome qc-stagger" style="--stagger: 1">
            <div class="qc-avatar">
              <img v-if="isVisualFixture" src="/dashboard/avatar.png" alt="" />
              <img v-else-if="user?.user_metadata?.avatar_url" :src="user.user_metadata.avatar_url" alt="" />
              <span v-else>{{ userInitial }}</span>
            </div>
            <div><strong>{{ greeting }}，继续点亮你的校园轨迹</strong></div>
            <span class="qc-welcome-spark" aria-hidden="true">✦</span>
          </div>
          <div class="qc-section qc-stagger" style="--stagger: 2">
            <h4>快速动作</h4>
            <div class="qc-actions">
              <router-link v-for="action in quickActions" :key="action.label" :to="action.to" class="qc-act" @click="showQuickCenter = false">
                <span class="qc-act-icon" :class="`tone-${action.tone}`" v-html="action.icon"></span><span>{{ action.label }}</span>
              </router-link>
            </div>
          </div>
          <div class="qc-section qc-stagger" style="--stagger: 3">
            <h4>今日提醒</h4>
            <div class="qc-reminders">
              <div v-for="reminder in quickReminders" :key="reminder.label" class="qc-remind">
                <span class="qc-remind-icon" :class="`tone-${reminder.tone}`" v-html="reminder.icon"></span>
                <span class="qc-remind-copy"><strong>{{ reminder.label }}</strong><small>{{ reminder.detail }}</small></span>
              </div>
            </div>
          </div>
          <div class="qc-section qc-stagger" style="--stagger: 4">
            <h4>最近访问</h4>
            <div class="qc-recent">
              <router-link v-for="item in quickRecent" :key="item.label" :to="item.to" class="qc-recent-item" @click="showQuickCenter = false">
                <span class="qc-grid-icon" :class="`tone-${item.tone}`" v-html="item.icon"></span><span>{{ item.label }}</span>
              </router-link>
            </div>
          </div>
          <div class="qc-section qc-stagger" style="--stagger: 5">
            <h4>灵感与反馈</h4>
            <div class="qc-feedback">
              <button class="qc-feedback-item" type="button" @click="refreshQuote"><span class="qc-grid-icon tone-gold" v-html="dashboardIconMarkup.spark"></span><span>今日灵感</span></button>
              <router-link to="/app/feedback" class="qc-feedback-item" @click="showQuickCenter = false"><span class="qc-grid-icon tone-purple" v-html="dashboardIconMarkup.message"></span><span>提建议</span></router-link>
              <router-link to="/app/settings/appearance" class="qc-feedback-item" @click="showQuickCenter = false"><span class="qc-grid-icon tone-blue" v-html="dashboardIconMarkup.theme"></span><span>切换主题</span></router-link>
              <button class="qc-feedback-item" type="button" @click="scrollToTop"><span class="qc-grid-icon tone-cyan" v-html="dashboardIconMarkup.arrowUp"></span><span>返回顶部</span></button>
            </div>
          </div>
          <p class="qc-footer qc-stagger" style="--stagger: 6">星芒快捷中心 是 SparkAlliance 的全局悬浮入口，<br />帮助你快速访问高频功能。</p>
        </div>
      </div>
    </Transition>

    <Transition name="fade">
      <div v-if="toastMessage" class="toast">{{ toastMessage }}</div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuth } from '../../composables/useAuth'
import { usePlanner } from '../../composables/usePlanner'
import { supabase } from '../../supabase'
import {
  ACTIVE_GOAL_STATUSES,
  buildDashboardActions,
  buildDashboardStats,
  categorizeWeeklyTasks,
  createCoreFeatures,
  getLocalWeekDateRange,
  resolveScheduleStatus,
  summarizeWeeklyProgress,
  type DashboardDataState,
  type DashboardSnapshot,
  type ScheduleStatus,
} from '../../utils/appHomeDashboard'
import { buildCampusHotHighlights, type CampusHotHighlight } from '../../utils/campusWall'

interface PlannerPreview {
  id: string
  title: string
  meta: string
  isOverdue: boolean
  progress: number | null
  remainingDays: number | null
}

interface PlannerTaskRow {
  id: string
  title: string
  due_date: string | null
  goals?: { title?: string | null } | Array<{ title?: string | null }> | null
}

interface SchedulePreview {
  id: string
  title: string
  time: string
  kind: 'normal' | 'urgent'
  status: ScheduleStatus
}

interface ScheduleEventRow {
  id: string
  title: string
  start_time: string
  end_time?: string | null
  priority?: number | null
}

interface ShopConversationRow {
  buyer_id: string
  seller_id: string
  buyer_unread: number | null
  seller_unread: number | null
}

interface CampusPostRow {
  id: string
  content: string
  author_id: string | null
  author_name: string | null
  anonymous_seed: string | null
  is_anonymous: boolean | null
  created_at: string
  likes?: Array<{ count: number }>
  comments?: Array<{ count: number }>
}

interface StudyFocusRow {
  total_focus_minutes: number | null
}

interface DashboardSectionStates {
  planner: DashboardDataState
  schedule: DashboardDataState
  weekly: DashboardDataState
  shop: DashboardDataState
  campus: DashboardDataState
}

const icon = (body: string) => `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`

const dashboardIconMarkup = {
  spark: icon('<path d="m12 2 1.7 6.3L20 10l-6.3 1.7L12 18l-1.7-6.3L4 10l6.3-1.7L12 2Z"/><path d="m18 16 .7 2.3L21 19l-2.3.7L18 22l-.7-2.3L15 19l2.3-.7L18 16Z"/>'),
  alert: icon('<path d="M12 3 3.8 18h16.4L12 3Z"/><path d="M12 9v4"/><path d="M12 16h.01"/>'),
  target: icon('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="m14 10 5-5"/><path d="M16 5h3v3"/>'),
  shop: icon('<path d="M5 8h14l-1 12H6L5 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/>'),
  package: icon('<path d="m4 7 8-4 8 4-8 4-8-4Z"/><path d="M4 7v10l8 4 8-4V7"/><path d="M12 11v10"/>'),
  message: icon('<path d="M4 5h16v11H9l-5 4V5Z"/><path d="M8 9h8M8 12h5"/>'),
  calendar: icon('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/>'),
  edit: icon('<path d="M4 20h4l11-11-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/>'),
  tag: icon('<path d="M20 13 13 20 4 11V4h7l9 9Z"/><circle cx="8.5" cy="8.5" r="1"/>'),
  book: icon('<path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H12v18H7.5A3.5 3.5 0 0 0 4 23V5.5Z"/><path d="M20 5.5A3.5 3.5 0 0 0 16.5 2H12v18h4.5A3.5 3.5 0 0 1 20 23V5.5Z"/>'),
  health: icon('<path d="M20.8 8.5c0 5-8.8 10-8.8 10s-8.8-5-8.8-10A4.5 4.5 0 0 1 12 6a4.5 4.5 0 0 1 8.8 2.5Z"/><path d="m8 12 2-2 2 3 2-3 2 2"/>'),
  theme: icon('<path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8 8 0 1 0 20 15.5Z"/>'),
  arrowUp: icon('<path d="m6 10 6-6 6 6"/><path d="M12 4v16"/>'),
}

const actionIconMarkup: Record<'high' | 'medium' | 'low', string> = {
  high: dashboardIconMarkup.alert,
  medium: dashboardIconMarkup.target,
  low: dashboardIconMarkup.spark,
}

const quickActions = [
  { label: 'AI 对话', to: '/app/chat', tone: 'blue', icon: dashboardIconMarkup.message },
  { label: '添加日程', to: '/app/schedule', tone: 'green', icon: dashboardIconMarkup.calendar },
  { label: '开始专注', to: '/app/study-room', tone: 'purple', icon: dashboardIconMarkup.target },
  { label: '发动态', to: '/app/wall', tone: 'pink', icon: dashboardIconMarkup.edit },
  { label: '发布商品', to: '/app/shop', tone: 'orange', icon: dashboardIconMarkup.tag },
  { label: '进入自习室', to: '/app/study-room', tone: 'cyan', icon: dashboardIconMarkup.book },
]

const quickRecent = [
  { label: 'AI 助手', to: '/app/chat', tone: 'blue', icon: dashboardIconMarkup.message },
  { label: '学习资源', to: '/app/resources', tone: 'purple', icon: dashboardIconMarkup.book },
  { label: '星火墙', to: '/app/wall', tone: 'pink', icon: dashboardIconMarkup.spark },
  { label: '健康打卡', to: '/app/health', tone: 'green', icon: dashboardIconMarkup.health },
]

const props = withDefaults(defineProps<{ visualFixture?: boolean }>(), {
  visualFixture: false,
})
const route = useRoute()
const isVisualFixture = computed(() => import.meta.env.DEV && props.visualFixture)
const fixtureNow = new Date('2026-04-26T08:30:00.000Z')

const { user } = useAuth()
const { createQuickTask } = usePlanner()

const emptySnapshot: DashboardSnapshot = {
  overdueTasks: 0,
  todayTasks: 0,
  activeGoals: 0,
  todayEvents: 0,
  streakDays: 0,
  weeklyCompletedTasks: 0,
  weeklyInProgressTasks: 0,
  weeklyNotStartedTasks: 0,
  weeklyTotalTasks: 0,
  weeklyFocusMinutes: null,
  activeListings: 0,
  pendingTransactions: 0,
  unreadShopMessages: 0,
  quickNoteLength: 0,
  metricStates: {
    todayTasks: 'loading',
    activeGoals: 'loading',
    activeListings: 'loading',
    pendingTransactions: 'loading',
    weeklyFocusMinutes: 'loading',
    streakDays: 'loading',
  },
}

const dashboardSnapshot = ref<DashboardSnapshot>({ ...emptySnapshot })
const todayPlannerTasks = ref<PlannerPreview[]>([])
const todaySchedule = ref<SchedulePreview[]>([])
const campusHighlights = ref<CampusHotHighlight[]>([])
const shopSignals = ref<string[]>(['主控台会自动同步你的交易、规划和日程状态。'])
const quickNote = ref(isVisualFixture.value ? '整理明天的高数复习提纲' : (localStorage.getItem('spark_quick_note') || ''))
const noteSaved = ref(false)
const convertingNote = ref(false)
const toastMessage = ref('')
const showQuickCenter = ref(false)
const isRefreshing = ref(false)
const statsVisible = ref(false)
const progressVisible = ref(false)
const plannerVisible = ref(false)
const quoteTransition = ref(false)
const aiTipBatch = ref(0)
const coreFeatures = createCoreFeatures()
const sectionStates = ref<DashboardSectionStates>({
  planner: 'loading',
  schedule: 'loading',
  weekly: 'loading',
  shop: 'loading',
  campus: 'loading',
})

const statsObserverTarget = ref<HTMLElement | null>(null)
const progressObserverTarget = ref<HTMLElement | null>(null)
const plannerObserverTarget = ref<HTMLElement | null>(null)
const quickCenterPanel = ref<HTMLElement | null>(null)
const quickCenterTrigger = ref<HTMLButtonElement | null>(null)

let statsObserver: IntersectionObserver | null = null
let progressObserver: IntersectionObserver | null = null
let plannerObserver: IntersectionObserver | null = null

function getDashboardNow() {
  return isVisualFixture.value ? new Date(fixtureNow) : new Date()
}

function closeQuickCenter() {
  showQuickCenter.value = false
}

function toggleQuickCenter() {
  showQuickCenter.value = !showQuickCenter.value
}

function handleQuickCenterKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && showQuickCenter.value) closeQuickCenter()
}

function handleQuickCenterPointerDown(event: PointerEvent) {
  if (!showQuickCenter.value) return
  const target = event.target as Node
  if (quickCenterPanel.value?.contains(target) || quickCenterTrigger.value?.contains(target)) return
  closeQuickCenter()
}

watch(showQuickCenter, async (isOpen) => {
  await nextTick()
  if (isOpen) quickCenterPanel.value?.focus()
  else quickCenterTrigger.value?.focus()
})

function animateCountUp(el: HTMLElement, target: number, duration = 500) {
  const startTime = performance.now()
  const startVal = 0
  const isFloat = !Number.isInteger(target)

  function tick(now: number) {
    const elapsed = now - startTime
    const progress = Math.min(elapsed / duration, 1)
    const eased = 1 - Math.pow(1 - progress, 3)
    const current = startVal + (target - startVal) * eased
    el.textContent = isFloat ? current.toFixed(1) : String(Math.round(current))
    if (progress < 1) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

function runCountUpOnStats() {
  nextTick(() => {
    const chips = document.querySelectorAll(".stat-chip .stat-value")
    chips.forEach((el) => {
      const raw = el.getAttribute("data-target") || "0"
      const num = parseFloat(raw)
      if (!isNaN(num)) animateCountUp(el as HTMLElement, num, 600)
    })
  })
}

onMounted(() => {
  const observerOpts: IntersectionObserverInit = { threshold: 0.2 }

  statsObserver = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && !statsVisible.value) {
      statsVisible.value = true
      runCountUpOnStats()
    }
  }, observerOpts)

  progressObserver = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) progressVisible.value = true
  }, observerOpts)

  plannerObserver = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) plannerVisible.value = true
  }, observerOpts)

  if (statsObserverTarget.value) statsObserver.observe(statsObserverTarget.value)
  if (progressObserverTarget.value) progressObserver.observe(progressObserverTarget.value)
  if (plannerObserverTarget.value) plannerObserver.observe(plannerObserverTarget.value)
  document.addEventListener('keydown', handleQuickCenterKeydown)
  document.addEventListener('pointerdown', handleQuickCenterPointerDown)
  if (isVisualFixture.value && route.query.quickCenter === '1') showQuickCenter.value = true
})

onUnmounted(() => {
  statsObserver?.disconnect()
  progressObserver?.disconnect()
  plannerObserver?.disconnect()
  document.removeEventListener('keydown', handleQuickCenterKeydown)
  document.removeEventListener('pointerdown', handleQuickCenterPointerDown)
})

const greeting = computed(() => {
  const hour = getDashboardNow().getHours()
  if (hour < 6) return '夜深了'
  if (hour < 12) return '早上好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  return '晚上好'
})

const userName = computed(() => {
  if (isVisualFixture.value) return '星火同学'
  if (user.value?.user_metadata?.nickname) return user.value.user_metadata.nickname
  if (user.value?.email) return user.value.email.split('@')[0]
  return '同学'
})
const userInitial = computed(() => userName.value.trim().slice(0, 1).toUpperCase() || '星')

const currentDate = computed(() => {
  const now = getDashboardNow()
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  return `${now.getMonth() + 1}月${now.getDate()}日 ${weekdays[now.getDay()]}`
})

const dashboardActions = computed(() =>
  buildDashboardActions({ ...dashboardSnapshot.value, quickNoteLength: quickNote.value.trim().length }),
)
const miniStats = computed(() => buildDashboardStats(dashboardSnapshot.value))
const weeklyProgress = computed(() =>
  summarizeWeeklyProgress(dashboardSnapshot.value.weeklyCompletedTasks, dashboardSnapshot.value.weeklyTotalTasks),
)
const ringOffset = computed(() => {
  const circumference = 2 * Math.PI * 50
  return circumference - (weeklyProgress.value.percent / 100) * circumference
})
const heroPills = computed(() => {
  const s = dashboardSnapshot.value
  const campusHeat = sectionStates.value.campus === 'error'
    ? '同步失败'
    : sectionStates.value.campus === 'unavailable'
      ? '登录可见'
      : campusHighlights.value[0]?.heat || '暂无数据'
  return [
    {
      label: s.weeklyFocusMinutes == null ? '本周专注 暂无数据' : '本周专注 ' + (s.weeklyFocusMinutes / 60).toFixed(1) + 'h',
      trend: s.weeklyFocusMinutes == null ? 'stable' : 'up',
    },
    { label: `连续高效 ${s.streakDays} 天`, trend: s.streakDays >= 3 ? 'up' : 'stable' },
    { label: `校园热榜 ${campusHeat}`, trend: campusHighlights.value.length > 0 ? 'hot' : 'stable' },
  ]
})

const quickReminders = computed(() => {
  const nextEvent = todaySchedule.value.find(event => event.status === 'active' || event.status === 'upcoming')
  const plannerReady = sectionStates.value.planner === 'real' || sectionStates.value.planner === 'fixture'
  const shopReady = sectionStates.value.shop === 'real' || sectionStates.value.shop === 'fixture'
  const scheduleReady = sectionStates.value.schedule === 'real' || sectionStates.value.schedule === 'fixture'
  return [
    {
      label: plannerReady ? `待办 ${dashboardSnapshot.value.todayTasks} 项` : '待办同步不可用',
      detail: plannerReady ? `${dashboardSnapshot.value.weeklyCompletedTasks} 项已在本周完成` : '刷新后重试',
      tone: 'purple',
      icon: dashboardIconMarkup.target,
    },
    {
      label: shopReady ? `未读互动 ${dashboardSnapshot.value.unreadShopMessages} 条` : '互动同步不可用',
      detail: shopReady ? `${dashboardSnapshot.value.pendingTransactions} 笔交易待推进` : '刷新后重试',
      tone: 'blue',
      icon: dashboardIconMarkup.message,
    },
    {
      label: scheduleReady && nextEvent ? nextEvent.title : scheduleReady ? '暂无临近日程' : '日程同步不可用',
      detail: scheduleReady && nextEvent ? nextEvent.time : scheduleReady ? '今天节奏从容' : '刷新后重试',
      tone: 'green',
      icon: dashboardIconMarkup.calendar,
    },
    {
      label: plannerReady ? `逾期事项 ${dashboardSnapshot.value.overdueTasks} 项` : '逾期状态不可用',
      detail: plannerReady && dashboardSnapshot.value.overdueTasks > 0 ? '建议优先完成闭环' : plannerReady ? '当前没有积压' : '刷新后重试',
      tone: dashboardSnapshot.value.overdueTasks > 0 ? 'orange' : 'cyan',
      icon: dashboardIconMarkup.alert,
    },
  ]
})

const aiInsight = computed(() => {
  const s = dashboardSnapshot.value
  if (s.overdueTasks > 0) return `你有 ${s.overdueTasks} 个任务已逾期，优先清理能直接提升执行闭环。`
  if (s.todayTasks > 3) return `今日待办较多（${s.todayTasks}项），建议先完成最重要的2件事。`
  if (s.streakDays >= 7) return `连续执行${s.streakDays}天，你的节奏很棒，继续保持高效节奏！`
  if (s.weeklyCompletedTasks > 0) return `本周已完成${s.weeklyCompletedTasks}项任务，${s.weeklyTotalTasks > 0 ? '当前完成率 ' + Math.round((s.weeklyCompletedTasks / s.weeklyTotalTasks) * 100) + '%' : '继续加油'}。`
  return '主控台已同步最新状态，开始今天的高效旅程吧。'
})

const quotes = [
  { text: '学而不思则罔，思而不学则殆。', author: '孔子', tag: '专注' },
  { text: '路漫漫其修远兮，吾将上下而求索。', author: '屈原', tag: '行动' },
  { text: 'Stay hungry, stay foolish.', author: 'Steve Jobs', tag: '创造' },
  { text: 'Talk is cheap. Show me the code.', author: 'Linus Torvalds', tag: '执行' },
  { text: '纸上得来终觉浅，绝知此事要躬行。', author: '陆游', tag: '实践' },
]
const quoteIndex = ref(isVisualFixture.value ? 0 : Math.floor(Math.random() * quotes.length))
const currentQuote = computed(() => quotes[quoteIndex.value])

const userLevel = computed(() => Math.floor(dashboardSnapshot.value.streakDays * 1.5 + dashboardSnapshot.value.weeklyCompletedTasks * 10) > 0 ? Math.min(99, Math.floor((dashboardSnapshot.value.streakDays * 15 + dashboardSnapshot.value.weeklyCompletedTasks * 50) / 100)) + 1 : 1)
const userXP = computed(() => (dashboardSnapshot.value.streakDays * 15 + dashboardSnapshot.value.weeklyCompletedTasks * 50) % 2000)
const nextLevelXP = 2000
const xpPercent = computed(() => Math.min(100, Math.round((userXP.value / nextLevelXP) * 100)))
const achievementBadges = computed(() => [
  {
    label: '高效达人',
    src: '/dashboard/badge-efficient.png',
    earned: (sectionStates.value.weekly === 'real' || sectionStates.value.weekly === 'fixture') && dashboardSnapshot.value.weeklyCompletedTasks >= 5,
    hint: `本周完成 ${dashboardSnapshot.value.weeklyCompletedTasks} 项任务`,
  },
  {
    label: '专注之星',
    src: '/dashboard/badge-focus.png',
    earned: (dashboardSnapshot.value.metricStates.weeklyFocusMinutes === 'real' || dashboardSnapshot.value.metricStates.weeklyFocusMinutes === 'fixture') && (dashboardSnapshot.value.weeklyFocusMinutes || 0) >= 600,
    hint: dashboardSnapshot.value.weeklyFocusMinutes == null ? '完成专注后解锁' : `本周专注 ${Math.round(dashboardSnapshot.value.weeklyFocusMinutes / 60)} 小时`,
  },
  {
    label: '学习先锋',
    src: '/dashboard/badge-learn.png',
    earned: (dashboardSnapshot.value.metricStates.activeGoals === 'real' || dashboardSnapshot.value.metricStates.activeGoals === 'fixture') && dashboardSnapshot.value.activeGoals > 0,
    hint: `${dashboardSnapshot.value.activeGoals} 个活跃目标`,
  },
  {
    label: '交流之星',
    src: '/dashboard/badge-social.png',
    earned: (sectionStates.value.campus === 'real' || sectionStates.value.campus === 'fixture') && campusHighlights.value.length > 0,
    hint: campusHighlights.value.length > 0 ? '校园热榜已同步' : '参与校园互动后解锁',
  },
])

const statSubInfo = computed(() => {
  const s = dashboardSnapshot.value
  const stats = miniStats.value
  return [
    stats[0]?.state === 'real' || stats[0]?.state === 'fixture' ? '待完成 ' + s.todayTasks + ' 项' : stats[0]?.sub,
    stats[1]?.state === 'real' || stats[1]?.state === 'fixture' ? '进行中 ' + s.activeGoals + ' 个' : stats[1]?.sub,
    stats[2]?.state === 'real' || stats[2]?.state === 'fixture' ? '当前在售 ' + s.activeListings + ' 件' : stats[2]?.sub,
    stats[3]?.state === 'real' || stats[3]?.state === 'fixture' ? '待回复 ' + s.unreadShopMessages + ' 条' : stats[3]?.sub,
    stats[4]?.state === 'real' || stats[4]?.state === 'fixture' ? '本周累计 ' + stats[4]?.value + 'h' : stats[4]?.sub,
    stats[5]?.state === 'real' || stats[5]?.state === 'fixture' ? '再接再厉！' : stats[5]?.sub,
  ]
})

const aiTipSets = computed(() => {
  if ([sectionStates.value.planner, sectionStates.value.schedule, sectionStates.value.weekly].includes('error')) {
    return [[
      '部分主控台数据暂时未能同步，建议稍后刷新。',
      '你仍可直接进入日程或规划页继续处理现有任务。',
      '数据恢复后，AI 会重新生成基于真实状态的建议。',
    ]]
  }
  return [[
    todaySchedule.value[0] ? '下一项日程是“' + todaySchedule.value[0].title + '”，建议提前准备。' : '今天没有日程冲突，可以安排一段完整专注时间。',
    dashboardSnapshot.value.overdueTasks > 0 ? '有 ' + dashboardSnapshot.value.overdueTasks + ' 个任务已逾期，建议优先处理。' : '当前没有逾期任务，执行节奏稳定。',
    dashboardSnapshot.value.weeklyFocusMinutes == null ? '完成一次专注后，这里会生成本周节奏建议。' : '本周已专注 ' + (dashboardSnapshot.value.weeklyFocusMinutes / 60).toFixed(1) + ' 小时。',
  ],
  [
    dashboardSnapshot.value.todayTasks > 0 ? '先完成最重要的 1 项，再处理其余 ' + Math.max(0, dashboardSnapshot.value.todayTasks - 1) + ' 项待办。' : '今天的待办已清空，可以规划下一阶段目标。',
    dashboardSnapshot.value.pendingTransactions > 0 ? '购物模块有 ' + dashboardSnapshot.value.pendingTransactions + ' 笔交易待推进。' : '购物模块暂无待推进交易。',
    dashboardSnapshot.value.activeGoals > 0 ? '从 ' + dashboardSnapshot.value.activeGoals + ' 个活跃目标中选择一个继续推进。' : '创建一个可在本周完成的小目标。',
  ]]
})
const aiTips = computed(() => aiTipSets.value[aiTipBatch.value % aiTipSets.value.length] || [])

let noteTimer: ReturnType<typeof setTimeout> | null = null
let toastTimer: ReturnType<typeof setTimeout> | null = null

function refreshQuote() {
  quoteTransition.value = true
  setTimeout(() => {
    quoteIndex.value = (quoteIndex.value + Math.floor(Math.random() * (quotes.length - 1)) + 1) % quotes.length
    quoteTransition.value = false
  }, 200)
}

function refreshAiTips() {
  aiTipBatch.value = (aiTipBatch.value + 1) % aiTipSets.value.length
}

function scrollToTop() {
  const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
  document.querySelector<HTMLElement>('.main-content')?.scrollTo({ top: 0, behavior })
  window.scrollTo({ top: 0, behavior })
  closeQuickCenter()
}

function saveNote() {
  if (!isVisualFixture.value) localStorage.setItem('spark_quick_note', quickNote.value)
  noteSaved.value = true
  if (noteTimer) clearTimeout(noteTimer)
  noteTimer = setTimeout(() => {
    noteSaved.value = false
  }, 1800)
}

function clearNote() {
  quickNote.value = ''
  if (!isVisualFixture.value) localStorage.removeItem('spark_quick_note')
  noteSaved.value = false
}

function showToast(message: string) {
  toastMessage.value = message
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toastMessage.value = ''
  }, 2400)
}

async function convertNoteToTask() {
  const content = quickNote.value.trim()
  if (!content || convertingNote.value) return
  if (isVisualFixture.value) {
    showToast('视觉演示不会写入任务数据。')
    return
  }

  convertingNote.value = true
  const task = await createQuickTask(content.slice(0, 100))
  convertingNote.value = false

  if (!task) {
    showToast('笔记转任务失败，请稍后重试。')
    return
  }

  clearNote()
  showToast('已把快速笔记加入今日任务。')
  await loadDashboard()
}

function getLocalDate() {
  const date = getDashboardNow()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function getTodayRange() {
  const start = getDashboardNow()
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  return { start: start.toISOString(), end: end.toISOString() }
}

function extractGoalTitle(goal: PlannerTaskRow['goals']) {
  if (Array.isArray(goal)) return goal[0]?.title || ''
  return goal?.title || ''
}

function formatScheduleTime(startTime: string, endTime?: string | null) {
  const start = new Date(startTime)
  const startLabel = start.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
  if (!endTime) return `${startLabel} 开始`
  const end = new Date(endTime)
  const endLabel = end.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
  return `${startLabel} - ${endLabel}`
}

function buildShopSignals(activeListings: number, pendingTransactions: number, unreadMessages: number) {
  const signals: string[] = []
  if (pendingTransactions > 0) signals.push(`你有 ${pendingTransactions} 笔交易需要确认节奏。`)
  if (unreadMessages > 0) signals.push(`购物模块里还有 ${unreadMessages} 条未读消息。`)
  if (activeListings === 0) signals.push('还没有在售商品，发布第一件闲置会显著提升购物模块活跃度。')
  if (signals.length === 0) signals.push('购物模块状态稳定，可以补一件新商品扩大曝光。')
  return signals
}

function getRemainingDays(dueDate: string | null, now = getDashboardNow()) {
  if (!dueDate) return null
  const due = new Date(dueDate + 'T00:00:00')
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  return Math.ceil((due.getTime() - today.getTime()) / 86400000)
}

function loadVisualFixture() {
  dashboardSnapshot.value = {
    overdueTasks: 1,
    todayTasks: 8,
    activeGoals: 3,
    todayEvents: 4,
    streakDays: 7,
    weeklyCompletedTasks: 7,
    weeklyInProgressTasks: 1,
    weeklyNotStartedTasks: 1,
    weeklyTotalTasks: 9,
    weeklyFocusMinutes: 744,
    activeListings: 12,
    pendingTransactions: 5,
    unreadShopMessages: 3,
    quickNoteLength: quickNote.value.trim().length,
    metricStates: {
      todayTasks: 'fixture',
      activeGoals: 'fixture',
      activeListings: 'fixture',
      pendingTransactions: 'fixture',
      weeklyFocusMinutes: 'fixture',
      streakDays: 'fixture',
    },
  }
  todayPlannerTasks.value = [
    { id: 'fixture-plan-1', title: '完成高数专题复习', meta: '期末冲刺 · 今天到期', isOverdue: false, progress: 72, remainingDays: 0 },
    { id: 'fixture-plan-2', title: '推进共创项目原型', meta: '校园共创 · 剩余 3 天', isOverdue: false, progress: 48, remainingDays: 3 },
    { id: 'fixture-plan-3', title: '整理英语演讲材料', meta: '能力成长 · 已逾期', isOverdue: true, progress: 30, remainingDays: -1 },
  ]
  todaySchedule.value = [
    { id: 'fixture-event-1', title: '高等数学复习', time: '16:00 - 17:30', kind: 'urgent', status: 'active' },
    { id: 'fixture-event-2', title: '共创项目同步会', time: '17:50 - 18:30', kind: 'normal', status: 'upcoming' },
    { id: 'fixture-event-3', title: '校园夜跑', time: '20:00 - 20:40', kind: 'normal', status: 'pending' },
  ]
  campusHighlights.value = [
    { id: 'fixture-hot-1', author: '校园热点', preview: '图书馆延长开放时间', heat: '8.9k 热度', score: 8900, to: '/app/wall' },
    { id: 'fixture-hot-2', author: '校园热点', preview: '春季社团招新指南', heat: '6.4k 热度', score: 6400, to: '/app/wall' },
    { id: 'fixture-hot-3', author: '校园热点', preview: '毕业季跳蚤市场', heat: '5.2k 热度', score: 5200, to: '/app/wall' },
  ]
  shopSignals.value = ['5 笔交易等待确认，3 条商品消息尚未回复。', '12 件商品正在校园市场展示。']
  sectionStates.value = {
    planner: 'fixture',
    schedule: 'fixture',
    weekly: 'fixture',
    shop: 'fixture',
    campus: 'fixture',
  }
}

async function loadDashboard() {
  isRefreshing.value = true
  setTimeout(() => { isRefreshing.value = false }, 1000)
  if (isVisualFixture.value) {
    loadVisualFixture()
    isRefreshing.value = false
    return
  }
  if (!user.value) {
    dashboardSnapshot.value = {
      ...emptySnapshot,
      quickNoteLength: quickNote.value.trim().length,
      metricStates: {
        todayTasks: 'unavailable',
        activeGoals: 'unavailable',
        activeListings: 'unavailable',
        pendingTransactions: 'unavailable',
        weeklyFocusMinutes: 'unavailable',
        streakDays: 'unavailable',
      },
    }
    todayPlannerTasks.value = []
    todaySchedule.value = []
    campusHighlights.value = []
    shopSignals.value = ['登录后即可同步你的规划、交易和校园动态。']
    sectionStates.value = {
      planner: 'unavailable',
      schedule: 'unavailable',
      weekly: 'unavailable',
      shop: 'unavailable',
      campus: 'unavailable',
    }
    return
  }

  const userId = user.value.id
  const today = getLocalDate()
  const weekRange = getLocalWeekDateRange(getDashboardNow())
  const todayRange = getTodayRange()

  try {
    // 独立容错：每个查询失败不影响其他查询
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async function safeQuery<T>(queryFn: () => PromiseLike<{ data: any; error: any; count?: number | null }>, fallback: T) {
      try {
        const result = await queryFn()
        if (result.error) {
          console.warn('[Dashboard] 查询降级:', result.error.message)
          return { data: fallback as T, count: 0, state: 'error' as DashboardDataState }
        }
        return { data: (result.data ?? fallback) as T, count: result.count ?? 0, state: 'real' as DashboardDataState }
      } catch (e) {
        console.warn('[Dashboard] 查询跳过:', e)
        return { data: fallback as T, count: 0, state: 'error' as DashboardDataState }
      }
    }

    const [
      plannerTasksResult,
      goalsCountResult,
      weekTasksResult,
      streakResult,
      scheduleResult,
      activeProductsResult,
      transactionResult,
      conversationsResult,
      weeklyFocusResult,
      hotPostsResult,
    ] = await Promise.all([
      safeQuery(() => supabase
        .from('planner_tasks')
        .select('id, title, due_date, goals(title)')
        .eq('user_id', userId)
        .in('status', ['pending', 'in_progress'])
        .lte('due_date', today)
        .order('due_date', { ascending: true })
        .limit(6), [] as PlannerTaskRow[]),
      safeQuery(() => supabase.from('goals').select('id', { count: 'exact', head: true }).eq('user_id', userId).in('status', [...ACTIVE_GOAL_STATUSES]), null),
      safeQuery(() => supabase
        .from('planner_tasks')
        .select('is_completed, status')
        .eq('user_id', userId)
        .gte('due_date', weekRange.start)
        .lte('due_date', weekRange.end)
        .in('status', ['pending', 'in_progress', 'completed']), [] as Array<{ is_completed?: boolean | null; status?: string | null }>),
      safeQuery(() => supabase.from('user_stats').select('current_daily_streak').eq('user_id', userId).maybeSingle(), null),
      safeQuery(() => supabase
        .from('schedule_events')
        .select('id, title, start_time, end_time, priority')
        .eq('user_id', userId)
        .eq('status', 'active')
        .lt('start_time', todayRange.end)
        .or(`end_time.is.null,end_time.gte.${todayRange.start}`)
        .order('start_time', { ascending: true })
        .limit(6), [] as ScheduleEventRow[]),
      safeQuery(() => supabase.from('shop_products').select('id', { count: 'exact', head: true }).eq('seller_id', userId).eq('status', 'active'), null),
      safeQuery(() => supabase
        .from('shop_transactions')
        .select('id, status')
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
        .in('status', ['pending', 'accepted', 'meeting']), []),
      safeQuery(() => supabase
        .from('shop_conversations')
        .select('buyer_id, seller_id, buyer_unread, seller_unread')
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`), [] as ShopConversationRow[]),
      safeQuery(() => supabase
        .from('study_daily_stats')
        .select('total_focus_minutes')
        .eq('user_id', userId)
        .gte('stat_date', weekRange.start)
        .lte('stat_date', today), [] as StudyFocusRow[]),
      safeQuery(() => supabase
        .from('posts')
        .select('id, content, author_id, author_name, anonymous_seed, is_anonymous, created_at, likes(count), comments(count)')
        .order('created_at', { ascending: false })
        .limit(24), [] as CampusPostRow[]),
    ])

    const plannerTasks = (plannerTasksResult.data || []) as PlannerTaskRow[]
    const overdueTasks = plannerTasks.filter(task => task.due_date && task.due_date < today).length
    const weeklyTasks = (weekTasksResult.data || []) as Array<{ is_completed?: boolean | null; status?: string | null }>
    const weeklyCategories = categorizeWeeklyTasks(weeklyTasks)
    const weeklyFocusMinutes = ((weeklyFocusResult.data || []) as StudyFocusRow[]).reduce(
      (sum, row) => sum + (row.total_focus_minutes || 0),
      0,
    )
    const pendingTransactions = (transactionResult.data || []).length
    const unreadMessages = ((conversationsResult.data || []) as ShopConversationRow[]).reduce((sum, conversation) => {
      if (conversation.buyer_id === userId) return sum + (conversation.buyer_unread || 0)
      if (conversation.seller_id === userId) return sum + (conversation.seller_unread || 0)
      return sum
    }, 0)
    const activeListings = activeProductsResult.count || 0

    dashboardSnapshot.value = {
      overdueTasks,
      todayTasks: plannerTasks.length,
      activeGoals: goalsCountResult.count || 0,
      todayEvents: (scheduleResult.data || []).length,
      streakDays: (streakResult.data as any)?.current_daily_streak || 0,
      weeklyCompletedTasks: weeklyCategories.completed,
      weeklyInProgressTasks: weeklyCategories.inProgress,
      weeklyNotStartedTasks: weeklyCategories.notStarted,
      weeklyTotalTasks: weeklyCategories.total,
      weeklyFocusMinutes,
      activeListings,
      pendingTransactions,
      unreadShopMessages: unreadMessages,
      quickNoteLength: quickNote.value.trim().length,
      metricStates: {
        todayTasks: plannerTasksResult.state,
        activeGoals: goalsCountResult.state,
        activeListings: activeProductsResult.state,
        pendingTransactions: transactionResult.state,
        weeklyFocusMinutes: weeklyFocusResult.state,
        streakDays: streakResult.state,
      },
    }
    sectionStates.value = {
      planner: plannerTasksResult.state === 'error' || goalsCountResult.state === 'error' ? 'error' : 'real',
      schedule: scheduleResult.state,
      weekly: weekTasksResult.state,
      shop: [activeProductsResult.state, transactionResult.state, conversationsResult.state].includes('error') ? 'error' : 'real',
      campus: hotPostsResult.state,
    }

    todayPlannerTasks.value = plannerTasks.map((task) => {
      const dueLabel = task.due_date ? (task.due_date < today ? '已逾期' : '今天到期') : '待安排'
      const goalTitle = extractGoalTitle(task.goals)
      return {
        id: task.id,
        title: task.title,
        meta: goalTitle ? `${goalTitle} · ${dueLabel}` : dueLabel,
        isOverdue: Boolean(task.due_date && task.due_date < today),
        progress: null,
        remainingDays: getRemainingDays(task.due_date),
      }
    })

    todaySchedule.value = ((scheduleResult.data || []) as ScheduleEventRow[]).map((event) => ({
      id: event.id,
      title: event.title,
      time: formatScheduleTime(event.start_time, event.end_time),
      kind: (event.priority || 0) > 0 ? 'urgent' : 'normal',
      status: resolveScheduleStatus(event.start_time, event.end_time),
    }))

    campusHighlights.value = buildCampusHotHighlights(
      ((hotPostsResult.data || []) as CampusPostRow[])
        .filter(post => Boolean(post.content?.trim()))
        .map(post => ({
          id: post.id,
          content: post.content,
          authorId: post.author_id,
          authorName: post.author_name,
          anonymousSeed: post.anonymous_seed,
          isAnonymous: post.is_anonymous,
          createdAt: post.created_at,
          likes: post.likes?.[0]?.count || 0,
          comments: post.comments?.[0]?.count || 0,
        })),
    )

    shopSignals.value = buildShopSignals(activeListings, pendingTransactions, unreadMessages)
  } catch (error) {
    console.error('loadDashboard failed:', error)
    sectionStates.value = {
      planner: 'error',
      schedule: 'error',
      weekly: 'error',
      shop: 'error',
      campus: 'error',
    }
    showToast('主控台刷新失败，请稍后重试。')
  }
}

watch(
  () => user.value?.id,
  () => {
    loadDashboard()
  },
  { immediate: true },
)
</script>

<style scoped>
.app-home {
  --dash-bg-page: #080714;
  --dash-bg-card: rgba(15, 12, 38, 0.65);
  --dash-bg-card-hover: rgba(20, 16, 48, 0.75);
  --dash-bg-hero: linear-gradient(135deg, rgba(20, 15, 50, 0.8), rgba(10, 8, 30, 0.9));
  --dash-bg-input: rgba(16, 12, 36, 0.6);
  --dash-bg-quickcenter: rgba(12, 10, 28, 0.95);
  --dash-border-card: rgba(139, 92, 246, 0.12);
  --dash-border-card-hover: rgba(139, 92, 246, 0.3);
  --dash-border-hero: rgba(139, 92, 246, 0.2);
  --dash-accent-purple: #7c3aed;
  --dash-accent-purple-light: #a78bfa;
  --dash-accent-blue: #3b82f6;
  --dash-color-success: #10b981;
  --dash-color-warning: #f59e0b;
  --dash-color-danger: #ef4444;
  --dash-color-gold: #f5c55e;
  --dash-text-primary: rgba(255, 255, 255, 0.93);
  --dash-text-secondary: rgba(255, 255, 255, 0.6);
  --dash-text-muted: rgba(255, 255, 255, 0.35);
  --dash-card-gap: 12px;
  --dash-section-gap: 12px;
  --dash-card-padding: 12px 16px;
  --dash-radius-sm: 8px;
  --dash-radius-md: 12px;
  --dash-radius-lg: 16px;
  --dash-radius-xl: 20px;
  --dash-radius-full: 999px;
  --dash-shadow-card: 0 4px 20px rgba(0, 0, 0, 0.25);
  --dash-shadow-card-hover: 0 8px 32px rgba(0, 0, 0, 0.4);
  --dash-shadow-elevated: 0 16px 48px rgba(0, 0, 0, 0.5);
  --dash-transition-fast: 120ms cubic-bezier(0.4, 0, 0.2, 1);
  --dash-transition-normal: 200ms cubic-bezier(0.4, 0, 0.2, 1);
  --dash-transition-smooth: 300ms cubic-bezier(0.16, 1, 0.3, 1);
  max-width: 1480px;
  margin: 0 auto;
  padding: 12px 20px 24px 0;
  color: var(--dash-text-primary);
  font-family: Inter, 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

.hero,
.card,
.stat-chip,
.shortcut-card,
.action-card,
.signal {
  background: var(--dash-bg-card);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid var(--dash-border-card);
  border-radius: var(--dash-radius-lg);
  box-shadow: var(--dash-shadow-card);
  transition: transform var(--dash-transition-normal), box-shadow var(--dash-transition-normal), border-color var(--dash-transition-normal);
}

.card:hover {
  transform: translateY(-3px);
  background: var(--dash-bg-card-hover);
  box-shadow: var(--dash-shadow-card-hover);
  border-color: var(--dash-border-card-hover);
}

.stat-chip {
  border-color: rgba(139, 92, 246, 0.15);
  box-shadow: 0 2px 16px rgba(0, 0, 0, 0.35), 0 0 0 0.5px rgba(139, 92, 246, 0.1);
}
.stat-chip:hover {
  transform: translateY(-2px);
  border-color: rgba(139, 92, 246, 0.3);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4), 0 0 16px rgba(139, 92, 246, 0.1);
}

.hero {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 24px;
  padding: 18px 24px;
  margin-bottom: 10px;
  border-radius: var(--dash-radius-xl);
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(ellipse at 55% 25%, rgba(139,92,246,0.35) 0%, transparent 50%),
    radial-gradient(ellipse at 75% 45%, rgba(88,28,200,0.25) 0%, transparent 45%),
    radial-gradient(ellipse at 20% 75%, rgba(59,130,246,0.15) 0%, transparent 40%),
    radial-gradient(ellipse at 35% 5%, rgba(147,51,234,0.12) 0%, transparent 55%),
    radial-gradient(ellipse at 90% 80%, rgba(236,72,153,0.06) 0%, transparent 35%),
    linear-gradient(180deg, rgba(10,6,26,0.94) 0%, rgba(6,4,16,0.97) 100%);
  border: 1px solid var(--dash-border-hero);
  box-shadow: 0 4px 48px rgba(0,0,0,0.6), 0 0 80px rgba(139,92,246,0.05), inset 0 1px 0 rgba(255,255,255,0.06);
  min-height: 180px;
}

.fixture-label {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}

/* 参考图主视觉 — 发光轨道星球，横向铺满 hero 右侧 2/3 并向中间靠拢 */
.planet-img-wrap {
  position: absolute;
  top: -12%;
  right: 0;
  width: 78%;
  height: 124%;
  pointer-events: none;
  z-index: 0;
  animation: planetFloat 24s ease-in-out infinite alternate;
  opacity: 0.92;
  mix-blend-mode: screen;
}
.planet-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 30%;
  -webkit-mask-image: linear-gradient(90deg, transparent 2%, #000 44%);
  mask-image:
    linear-gradient(90deg, transparent 2%, #000 44%),
    linear-gradient(180deg, #000 52%, rgba(0, 0, 0, 0.4) 86%, transparent 100%);
  mask-composite: intersect;
  filter: brightness(0.96) saturate(1.1) drop-shadow(0 0 40px rgba(99, 102, 241, 0.3));
}

@keyframes planetFloat {
  0% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(-4px, 5px) scale(1.02); }
  100% { transform: translate(3px, -3px) scale(0.99); }
}

/* 一线天效果 */
.hero-horizon {
  position: absolute;
  bottom: 25%;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, rgba(168,85,247,0.15) 20%, rgba(96,165,250,0.25) 50%, rgba(168,85,247,0.15) 80%, transparent 100%);
  pointer-events: none;
  z-index: 1;
}
.hero-horizon::before {
  content: '';
  position: absolute;
  bottom: -4px;
  left: 10%;
  right: 10%;
  height: 8px;
  background: linear-gradient(90deg, transparent, rgba(168,85,247,0.06) 30%, rgba(96,165,250,0.08) 50%, rgba(168,85,247,0.06) 70%, transparent);
  filter: blur(4px);
}

/* 星云层 */
.hero-nebula-core {
  position: absolute; top: -20%; right: 15%; width: 300px; height: 300px;
  background: radial-gradient(circle, rgba(139,92,246,0.15) 0%, rgba(99,102,241,0.08) 35%, transparent 65%);
  filter: blur(40px); pointer-events: none;
  animation: nebulaCore 10s ease-in-out infinite alternate;
}
.hero-nebula-mid {
  position: absolute; top: -30%; left: 20%; width: 400px; height: 400px;
  background: radial-gradient(ellipse, rgba(59,130,246,0.06) 0%, rgba(139,92,246,0.03) 40%, transparent 70%);
  filter: blur(50px); pointer-events: none;
  animation: nebulaMid 14s ease-in-out infinite alternate;
}

@keyframes nebulaCore { from { transform: translate(0,0) scale(1); opacity: 0.7 } to { transform: translate(-8px,8px) scale(1.05); opacity: 1 } }
@keyframes nebulaMid { from { transform: translate(0,0) scale(1); opacity: 0.5 } to { transform: translate(-15px,10px) scale(1.08); opacity: 0.8 } }

/* 星点 */
.hero-stars { position: absolute; inset: 0; pointer-events: none; }
.h-star {
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(200,180,255,0.4) 50%, transparent 100%);
  animation: starTwinkle ease-in-out infinite;
}
@keyframes starTwinkle {
  0%, 100% { opacity: 0.08; transform: scale(0.5); }
  30% { opacity: 0.9; transform: scale(1.5); }
  70% { opacity: 0.25; transform: scale(0.8); }
}
.h-star-bright {
  background: radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(200,180,255,0.6) 40%, transparent 100%) !important;
  box-shadow: 0 0 6px rgba(200,180,255,0.5);
}

/* 流星 */
.hero-meteors { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
.meteor {
  position: absolute;
  width: 80px;
  height: 1px;
  background: linear-gradient(90deg, rgba(255,255,255,0.6), transparent);
  transform: rotate(-35deg);
  animation: meteorShoot 8s linear infinite;
  opacity: 0;
}
@keyframes meteorShoot {
  0% { opacity: 0; transform: rotate(-35deg) translateX(0); }
  5% { opacity: 0.8; }
  15% { opacity: 0; transform: rotate(-35deg) translateX(-200px); }
  100% { opacity: 0; }
}

.hero-left { position: relative; z-index: 1; flex: 1; }
.hero-greeting {
  margin: 0 0 6px;
  color: #e2e8f0;
  font-size: 28px;
  font-weight: 800;
  letter-spacing: 1px;
  line-height: 1.3;
  text-shadow: 0 2px 24px rgba(168,85,247,0.12);
}
.hero-date { color: rgba(226,232,240,0.35); font-size: 13px; margin: 0 0 6px; }
.hero-insight { color: rgba(139,92,246,0.65); font-size: 13px; margin: 6px 0 0; line-height: 1.6; max-width: 520px; }

.hero-right { position: relative; z-index: 1; display: flex; gap: 10px; flex-shrink: 0; }
.hero-orbit-note {
  position: absolute;
  right: 24px;
  bottom: 70px;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  max-width: 250px;
  color: rgba(226, 232, 240, 0.5);
  font-size: 11px;
}
.hero-orbit-mark { color: #93c5fd; text-shadow: 0 0 12px rgba(96, 165, 250, 0.65); }
.hero-pagination {
  position: absolute;
  left: 50%;
  bottom: 12px;
  z-index: 2;
  display: flex;
  gap: 5px;
  transform: translateX(-50%);
}
.hero-pagination span { width: 5px; height: 5px; border-radius: 50%; background: rgba(255,255,255,0.2); }
.hero-pagination span.active { width: 16px; border-radius: 999px; background: rgba(147,197,253,0.75); box-shadow: 0 0 8px rgba(96,165,250,0.45); }
.btn.hero-ghost { background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.5); border: 1px solid rgba(255,255,255,0.08); height: 40px; padding: 0 16px; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.btn.hero-ghost:hover { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.8); }
.btn.hero-primary { background: linear-gradient(135deg, #6d28d9, #8b5cf6); color: white; height: 40px; padding: 0 20px; border-radius: 10px; font-size: 13px; font-weight: 600; text-decoration: none; display: inline-flex; align-items: center; box-shadow: 0 2px 16px rgba(139,92,246,0.25); transition: all 0.2s; }
.btn.hero-primary:hover { box-shadow: 0 4px 24px rgba(139,92,246,0.4); transform: translateY(-1px); }

.note-buttons {
  display: flex;
  gap: 10px;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 40px;
  padding: 0 16px;
  border: none;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  transition: 0.2s ease;
}

.btn.primary {
  background: linear-gradient(135deg, #6d28d9, #8b5cf6);
  color: #fff;
  box-shadow: 0 2px 12px rgba(139, 92, 246, 0.2);
}

.btn.primary:hover {
  box-shadow: 0 4px 20px rgba(139, 92, 246, 0.35);
}

.btn.ghost {
  background: rgba(255,255,255,0.03);
  color: rgba(255,255,255,0.5);
  border: 1px solid rgba(255,255,255,0.08);
}

.btn.ghost:hover {
  background: rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.8);
}

.btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.stats-strip {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: var(--dash-card-gap);
  margin-bottom: var(--dash-section-gap);
}

.stat-unit {
  font-size: 14px;
  font-weight: 500;
  color: rgba(255,255,255,0.4);
  margin-left: 2px;
  vertical-align: baseline;
}

.stat-chip {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 14px;
  border-radius: var(--dash-radius-lg);
  min-height: 82px;
}

.stat-chip:hover {
  transform: translateY(-2px);
  border-color: rgba(168,85,247,0.15);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4), 0 0 16px rgba(168, 85, 247, 0.06);
}

.stat-chip strong {
  display: block;
  color: rgba(255,255,255,0.95);
  font-size: 24px;
  font-weight: 800;
  line-height: 1;
}

.shop-stats strong {
  display: block;
  color: rgba(255,255,255,0.95);
  font-size: 22px;
  font-weight: 800;
}

.stat-chip span {
  display: block;
  margin-top: 4px;
  color: rgba(255,255,255,0.3);
  font-size: 11px;
}

.shop-stats span {
  display: block;
  margin-top: 2px;
  color: rgba(255,255,255,0.3);
  font-size: 11px;
}

.row-3col {
  display: grid;
  grid-template-columns: 1.2fr minmax(0, 1fr) minmax(0, 1fr);
  gap: var(--dash-card-gap);
  margin-bottom: var(--dash-section-gap);
}

.row-4col {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--dash-card-gap);
  margin-bottom: var(--dash-section-gap);
}

.card {
  min-width: 0;
  padding: var(--dash-card-padding);
  border-radius: var(--dash-radius-lg);
}

.action-copy span {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
}

.card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.card-head h3 {
  margin: 0;
  color: rgba(255,255,255,0.9);
  font-size: 15px;
  font-weight: 700;
}

.card-head span,
.more-link {
  color: rgba(255,255,255,0.3);
  font-size: 12px;
}

.more-link {
  text-decoration: none;
  color: rgba(196,181,253,0.6);
  transition: color 0.2s;
}

.more-link:hover {
  color: #c4b5fd;
}

.plain-btn {
  background: none;
  border: none;
  cursor: pointer;
}

.action-card {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 12px;
  align-items: center;
  padding: 8px 12px;
  margin-bottom: 7px;
  text-decoration: none;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 14px;
  position: relative;
  overflow: hidden;
}

.action-card::before {
  content: '';
  position: absolute;
  inset: 0 auto 0 0;
  width: 3px;
}

.action-card.tone-high::before { background: linear-gradient(180deg, #f97316, #ef4444); }
.action-card.tone-medium::before { background: linear-gradient(180deg, #7c3aed, #3b82f6); }
.action-card.tone-low::before { background: linear-gradient(180deg, #06b6d4, #10b981); }

.action-card:last-child {
  margin-bottom: 0;
}

.action-card:hover {
  transform: translateX(3px);
}

.action-card.tone-high {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.06), rgba(139, 92, 246, 0.03));
  border: 1px solid rgba(239, 68, 68, 0.12);
}

.action-card.tone-high:hover {
  border-color: rgba(239, 68, 68, 0.2);
  box-shadow: 0 0 16px rgba(239, 68, 68, 0.06);
}

.action-card.tone-medium {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.06), rgba(139, 92, 246, 0.03));
  border: 1px solid rgba(59, 130, 246, 0.1);
}

.action-card.tone-medium:hover {
  border-color: rgba(59, 130, 246, 0.18);
  box-shadow: 0 0 16px rgba(59, 130, 246, 0.05);
}

.action-card.tone-low {
  background: rgba(255,255,255,0.015);
  border: 1px solid rgba(255,255,255,0.04);
}

.action-icon {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-card-hover);
  font-size: 18px;
}

.action-copy strong,
.list-item strong,
.shortcut-card strong,
.campus-meta strong {
  display: block;
  color: var(--color-text-primary);
  font-size: 14px;
}

.action-copy span,
.list-item span,
.signal,
.progress-summary,
.empty,
.note-actions > span,
.shortcut-card span,
.quote-card cite,
.campus-meta span,
.campus-item p {
  color: var(--color-text-muted);
  font-size: 12px;
  line-height: 1.5;
}

.action-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.priority-tag {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 6px;
}

.priority-tag.p-high {
  background: rgba(239,68,68,0.1);
  color: #f87171;
}

.priority-tag.p-medium {
  background: rgba(59,130,246,0.08);
  color: rgba(96,165,250,0.8);
}

.priority-tag.p-low {
  background: rgba(245,158,11,0.06);
  color: rgba(245,158,11,0.5);
}

.action-cta {
  color: #c4b5fd;
  font-size: 12px;
  font-weight: 600;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.list-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.list-item-link {
  text-decoration: none;
  border-radius: 10px;
  padding: 7px 10px;
  margin: -4px -6px;
  transition: all 0.2s;
  border: 1px solid transparent;
}
.list-item-link:hover {
  background: rgba(255,255,255,0.02);
  border-color: rgba(255,255,255,0.04);
}

.dot {
  width: 9px;
  height: 9px;
  margin-top: 6px;
  border-radius: 999px;
  background: var(--color-text-muted);
  flex-shrink: 0;
}

.dot.normal {
  background: #60a5fa;
}

.dot.urgent {
  background: #f87171;
  box-shadow: 0 0 10px rgba(248, 113, 113, 0.4);
}

.shop-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 16px;
}

.shop-stats > div {
  padding: 14px 12px;
  border-radius: 14px;
  text-align: center;
  background: rgba(12,10,24,0.5);
  border: 1px solid rgba(255,255,255,0.04);
  position: relative;
}

.shop-stats > div:nth-child(1) strong { color: #8b5cf6; }
.shop-stats > div:nth-child(2) strong { color: #10b981; }
.shop-stats > div:nth-child(3) strong { color: #f87171; }

.signal-list,
.campus-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.signal {
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(249, 115, 22, 0.07);
  border-color: rgba(249, 115, 22, 0.1);
}

.note-card {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.04), rgba(16, 185, 129, 0.03)), rgba(12, 10, 24, 0.65);
}

.saved {
  color: #34d399 !important;
  font-weight: 600;
}

.note-textarea {
  width: 100%;
  resize: none;
  border: 1px solid var(--color-border);
  background: var(--color-bg-card);
  border-radius: 12px;
  padding: 12px 14px;
  font: inherit;
  font-size: 13px;
  line-height: 1.6;
  color: var(--color-text-primary);
  outline: none;
}

.note-textarea::placeholder {
  color: var(--color-text-muted);
}

.note-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
}

.progress-card {
  text-align: center;
}

.progress-pct {
  color: #c4b5fd;
}

.progress-detail {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 8px;
  font-size: 11px;
  color: rgba(255,255,255,0.25);
}

.overdue-tag {
  color: rgba(248,113,113,0.6);
}

.card-badge {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 6px;
  background: rgba(139,92,246,0.1);
  color: rgba(196,181,253,0.7);
  margin-left: 6px;
  vertical-align: middle;
}

.pd-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 2px;
  margin-right: 4px;
  vertical-align: middle;
}
.pd-dot.done { background: #10b981; }
.pd-dot.prog { background: #6366f1; }
.pd-dot.warn { background: #f59e0b; }
.pd-done, .pd-prog, .pd-warn {
  font-size: 11px;
  color: rgba(255,255,255,0.4);
}

.progress-trend {
  text-align: center;
  font-size: 12px;
  color: rgba(255,255,255,0.3);
  margin: 8px 0 0;
}
.trend-up {
  color: #10b981;
  font-weight: 600;
}

.shop-stat-icon {
  display: block;
  font-size: 18px;
  margin-bottom: 4px;
}

.pi-eta {
  font-size: 10px;
  color: rgba(255,255,255,0.2);
  margin-left: 4px;
  flex-shrink: 0;
}

.ring-wrap {
  position: relative;
  width: 130px;
  height: 130px;
  margin: 8px auto 12px;
}

.ring {
  width: 100%;
  height: 100%;
}

.ring-bg {
  fill: none;
  stroke: rgba(255,255,255,0.08);
  stroke-width: 8;
}

.ring-fg {
  fill: none;
  stroke: url(#ringGradient);
  stroke-width: 9;
  stroke-linecap: round;
  stroke-dasharray: 314.16;
  transform: rotate(-90deg);
  transform-origin: center;
  transition: stroke-dashoffset 0.8s ease;
  filter: drop-shadow(0 0 12px rgba(139, 92, 246, 0.45)) drop-shadow(0 0 4px rgba(124, 58, 237, 0.3));
}

.ring-label {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.ring-label strong {
  font-size: 26px;
  color: var(--color-text-primary);
}

.ring-label span {
  font-size: 11px;
  color: var(--color-text-muted);
}

.hero-date { color: var(--color-text-muted); font-size: 13px; margin: 4px 0 0; }

.card-sub { font-size: 12px; color: var(--color-text-muted); }

.planner-list { display: flex; flex-direction: column; gap: 14px; }
.planner-item { padding: 0 0 12px; border-bottom: 1px solid rgba(255,255,255,0.03); }
.planner-item:last-child { border-bottom: none; padding-bottom: 0; }
.pi-top { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.pi-dot { width: 8px; height: 8px; border-radius: 50%; background: #8b5cf6; flex-shrink: 0; }
.pi-dot.overdue { background: #f87171; box-shadow: 0 0 8px rgba(248,113,113,0.3); }
.pi-top strong { flex: 1; font-size: 13px; color: rgba(255,255,255,0.8); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pi-status { font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 4px; flex-shrink: 0; }
.st-progress { background: rgba(139,92,246,0.08); color: rgba(196,181,253,0.6); }
.st-overdue { background: rgba(239,68,68,0.08); color: #f87171; }
.pi-bar-row { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.pi-bar { flex: 1; height: 4px; background: rgba(255,255,255,0.06); border-radius: 2px; overflow: hidden; }
.pi-bar-fill { height: 100%; background: linear-gradient(90deg, #8b5cf6, #3b82f6); border-radius: 2px; transition: width 0.6s ease; }
.pi-pct { font-size: 11px; color: rgba(255,255,255,0.35); min-width: 30px; text-align: right; }
.pi-meta { font-size: 11px; color: rgba(255,255,255,0.2); }

.status-tag {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 6px;
  flex-shrink: 0;
  margin-left: auto;
}

.status-tag.active {
  background: rgba(16,185,129,0.1);
  color: #34d399;
}

.status-tag.upcoming {
  background: rgba(245,158,11,0.08);
  color: rgba(245,158,11,0.6);
}

.card-bottom-link {
  display: block;
  text-align: center;
  padding: 8px 0 0;
  margin-top: 8px;
  border-top: 1px solid rgba(255,255,255,0.04);
  font-size: 12px;
  color: rgba(196,181,253,0.5);
  text-decoration: none;
  transition: color 0.2s;
}

.card-bottom-link:hover { color: #c4b5fd; }

/* AI 今日建议 */
.ai-card {
  background: linear-gradient(135deg, rgba(59,130,246,0.06), rgba(139,92,246,0.04));
  border-color: rgba(59,130,246,0.08);
}
.ai-tips { display: flex; flex-direction: column; gap: 10px; }
.ai-tip { display: flex; gap: 8px; font-size: 13px; color: rgba(255,255,255,0.6); line-height: 1.6; }
.ai-bullet { color: #3b82f6; font-weight: bold; flex-shrink: 0; }

/* 成长进度 */
.growth-card { background: linear-gradient(135deg, rgba(245,158,11,0.06), rgba(139,92,246,0.04)); }
.growth-level { display: flex; gap: 14px; align-items: center; margin-bottom: 14px; }
.gl-avatar { width: 48px; height: 48px; border-radius: 14px; background: linear-gradient(135deg, #8b5cf6, #f59e0b); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.gl-icon { font-size: 22px; }
.gl-avatar-img { width: 100%; height: 100%; object-fit: cover; border-radius: 14px; }
.gl-info { flex: 1; min-width: 0; }
.gl-name { font-size: 14px; font-weight: 700; color: var(--color-text-primary); }
.gl-title { font-weight: 400; color: var(--color-text-muted); font-size: 12px; margin-left: 4px; }
.gl-xp { font-size: 11px; color: var(--color-text-muted); margin: 2px 0 6px; }
.gl-bar { height: 6px; background: var(--color-border); border-radius: 3px; overflow: hidden; }
.gl-bar-fill { height: 100%; background: linear-gradient(90deg, #8b5cf6, #f59e0b); border-radius: 3px; transition: width 0.6s ease; }
.gl-stats { display: flex; gap: 16px; margin-bottom: 8px; }
.gl-stats > div { display: flex; flex-direction: column; }
.gl-stats strong { font-size: 13px; color: var(--color-text-primary); }
.gl-stats span { font-size: 10px; color: var(--color-text-muted); }
.gl-hint { font-size: 11px; color: rgba(245,158,11,0.5); margin: 0; }

/* 成就徽章 */
.badge-card { background: linear-gradient(135deg, rgba(236,72,153,0.05), rgba(139,92,246,0.04)); }
.badge-row {
  display: flex;
  gap: 14px;
  justify-content: center;
}
.badge-item-v2 {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  transition: transform 0.2s;
}
.badge-item-v2:hover { transform: translateY(-3px); }
.badge-item-v2.locked { opacity: 0.3; }
.badge-circle {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.22s;
  border: 1.5px solid rgba(255,255,255,0.1);
}
.badge-item-v2.earned .badge-circle {
  animation: badgeGlow 3s ease-in-out infinite alternate;
}
@keyframes badgeGlow {
  from { filter: brightness(1); box-shadow: 0 4px 20px rgba(139, 92, 246, 0.2); }
  to { filter: brightness(1.2); box-shadow: 0 4px 28px rgba(139, 92, 246, 0.35); }
}
.badge-item-v2:hover .badge-circle {
  transform: scale(1.12);
  box-shadow: 0 0 20px rgba(139, 92, 246, 0.3);
}
.badge-item-v2 > span {
  font-size: 10px;
  color: var(--color-text-muted);
  text-align: center;
}

.quote-card {
  background:
    radial-gradient(ellipse at 90% 20%, rgba(168,85,247,0.12) 0%, transparent 50%),
    radial-gradient(ellipse at 10% 80%, rgba(96,165,250,0.06) 0%, transparent 50%),
    linear-gradient(135deg, rgba(139, 92, 246, 0.08), rgba(79, 142, 247, 0.04)),
    rgba(15, 17, 24, 0.7);
  border-color: rgba(139, 92, 246, 0.12);
}

.quote-tag {
  display: inline-flex;
  margin-bottom: 12px;
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(139, 92, 246, 0.12);
  color: #ddd6fe;
  font-size: 11px;
  font-weight: 600;
}

.quote-card blockquote {
  margin: 0;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.8;
  font-size: 14px;
  font-style: italic;
}

.quote-card cite {
  display: block;
  margin-top: 14px;
  color: var(--color-text-muted);
  font-size: 12px;
}

/* 校园热榜 */
.campus-card {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.05), rgba(244, 63, 94, 0.04));
}

.campus-hot-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid var(--color-border);
}
.campus-hot-item:last-child { border-bottom: none; }

.hot-rank {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
  background: var(--color-bg-card-hover);
  color: var(--color-text-muted);
}
.campus-hot-item:first-child .hot-rank { background: linear-gradient(135deg, rgba(245,197,94,0.3), rgba(239,68,68,0.2)); color: #f5c55e; font-weight: 800; box-shadow: 0 0 10px rgba(245,197,94,0.2); }
.campus-hot-item:nth-child(2) .hot-rank { background: linear-gradient(135deg, rgba(148,163,184,0.25), rgba(100,116,139,0.15)); color: #94a3b8; font-weight: 800; box-shadow: 0 0 8px rgba(148,163,184,0.15); }
.campus-hot-item:nth-child(3) .hot-rank { background: linear-gradient(135deg, rgba(249,115,22,0.25), rgba(234,88,12,0.15)); color: #f97316; font-weight: 800; box-shadow: 0 0 8px rgba(249,115,22,0.15); }

.hot-info { flex: 1; min-width: 0; }
.hot-info strong { display: block; font-size: 13px; color: var(--color-text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hot-info span { font-size: 11px; color: var(--color-text-muted); }

.shortcuts h2 {
  margin: 0 0 20px;
  color: var(--color-text-primary);
  font-size: 18px;
}

.shortcut-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 12px;
}

.status-tag.pending {
  color: var(--dash-text-muted);
  background: rgba(255, 255, 255, 0.04);
}

.pi-bar-fill.unavailable {
  width: 0 !important;
  background: var(--dash-text-muted);
}

.app-home :is(button, a, textarea):focus-visible {
  outline: 2px solid var(--dash-accent-purple-light);
  outline-offset: 2px;
}

.shortcut-card {
  display: flex;
  gap: 14px;
  align-items: center;
  padding: 16px 18px;
  text-decoration: none;
  transition: 0.2s ease;
}

.shortcut-card:hover {
  transform: translateY(-3px);
  border-color: rgba(168,85,247,0.12);
  box-shadow: 0 8px 24px rgba(0,0,0,0.4), 0 0 16px rgba(168,85,247,0.05);
}

.shortcut-card:hover .shortcut-icon {
  transform: scale(1.08);
  transition: transform 0.2s;
}

.shortcut-icon,
.stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 参考图同款霓虹 bitmap 统计图标 */
.stat-icon-art { overflow: hidden; }
.stat-icon-art img {
  width: 44px;
  height: 44px;
  object-fit: contain;
  transform: scale(1.12);
  filter: drop-shadow(0 0 8px rgba(139, 92, 246, 0.35));
}

.stat-icon {
  width: 46px;
  height: 46px;
  border-radius: 14px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 24px rgba(var(--icon-r, 139), var(--icon-g, 92), var(--icon-b, 246), 0.25), inset 0 0 12px rgba(255,255,255,0.05);
  transition: box-shadow 0.25s, transform 0.25s;
  font-size: 20px;
  animation: iconGlow 3s ease-in-out infinite alternate;
  border: 1px solid rgba(var(--icon-r, 139), var(--icon-g, 92), var(--icon-b, 246), 0.15);
}
@keyframes iconGlow {
  0% { box-shadow: 0 0 20px rgba(var(--icon-r, 139), var(--icon-g, 92), var(--icon-b, 246), 0.2), inset 0 0 12px rgba(255,255,255,0.05); }
  100% { box-shadow: 0 0 30px rgba(var(--icon-r, 139), var(--icon-g, 92), var(--icon-b, 246), 0.35), inset 0 0 16px rgba(255,255,255,0.08); }
}
.stat-chip:hover .stat-icon {
  box-shadow: 0 0 40px rgba(var(--icon-r, 139), var(--icon-g, 92), var(--icon-b, 246), 0.45), inset 0 0 16px rgba(255,255,255,0.1);
  transform: scale(1.1);
  animation: none;
}

.stat-text { min-width: 0; }
.stat-label { display: block; margin-top: 3px; color: rgba(255,255,255,0.3); font-size: 11px; }
.stat-sub-info { display: block; margin-top: 1px; color: rgba(255,255,255,0.15); font-size: 10px; }

.shortcut-icon {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  flex-shrink: 0;
}

.toast {
  position: fixed;
  left: 50%;
  bottom: 28px;
  transform: translateX(-50%);
  padding: 12px 16px;
  border-radius: 999px;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  color: var(--color-text-primary);
  box-shadow: var(--shadow-elevated);
  z-index: 20;
}

/* ====== 入场动画 ====== */
.hero { animation: cardEnter 0.5s ease backwards; }
.stats-strip .stat-chip:nth-child(1) { animation: cardEnter 0.4s ease 0.1s backwards; }
.stats-strip .stat-chip:nth-child(2) { animation: cardEnter 0.4s ease 0.15s backwards; }
.stats-strip .stat-chip:nth-child(3) { animation: cardEnter 0.4s ease 0.2s backwards; }
.stats-strip .stat-chip:nth-child(4) { animation: cardEnter 0.4s ease 0.25s backwards; }
.row-3col .card, .row-4col .card { animation: cardEnter 0.4s ease 0.3s backwards; }

@keyframes cardEnter {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 列表项入场 */
.list-item, .action-card, .campus-hot-item, .signal {
  animation: itemEnter 0.3s ease backwards;
}

@keyframes itemEnter {
  from { opacity: 0; transform: translateX(-6px); }
  to { opacity: 1; transform: translateX(0); }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translate(-50%, 8px);
}

@media (min-width: 1100px) and (max-width: 1399px) {
  .row-3col {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .row-4col {
    grid-template-columns: repeat(2, 1fr);
  }

  .shortcut-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .stats-strip {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (min-width: 768px) and (max-width: 1099px) {
  .row-3col {
    grid-template-columns: minmax(0, 1fr);
  }

  .row-4col {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .shortcut-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .stats-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 767px) {
  .app-home {
    padding: 20px 16px 40px;
  }

  .hero,
  .hero-right,
  .note-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .stats-strip {
    grid-template-columns: repeat(2, 1fr);
  }

  .shortcut-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .shop-stats {
    grid-template-columns: 1fr;
  }

  .row-3col, .row-4col {
    grid-template-columns: minmax(0, 1fr);
  }

  .action-card {
    grid-template-columns: auto 1fr;
  }

  .action-cta {
    grid-column: 2;
  }

  .campus-meta {
    flex-direction: column;
    gap: 4px;
  }
}

/* ====== 底部栏 ====== */
.home-footer {
  margin-top: 48px;
  padding: 28px 0 16px;
  border-top: 1px solid rgba(139, 92, 246, 0.08);
  text-align: center;
  position: relative;
}
.home-footer::before {
  content: '✦';
  position: absolute;
  top: -8px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(15, 12, 41, 0.9);
  padding: 0 12px;
  color: rgba(139, 92, 246, 0.4);
  font-size: 14px;
}
.footer-links {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}
.footer-links a {
  font-size: 12px;
  color: var(--color-text-muted);
  text-decoration: none;
  transition: color 0.15s;
}
.footer-links a:hover { color: var(--theme-color, #4f8ef7); }
.footer-links span { color: var(--color-text-muted); font-size: 11px; }
.footer-copy {
  font-size: 11px;
  color: var(--color-text-muted);
  margin: 0;
  opacity: 0.6;
}

/* ====== Hero Pills ====== */
.hero-sparkle {
  color: #c084fc;
  font-size: 0.85em;
  animation: sparkleGlow 2.5s ease-in-out infinite;
}
@keyframes sparkleGlow {
  0%, 100% { opacity: 0.5; text-shadow: none; }
  50% { opacity: 1; text-shadow: 0 0 12px rgba(192,132,252,0.5); }
}

.hero-pills {
  display: flex;
  gap: 10px;
  margin-top: 14px;
  flex-wrap: wrap;
}
.hero-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 14px;
  border-radius: 999px;
  background: rgba(139,92,246,0.1);
  border: 1px solid rgba(139,92,246,0.15);
  color: #ddd6fe;
  font-size: 12px;
  font-weight: 500;
  backdrop-filter: blur(8px);
  transition: 0.2s;
}
.hero-pill:hover {
  background: rgba(139,92,246,0.18);
  border-color: rgba(139,92,246,0.25);
}
.pill-indicator {
  width: 6px; height: 6px; border-radius: 50%;
}
.pill-indicator.up { background: #22c55e; box-shadow: 0 0 6px rgba(34,197,94,0.5); }
.pill-indicator.stable { background: #60a5fa; box-shadow: 0 0 6px rgba(96,165,250,0.4); }
.pill-indicator.hot { background: #f97316; box-shadow: 0 0 6px rgba(249,115,22,0.5); }

/* ====== 星芒快捷中心 FAB ====== */
.spark-fab {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 31;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6d28d9, #8b5cf6);
  border: 1px solid rgba(139,92,246,0.4);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 20px rgba(109,40,217,0.35), 0 0 40px rgba(139,92,246,0.1);
  transition: transform 0.25s cubic-bezier(0.4,0,0.2,1), box-shadow 0.25s;
  animation: fabBreath 3s ease-in-out infinite;
}
.spark-fab:hover {
  transform: translateY(-3px) scale(1.06);
  box-shadow: 0 6px 28px rgba(109,40,217,0.45), 0 0 50px rgba(139,92,246,0.15);
}
.spark-fab:active { transform: scale(0.96); }
.spark-fab.active { transform: none; }
.spark-fab.active .fab-star { transform: rotate(45deg); }
.fab-star { width: 22px; height: 22px; filter: drop-shadow(0 0 4px rgba(255,255,255,0.4)); }

@keyframes fabBreath {
  0%, 100% { box-shadow: 0 4px 20px rgba(109,40,217,0.35), 0 0 30px rgba(139,92,246,0.08); }
  50% { box-shadow: 0 4px 24px rgba(109,40,217,0.45), 0 0 50px rgba(139,92,246,0.15); }
}

/* ====== Quick Center Panel ====== */
.quick-center {
  position: fixed;
  right: 24px;
  bottom: 92px;
  z-index: 30;
}
.qc-panel {
  width: min(320px, calc(100vw - 32px));
  max-height: 80vh;
  overflow-y: auto;
  background: var(--dash-bg-quickcenter);
  backdrop-filter: blur(24px);
  border: 1px solid rgba(139,92,246,0.15);
  border-radius: 20px;
  padding: 20px;
  box-shadow: var(--dash-shadow-elevated), 0 0 40px rgba(139,92,246,0.06);
  transform-origin: bottom right;
  counter-reset: quick-section;
}
.qc-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}
.qc-greeting {
  color: #e2e8f0;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.5;
}
.qc-close {
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 8px;
  color: rgba(255,255,255,0.4);
  width: 44px; height: 44px;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px;
  cursor: pointer;
  transition: 0.15s;
}
.qc-close:hover { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.8); }

.qc-section { margin-bottom: 16px; }
.qc-section h4 {
  color: rgba(255,255,255,0.35);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0 0 10px;
  display: flex;
  align-items: center;
  gap: 7px;
}

.qc-section h4::before {
  counter-increment: quick-section;
  content: counter(quick-section);
  width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: var(--dash-accent-purple-light);
  background: rgba(139, 92, 246, 0.12);
  font-size: 10px;
}

.qc-actions {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.qc-act {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 4px;
  border-radius: 12px;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.04);
  text-decoration: none;
  transition: 0.2s;
}
.qc-act:hover {
  background: rgba(139,92,246,0.08);
  border-color: rgba(139,92,246,0.15);
  transform: translateY(-2px);
}
.qc-act-icon {
  width: 36px; height: 36px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  font-size: 16px;
}
.qc-act > span:last-child {
  font-size: 11px;
  color: rgba(255,255,255,0.5);
}

.qc-reminders { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.qc-remind {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 12px;
  border-radius: 10px;
  background: rgba(255,255,255,0.02);
  font-size: 12px;
  color: rgba(255,255,255,0.6);
  min-height: 44px;
}
.qc-remind-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.qc-remind-dot.urgent { background: #f97316; box-shadow: 0 0 6px rgba(249,115,22,0.5); }
.qc-remind-dot.info { background: #3b82f6; box-shadow: 0 0 6px rgba(59,130,246,0.4); }
.qc-remind-dot.upcoming { background: #22c55e; box-shadow: 0 0 6px rgba(34,197,94,0.4); }
.qc-remind-dot.overdue { background: #ef4444; box-shadow: 0 0 6px rgba(239,68,68,0.5); }

.qc-recent {
  display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px;
}
.qc-recent-item {
  padding: 6px 14px;
  border-radius: 999px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.5);
  font-size: 12px;
  text-decoration: none;
  transition: 0.15s;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.qc-recent-item:hover {
  background: rgba(139,92,246,0.1);
  border-color: rgba(139,92,246,0.2);
  color: #ddd6fe;
}

.qc-bottom { border-top: 1px solid rgba(255,255,255,0.05); padding-top: 14px; }
.qc-inspire {
  font-size: 12px;
  color: rgba(192,132,252,0.6);
  line-height: 1.6;
  font-style: italic;
  margin-bottom: 10px;
}
.qc-bottom-acts { display: flex; gap: 8px; flex-wrap: wrap; }
.qc-small-btn {
  padding: 5px 12px;
  border-radius: 8px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.4);
  font-size: 11px;
  cursor: pointer;
  text-decoration: none;
  transition: 0.15s;
  min-height: 44px;
}

.qc-stagger {
  animation: qcSectionEnter 240ms var(--dash-transition-smooth) both;
  animation-delay: calc(var(--stagger) * 40ms);
}

@keyframes qcSectionEnter {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 767px) {
  .quick-center {
    right: 16px;
    bottom: 88px;
  }

  .spark-fab {
    right: 16px;
    bottom: 16px;
  }

  .qc-panel {
    padding: 16px;
  }
}

@media (min-width: 480px) and (max-width: 767px) {
  .quick-center,
  .spark-fab {
    right: 24px;
  }
}

@media (min-width: 1400px) {
  .app-home {
    --dash-card-gap: 8px;
    --dash-section-gap: 8px;
    --dash-card-padding: 8px 10px;
    padding: 8px 16px 12px 0;
  }

  .hero {
    min-height: 168px;
    padding: 12px 20px;
    margin-bottom: 8px;
  }

  .hero-pills {
    gap: 8px;
    margin-top: 8px;
  }

  .hero-pill {
    padding: 4px 10px;
    font-size: 11px;
  }

  .stats-strip,
  .row-3col,
  .row-4col {
    gap: 8px;
    margin-bottom: 8px;
  }

  .stat-chip {
    min-height: 68px;
    gap: 8px;
    padding: 6px 8px;
  }

  .stat-icon {
    width: 34px;
    height: 34px;
    border-radius: 10px;
    font-size: 16px;
  }

  .stat-chip strong {
    font-size: 20px;
  }

  .stat-chip span {
    margin-top: 2px;
    line-height: 1.15;
  }

  .card {
    padding: 8px 10px;
  }

  .card-head {
    margin-bottom: 6px;
  }

  .card-head h3 {
    font-size: 13px;
  }

  .action-card {
    gap: 8px;
    padding: 5px 8px;
    margin-bottom: 4px;
    border-radius: 10px;
  }

  .action-icon {
    width: 30px;
    height: 30px;
    border-radius: 9px;
    font-size: 14px;
  }

  .action-copy strong,
  .list-item strong {
    font-size: 12px;
    line-height: 1.3;
  }

  .action-copy span,
  .list-item span,
  .pi-meta {
    font-size: 10px;
    line-height: 1.3;
  }

  .list {
    gap: 3px;
  }

  .list-item {
    gap: 7px;
  }

  .list-item-link {
    padding: 4px 6px;
    margin: -2px;
  }

  .planner-list {
    gap: 6px;
  }

  .planner-item {
    padding-bottom: 6px;
  }

  .pi-top {
    margin-bottom: 3px;
  }

  .pi-bar-row {
    margin-bottom: 2px;
  }

  .card-bottom-link {
    padding-top: 4px;
    margin-top: 4px;
  }

  .shop-stats {
    gap: 4px;
    margin-bottom: 6px;
  }

  .shop-stats > div {
    padding: 5px 4px;
    border-radius: 10px;
  }

  .shop-stat-icon {
    font-size: 13px;
    margin-bottom: 1px;
  }

  .shop-stats strong {
    font-size: 16px;
    line-height: 1.1;
  }

  .shop-stats span {
    margin-top: 1px;
    font-size: 9px;
    line-height: 1.1;
  }

  .signal-list {
    gap: 3px;
  }

  .signal {
    padding: 4px 6px;
    overflow: hidden;
    color: var(--dash-text-secondary);
    font-size: 10px;
    line-height: 1.2;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .note-textarea {
    padding: 7px 8px;
    font-size: 12px;
    line-height: 1.35;
  }

  .note-actions {
    gap: 6px;
    margin-top: 5px;
  }

  .note-actions > span {
    font-size: 10px;
  }

  .note-buttons {
    gap: 5px;
  }

  .ring-wrap {
    width: 82px;
    height: 82px;
    margin: 0 auto 4px;
  }

  .ring-label strong {
    font-size: 20px;
  }

  .progress-detail {
    gap: 6px;
    margin-top: 4px;
  }

  .progress-detail > span {
    font-size: 9px;
  }

  .progress-trend {
    margin-top: 4px;
    font-size: 10px;
  }

  .ai-tips {
    gap: 5px;
  }

  .ai-tip {
    gap: 6px;
    font-size: 11px;
    line-height: 1.35;
  }

  .growth-level {
    gap: 8px;
    margin-bottom: 6px;
  }

  .gl-avatar {
    width: 36px;
    height: 36px;
    border-radius: 10px;
  }

  .gl-icon {
    font-size: 16px;
  }

  .gl-stats {
    gap: 10px;
    margin-bottom: 4px;
  }

  .gl-hint {
    font-size: 10px;
  }

  .badge-row {
    gap: 8px;
  }

  .badge-item-v2 {
    gap: 4px;
  }

  .badge-circle {
    width: 38px;
    height: 38px;
    font-size: 16px;
  }

  .quote-tag {
    margin-bottom: 4px;
    padding: 2px 8px;
    font-size: 10px;
  }

  .quote-card blockquote {
    font-size: 11px;
    line-height: 1.35;
  }

  .quote-card cite {
    margin-top: 4px;
    font-size: 10px;
  }

  .campus-list {
    gap: 2px;
  }

  .campus-hot-item {
    gap: 6px;
    padding: 3px 0;
  }

  .hot-rank {
    width: 18px;
    height: 18px;
    font-size: 10px;
  }

  .hot-info strong {
    font-size: 11px;
    line-height: 1.2;
  }

  .hot-info span {
    font-size: 9px;
    line-height: 1.2;
  }

  .shortcuts h2 {
    margin-bottom: 6px;
    font-size: 14px;
  }

  .shortcut-grid {
    gap: 6px;
  }

  .shortcut-card {
    min-height: 48px;
    gap: 7px;
    padding: 6px 8px;
  }

  .shortcut-icon {
    width: 30px;
    height: 30px;
    border-radius: 10px;
  }

  .shortcut-card strong {
    font-size: 11px;
    line-height: 1.2;
  }

  .shortcut-card span {
    font-size: 9px;
    line-height: 1.2;
  }

  .home-footer {
    margin-top: 8px;
    padding: 8px 0 4px;
  }

  .footer-links {
    gap: 6px;
    margin-bottom: 4px;
  }

  .footer-copy {
    margin: 0;
    font-size: 9px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .app-home *,
  .app-home *::before,
  .app-home *::after {
    scroll-behavior: auto !important;
    animation-duration: 1ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 1ms !important;
  }
}
.qc-small-btn:hover { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.7); }

/* QC Transition */
.qc-enter-active { transition: opacity 0.22s ease; }
.qc-leave-active { transition: opacity 0.18s ease; }
.qc-enter-from, .qc-leave-to { opacity: 0; }
.qc-enter-active .qc-panel { animation: qcOpen 0.26s cubic-bezier(0.16,1,0.3,1) forwards; }
.qc-leave-active .qc-panel { animation: qcClose 0.18s ease forwards; }

@keyframes qcOpen {
  from { opacity: 0; transform: scale(0.92) translateY(12px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
@keyframes qcClose {
  from { opacity: 1; transform: scale(1); }
  to { opacity: 0; transform: scale(0.94) translateY(8px); }
}

/* Iteration 4: reference geometry, icon language, and quick-center composition. */
.action-icon { color: #c4b5fd; }
.action-icon :deep(svg) { width: 19px; height: 19px; }
.shop-stat-icon { height: 18px; font-size: 0; display: grid; place-items: center; }
.shop-stat-icon :deep(svg) { width: 18px; height: 18px; margin: 0 auto; }
.gl-icon :deep(svg) { width: 24px; height: 24px; color: #fff7d6; }
.status-tag.ended { background: rgba(148, 163, 184, 0.08); color: rgba(203, 213, 225, 0.55); }
.state-message { display: flex; min-height: 72px; margin: 0; align-items: center; justify-content: center; text-align: center; }
.state-message.is-error { color: rgba(248, 113, 113, 0.72); }

.tone-purple { color: #a78bfa; }
.tone-blue { color: #60a5fa; }
.tone-green { color: #34d399; }
.tone-cyan { color: #22d3ee; }
.tone-pink { color: #f472b6; }
.tone-orange { color: #fb923c; }
.tone-red { color: #f87171; }
.tone-gold { color: #f5c55e; }

.badge-circle { overflow: hidden; background: rgba(139,92,246,0.08); }
.badge-circle img {
  width: 112%;
  height: 112%;
  object-fit: cover;
  filter: invert(1) hue-rotate(180deg) saturate(1.2) brightness(1.08);
  mix-blend-mode: screen;
}

.quick-center::before {
  content: '';
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background: rgba(3, 2, 12, 0.2);
  backdrop-filter: blur(1.5px);
}
.qc-panel {
  width: min(428px, calc(100vw - 32px));
  padding: 18px;
  background:
    radial-gradient(circle at 16% 4%, rgba(99, 102, 241, 0.18), transparent 35%),
    radial-gradient(circle at 94% 78%, rgba(139, 92, 246, 0.13), transparent 32%),
    rgba(11, 9, 32, 0.9);
  border-color: rgba(129, 92, 246, 0.42);
  box-shadow: 0 24px 64px rgba(0,0,0,0.58), 0 0 40px rgba(99,102,241,0.14), inset 0 1px 0 rgba(255,255,255,0.06);
  outline: none;
  scrollbar-width: thin;
  scrollbar-color: rgba(139,92,246,0.35) transparent;
}
.qc-brand { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 12px; }
.qc-brand h2 { margin: 0; color: #f1f5f9; font-size: 19px; line-height: 1.25; }
.qc-brand p { margin: 4px 0 0; color: rgba(196,181,253,0.52); font-size: 11px; }
/* Iteration 5: lighter close chrome, unchanged 44px hit target. */
.qc-close {
  position: relative;
  z-index: 0;
  width: 44px;
  height: 44px;
  flex: 0 0 44px;
  background: transparent;
  border-color: transparent;
  color: rgba(226, 232, 240, 0.55);
  font-size: 11px;
}
.qc-close::before {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  z-index: -1;
  width: 26px;
  height: 26px;
  transform: translate(-50%, -50%);
  border-radius: 8px;
  background: rgba(148, 163, 184, 0.1);
  border: 1px solid rgba(148, 163, 184, 0.16);
  transition: background 150ms ease, border-color 150ms ease;
}
.qc-close:hover { background: transparent; color: rgba(255, 255, 255, 0.85); }
.qc-close:hover::before { background: rgba(148, 163, 184, 0.22); border-color: rgba(148, 163, 184, 0.32); }
.qc-welcome {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  min-height: 64px;
  margin-bottom: 14px;
  padding: 9px 12px;
  border: 1px solid rgba(139,92,246,0.18);
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.06));
}
.qc-avatar { width: 42px; height: 42px; display: grid; place-items: center; overflow: hidden; border-radius: 50%; color: #ede9fe; font-size: 15px; font-weight: 700; background: linear-gradient(135deg,#4f46e5,#9333ea); box-shadow: 0 0 18px rgba(99,102,241,0.3); }
.qc-avatar img { width: 100%; height: 100%; object-fit: cover; }
.qc-welcome strong, .qc-welcome span { display: block; }
.qc-welcome strong { color: rgba(255,255,255,0.9); font-size: 12px; }
.qc-welcome div > span { margin-top: 3px; color: rgba(255,255,255,0.42); font-size: 10px; }
.qc-welcome-spark { color: #f5c55e; text-shadow: 0 0 10px rgba(245,197,94,0.55); }
.qc-section { margin-bottom: 13px; }
.qc-section h4 { margin-bottom: 8px; }

.qc-actions { grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 7px; }
.qc-act { min-width: 0; min-height: 64px; gap: 5px; padding: 7px 2px; background: rgba(255,255,255,0.025); }
.qc-act-icon { width: 36px; height: 36px; }
.qc-act-icon :deep(svg) { width: 19px; height: 19px; }
.qc-act-icon.tone-blue { background: linear-gradient(135deg,#2563eb,#7c3aed); }
.qc-act-icon.tone-green { background: linear-gradient(135deg,#059669,#0891b2); }
.qc-act-icon.tone-purple { background: linear-gradient(135deg,#7c3aed,#4f46e5); }
.qc-act-icon.tone-pink { background: linear-gradient(135deg,#db2777,#7c3aed); }
.qc-act-icon.tone-orange { background: linear-gradient(135deg,#ea580c,#db2777); }
.qc-act-icon.tone-cyan { background: linear-gradient(135deg,#0891b2,#2563eb); }
.qc-act > span:last-child { text-align: center; line-height: 1.2; font-size: 10px; letter-spacing: -0.2px; white-space: nowrap; }

.qc-reminders { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 7px; }
.qc-remind { min-height: 54px; align-items: center; gap: 9px; padding: 7px 9px; border: 1px solid rgba(255,255,255,0.045); }
.qc-remind-icon { width: 30px; height: 30px; flex: 0 0 30px; display: grid; place-items: center; border-radius: 9px; background: rgba(139,92,246,0.1); }
.qc-remind-icon :deep(svg) { width: 16px; height: 16px; }
/* Iteration 5: reference reminder icons use solid gradient tiles with white glyphs. */
.qc-remind-icon.tone-purple,
.qc-remind-icon.tone-blue,
.qc-remind-icon.tone-green,
.qc-remind-icon.tone-orange,
.qc-remind-icon.tone-cyan { color: #fff; }
.qc-remind-icon.tone-purple { background: linear-gradient(135deg, #7c3aed, #4f46e5); }
.qc-remind-icon.tone-blue { background: linear-gradient(135deg, #2563eb, #7c3aed); }
.qc-remind-icon.tone-green { background: linear-gradient(135deg, #059669, #0891b2); }
.qc-remind-icon.tone-orange { background: linear-gradient(135deg, #ea580c, #db2777); }
.qc-remind-icon.tone-cyan { background: linear-gradient(135deg, #0891b2, #2563eb); }
.qc-remind-copy { min-width: 0; }
.qc-remind-copy strong, .qc-remind-copy small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.qc-remind-copy strong { color: rgba(255,255,255,0.72); font-size: 10px; }
.qc-remind-copy small { margin-top: 2px; color: rgba(255,255,255,0.3); font-size: 9px; }

.qc-recent, .qc-feedback { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
.qc-recent-item, .qc-feedback-item {
  min-width: 0;
  min-height: 68px;
  padding: 7px 3px;
  border: 1px solid transparent;
  border-radius: 11px;
  background: transparent;
  color: rgba(255,255,255,0.48);
  font: inherit;
  font-size: 10px;
  text-decoration: none;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  transition: background 160ms ease, border-color 160ms ease, color 160ms ease;
}
.qc-recent-item:hover, .qc-feedback-item:hover { background: rgba(139,92,246,0.08); border-color: rgba(139,92,246,0.16); color: #ede9fe; }
.qc-grid-icon { width: 34px; height: 34px; display: grid; place-items: center; border-radius: 10px; background: rgba(139,92,246,0.1); }
.qc-grid-icon :deep(svg) { width: 18px; height: 18px; }
/* Iteration 5: tint recent/feedback tiles per tone like the reference. */
.qc-grid-icon.tone-blue { background: rgba(37, 99, 235, 0.24); }
.qc-grid-icon.tone-purple { background: rgba(124, 58, 237, 0.24); }
.qc-grid-icon.tone-pink { background: rgba(219, 39, 119, 0.2); }
.qc-grid-icon.tone-green { background: rgba(5, 150, 105, 0.22); }
.qc-grid-icon.tone-cyan { background: rgba(8, 145, 178, 0.24); }
.qc-grid-icon.tone-gold { background: rgba(245, 197, 94, 0.16); }
.qc-footer { margin: 2px 0 0; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.05); color: rgba(255,255,255,0.22); font-size: 9px; text-align: center; }

@media (min-width: 480px) and (max-width: 767px) {
  .quick-center { right: 56px; }

  /* Iteration 5: reference vertical rhythm — ~772px panel, flex-distributed sections. */
  .qc-panel {
    display: flex;
    flex-direction: column;
    height: min(772px, calc(100dvh - 200px));
    max-height: none;
  }
  .qc-panel > * { flex: 0 0 auto; }
  .qc-section { display: flex; flex-direction: column; flex: 1 0 auto; margin-bottom: 10px; }
  .qc-section h4 { flex: 0 0 auto; }
  .qc-section .qc-actions,
  .qc-section .qc-reminders,
  .qc-section .qc-recent,
  .qc-section .qc-feedback { flex: 1 0 auto; align-content: center; }
  .qc-welcome { min-height: 72px; margin-bottom: 16px; }
  .qc-act { min-height: 76px; gap: 7px; }
  .qc-act-icon { width: 42px; height: 42px; border-radius: 12px; }
  .qc-act-icon :deep(svg) { width: 21px; height: 21px; }
  .qc-remind { min-height: 62px; }
  .qc-remind-icon { width: 34px; height: 34px; flex-basis: 34px; border-radius: 10px; }
  .qc-remind-icon :deep(svg) { width: 17px; height: 17px; }
  .qc-remind-copy strong { font-size: 11px; }
  .qc-remind-copy small { font-size: 10px; }
  .qc-recent-item, .qc-feedback-item { min-height: 80px; font-size: 11px; }
  .qc-grid-icon { width: 42px; height: 42px; border-radius: 12px; }
  .qc-grid-icon :deep(svg) { width: 20px; height: 20px; }
  .qc-footer { margin-top: auto; padding-top: 12px; }
}

@media (max-width: 479px) {
  .qc-actions { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .qc-brand h2 { font-size: 17px; }
  .qc-panel { padding: 14px; }
}

@media (max-width: 767px) {
  .hero-orbit-note, .hero-pagination { display: none; }

  /* 小屏收敛主视觉强度，保证 hero 文字可读 */
  .planet-img-wrap {
    top: auto;
    bottom: -6%;
    width: 100%;
    height: 64%;
    opacity: 0.55;
  }
  .planet-img {
    object-position: center 40%;
    -webkit-mask-image: linear-gradient(180deg, transparent 0%, #000 42%);
    mask-image: linear-gradient(180deg, transparent 0%, #000 42%);
    mask-composite: add;
  }
}

@media (min-width: 1400px) {
  .hero { min-height: 190px; padding: 14px 22px; }
  .stat-chip { min-height: 76px; }
  .stat-icon { width: 40px; height: 40px; border-radius: 12px; }
  .row-3col > .card { height: 224px; overflow: hidden; }
  .row-4col + .row-4col > .card { height: 132px; overflow: hidden; }
  .badge-circle { width: 42px; height: 42px; }
  .shortcut-card { min-height: 54px; }
}
</style>
