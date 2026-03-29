<template>
  <!-- 健康周报组件 -->
  <div class="weekly-report">
    <div class="wr-header">
      <h3 class="wr-title">📊 本周健康报告</h3>
      <button class="wr-refresh" @click="refresh" :disabled="loading">{{ loading ? '生成中...' : '刷新' }}</button>
    </div>

    <div v-if="!report && !loading" class="wr-empty">
      <p>点击刷新生成本周健康报告</p>
    </div>

    <div v-if="loading" class="wr-loading">
      <div class="wr-spinner"></div>
      <p>正在分析你的健康数据...</p>
    </div>

    <div v-if="report" class="wr-body">
      <!-- 综合评分 -->
      <div class="wr-grade-card" :class="'grade-' + report.grade.toLowerCase()">
        <div class="wr-grade">{{ report.grade }}</div>
        <div class="wr-grade-info">
          <span class="wr-grade-text">{{ gradeText }}</span>
          <span class="wr-grade-days">本周打卡 {{ report.total_checkin_days }}/7 天</span>
        </div>
      </div>

      <!-- 指标卡片 -->
      <div class="wr-metrics">
        <div class="wr-metric">
          <span class="wr-metric-icon">😴</span>
          <span class="wr-metric-val">{{ report.avg_sleep_hours.toFixed(1) }}h</span>
          <span class="wr-metric-label">平均睡眠</span>
          <span class="wr-metric-status" :class="report.avg_sleep_hours >= 7 ? 'good' : 'warn'">
            {{ report.avg_sleep_hours >= 7 ? '达标' : '不足' }}
          </span>
        </div>
        <div class="wr-metric">
          <span class="wr-metric-icon">🍱</span>
          <span class="wr-metric-val">{{ report.avg_meal_completion.toFixed(0) }}%</span>
          <span class="wr-metric-label">饮食规律</span>
          <span class="wr-metric-status" :class="report.avg_meal_completion >= 80 ? 'good' : 'warn'">
            {{ report.avg_meal_completion >= 80 ? '良好' : '偏低' }}
          </span>
        </div>
        <div class="wr-metric">
          <span class="wr-metric-icon">🏃</span>
          <span class="wr-metric-val">{{ report.avg_exercise_minutes.toFixed(0) }}min</span>
          <span class="wr-metric-label">日均运动</span>
          <span class="wr-metric-status" :class="report.avg_exercise_minutes >= 30 ? 'good' : 'warn'">
            {{ report.avg_exercise_minutes >= 30 ? '达标' : '偏少' }}
          </span>
        </div>
        <div class="wr-metric">
          <span class="wr-metric-icon">💧</span>
          <span class="wr-metric-val">{{ report.avg_water_intake.toFixed(0) }}ml</span>
          <span class="wr-metric-label">日均饮水</span>
          <span class="wr-metric-status" :class="report.avg_water_intake >= 1500 ? 'good' : 'warn'">
            {{ report.avg_water_intake >= 1500 ? '充足' : '不足' }}
          </span>
        </div>
      </div>

      <!-- 最佳/最差日 -->
      <div class="wr-days-row" v-if="report.best_day">
        <div class="wr-day best">
          <span class="wr-day-label">⭐ 最佳日</span>
          <span class="wr-day-date">{{ formatDate(report.best_day) }}</span>
        </div>
        <div class="wr-day worst" v-if="report.worst_day && report.worst_day !== report.best_day">
          <span class="wr-day-label">📉 待提升</span>
          <span class="wr-day-date">{{ formatDate(report.worst_day) }}</span>
        </div>
      </div>

      <!-- 改进建议 -->
      <div class="wr-tips">
        <div class="wr-tips-title">💡 改进建议</div>
        <div v-for="(tip, i) in report.improvement_tips" :key="i" class="wr-tip-item">
          <span class="wr-tip-dot">{{ i + 1 }}</span>
          <span class="wr-tip-text">{{ tip }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useHealth } from '../../composables/useHealth'
import type { WeeklyReport } from '../../composables/useHealth'

const { generateWeeklyReport } = useHealth()

const report = ref<WeeklyReport | null>(null)
const loading = ref(false)

const gradeText = computed(() => {
  if (!report.value) return ''
  const texts: Record<string, string> = {
    A: '本周表现优秀！继续保持',
    B: '本周表现良好，还有提升空间',
    C: '本周表现一般，需要调整',
    D: '本周需要更多努力哦',
  }
  return texts[report.value.grade] || ''
})

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

async function refresh() {
  loading.value = true
  try {
    report.value = await generateWeeklyReport()
  } finally {
    loading.value = false
  }
}

onMounted(refresh)
</script>

<style scoped>
.weekly-report{background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.05);border-radius:16px;padding:20px}
.wr-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
.wr-title{font-size:16px;font-weight:700;color:white;margin:0}
.wr-refresh{padding:6px 14px;border-radius:10px;border:1px solid rgba(139,92,246,.2);background:rgba(139,92,246,.08);color:rgba(139,92,246,.7);font-size:12px;cursor:pointer}
.wr-refresh:disabled{opacity:.5;cursor:not-allowed}
.wr-empty{text-align:center;padding:24px;color:rgba(255,255,255,.3);font-size:13px}
.wr-loading{text-align:center;padding:30px}
.wr-spinner{width:28px;height:28px;margin:0 auto 12px;border:2.5px solid rgba(139,92,246,.1);border-top-color:rgba(139,92,246,.6);border-radius:50%;animation:spin .7s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.wr-loading p{font-size:13px;color:rgba(255,255,255,.3)}

/* 评分卡 */
.wr-grade-card{display:flex;align-items:center;gap:16px;padding:16px;border-radius:14px;margin-bottom:16px}
.wr-grade-card.grade-a{background:linear-gradient(135deg,rgba(16,185,129,.12),rgba(16,185,129,.04));border:1px solid rgba(16,185,129,.2)}
.wr-grade-card.grade-b{background:linear-gradient(135deg,rgba(59,130,246,.12),rgba(59,130,246,.04));border:1px solid rgba(59,130,246,.2)}
.wr-grade-card.grade-c{background:linear-gradient(135deg,rgba(245,158,11,.12),rgba(245,158,11,.04));border:1px solid rgba(245,158,11,.2)}
.wr-grade-card.grade-d{background:linear-gradient(135deg,rgba(239,68,68,.12),rgba(239,68,68,.04));border:1px solid rgba(239,68,68,.2)}
.wr-grade{font-size:48px;font-weight:900;line-height:1}
.grade-a .wr-grade{color:#10b981}
.grade-b .wr-grade{color:#3b82f6}
.grade-c .wr-grade{color:#f59e0b}
.grade-d .wr-grade{color:#ef4444}
.wr-grade-info{display:flex;flex-direction:column;gap:4px}
.wr-grade-text{font-size:14px;font-weight:600;color:white}
.wr-grade-days{font-size:12px;color:rgba(255,255,255,.4)}

/* 指标 */
.wr-metrics{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px}
.wr-metric{display:flex;flex-direction:column;align-items:center;gap:4px;padding:14px 10px;border-radius:12px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.05)}
.wr-metric-icon{font-size:22px}
.wr-metric-val{font-size:20px;font-weight:700;color:white}
.wr-metric-label{font-size:11px;color:rgba(255,255,255,.35)}
.wr-metric-status{font-size:10px;padding:2px 8px;border-radius:6px}
.wr-metric-status.good{background:rgba(34,197,94,.1);color:rgba(34,197,94,.7)}
.wr-metric-status.warn{background:rgba(245,158,11,.1);color:rgba(245,158,11,.7)}

/* 最佳/最差日 */
.wr-days-row{display:flex;gap:10px;margin-bottom:16px}
.wr-day{flex:1;padding:12px;border-radius:10px;display:flex;flex-direction:column;gap:4px;text-align:center}
.wr-day.best{background:rgba(34,197,94,.06);border:1px solid rgba(34,197,94,.1)}
.wr-day.worst{background:rgba(245,158,11,.06);border:1px solid rgba(245,158,11,.1)}
.wr-day-label{font-size:11px;color:rgba(255,255,255,.4)}
.wr-day-date{font-size:14px;font-weight:600;color:white}

/* 建议 */
.wr-tips{padding:14px;border-radius:12px;background:rgba(139,92,246,.04);border:1px solid rgba(139,92,246,.08)}
.wr-tips-title{font-size:13px;font-weight:600;color:rgba(255,255,255,.6);margin-bottom:10px}
.wr-tip-item{display:flex;gap:8px;align-items:flex-start;padding:4px 0}
.wr-tip-dot{width:20px;height:20px;border-radius:50%;background:rgba(139,92,246,.1);color:rgba(139,92,246,.6);font-size:11px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.wr-tip-text{font-size:13px;color:rgba(255,255,255,.5);line-height:1.5}
</style>
