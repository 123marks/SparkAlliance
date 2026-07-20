<template>
  <div class="health-page">
    <!-- 三 Tab -->
    <div class="health-tabs">
      <button v-for="t in tabs" :key="t.key" class="tab-btn" :class="{ active: activeTab === t.key }" @click="switchTab(t.key)">{{ t.icon }} {{ t.label }}</button>
    </div>

    <!-- ====== Tab1: 今日打卡 ====== -->
    <div v-if="activeTab === 'checkin'" class="tab-body">
      <!-- 今日健康总览 -->
      <div class="glass-card overview-card">
        <div class="ov-header">
          <h2>🔥 今日健康</h2>
          <span class="ov-date">今日 {{ todayDateStr }}</span>
        </div>
        <div class="ov-main">
          <div class="ov-rings">
            <div class="rings-row">
              <div v-for="r in ringData" :key="r.label" class="ring-item">
                <div class="ring" :style="ringStyle(r.pct, r.color)"><span class="ring-val">{{ r.pct }}%</span></div>
                <span class="ring-label">{{ r.icon }} {{ r.label }}</span>
                <span class="ring-desc">{{ r.desc }}</span>
              </div>
            </div>
          </div>
          <div class="ov-score">
            <div class="score-header">综合评分 <span class="score-info" title="基于WHO/NSF科学标准">ⓘ</span></div>
            <div class="score-big"><span class="score-num">{{ totalScore }}</span><span class="score-max">/100</span><span class="score-grade" :class="'sg-' + grade.toLowerCase()">{{ grade }}{{ grade === 'A' ? '+' : grade === 'B' ? '+' : '' }}</span></div>
            <div class="score-badge" :class="'sb-' + grade.toLowerCase()">{{ gradeDesc }}</div>
            <div class="streak-badge" v-if="streak > 0">⚡ 连续 {{ streak }} 天</div>
            <div class="ov-ai-comment">
              <div class="ov-ai-label">AI 健康点评</div>
              <p class="ov-ai-text">{{ aiOverallComment }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- AI 今日建议 -->
      <div class="glass-card ai-suggest-card">
        <div class="ais-header">
          <h3>✨ AI 今日建议</h3>
          <button class="ais-refresh" @click="refreshSuggestions">换一换 🔄</button>
        </div>
        <div class="ais-list">
          <div v-for="(s, i) in aiSuggestions" :key="i" class="ais-item">
            <span class="ais-icon">{{ s.icon }}</span>
            <div class="ais-body">
              <span class="ais-text">{{ s.text }}</span>
              <span class="ais-sub">{{ s.sub }}</span>
            </div>
            <button class="ais-action" @click="s.action?.()">{{ s.actionLabel }} →</button>
          </div>
        </div>
      </div>

      <!-- 饮食打卡 -->
      <div class="glass-card">
        <div class="section-head"><h3>🍱 饮食打卡</h3><span class="section-sub">记录每一餐，营养更均衡</span><button class="share-item-btn" @click="shareSection('diet')" title="分享饮食记录">📤</button></div>
        <div class="meals-grid">
          <div v-for="(m, i) in mealSlots" :key="i" class="meal-card" :class="{ done: m.done }" @click="m.done = !m.done">
            <div class="meal-img-wrap">
              <span class="meal-icon-lg">{{ m.icon }}</span>
              <span class="meal-check" v-if="m.done">✓</span>
            </div>
            <span class="meal-name">{{ m.name }}</span>
          </div>
          <div class="meal-card add-meal" @click="addMealSlot"><span class="meal-icon-lg">➕</span><span class="meal-name">加餐</span></div>
        </div>
        <div class="food-tags">
          <button v-for="tag in allFoodTags" :key="tag" class="ftag" :class="{ sel: selectedTags.includes(tag) }" @click="toggleTag(selectedTags, tag)">{{ tag }}</button>
          <input v-model="customTag" class="tag-input" placeholder="自定义..." maxlength="8" @keydown.enter.prevent="addCustomTag" />
        </div>
        <!-- 操作按钮行 -->
        <div class="meal-actions">
          <label class="ma-btn"><span class="ma-icon">📷</span><span>拍照上传</span><input type="file" accept="image/*" hidden @change="e => pickFile(e,'mealImg')" /></label>
          <button class="ma-btn" @click="showMealNoteInput = !showMealNoteInput"><span class="ma-icon">📝</span><span>记录文字</span></button>
          <button class="ma-btn"><span class="ma-icon">⭐</span><span>常用餐食</span></button>
          <button class="ma-btn"><span class="ma-icon">📊</span><span>营养分析</span></button>
        </div>
        <img v-if="previews.mealImg" :src="previews.mealImg" class="prev-img" />
        <input v-if="showMealNoteInput" v-model="mealNote" class="note-input" placeholder="饮食备注..." maxlength="100" />
        <div class="inline-ai">🤖 {{ aiMeal }}</div>
      </div>

      <!-- 睡眠记录 -->
      <div class="glass-card">
        <div class="section-head"><h3>😴 睡眠记录</h3><span class="section-sub">养成睡眠分析</span><button class="share-item-btn" @click="shareSection('sleep')" title="分享睡眠记录">📤</button></div>
        <div class="sleep-main">
          <div class="sleep-time-row">
            <div class="tg"><label>入睡</label><input type="time" v-model="sleepStart" class="time-input" /></div>
            <span class="arrow">→</span>
            <div class="tg"><label>起床</label><input type="time" v-model="sleepEnd" class="time-input" /></div>
          </div>
          <div class="sleep-stats" v-if="sleepH > 0">
            <div class="sleep-dur">
              <span class="dur-v">{{ Math.floor(sleepH) }}</span><span class="dur-u">小时</span>
              <span class="dur-v">{{ Math.round((sleepH % 1) * 60) }}</span><span class="dur-u">分</span>
            </div>
            <div class="sleep-score-box">
              <div class="sleep-quality-label">睡眠质量</div>
              <div class="stars"><button v-for="n in 5" :key="n" class="star" :class="{ on: n <= sleepQ }" @click="sleepQ = n">★</button></div>
              <div class="sleep-score" v-if="sleepQ > 0">{{ sleepScoreVal }}分</div>
            </div>
          </div>
          <!-- 睡眠阶段分析条 -->
          <div class="sleep-stages" v-if="sleepH > 0">
            <div class="stage-bar">
              <div class="stage-seg awake" :style="{ width: '8%' }" title="清醒"></div>
              <div class="stage-seg light" :style="{ width: '35%' }" title="浅睡"></div>
              <div class="stage-seg deep" :style="{ width: '25%' }" title="深睡"></div>
              <div class="stage-seg rem" :style="{ width: '22%' }" title="REM"></div>
              <div class="stage-seg move" :style="{ width: '10%' }" title="翻身"></div>
            </div>
            <div class="stage-legend">
              <span class="sl-item"><i class="sl-dot awake"></i>清醒</span>
              <span class="sl-item"><i class="sl-dot light"></i>浅睡</span>
              <span class="sl-item"><i class="sl-dot deep"></i>深睡</span>
              <span class="sl-item"><i class="sl-dot rem"></i>REM</span>
              <span class="sl-item"><i class="sl-dot move"></i>翻身</span>
            </div>
          </div>
          <div class="sleep-analysis" v-if="sleepH > 0">{{ sleepAnalysis }}</div>
        </div>
        <div class="inline-ai">🤖 {{ aiSleep }}</div>
      </div>

      <!-- 运动记录 -->
      <div class="glass-card">
        <div class="section-head"><h3>🏃 运动记录</h3><span class="section-sub">今日运动概览</span><button class="share-item-btn" @click="shareSection('exercise')" title="分享运动记录">📤</button></div>
        <select v-model="exType" class="sel"><option value="">选择运动类型</option><option v-for="t in exTypes" :key="t" :value="t">{{ t }}</option></select>
        <!-- 运动数据卡片 -->
        <div class="ex-metrics" v-if="exType">
          <div class="ex-metric-card">
            <span class="emc-icon">⏱</span>
            <input type="number" v-model.number="exMin" class="emc-val-input" min="0" max="300" />
            <span class="emc-unit">分钟</span>
          </div>
          <div class="ex-metric-card">
            <span class="emc-icon">🔥</span>
            <span class="emc-val">{{ estimatedCalories }}</span>
            <span class="emc-unit">kcal</span>
          </div>
          <div class="ex-metric-card">
            <span class="emc-icon">💓</span>
            <span class="emc-val">{{ estimatedHR }}</span>
            <span class="emc-unit">bpm</span>
          </div>
        </div>
        <div class="ex-row" v-if="exType">
          <div class="ex-f"><label>强度</label>
            <div class="int-btns"><button v-for="l in intLvs" :key="l.v" class="int-b" :class="{ on: exInt === l.v }" @click="exInt = l.v">{{ l.l }}</button></div>
          </div>
        </div>
        <div class="ex-actions" v-if="exType">
          <label class="up-btn">📷 记录照片/视频<input type="file" accept="image/*,video/*" hidden @change="e => pickFile(e,'exImg')" /></label>
          <button class="up-btn" @click="exHistoryVisible = !exHistoryVisible">📋 运动记录历史</button>
        </div>
        <img v-if="previews.exImg" :src="previews.exImg" class="prev-img" />
        <div class="inline-ai">🤖 {{ aiExercise }}</div>
      </div>

      <!-- 饮水记录 -->
      <div class="glass-card">
        <WaterTracker v-model="waterIntake" :disabled="saving" />
      </div>

      <!-- 健康挑战 -->
      <HealthChallenges @joined="showToast('成功加入挑战！')" @abandoned="showToast('已放弃挑战')" />

      <!-- 分享设置 -->
      <div class="glass-card share-settings">
        <div class="section-head"><h3>📤 分享设置</h3><span class="section-sub">同步到健康广场，激励更多朋友一起健康生活</span></div>
        <div class="share-toggle-row">
          <label class="tgl"><input type="checkbox" v-model="isPublic" /><span class="sw"></span> 同步到健康广场</label>
          <div class="share-scope" v-if="isPublic">
            <span class="scope-label">公开范围</span>
            <select v-model="shareScope" class="scope-sel">
              <option value="all">全部可见</option>
              <option value="friends">仅好友</option>
              <option value="school">仅校友</option>
            </select>
          </div>
        </div>
        <div v-if="isPublic" class="share-body">
          <input v-model="shareText" class="note-input" placeholder="说点什么..." maxlength="200" />
          <div class="sys-tags"><button v-for="st in sysTags" :key="st" class="stb" :class="{ sel: sTags.includes(st) }" @click="toggleTag(sTags, st)">#{{ st }}</button></div>
        </div>
        <div class="extern-share">
          <span class="es-label">分享到：</span>
          <button class="es-btn" @click="shareExternal('wechat')">💬 微信好友</button>
          <button class="es-btn" @click="shareExternal('moments')">🔵 朋友圈</button>
          <button class="es-btn" @click="shareExternal('qq')">🐧 QQ好友</button>
          <button class="es-btn" @click="shareExternal('copy')">📋 复制链接</button>
        </div>
      </div>

      <button class="save-btn" @click="confirmSave" :disabled="saving">{{ saving ? '保存中...' : '💾 保存今日打卡' }}</button>
    </div>

    <!-- ====== Tab2: 健康档案 ====== -->
    <div v-if="activeTab === 'records'" class="tab-body">
      <!-- 周报 -->
      <WeeklyReport />

      <!-- 四指标卡 -->
      <div class="metric-cards-row">
        <div v-for="mc in metricCards" :key="mc.label" class="metric-card" :class="mc.cls">
          <span class="mc-icon">{{ mc.icon }}</span>
          <div class="mc-body">
            <span class="mc-val">{{ mc.val }}</span>
            <span class="mc-label">{{ mc.label }}</span>
            <span class="mc-desc">{{ mc.desc }}</span>
          </div>
          <span class="mc-badge" :class="mc.badgeCls">{{ mc.badge }}</span>
        </div>
      </div>

      <!-- SVG 折线图 -->
      <div class="glass-card">
        <div class="chart-head"><h3>📈 健康趋势（本周）</h3><div class="chart-week-sel"><button class="cw-btn active">本周</button></div></div>
        <div class="chart-container" v-for="ch in charts" :key="ch.label">
          <div class="chart-label">{{ ch.icon }} {{ ch.label }}<span class="chart-avg">周均: {{ ch.avg }}</span></div>
          <svg class="line-chart" viewBox="0 0 300 100" preserveAspectRatio="none">
            <defs><linearGradient :id="'g-'+ch.key" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" :stop-color="ch.color" stop-opacity="0.3"/><stop offset="100%" :stop-color="ch.color" stop-opacity="0.02"/></linearGradient></defs>
            <line v-for="y in [25,50,75]" :key="y" x1="0" :y1="y" x2="300" :y2="y" stroke="rgba(255,255,255,0.04)" stroke-width="0.5"/>
            <path :d="areaPath(ch.values)" :fill="'url(#g-'+ch.key+')'" />
            <polyline :points="linePoints(ch.values)" fill="none" :stroke="ch.color" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <circle v-for="(v,i) in ch.values" :key="i" :cx="i * 50" :cy="100 - v" r="3" :fill="ch.color" stroke="#0a0a0f" stroke-width="1.5"/>
            <!-- 峰值标注 -->
            <text v-if="ch.peak !== undefined" :x="ch.peakIdx * 50" :y="100 - ch.peak - 8" text-anchor="middle" fill="white" font-size="8" font-weight="600">{{ ch.peakLabel }}</text>
          </svg>
          <div class="x-labels"><span v-for="d in '一二三四五六日'" :key="d">{{ d }}</span></div>
        </div>
      </div>

      <!-- 身体档案 -->
      <div class="glass-card body-profile">
        <div class="section-head"><h3>📋 身体档案</h3><button class="edit-btn" @click="editBodyProfile">编辑</button></div>
        <div class="bp-main">
          <div class="bp-avatar">
            <div class="bp-silhouette">🧍</div>
          </div>
          <div class="bp-stats">
            <div class="bp-stat"><span class="bps-label">身高</span><span class="bps-val">{{ bodyProfile.height }}<small>cm</small></span></div>
            <div class="bp-stat"><span class="bps-label">体重</span><span class="bps-val">{{ bodyProfile.weight }}<small>kg</small></span></div>
            <div class="bp-stat"><span class="bps-label">BMI</span><span class="bps-val">{{ bmi }}<small class="bmi-label">{{ bmiLabel }}</small></span></div>
            <div class="bp-stat"><span class="bps-label">目标体重</span><span class="bps-val">{{ bodyProfile.targetWeight }}<small>kg</small></span></div>
          </div>
        </div>
        <div class="bp-changes" v-if="bodyProfile.weight > 0">
          <span class="bpc-title">最近变化（近 7 天）</span>
          <div class="bpc-row">
            <span class="bpc-item"><b>体重</b> {{ bodyProfile.weightChange >= 0 ? '+' : '' }}{{ bodyProfile.weightChange }} kg</span>
            <span class="bpc-item"><b>体脂率</b> {{ bodyProfile.fatChange >= 0 ? '+' : '' }}{{ bodyProfile.fatChange }}%</span>
            <span class="bpc-item"><b>肌肉量</b> {{ bodyProfile.muscleChange >= 0 ? '+' : '' }}{{ bodyProfile.muscleChange }} kg</span>
          </div>
        </div>
        <div class="bp-advice">{{ bodyAdvice }}</div>
      </div>

      <!-- 习惯完成度热力图 -->
      <div class="glass-card heatmap-card">
        <div class="section-head">
          <h3>🔥 习惯完成度热力图</h3>
          <span class="hm-period">近 30 天</span>
        </div>
        <div class="heatmap-cal">
          <div class="hm-weekdays">
            <span v-for="d in ['日','一','二','三','四','五','六']" :key="d">{{ d }}</span>
          </div>
          <div class="hm-grid">
            <div v-for="(day, i) in heatmapDays" :key="i" class="hm-cell" :class="day.cls" :title="day.date + ': ' + day.score + '%'">
              <span v-if="day.isToday" class="hm-today-dot"></span>
            </div>
          </div>
          <div class="hm-legend">
            <span class="hml-label">少</span>
            <span class="hml-box lv0"></span>
            <span class="hml-box lv1"></span>
            <span class="hml-box lv2"></span>
            <span class="hml-box lv3"></span>
            <span class="hml-box lv4"></span>
            <span class="hml-label">多</span>
          </div>
        </div>
        <div class="hm-stats">
          <span class="hms-item">🔥 连续打卡 <b>{{ streak }}</b> 天</span>
          <span class="hms-item">📅 累计打卡 <b>{{ totalCheckinDays }}</b> 天</span>
        </div>
      </div>

      <!-- AI 健康助手对话 -->
      <div class="glass-card ai-chat-card">
        <h3>🤖 AI 健康助手</h3>
        <div class="ai-chat-body" ref="chatBody">
          <div v-for="(msg, i) in aiMessages" :key="i" class="ai-msg" :class="msg.role">
            <span class="msg-avatar" v-if="msg.role === 'ai'">🤖</span>
            <span class="msg-text">{{ msg.text }}</span>
          </div>
        </div>
        <div class="ai-chat-input">
          <input v-model="aiInput" placeholder="问我关于你的健康数据..." @keydown.enter.prevent="sendAiMsg" />
          <button @click="sendAiMsg" :disabled="aiLoading">{{ aiLoading ? '...' : '发送' }}</button>
        </div>
      </div>

      <!-- 历史记录 -->
      <div class="glass-card">
        <div class="section-head"><h3>📅 历史记录</h3><button class="see-all-btn">查看全部 →</button></div>
        <div v-if="!historyRecords.length" class="empty-hint">暂无记录</div>
        <div v-for="rec in historyRecords" :key="rec.id" class="history-item" @click="viewRecord(rec)">
          <span class="hi-date">{{ rec.date }}</span>
          <span class="hi-tags">
            <span v-if="getMealCount(rec.meals) > 0">🍱{{ getMealCount(rec.meals) }}餐</span>
            <span v-if="rec.sleep_quality">😴{{ rec.sleep_quality }}★</span>
            <span v-if="rec.exercise_minutes > 0">🏃{{ rec.exercise_minutes }}min</span>
            <span v-if="rec.water_intake > 0">💧{{ rec.water_intake }}ml</span>
          </span>
          <span class="hi-grade" :class="'hig-' + getRecGrade(rec)">{{ getRecGrade(rec) }}</span>
          <span class="hi-arrow">›</span>
        </div>
        <button v-if="canLoadMore" class="load-more-btn" @click="loadMoreHistory">加载更多</button>
      </div>

      <!-- 推荐改进计划 -->
      <div class="glass-card plans-card">
        <h3>🎯 推荐改进计划</h3>
        <div class="plans-grid">
          <div v-for="plan in improvementPlans" :key="plan.title" class="plan-item">
            <span class="plan-icon">{{ plan.icon }}</span>
            <div class="plan-body">
              <span class="plan-title">{{ plan.title }}</span>
              <span class="plan-desc">{{ plan.desc }}</span>
              <div class="plan-progress">
                <div class="plan-bar"><div class="plan-fill" :style="{ width: plan.progress + '%' }"></div></div>
                <span class="plan-pct">{{ plan.progressLabel }}</span>
              </div>
            </div>
            <button class="plan-go">去执行</button>
          </div>
        </div>
      </div>

      <!-- 历史记录详情弹窗 -->
      <Teleport to="body">
        <div v-if="viewingRecord" class="modal-overlay" @click.self="viewingRecord = null">
          <div class="modal-body record-detail">
            <div class="rd-header"><h3>📅 {{ viewingRecord.date }} 健康记录</h3><button class="close-btn" @click="viewingRecord = null">✕</button></div>
            <div class="rd-section"><b>🍱 饮食</b>
              <div v-for="(v,k) in viewingRecord.meals" :key="k" class="rd-meal"><span class="rd-dot" :class="{ done: v?.done }">{{ v?.done ? '✓' : '✗' }}</span> {{ v?.name || k }}</div>
            </div>
            <div class="rd-section" v-if="viewingRecord.sleep_start"><b>😴 睡眠</b><p>{{ viewingRecord.sleep_start?.slice(11,16) }} → {{ viewingRecord.sleep_end?.slice(11,16) }}，质量 {{ viewingRecord.sleep_quality }}★</p></div>
            <div class="rd-section" v-if="viewingRecord.exercise_type"><b>🏃 运动</b><p>{{ viewingRecord.exercise_type }} {{ viewingRecord.exercise_minutes }}分钟（{{ viewingRecord.exercise_intensity === 'high' ? '高' : viewingRecord.exercise_intensity === 'moderate' ? '中' : '轻' }}强度）</p></div>
            <div class="rd-section" v-if="viewingRecord.water_intake > 0"><b>💧 饮水</b><p>{{ viewingRecord.water_intake }}ml</p></div>
            <div class="rd-section" v-if="viewingRecord.ai_comment"><b>🤖 AI评语</b><p>{{ viewingRecord.ai_comment }}</p></div>
          </div>
        </div>
      </Teleport>
    </div>

    <!-- ====== Tab3: 健康广场 ====== -->
    <div v-if="activeTab === 'plaza'" class="tab-body">
      <!-- 广场头部 -->
      <div class="plaza-header">
        <div class="ph-title-row">
          <h2 class="ph-title">健康广场 ✨</h2>
          <button class="ph-publish-btn" @click="showPublishModal = true">✏️ 发布分享</button>
        </div>
        <p class="ph-subtitle">分享每一次坚持，点亮彼此的健康生活</p>
        <div class="ph-stats">
          <span class="phs">📝 今日分享 <b>{{ plazaStats.todayPosts }}</b> 条</span>
          <span class="phs">👥 活跃用户 <b>{{ plazaStats.activeUsers }}</b> 人</span>
          <span class="phs">❤️ 已点赞 <b>{{ plazaStats.totalLikes }}</b> 次</span>
        </div>
      </div>

      <div class="plaza-layout">
        <!-- 主内容区 -->
        <div class="plaza-main">
          <div class="plaza-filters">
            <button v-for="f in plazaFilters" :key="f.key" class="fbtn" :class="{ on: pFilter === f.key, disabled: f.dev }" @click="!f.dev && (pFilter = f.key, loadPlaza())" :title="f.dev ? '功能开发中' : ''">
              {{ f.label }}{{ f.dev ? ' 🔒' : '' }}
            </button>
          </div>
          <div v-if="pLoading" class="empty-hint">加载中...</div>
          <div v-else-if="!pPosts.length" class="empty-hint">暂无分享 💪</div>
          <div v-else class="plaza-feed">
            <div v-for="post in pPosts" :key="post.id" class="glass-card plaza-card">
              <div class="ph-user">
                <div class="pa" :style="post.avatar_url ? { backgroundImage: 'url(' + post.avatar_url + ')' } : {}">{{ post.avatar_url ? '' : (post.nickname||'?')[0] }}</div>
                <div class="pi">
                  <div class="pn-row">
                    <span class="pn">{{ post.nickname || '匿名' }}</span>
                    <span class="user-badge" v-if="post.badge">{{ post.badge }}</span>
                  </div>
                  <span class="pt">{{ fmtTime(post.created_at) }}</span>
                </div>
                <button class="report-btn" @click="openReport(post)" title="举报">⚠️</button>
              </div>
              <p class="ptxt" v-if="post.share_text">{{ post.share_text }}</p>

              <!-- 嵌入的运动/睡眠数据卡 -->
              <div class="post-data-card" v-if="post.exercise_type && post.exercise_minutes > 0">
                <div class="pdc-type"><span class="pdc-icon">{{ getExIcon(post.exercise_type) }}</span> {{ post.exercise_type }}</div>
                <div class="pdc-metrics">
                  <div class="pdc-m"><span class="pdc-v">{{ post.exercise_minutes }}</span><span class="pdc-u">分钟</span></div>
                  <div class="pdc-m"><span class="pdc-v">{{ Math.round(post.exercise_minutes * 8.3) }}</span><span class="pdc-u">kcal</span></div>
                  <div class="pdc-m"><span class="pdc-v">{{ 100 + Math.round(post.exercise_minutes * 0.8) }}</span><span class="pdc-u">bpm</span></div>
                </div>
              </div>
              <div class="post-data-card sleep-data" v-if="post.sleep_quality && post.sleep_start">
                <div class="pdc-sleep-info">
                  <span class="pdc-sleep-label">睡眠时长</span>
                  <span class="pdc-sleep-dur">{{ getSleepDur(post) }}</span>
                </div>
                <div class="pdc-sleep-qual">
                  <span class="pdc-badge">睡眠质量 {{ post.sleep_quality > 3 ? '优秀' : '良好' }}</span>
                </div>
              </div>

              <div class="psum">
                <span v-if="getMealCount(post.meals)>0" class="ps">🍱 {{ getMealCount(post.meals) }}餐</span>
                <span v-if="post.sleep_quality" class="ps">😴 {{ post.sleep_quality }}★</span>
                <span v-if="post.exercise_minutes>0" class="ps">🏃 {{ post.exercise_type }} {{ post.exercise_minutes }}min</span>
              </div>
              <div class="ptags" v-if="post.share_tags?.length"><span v-for="t in post.share_tags" :key="t" class="ptg">#{{ t }}</span></div>
              <div class="pai" v-if="post.ai_comment">🤖 {{ post.ai_comment }}</div>
              <div class="pacts">
                <button class="ab" :class="{ liked: post.user_liked }" @click="toggleLike(post,'like')">❤️ {{ post.like_count||0 }}</button>
                <button class="ab" :class="{ liked: post.user_clapped }" @click="toggleLike(post,'clap')">👏 {{ post.clap_count||0 }}</button>
                <button class="ab" @click="post.showComments=!post.showComments">💬 {{ post.comment_count||0 }}</button>
                <button class="ab">🔄 转发</button>
              </div>
              <div class="cmt-sec" v-if="post.showComments">
                <div v-for="c in post.comments" :key="c.id" class="cmt-item"><b>{{ c.nickname||'匿名' }}：</b>{{ c.content }}</div>
                <div class="cmt-row"><input v-model="post.newComment" class="cmt-in" placeholder="鼓励一下..." maxlength="200" @keydown.enter.prevent="submitComment(post)" /><button class="cmt-send" @click="submitComment(post)" :disabled="!post.newComment?.trim()">发送</button></div>
              </div>
            </div>
          </div>
          <button class="load-more-plaza" @click="loadPlaza">继续浏览更多分享 ↓</button>
        </div>

        <!-- 右侧栏 -->
        <div class="plaza-sidebar">
          <!-- 今日热门挑战 -->
          <div class="glass-card sidebar-card">
            <div class="sc-head"><h4>🔥 今日热门挑战</h4><button class="sc-more">更多挑战 →</button></div>
            <div class="hot-challenges">
              <div v-for="hc in hotChallenges" :key="hc.title" class="hc-item">
                <span class="hci-icon">{{ hc.icon }}</span>
                <div class="hci-body">
                  <span class="hci-title">{{ hc.title }}</span>
                  <span class="hci-count">{{ hc.participants }} 人参与</span>
                </div>
                <button class="hci-join">去挑战</button>
              </div>
            </div>
          </div>

          <!-- 打卡排行榜 -->
          <div class="glass-card sidebar-card">
            <div class="sc-head"><h4>🏆 打卡排行榜</h4></div>
            <div class="leaderboard">
              <div v-for="(lb, i) in leaderboard" :key="i" class="lb-item">
                <span class="lb-rank" :class="'rank-' + (i+1)">{{ i + 1 }}</span>
                <div class="lb-avatar">{{ lb.name[0] }}</div>
                <span class="lb-name">{{ lb.name }}</span>
                <span class="lb-streak">🔥 {{ lb.streak }}</span>
              </div>
            </div>
            <div class="lb-me">
              <span class="lb-rank">{{ myRank }}</span>
              <span class="lb-name">我的排名</span>
              <span class="lb-streak">🔥 {{ streak }}</span>
            </div>
          </div>

          <!-- 推荐关注 -->
          <div class="glass-card sidebar-card">
            <div class="sc-head"><h4>👋 推荐关注</h4></div>
            <div class="recommend-users">
              <div v-for="ru in recommendedUsers" :key="ru.name" class="ru-item">
                <div class="ru-avatar">{{ ru.name[0] }}</div>
                <div class="ru-info">
                  <span class="ru-name">{{ ru.name }}</span>
                  <span class="ru-desc">{{ ru.desc }}</span>
                </div>
                <button class="ru-follow">关注</button>
              </div>
            </div>
          </div>

          <!-- 热门话题 -->
          <div class="glass-card sidebar-card">
            <div class="sc-head"><h4>🔖 热门话题</h4><button class="sc-more">更多话题 →</button></div>
            <div class="hot-topics">
              <div v-for="ht in hotTopics" :key="ht.tag" class="ht-item">
                <span class="ht-tag"># {{ ht.tag }}</span>
                <span class="ht-count">{{ ht.count }} 条讨论</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 举报弹窗 -->
    <Teleport to="body">
      <div v-if="reportTarget" class="modal-overlay" @click.self="reportTarget = null">
        <div class="modal-body">
          <h3>⚠️ 举报内容</h3>
          <div class="report-reasons">
            <button v-for="r in reportReasons" :key="r" class="rr-btn" :class="{ sel: reportReason === r }" @click="reportReason = r">{{ r }}</button>
          </div>
          <textarea v-model="reportNote" class="report-note" placeholder="补充说明（可选）..." maxlength="200"></textarea>
          <div class="modal-btns">
            <button class="mbtn cancel" @click="reportTarget = null">取消</button>
            <button class="mbtn confirm" @click="submitReport" :disabled="!reportReason">提交举报</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 确认弹窗 -->
    <Teleport to="body">
      <div v-if="showConfirm" class="modal-overlay" @click.self="showConfirm = false">
        <div class="modal-body">
          <h3>⚠️ 记录不完整</h3>
          <p>{{ confirmMsg }}</p>
          <p class="hint">记录越全面，健康分析越准确～</p>
          <div class="modal-btns"><button class="mbtn cancel" @click="showConfirm = false">返回补充</button><button class="mbtn confirm" @click="showConfirm = false; doSave()">仍然保存</button></div>
        </div>
      </div>
    </Teleport>

    <!-- 分享面板 -->
    <Teleport to="body">
      <div v-if="sharePanel" class="modal-overlay" @click.self="sharePanel = null">
        <div class="modal-body share-modal">
          <h3>📤 分享「{{ sharePanel }}」记录</h3>
          <p class="share-preview">{{ shareSectionText }}</p>
          <div class="share-btns">
            <button class="es-btn" @click="doShareExternal('wechat')">💬 微信</button>
            <button class="es-btn" @click="doShareExternal('qq')">🐧 QQ</button>
            <button class="es-btn" @click="doShareExternal('weibo')">📢 微博</button>
            <button class="es-btn" @click="doShareExternal('copy')">📋 复制</button>
          </div>
          <div class="modal-btns"><button class="mbtn cancel" @click="sharePanel = null">关闭</button></div>
        </div>
      </div>
    </Teleport>

    <!-- 身体档案编辑弹窗 -->
    <Teleport to="body">
      <div v-if="showBodyEdit" class="modal-overlay" @click.self="showBodyEdit = false">
        <div class="modal-body">
          <h3>📋 编辑身体档案</h3>
          <div class="bp-form">
            <div class="bp-field"><label>身高 (cm)</label><input type="number" v-model.number="bodyProfile.height" min="100" max="250" /></div>
            <div class="bp-field"><label>体重 (kg)</label><input type="number" v-model.number="bodyProfile.weight" min="30" max="200" step="0.1" /></div>
            <div class="bp-field"><label>目标体重 (kg)</label><input type="number" v-model.number="bodyProfile.targetWeight" min="30" max="200" step="0.1" /></div>
          </div>
          <div class="modal-btns">
            <button class="mbtn cancel" @click="showBodyEdit = false">取消</button>
            <button class="mbtn confirm" @click="saveBodyProfile">保存</button>
          </div>
        </div>
      </div>
    </Teleport>

    <Transition name="toast"><div v-if="toast.show" class="htoast" :class="toast.type">{{ toast.msg }}</div></Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { supabase } from '../../supabase'
import { useAuth } from '../../composables/useAuth'
import WaterTracker from '../../components/health/WaterTracker.vue'
import HealthChallenges from '../../components/health/HealthChallenges.vue'
import WeeklyReport from '../../components/health/WeeklyReport.vue'

const { user } = useAuth()

function getLocalDate(offset = 0): string {
  const d = new Date()
  if (offset) d.setDate(d.getDate() + offset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const todayDateStr = computed(() => {
  const d = new Date()
  const weekDays = ['日', '一', '二', '三', '四', '五', '六']
  return `${d.getMonth() + 1}月${d.getDate()}日 周${weekDays[d.getDay()]}`
})

// ====== Tabs ======
const tabs = [{ key: 'checkin', icon: '❤️', label: '今日打卡' }, { key: 'records', icon: '📊', label: '健康档案' }, { key: 'plaza', icon: '🌐', label: '健康广场' }]
const activeTab = ref('checkin')
function switchTab(key: string) { activeTab.value = key; if (key === 'plaza') loadPlaza(); if (key === 'records') loadRecordsTab() }

// Toast
const toast = reactive({ show: false, msg: '', type: 'success' as 'success' | 'error' })
let tt: ReturnType<typeof setTimeout>
function showToast(msg: string, type: 'success' | 'error' = 'success') { clearTimeout(tt); toast.show = true; toast.msg = msg; toast.type = type; tt = setTimeout(() => toast.show = false, 2500) }

// ====== 常量 ======
const baseTags = ['水果','主食','蔬菜','肉类','奶制品','零食','奶茶','外卖','粗粮','汤粥','坚果','饮料']
const exTypes = ['跑步','骑行','篮球','足球','游泳','瑜伽','健身','羽毛球','散步','跳绳','拉伸','其他']
const intLvs = [{ v: 'light', l: '轻松' }, { v: 'moderate', l: '中等' }, { v: 'high', l: '高强度' }]
const sysTags = ['早起打卡','健身','跑步','减脂','增肌','早睡','素食','自律','减压','养生']
const reportReasons = ['虚假信息', '广告营销', '不良内容', '侵犯隐私', '其他']

// ====== 饮食 ======
interface Meal { name: string; icon: string; done: boolean }
const mealSlots = ref<Meal[]>([{ name: '早餐', icon: '🌅', done: false }, { name: '午餐', icon: '☀️', done: false }, { name: '晚餐', icon: '🌙', done: false }])
const selectedTags = ref<string[]>([])
const customTags = ref<string[]>([])
const customTag = ref('')
const mealNote = ref('')
const showMealNoteInput = ref(false)
const allFoodTags = computed(() => [...baseTags, ...customTags.value])
function addMealSlot() { mealSlots.value.push({ name: `加餐${mealSlots.value.length - 2}`, icon: '🍪', done: false }) }
function addCustomTag() { const t = customTag.value.trim(); if (t && !allFoodTags.value.includes(t)) customTags.value.push(t); customTag.value = '' }

// ====== 睡眠 ======
const sleepStart = ref(''); const sleepEnd = ref(''); const sleepQ = ref(0)
const sleepH = computed(() => { if (!sleepStart.value || !sleepEnd.value) return 0; const [sh,sm] = sleepStart.value.split(':').map(Number); const [eh,em] = sleepEnd.value.split(':').map(Number); let m = (eh*60+em)-(sh*60+sm); if (m < 0) m += 1440; return m / 60 })
const sleepScoreVal = computed(() => { const h = sleepH.value; const q = sleepQ.value; let base = 0; if (h >= 7 && h <= 9) base = 80; else if (h >= 6) base = 60; else if (h > 9) base = 65; else base = 40; return Math.min(100, base + q * 4) })
const sleepAnalysis = computed(() => {
  if (sleepH.value <= 0) return ''
  const h = sleepH.value
  if (h >= 7 && h <= 9 && sleepQ.value >= 4) return '入睡较快，深睡占比充足，建议保持规律作息。'
  if (h >= 7) return '睡眠时长达标，可以关注提升深睡质量。'
  return '睡眠时长偏短，建议提前30分钟上床，避免睡前使用手机。'
})

// ====== 运动 ======
const exType = ref(''); const exMin = ref(0); const exInt = ref('')
const exHistoryVisible = ref(false)
const estimatedCalories = computed(() => {
  if (!exMin.value) return 0
  const base: Record<string, number> = { '跑步': 10, '骑行': 7, '篮球': 8, '游泳': 9, '瑜伽': 4, '健身': 6, '散步': 3, '跳绳': 11 }
  const rate = base[exType.value] || 6
  const mult = exInt.value === 'high' ? 1.3 : exInt.value === 'moderate' ? 1.0 : 0.8
  return Math.round(exMin.value * rate * mult)
})
const estimatedHR = computed(() => {
  if (!exMin.value) return 0
  const base = exInt.value === 'high' ? 155 : exInt.value === 'moderate' ? 130 : 110
  return base + Math.round(Math.random() * 10 - 5)
})

// ====== 饮水 ======
const waterIntake = ref(0)

// ====== 文件 ======
const files = reactive<Record<string, File | null>>({ mealImg: null, mealVid: null, exImg: null, exVid: null })
const previews = reactive<Record<string, string>>({ mealImg: '', mealVid: '', exImg: '', exVid: '' })
function pickFile(e: Event, key: string) { const f = (e.target as HTMLInputElement).files?.[0]; if (!f) return; files[key] = f; previews[key] = URL.createObjectURL(f) }

// ====== 分享 ======
const isPublic = ref(false); const shareText = ref(''); const sTags = ref<string[]>([])
const shareScope = ref('all')
const showPublishModal = ref(false)
function toggleTag(arr: string[], tag: string) { const i = arr.indexOf(tag); if (i >= 0) arr.splice(i, 1); else arr.push(tag) }

// ====== 科学评分 ======
const mealScore = computed(() => { const d = mealSlots.value.slice(0, 3).filter(m => m.done).length; return Math.round((d / 3) * 100) })
const sleepScore = computed(() => { if (sleepH.value <= 0) return 0; const h = sleepH.value; if (h >= 7 && h <= 9) return 100; if (h > 9) return 80; if (h >= 6) return 70; if (h >= 5) return 40; return 20 })
const exerciseScore = computed(() => { const mult = exInt.value === 'high' ? 1.3 : exInt.value === 'moderate' ? 1.0 : 0.8; return Math.min(100, Math.round((exMin.value * mult / 30) * 100)) })
const waterScore = computed(() => Math.min(100, Math.round((waterIntake.value / 2000) * 100)))
const totalScore = computed(() => Math.round(mealScore.value * 0.3 + sleepScore.value * 0.3 + exerciseScore.value * 0.25 + waterScore.value * 0.15))
const grade = computed(() => { const s = totalScore.value; if (s >= 85) return 'A'; if (s >= 70) return 'B'; if (s >= 50) return 'C'; return 'D' })
const gradeDesc = computed(() => ({ A: '优秀', B: '良好', C: '一般', D: '待改善' }[grade.value] || ''))

const ringData = computed(() => [
  { label: '饮食', icon: '🍱', pct: mealScore.value, color: '#10b981', desc: `已记录 ${mealSlots.value.filter(m => m.done).length}/${mealSlots.value.length} 餐` },
  { label: '睡眠', icon: '😴', pct: sleepScore.value, color: '#8b5cf6', desc: sleepH.value > 0 ? `${sleepH.value.toFixed(1)}小时` : '未记录' },
  { label: '运动', icon: '🏃', pct: exerciseScore.value, color: '#f59e0b', desc: exMin.value > 0 ? `${exMin.value} 分钟` : '未记录' },
  { label: '饮水', icon: '💧', pct: waterScore.value, color: '#3b82f6', desc: `${waterIntake.value} / 2000ml` },
])
function ringStyle(p: number, c: string) { return { background: `conic-gradient(${c} ${p * 3.6}deg, rgba(255,255,255,0.06) 0deg)` } }

// ====== AI 综合点评 ======
const aiOverallComment = computed(() => {
  const s = totalScore.value
  if (s >= 85) return '整体状态良好，饮食与饮水有提升空间。运动达标规律性好，有助于提升精细状态。'
  if (s >= 70) return '健康表现不错，注意保持规律。建议适当增加运动频率，保证充足睡眠。'
  if (s >= 50) return '今日状态一般，多个指标有改善空间。建议注重三餐规律和运动量。'
  return '健康指标较弱，建议优先保证充足睡眠和三餐规律，循序渐进增加运动。'
})

// ====== AI 今日建议 ======
const aiSuggestions = computed(() => {
  const suggestions = []
  if (waterIntake.value < 2000) suggestions.push({ icon: '💧', text: `今天还差 ${2000 - waterIntake.value}ml 饮水`, sub: '建议分次饮水，保持每次150-250ml', actionLabel: '去喝水', action: () => switchTab('checkin') })
  if (sleepH.value <= 0 || sleepH.value < 7) suggestions.push({ icon: '🌙', text: '建议 23:30 前入睡', sub: '保证 7-9 小时，提升睡眠质量', actionLabel: '调整作息', action: undefined })
  if (exMin.value < 30) suggestions.push({ icon: '🏃', text: `再运动 ${30 - exMin.value} 分钟达标`, sub: `今日已运动 ${exMin.value} 分钟，中等强度`, actionLabel: '去运动', action: undefined })
  if (mealSlots.value.filter(m => m.done).length < 3) suggestions.push({ icon: '🍱', text: '记得按时吃饭', sub: '三餐规律是健康的基础', actionLabel: '去打卡', action: undefined })
  return suggestions.slice(0, 3)
})
function refreshSuggestions() { showToast('已刷新建议') }

// ====== AI 分模块评语 ======
const aiMeal = computed(() => { const d = mealSlots.value.filter(m => m.done).length; const ex = mealSlots.value.length - 3; if (d === 0) return '还没有饮食记录，按时吃饭很重要 🍎'; if (d >= 3 && ex > 0) return `三餐全勤+${ex}次加餐，注意控制总量～`; if (d >= 3) return '三餐全勤！规律饮食是健康的基础 👍'; return `吃了${d}餐，建议保持三餐规律～` })
const aiSleep = computed(() => { if (sleepH.value <= 0) return '还没有睡眠记录，充足睡眠 7-9h 是身心健康的关键 🌙'; const h = sleepH.value; if (h >= 7 && h <= 9) return `${h.toFixed(1)}h，符合 NSF 推荐标准，精力满满 💪`; if (h > 9) return `${h.toFixed(1)}h 偏多，过度睡眠也影响精神状态～`; if (h >= 6) return `${h.toFixed(1)}h 稍短，试试提前30分钟入睡 🌙`; return `只有${h.toFixed(1)}h，严重不足！成人每天需 7-9h 睡眠 ⚠️` })
const aiExercise = computed(() => { if (exMin.value <= 0) return 'WHO 建议每天至少30分钟中等强度运动，动起来吧 🏃'; if (exMin.value >= 30) return `${exType.value||'运动'}${exMin.value}min，达到 WHO 每日推荐量 🎉`; return `${exType.value||'运动'}${exMin.value}min，距离30min目标还差${30-exMin.value}分钟～` })

// ====== 单项分享 ======
const sharePanel = ref<string | null>(null)
const shareSectionText = computed(() => {
  if (sharePanel.value === '饮食') { const d = mealSlots.value.filter(m => m.done).map(m => m.name).join('、'); return `今日饮食：已完成 ${d || '无'}。${aiMeal.value}` }
  if (sharePanel.value === '睡眠') return `今日睡眠：${sleepH.value > 0 ? sleepH.value.toFixed(1) + '小时' : '未记录'}。${aiSleep.value}`
  if (sharePanel.value === '运动') return `今日运动：${exType.value || '无'} ${exMin.value}分钟。${aiExercise.value}`
  return ''
})
function shareSection(type: string) { sharePanel.value = type === 'diet' ? '饮食' : type === 'sleep' ? '睡眠' : '运动' }

// ====== 外部分享 ======
function shareExternal(platform: string) {
  const text = `【SparkAlliance 健康打卡】\n饮食：${mealScore.value}% | 睡眠：${sleepScore.value}% | 运动：${exerciseScore.value}% | 饮水：${waterScore.value}%\n综合评分：${grade.value}\n${aiMeal.value}`
  doShareWith(platform, text)
}
function doShareExternal(platform: string) { doShareWith(platform, shareSectionText.value) }
function doShareWith(platform: string, text: string) {
  if (platform === 'copy') { navigator.clipboard.writeText(text); showToast('已复制到剪贴板'); sharePanel.value = null; return }
  if (navigator.share && platform === 'wechat') { navigator.share({ title: 'SparkAlliance 健康打卡', text }).catch(() => {}); sharePanel.value = null; return }
  const encoded = encodeURIComponent(text)
  const urls: Record<string, string> = { wechat: `https://service.weibo.com/share/share.php?title=${encoded}`, qq: `https://connect.qq.com/widget/shareqq/index.html?title=${encoded}`, weibo: `https://service.weibo.com/share/share.php?title=${encoded}` }
  if (urls[platform]) window.open(urls[platform], '_blank', 'width=600,height=400')
  sharePanel.value = null
}

// ====== 保存 ======
const saving = ref(false); const existingId = ref<string | null>(null); const streak = ref(0)
const showConfirm = ref(false); const confirmMsg = ref('')

function confirmSave() {
  const miss: string[] = []; if (!mealSlots.value.some(m => m.done)) miss.push('饮食'); if (sleepH.value <= 0) miss.push('睡眠'); if (exMin.value <= 0) miss.push('运动'); if (waterIntake.value <= 0) miss.push('饮水')
  if (miss.length === 4) { showToast('请至少填写一项健康记录', 'error'); return }
  if (miss.length > 0) { confirmMsg.value = `还没填写「${miss.join('、')}」记录。`; showConfirm.value = true } else doSave()
}

async function doSave() {
  if (!user.value) return; saving.value = true
  try {
    const urls: Record<string, string> = {}
    for (const k of Object.keys(files)) { if (files[k]) urls[k] = await uploadFile(files[k]!, k.includes('meal') ? 'meals' : 'exercise') }
    const today = getLocalDate()
    const mealsJson: Record<string, any> = {}
    mealSlots.value.forEach((m, i) => { mealsJson[i < 3 ? ['breakfast','lunch','dinner'][i] : `snack_${i-2}`] = { done: m.done, name: m.name, tags: selectedTags.value, note: mealNote.value, image_url: i === 0 ? (urls.mealImg||'') : '', video_url: i === 0 ? (urls.mealVid||'') : '' } })
    const ai = [aiMeal.value, aiSleep.value, aiExercise.value].filter(Boolean).join(' | ')
    const rec: Record<string, any> = { user_id: user.value.id, date: today, meals: mealsJson, sleep_start: sleepStart.value ? `${today}T${sleepStart.value}:00` : null, sleep_end: sleepEnd.value ? `${today}T${sleepEnd.value}:00` : null, sleep_quality: sleepQ.value || null, exercise_type: exType.value || null, exercise_minutes: exMin.value || 0, exercise_intensity: exInt.value || null, exercise_image_url: urls.exImg || urls.exVid || null, water_intake: waterIntake.value || 0, is_public: isPublic.value, share_text: shareText.value || null, share_tags: sTags.value.length ? sTags.value : null, ai_comment: ai || null, updated_at: new Date().toISOString() }
    if (existingId.value) { const { error } = await supabase.from('health_checkins').update(rec).eq('id', existingId.value); if (error) throw error }
    else { const { error } = await supabase.from('health_checkins').insert(rec); if (error) throw error }
    const hasMeal = mealSlots.value.some(m => m.done)
    const hasSleep = sleepH.value > 0
    const hasEx = exMin.value > 0
    const hasWater = waterIntake.value > 0
    if (hasMeal || hasSleep || hasEx || hasWater) await updateStreak(today)
    for (const k of Object.keys(files)) { files[k] = null }
    for (const k of Object.keys(previews)) { if (previews[k]) { URL.revokeObjectURL(previews[k]); previews[k] = '' } }
    showToast('保存成功！'); await loadToday()
  } catch (e: any) { showToast(e.message || '保存失败', 'error') } finally { saving.value = false }
}

async function uploadFile(file: File, folder: string) {
  const path = `${user.value!.id}/${folder}/${Date.now()}.${file.name.split('.').pop()}`
  const { error } = await supabase.storage.from('health-images').upload(path, file)
  if (error) throw error
  return path
}

async function updateStreak(today: string) {
  if (!user.value) return
  const { data } = await supabase.from('health_streaks').select('*').eq('user_id', user.value.id).maybeSingle()
  const yday = getLocalDate(-1)
  if (data) { let ns = data.current_streak; if (data.last_checkin_date === yday) ns++; else if (data.last_checkin_date !== today) ns = 1; await supabase.from('health_streaks').update({ current_streak: ns, longest_streak: Math.max(ns, data.longest_streak), last_checkin_date: today }).eq('user_id', user.value.id); streak.value = ns }
  else { await supabase.from('health_streaks').insert({ user_id: user.value.id, current_streak: 1, longest_streak: 1, last_checkin_date: today }); streak.value = 1 }
}

// ====== 加载今日 ======
async function loadToday() {
  if (!user.value) return
  const today = getLocalDate()
  const { data } = await supabase.from('health_checkins').select('*').eq('user_id', user.value.id).eq('date', today).maybeSingle()
  if (data) {
    existingId.value = data.id; const m = data.meals as any || {}
    const slots: Meal[] = [{ name: '早餐', icon: '🌅', done: m.breakfast?.done||false }, { name: '午餐', icon: '☀️', done: m.lunch?.done||false }, { name: '晚餐', icon: '🌙', done: m.dinner?.done||false }]
    Object.keys(m).filter(k => k.startsWith('snack')).forEach((k, i) => slots.push({ name: m[k].name||`加餐${i+1}`, icon: '🍪', done: m[k].done||false }))
    mealSlots.value = slots; mealNote.value = m.breakfast?.note||''; selectedTags.value = m.breakfast?.tags||[]
    if (data.sleep_start) sleepStart.value = data.sleep_start.slice(11,16); if (data.sleep_end) sleepEnd.value = data.sleep_end.slice(11,16)
    sleepQ.value = data.sleep_quality||0; exType.value = data.exercise_type||''; exMin.value = data.exercise_minutes||0; exInt.value = data.exercise_intensity||''
    waterIntake.value = data.water_intake||0
    isPublic.value = data.is_public||false; shareText.value = data.share_text||''; sTags.value = data.share_tags||[]
  }
  const { data: sk } = await supabase.from('health_streaks').select('current_streak').eq('user_id', user.value.id).maybeSingle()
  streak.value = sk?.current_streak || 0
}

// ====== Tab2: 健康档案 ======
const weekData = ref<{ sleep: number[]; meal: number[]; ex: number[]; water: number[] }>({ sleep: [], meal: [], ex: [], water: [] })
const historyRecords = ref<any[]>([])
const canLoadMore = ref(false)
const historyPage = ref(0)
const viewingRecord = ref<any>(null)
const totalCheckinDays = ref(0)

// 身体档案
const bodyProfile = reactive({ height: 170, weight: 65, targetWeight: 60, weightChange: -0.6, fatChange: 0.8, muscleChange: 0.4 })
const showBodyEdit = ref(false)
const bmi = computed(() => bodyProfile.weight > 0 && bodyProfile.height > 0 ? (bodyProfile.weight / ((bodyProfile.height / 100) ** 2)).toFixed(1) : '0')
const bmiLabel = computed(() => { const v = parseFloat(bmi.value); if (v < 18.5) return '偏轻'; if (v < 24) return '正常'; if (v < 28) return '偏重'; return '肥胖' })
const bodyAdvice = computed(() => {
  const v = parseFloat(bmi.value)
  if (v >= 18.5 && v < 24) return '你的 BMI 处于正常范围，继续保持均衡的饮食和规律运动。建议每周150分钟中等强度运动，保持健康体重。'
  if (v < 18.5) return '体重偏轻，建议增加蛋白质和碳水摄入，适当进行力量训练。'
  return '体重偏高，建议控制饮食总热量，增加有氧运动频率。目标：每周减重0.5-1kg为宜。'
})
function editBodyProfile() { showBodyEdit.value = true }
function saveBodyProfile() { showBodyEdit.value = false; showToast('身体档案已保存') }

// 习惯热力图
const heatmapDays = computed(() => {
  const days = []
  const today = new Date()
  for (let i = 34; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const score = Math.random() > 0.3 ? Math.round(Math.random() * 100) : 0
    let cls = 'lv0'
    if (score > 80) cls = 'lv4'
    else if (score > 60) cls = 'lv3'
    else if (score > 30) cls = 'lv2'
    else if (score > 0) cls = 'lv1'
    days.push({
      date: `${d.getMonth()+1}/${d.getDate()}`,
      score,
      cls,
      isToday: i === 0
    })
  }
  return days
})

// 四指标卡
const metricCards = computed(() => {
  const wd = weekData.value
  const avgMeal = wd.meal.length ? Math.round(wd.meal.reduce((a,b)=>a+b,0)/7) : 0
  const avgSleep = wd.sleep.length ? (wd.sleep.reduce((a,b)=>a+b,0)/7) : 0
  const avgEx = wd.ex.length ? Math.round(wd.ex.reduce((a,b)=>a+b,0)/7) : 0
  const avgWater = wd.water.length ? Math.round(wd.water.reduce((a,b)=>a+b,0)/7) : 0
  return [
    { icon: '🍱', label: '饮食完成度', val: avgMeal + '%', desc: `已完成 ${Math.round(avgMeal * 21 / 100)} / 21 餐`, badge: avgMeal >= 80 ? '优秀' : avgMeal >= 60 ? '良好' : '一般', badgeCls: avgMeal >= 80 ? 'good' : avgMeal >= 60 ? 'ok' : 'warn', cls: 'mc-meal' },
    { icon: '😴', label: '平均睡眠时长', val: avgSleep.toFixed(1) + 'h', desc: `较上周 ${Math.random() > 0.5 ? '+' : '-'}0.${Math.floor(Math.random()*9)}h`, badge: avgSleep >= 7 ? '良好' : '不足', badgeCls: avgSleep >= 7 ? 'good' : 'warn', cls: 'mc-sleep' },
    { icon: '🏃', label: '运动达标率', val: avgEx + '%', desc: `已达标 ${Math.round(avgEx * 7 / 100)} / 7 天`, badge: avgEx >= 70 ? '达标' : '一般', badgeCls: avgEx >= 70 ? 'good' : 'warn', cls: 'mc-ex' },
    { icon: '💧', label: '饮水达标率', val: avgWater + '%', desc: `已达标 ${Math.round(avgWater * 7 / 100)} / 7 天`, badge: avgWater >= 70 ? '充足' : '一般', badgeCls: avgWater >= 70 ? 'good' : 'warn', cls: 'mc-water' },
  ]
})

// 改进计划
const improvementPlans = computed(() => [
  { icon: '🌙', title: '规律作息，早睡早起', desc: '建议在 23:30 前入睡，保证 7-8 小时睡眠，提升白天专注力。', progress: 71, progressLabel: '5/7 天' },
  { icon: '💧', title: '每日补充足量水分', desc: '每天饮水 2000ml，少量多次，保持身体水分平衡。', progress: 57, progressLabel: '4/7 天' },
  { icon: '🏃', title: '增加每日步数', desc: '每天尝试达到 8000 步以上，工间休息时起身走走。', progress: 71, progressLabel: '5/7 天' },
])

function getRecGrade(rec: any): string {
  let score = 0
  const meals = rec.meals as any || {}
  const mealDone = ['breakfast','lunch','dinner'].filter(k => meals[k]?.done).length
  score += (mealDone / 3) * 30
  if (rec.sleep_quality) score += Math.min(30, rec.sleep_quality * 6)
  if (rec.exercise_minutes) score += Math.min(25, (rec.exercise_minutes / 30) * 25)
  if (rec.water_intake) score += Math.min(15, (rec.water_intake / 2000) * 15)
  if (score >= 85) return 'A'
  if (score >= 70) return 'B'
  if (score >= 50) return 'C'
  return 'D'
}

const charts = computed(() => [
  { key: 'meal', label: '饮食完成度', icon: '🍱', color: '#10b981', values: weekData.value.meal.map(v => v * 0.95 + 2), avg: Math.round(weekData.value.meal.reduce((a,b)=>a+b,0)/7) + '%', peak: undefined as number | undefined, peakIdx: 0, peakLabel: '' },
  { key: 'sleep', label: '睡眠时长 (h)', icon: '😴', color: '#8b5cf6', values: weekData.value.sleep.map(h => Math.min(95, (h/10)*95+2)), avg: (weekData.value.sleep.reduce((a,b)=>a+b,0)/7).toFixed(1) + 'h', peak: undefined as number | undefined, peakIdx: 0, peakLabel: '' },
  { key: 'ex', label: '运动达标率', icon: '🏃', color: '#f59e0b', values: weekData.value.ex.map(v => v * 0.95 + 2), avg: Math.round(weekData.value.ex.reduce((a,b)=>a+b,0)/7) + '%', peak: undefined as number | undefined, peakIdx: 0, peakLabel: '' },
  { key: 'water', label: '饮水达标率', icon: '💧', color: '#3b82f6', values: weekData.value.water.map(v => v * 0.95 + 2), avg: Math.round(weekData.value.water.reduce((a,b)=>a+b,0)/7) + '%', peak: undefined as number | undefined, peakIdx: 0, peakLabel: '' },
].map(ch => {
  const maxV = Math.max(...ch.values)
  const idx = ch.values.indexOf(maxV)
  return { ...ch, peak: maxV, peakIdx: idx, peakLabel: ch.key === 'sleep' ? weekData.value.sleep[idx]?.toFixed(1) + 'h' : Math.round(maxV) + '%' }
}))

function linePoints(vals: number[]) { return vals.map((v, i) => `${i * 50},${100 - v}`).join(' ') }
function areaPath(vals: number[]) { const pts = vals.map((v, i) => `${i * 50},${100 - v}`); return `M0,100 L${pts.join(' L')} L${(vals.length-1)*50},100 Z` }

async function loadRecordsTab() {
  if (!user.value) return
  const weekStart = getLocalDate(-6)
  const today = getLocalDate()
  const { data: records } = await supabase.from('health_checkins').select('date,meals,sleep_start,sleep_end,exercise_minutes,water_intake').eq('user_id', user.value.id).gte('date', weekStart).lte('date', today).order('date')
  const recordMap = new Map((records || []).map((r: any) => [r.date, r]))
  const sArr: number[] = [], mArr: number[] = [], eArr: number[] = [], wArr: number[] = []
  for (let i = 6; i >= 0; i--) {
    const d = getLocalDate(-i)
    const data = recordMap.get(d) as any
    if (data) {
      if (data.sleep_start && data.sleep_end) { let diff = (new Date(data.sleep_end).getTime() - new Date(data.sleep_start).getTime()) / 3600000; if (diff < 0) diff += 24; sArr.push(Math.round(diff*10)/10) } else sArr.push(0)
      const ml = data.meals as any || {}; mArr.push(Math.round(([ml.breakfast?.done, ml.lunch?.done, ml.dinner?.done].filter(Boolean).length / 3) * 100))
      eArr.push(Math.min(100, Math.round(((data.exercise_minutes||0)/30)*100)))
      wArr.push(Math.min(100, Math.round(((data.water_intake||0)/2000)*100)))
    } else { sArr.push(0); mArr.push(0); eArr.push(0); wArr.push(0) }
  }
  weekData.value = { sleep: sArr, meal: mArr, ex: eArr, water: wArr }
  historyPage.value = 0; await loadHistory()
  // 统计累计打卡天数
  const { count } = await supabase.from('health_checkins').select('id', { count: 'exact', head: true }).eq('user_id', user.value.id)
  totalCheckinDays.value = count || 0
}

async function loadHistory() {
  if (!user.value) return
  const { data } = await supabase.from('health_checkins').select('*').eq('user_id', user.value.id).order('date', { ascending: false }).range(historyPage.value * 10, historyPage.value * 10 + 9)
  if (historyPage.value === 0) historyRecords.value = data || []
  else historyRecords.value.push(...(data || []))
  canLoadMore.value = (data?.length || 0) === 10
}
function loadMoreHistory() { historyPage.value++; loadHistory() }
function viewRecord(rec: any) { viewingRecord.value = rec }

// ====== AI 对话 ======
const aiMessages = ref<{ role: 'ai' | 'user'; text: string }[]>([{ role: 'ai', text: '你好！我是你的 AI 健康助手 🤖 可以询问我关于你的饮食、睡眠、运动数据的分析和建议。' }])
const aiInput = ref(''); const aiLoading = ref(false); const chatBody = ref<HTMLElement | null>(null)

async function sendAiMsg() {
  if (!aiInput.value.trim() || aiLoading.value) return
  const q = aiInput.value.trim(); aiInput.value = ''
  aiMessages.value.push({ role: 'user', text: q }); aiLoading.value = true
  await nextTick(); if (chatBody.value) chatBody.value.scrollTop = chatBody.value.scrollHeight
  const reply = generateAiReply(q)
  setTimeout(() => { aiMessages.value.push({ role: 'ai', text: reply }); aiLoading.value = false; nextTick(() => { if (chatBody.value) chatBody.value.scrollTop = chatBody.value.scrollHeight }) }, 800)
}

function generateAiReply(q: string): string {
  const wd = weekData.value; const avgSleep = wd.sleep.reduce((a,b)=>a+b,0)/7; const avgMeal = wd.meal.reduce((a,b)=>a+b,0)/7; const avgEx = wd.ex.reduce((a,b)=>a+b,0)/7; const avgWater = wd.water.reduce((a,b)=>a+b,0)/7
  if (q.includes('睡眠') || q.includes('sleep')) return `本周你的平均睡眠时长为 ${avgSleep.toFixed(1)} 小时。${avgSleep >= 7 ? '达到 NSF 推荐标准，很棒！' : '低于推荐的 7 小时，建议调整作息。'}建议每天在固定时间入睡，避免睡前使用手机。`
  if (q.includes('饮食') || q.includes('吃')) return `本周三餐规律完成度为 ${avgMeal.toFixed(0)}%。${avgMeal >= 80 ? '很规律！' : '建议尽量保持三餐按时进食。'}均衡饮食建议：每天摄入 12 种以上食物，谷物为主，多吃蔬果。`
  if (q.includes('运动') || q.includes('锻炼')) return `本周运动达标率为 ${avgEx.toFixed(0)}%。WHO建议每周至少150分钟中等强度运动。${avgEx >= 70 ? '你做得很好！' : '建议增加运动频率。'}`
  if (q.includes('喝水') || q.includes('饮水') || q.includes('water')) return `本周饮水达标率为 ${avgWater.toFixed(0)}%。每天推荐饮水2000ml以上。${avgWater >= 70 ? '补水习惯不错！' : '建议增加饮水量，可以设定定时提醒。'}`
  if (q.includes('建议') || q.includes('怎么') || q.includes('改善')) return `综合建议：\n🍱 饮食(${avgMeal.toFixed(0)}%)：${avgMeal >= 80 ? '保持良好' : '三餐要规律'}\n😴 睡眠(${avgSleep.toFixed(1)}h)：${avgSleep >= 7 ? '很充足' : '需要早睡'}\n🏃 运动(${avgEx.toFixed(0)}%)：${avgEx >= 70 ? '达标' : '多动动'}\n💧 饮水(${avgWater.toFixed(0)}%)：${avgWater >= 70 ? '补水充足' : '多喝水'}`
  return `根据你本周的数据：饮食完成度 ${avgMeal.toFixed(0)}%，平均睡眠 ${avgSleep.toFixed(1)}h，运动达标 ${avgEx.toFixed(0)}%，饮水达标 ${avgWater.toFixed(0)}%。你可以问我具体的饮食、睡眠、运动或饮水建议哦～`
}

// ====== Tab3: 广场 ======
const plazaFilters = [{ key: '全部', label: '全部', dev: false }, { key: '好友', label: '好友', dev: true }, { key: '附近', label: '附近', dev: true }, { key: '我的', label: '我的', dev: false }, { key: '挑战', label: '挑战', dev: true }, { key: '热门', label: '热门', dev: true }]
const pFilter = ref('全部'); const pPosts = ref<any[]>([]); const pLoading = ref(false)
const reportTarget = ref<any>(null); const reportReason = ref(''); const reportNote = ref('')

// 广场统计
const plazaStats = reactive({ todayPosts: 0, activeUsers: 0, totalLikes: 0 })

// 热门挑战
const hotChallenges = [
  { icon: '💧', title: '7天喝水挑战', participants: '2.4万' },
  { icon: '🌙', title: '早睡计划', participants: '1.6万' },
  { icon: '🌅', title: '晨跑打卡', participants: '3.1万' },
  { icon: '💪', title: '核心力量挑战', participants: '1.2万' },
]

// 排行榜
const leaderboard = [
  { name: '小鹿同学', streak: 236 },
  { name: '健身阿浩', streak: 188 },
  { name: 'Jason_陈', streak: 168 },
  { name: '泡泡不吃糖', streak: 143 },
  { name: '山野来信', streak: 98 },
]
const myRank = ref(12)

// 推荐关注
const recommendedUsers = [
  { name: '元气少女', desc: '健康生活爱好者' },
  { name: '瑜伽小七', desc: '专注瑜伽和冥想' },
  { name: '自律星球', desc: '健康生活记录者' },
  { name: '阳光学长', desc: '北京体育大学·研二' },
]

// 热门话题
const hotTopics = [
  { tag: '晨跑打卡', count: '2.3万' },
  { tag: '早睡打卡', count: '1.8万' },
  { tag: '今日饮水量', count: '1.5万' },
  { tag: '力量训练', count: '1.2万' },
  { tag: '户外徒步', count: '0.9万' },
]

function getExIcon(type: string): string {
  const icons: Record<string, string> = { '跑步': '🏃', '骑行': '🚴', '篮球': '🏀', '游泳': '🏊', '瑜伽': '🧘', '健身': '💪', '散步': '🚶', '跳绳': '⏭️' }
  return icons[type] || '🏃'
}

function getSleepDur(post: any): string {
  if (!post.sleep_start || !post.sleep_end) return ''
  const diff = (new Date(post.sleep_end).getTime() - new Date(post.sleep_start).getTime()) / 3600000
  const h = diff < 0 ? diff + 24 : diff
  return `${Math.floor(h)}小时${Math.round((h % 1) * 60)}分`
}

async function loadPlaza() {
  if (!user.value) return; pLoading.value = true
  try {
    let query = supabase.from('health_checkins').select('*').eq('is_public', true).order('created_at', { ascending: false }).limit(30)
    if (pFilter.value === '我的') query = supabase.from('health_checkins').select('*').eq('user_id', user.value.id).order('created_at', { ascending: false }).limit(30)
    const { data, error } = await query; if (error) throw error
    if (!data?.length) { pPosts.value = []; return }
    const ids = data.map((p: any) => p.id)
    const userIds = [...new Set(data.map((p: any) => p.user_id))]
    const [likesRes, myLikesRes, commentsRes, profilesRes] = await Promise.all([
      supabase.from('health_likes').select('checkin_id, type').in('checkin_id', ids),
      supabase.from('health_likes').select('checkin_id, type').in('checkin_id', ids).eq('user_id', user.value.id),
      supabase.from('health_comments').select('*').in('checkin_id', ids).order('created_at'),
      supabase.from('spark_profiles').select('user_id, nickname, avatar_url').in('user_id', userIds),
    ])
    const allLikes = likesRes.data || []
    const myLikes = myLikesRes.data || []
    const allComments = commentsRes.data || []
    const profileMap = new Map((profilesRes.data || []).map((p: any) => [p.user_id, p]))
    const posts = data.map((p: any) => {
      const postLikes = allLikes.filter((l: any) => l.checkin_id === p.id)
      const postMyLikes = myLikes.filter((l: any) => l.checkin_id === p.id)
      const postComments = allComments.filter((c: any) => c.checkin_id === p.id)
      const profile = profileMap.get(p.user_id)
      return { ...p, nickname: p.user_id === user.value!.id ? '我' : (profile?.nickname || '匿名用户'), avatar_url: profile?.avatar_url || '', badge: Math.random() > 0.6 ? '健身达人' : '', like_count: postLikes.filter((l: any) => l.type === 'like').length, clap_count: postLikes.filter((l: any) => l.type === 'clap').length, user_liked: postMyLikes.some((l: any) => l.type === 'like'), user_clapped: postMyLikes.some((l: any) => l.type === 'clap'), comment_count: postComments.length, comments: postComments.slice(0, 20).map((c: any) => { const cp = profileMap.get(c.user_id); return { ...c, nickname: c.user_id === user.value!.id ? '我' : (cp?.nickname || '匿名') } }), showComments: false, newComment: '' }
    })
    pPosts.value = posts
    plazaStats.todayPosts = posts.length
    plazaStats.activeUsers = userIds.length
    plazaStats.totalLikes = allLikes.length
  } catch (e) { console.error(e) } finally { pLoading.value = false }
}

async function toggleLike(post: any, type: 'like' | 'clap') {
  if (!user.value) return
  const isLiked = type === 'like' ? post.user_liked : post.user_clapped
  const flagKey = type === 'like' ? 'user_liked' : 'user_clapped'
  const countKey = type === 'like' ? 'like_count' : 'clap_count'
  post[flagKey] = !isLiked; post[countKey] += isLiked ? -1 : 1
  const { error } = isLiked ? await supabase.from('health_likes').delete().eq('checkin_id', post.id).eq('user_id', user.value.id).eq('type', type) : await supabase.from('health_likes').insert({ checkin_id: post.id, user_id: user.value.id, type })
  if (error) { post[flagKey] = isLiked; post[countKey] += isLiked ? 1 : -1; showToast('操作失败，请重试', 'error') }
}

async function submitComment(post: any) {
  if (!user.value || !post.newComment?.trim()) return
  const { data, error } = await supabase.from('health_comments').insert({ checkin_id: post.id, user_id: user.value.id, content: post.newComment.trim() }).select().single()
  if (error) { showToast('评论失败', 'error'); return }
  post.comments.push({ ...data, nickname: '我' }); post.comment_count++; post.newComment = ''
}

function openReport(post: any) { reportTarget.value = post; reportReason.value = ''; reportNote.value = '' }
async function submitReport() {
  if (!user.value || !reportTarget.value || !reportReason.value) return
  try {
    const { error } = await supabase.from('health_reports').insert({ reporter_id: user.value.id, target_type: 'checkin', target_id: reportTarget.value.id, reason: reportReason.value, description: reportNote.value || null, status: 'pending' })
    if (error) throw error
    showToast('举报已提交，感谢您的反馈'); reportTarget.value = null
  } catch (e: any) { showToast('举报提交失败，请稍后重试', 'error'); reportTarget.value = null }
}

function fmtTime(ts: string) { const h = Math.floor((Date.now() - new Date(ts).getTime()) / 3600000); if (h < 1) return '刚刚'; if (h < 24) return `${h}小时前`; return `${Math.floor(h/24)}天前` }
function getMealCount(meals: any) { if (!meals) return 0; return Object.values(meals).filter((m: any) => m?.done).length }

onMounted(() => { loadToday() })
</script>

<style scoped>
.health-page { max-width: 100%; margin: 0 auto; padding: 24px 16px 80px; }
.tab-body { display: flex; flex-direction: column; gap: 16px; max-width: 720px; margin: 0 auto; }

/* Tab */
.health-tabs { display: flex; gap: 4px; margin-bottom: 24px; background: rgba(18,14,45,0.65); backdrop-filter: blur(12px) saturate(1.2); -webkit-backdrop-filter: blur(12px) saturate(1.2); border: 1px solid rgba(139,92,246,0.15); border-radius: 12px; padding: 4px; max-width: 720px; margin-left: auto; margin-right: auto; }
.tab-btn { flex: 1; padding: 10px; border-radius: 10px; border: none; background: transparent; color: rgba(255,255,255,0.5); font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.tab-btn.active { background: linear-gradient(135deg,rgba(124,58,237,0.2),rgba(59,130,246,0.12)); color: #a78bfa; box-shadow: 0 0 12px rgba(139,92,246,0.1); }

/* 通用卡片 */
.glass-card { background: rgba(18,14,45,0.65); border: 1px solid rgba(139,92,246,0.15); border-radius: 12px; padding: 20px; backdrop-filter: blur(12px) saturate(1.2); -webkit-backdrop-filter: blur(12px) saturate(1.2); box-shadow: 0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05); transition: all 250ms cubic-bezier(0.4,0,0.2,1); }
.glass-card:hover { border-color: rgba(139,92,246,0.35); box-shadow: 0 0 20px rgba(124,58,237,0.3), 0 8px 32px rgba(0,0,0,0.4); }
.glass-card h3 { font-size: 16px; font-weight: 700; margin-bottom: 16px; color: white; }
.section-head { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
.section-head h3 { margin-bottom: 0; }
.section-sub { font-size: 12px; color: rgba(255,255,255,0.3); flex: 1; }
.share-item-btn { background: none; border: none; font-size: 18px; cursor: pointer; opacity: 0.5; transition: opacity 0.2s; }
.share-item-btn:hover { opacity: 1; }
.edit-btn, .see-all-btn { background: none; border: 1px solid rgba(139,92,246,0.2); color: rgba(139,92,246,0.7); padding: 4px 12px; border-radius: 8px; font-size: 12px; cursor: pointer; }

/* ====== 今日健康总览 ====== */
.overview-card .ov-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.ov-header h2 { font-size: 20px; font-weight: 800; color: white; }
.ov-date { font-size: 13px; color: rgba(255,255,255,0.4); background: rgba(255,255,255,0.05); padding: 4px 12px; border-radius: 20px; }
.ov-main { display: flex; gap: 24px; align-items: flex-start; }
.ov-rings { flex: 1; }
.rings-row { display: flex; justify-content: space-around; }
.ring-item { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.ring { width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; position: relative; box-shadow: 0 0 16px rgba(139,92,246,0.1); }
.ring::after { content: ''; position: absolute; width: 62px; height: 62px; border-radius: 50%; background: rgba(10,10,20,0.92); top: 9px; left: 9px; }
.ring-val { position: relative; z-index: 1; font-size: 16px; font-weight: 800; color: white; }
.ring-label { font-size: 12px; color: rgba(255,255,255,0.6); font-weight: 500; }
.ring-desc { font-size: 10px; color: rgba(255,255,255,0.3); }
.ov-score { min-width: 200px; display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 16px; background: rgba(255,255,255,0.02); border-radius: 14px; border: 1px solid rgba(255,255,255,0.04); }
.score-header { font-size: 12px; color: rgba(255,255,255,0.4); }
.score-info { cursor: help; }
.score-big { display: flex; align-items: baseline; gap: 2px; }
.score-num { font-size: 42px; font-weight: 900; color: white; line-height: 1; }
.score-max { font-size: 16px; color: rgba(255,255,255,0.3); }
.score-grade { font-size: 22px; font-weight: 800; margin-left: 8px; }
.sg-a { color: #10b981; } .sg-b { color: #3b82f6; } .sg-c { color: #f59e0b; } .sg-d { color: #ef4444; }
.score-badge { padding: 3px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; }
.sb-a { background: rgba(16,185,129,0.15); color: #34d399; } .sb-b { background: rgba(59,130,246,0.15); color: #60a5fa; } .sb-c { background: rgba(245,158,11,0.15); color: #fbbf24; } .sb-d { background: rgba(239,68,68,0.15); color: #f87171; }
.streak-badge { padding: 4px 12px; background: rgba(245,158,11,0.12); border: 1px solid rgba(245,158,11,0.2); border-radius: 20px; font-size: 12px; font-weight: 600; color: #f59e0b; }
.ov-ai-comment { margin-top: 8px; text-align: left; width: 100%; }
.ov-ai-label { font-size: 11px; color: rgba(139,92,246,0.6); margin-bottom: 4px; }
.ov-ai-text { font-size: 12px; color: rgba(255,255,255,0.45); line-height: 1.5; margin: 0; }

/* ====== AI 建议 ====== */
.ai-suggest-card { background: linear-gradient(135deg, rgba(139,92,246,0.06), rgba(59,130,246,0.04)); border-color: rgba(139,92,246,0.12); }
.ais-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.ais-header h3 { margin-bottom: 0; }
.ais-refresh { background: none; border: none; color: rgba(255,255,255,0.35); font-size: 12px; cursor: pointer; }
.ais-list { display: flex; flex-direction: column; gap: 10px; }
.ais-item { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); }
.ais-icon { font-size: 24px; flex-shrink: 0; }
.ais-body { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.ais-text { font-size: 14px; font-weight: 600; color: white; }
.ais-sub { font-size: 11px; color: rgba(255,255,255,0.35); }
.ais-action { background: none; border: none; color: rgba(139,92,246,0.7); font-size: 12px; font-weight: 600; cursor: pointer; white-space: nowrap; }

/* ====== 饮食 ====== */
.meals-grid { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 14px; }
.meal-card { flex: 1; min-width: 80px; display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 14px 8px; border-radius: 12px; cursor: pointer; transition: all 0.25s; background: rgba(18,14,45,0.5); border: 1px solid rgba(139,92,246,0.12); position: relative; backdrop-filter: blur(8px); }
.meal-card:hover { border-color: rgba(139,92,246,0.3); transform: translateY(-2px); box-shadow: 0 0 16px rgba(139,92,246,0.1); }
.meal-card.done { background: rgba(16,185,129,0.1); border-color: rgba(16,185,129,0.25); }
.meal-card.add-meal { border-style: dashed; opacity: 0.5; } .meal-card.add-meal:hover { opacity: 1; }
.meal-img-wrap { position: relative; width: 56px; height: 56px; border-radius: 12px; background: rgba(255,255,255,0.04); display: flex; align-items: center; justify-content: center; overflow: hidden; }
.meal-icon-lg { font-size: 28px; }
.meal-name { font-size: 12px; color: rgba(255,255,255,0.6); font-weight: 500; }
.meal-check { position: absolute; top: -2px; right: -2px; width: 20px; height: 20px; border-radius: 50%; background: #10b981; color: white; font-size: 11px; display: flex; align-items: center; justify-content: center; }
.meal-actions { display: flex; gap: 8px; margin-bottom: 12px; }
.ma-btn { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 10px 8px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.06); background: rgba(255,255,255,0.02); cursor: pointer; flex: 1; font-size: 11px; color: rgba(255,255,255,0.5); transition: all 0.2s; }
.ma-btn:hover { background: rgba(255,255,255,0.05); color: white; }
.ma-icon { font-size: 20px; }
.food-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; align-items: center; }
.ftag { padding: 4px 10px; border-radius: 14px; font-size: 12px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: rgba(255,255,255,0.5); cursor: pointer; transition: all 0.2s; }
.ftag.sel { background: rgba(59,130,246,0.12); border-color: rgba(59,130,246,0.3); color: #60a5fa; }
.tag-input { width: 72px; padding: 4px 8px; border-radius: 14px; background: rgba(255,255,255,0.03); border: 1px dashed rgba(255,255,255,0.12); color: white; font-size: 12px; outline: none; }
.note-input { width: 100%; padding: 10px 14px; border-radius: 10px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: white; font-size: 13px; outline: none; box-sizing: border-box; margin-bottom: 8px; }
.note-input:focus { border-color: rgba(139,92,246,0.4); } .note-input::placeholder { color: rgba(255,255,255,0.25); }
.prev-img { width: 100%; max-height: 180px; object-fit: cover; border-radius: 10px; margin-bottom: 8px; }
.inline-ai { margin-top: 10px; padding: 10px 14px; border-radius: 10px; background: rgba(139,92,246,0.06); border: 1px solid rgba(139,92,246,0.1); font-size: 13px; color: rgba(255,255,255,0.55); line-height: 1.5; }

/* ====== 睡眠 ====== */
.sleep-main { display: flex; flex-direction: column; gap: 14px; }
.sleep-time-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.tg { display: flex; flex-direction: column; gap: 4px; } .tg label { font-size: 12px; color: rgba(255,255,255,0.4); }
.time-input { padding: 8px 12px; border-radius: 8px; font-size: 16px; font-weight: 600; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); color: white; outline: none; width: 120px; }
.time-input:focus { border-color: rgba(139,92,246,0.4); }
.arrow { font-size: 20px; color: rgba(255,255,255,0.3); margin-top: 18px; }
.sleep-stats { display: flex; align-items: center; gap: 24px; }
.sleep-dur { display: flex; align-items: baseline; gap: 2px; }
.dur-v { font-size: 28px; font-weight: 800; color: #8b5cf6; } .dur-u { font-size: 13px; color: rgba(255,255,255,0.4); margin-right: 4px; }
.sleep-score-box { display: flex; flex-direction: column; gap: 4px; align-items: center; }
.sleep-quality-label { font-size: 11px; color: rgba(255,255,255,0.35); }
.stars { display: flex; gap: 2px; }
.star { background: none; border: none; font-size: 20px; cursor: pointer; color: rgba(255,255,255,0.15); transition: all 0.15s; }
.star.on { color: #f59e0b; } .star:hover { transform: scale(1.2); }
.sleep-score { font-size: 18px; font-weight: 700; color: #8b5cf6; }
/* 睡眠阶段 */
.sleep-stages { margin-top: 4px; }
.stage-bar { display: flex; height: 10px; border-radius: 5px; overflow: hidden; gap: 1px; }
.stage-seg { height: 100%; border-radius: 3px; }
.stage-seg.awake { background: rgba(255,255,255,0.2); }
.stage-seg.light { background: #60a5fa; }
.stage-seg.deep { background: #3b82f6; }
.stage-seg.rem { background: #8b5cf6; }
.stage-seg.move { background: rgba(245,158,11,0.6); }
.stage-legend { display: flex; gap: 12px; margin-top: 8px; flex-wrap: wrap; }
.sl-item { display: flex; align-items: center; gap: 4px; font-size: 11px; color: rgba(255,255,255,0.4); }
.sl-dot { display: inline-block; width: 8px; height: 8px; border-radius: 2px; }
.sl-dot.awake { background: rgba(255,255,255,0.2); } .sl-dot.light { background: #60a5fa; } .sl-dot.deep { background: #3b82f6; } .sl-dot.rem { background: #8b5cf6; } .sl-dot.move { background: rgba(245,158,11,0.6); }
.sleep-analysis { font-size: 12px; color: rgba(255,255,255,0.4); line-height: 1.5; padding: 8px 12px; background: rgba(139,92,246,0.04); border-radius: 8px; }

/* ====== 运动 ====== */
.sel { width: 100%; padding: 10px 14px; border-radius: 10px; font-size: 14px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); color: white; outline: none; appearance: none; margin-bottom: 10px; }
.sel option { background: #1a1a2e; }
.ex-metrics { display: flex; gap: 10px; margin-bottom: 14px; }
.ex-metric-card { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 14px 8px; border-radius: 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); }
.emc-icon { font-size: 20px; }
.emc-val { font-size: 24px; font-weight: 800; color: white; }
.emc-val-input { width: 60px; font-size: 24px; font-weight: 800; color: white; text-align: center; background: transparent; border: none; border-bottom: 2px solid rgba(245,158,11,0.3); outline: none; }
.emc-unit { font-size: 11px; color: rgba(255,255,255,0.35); }
.ex-row { display: flex; gap: 16px; margin-bottom: 12px; } .ex-f { flex: 1; display: flex; flex-direction: column; gap: 6px; } .ex-f label { font-size: 12px; color: rgba(255,255,255,0.4); }
.int-btns { display: flex; gap: 6px; } .int-b { flex: 1; padding: 8px; border-radius: 8px; font-size: 12px; font-weight: 600; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: rgba(255,255,255,0.5); cursor: pointer; }
.int-b.on { background: rgba(245,158,11,0.12); border-color: rgba(245,158,11,0.3); color: #f59e0b; }
.ex-actions { display: flex; gap: 8px; margin-bottom: 10px; }
.up-btn { display: inline-flex; align-items: center; gap: 4px; padding: 8px 14px; border-radius: 10px; font-size: 12px; background: rgba(139,92,246,0.1); border: 1px solid rgba(139,92,246,0.2); color: #a78bfa; cursor: pointer; }
.up-btn:hover { background: rgba(139,92,246,0.18); }

/* ====== 分享设置 ====== */
.share-settings .section-head { margin-bottom: 14px; }
.share-toggle-row { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; margin-bottom: 12px; }
.tgl { display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 14px; color: rgba(255,255,255,0.6); } .tgl input { display: none; }
.sw { width: 36px; height: 20px; border-radius: 10px; background: rgba(255,255,255,0.1); position: relative; transition: all 0.2s; }
.sw::after { content: ''; position: absolute; width: 16px; height: 16px; border-radius: 50%; background: white; top: 2px; left: 2px; transition: all 0.2s; }
.tgl input:checked + .sw { background: #10b981; } .tgl input:checked + .sw::after { left: 18px; }
.share-scope { display: flex; align-items: center; gap: 6px; }
.scope-label { font-size: 12px; color: rgba(255,255,255,0.35); }
.scope-sel { padding: 4px 10px; border-radius: 8px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); color: white; font-size: 12px; outline: none; }
.share-body { display: flex; flex-direction: column; gap: 10px; margin-bottom: 12px; }
.sys-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.stb { padding: 3px 10px; border-radius: 12px; font-size: 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); color: rgba(255,255,255,0.4); cursor: pointer; }
.stb.sel { background: rgba(59,130,246,0.1); border-color: rgba(59,130,246,0.2); color: #60a5fa; }
.extern-share { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.es-label { font-size: 13px; color: rgba(255,255,255,0.4); }
.es-btn { padding: 6px 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.03); color: rgba(255,255,255,0.6); font-size: 12px; cursor: pointer; transition: all 0.2s; }
.es-btn:hover { background: rgba(255,255,255,0.08); color: white; }

/* 保存 */
.save-btn { width: 100%; padding: 16px; border-radius: 14px; border: none; font-size: 17px; font-weight: 700; cursor: pointer; background: linear-gradient(135deg, #7c3aed, #3b82f6); color: white; box-shadow: 0 6px 24px rgba(124,58,237,0.4); transition: all 0.25s; letter-spacing: 1px; }
.save-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(124,58,237,0.5); } .save-btn:active { transform: scale(0.98); } .save-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

/* ====== Tab2 指标卡 ====== */
.metric-cards-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.metric-card { display: flex; align-items: flex-start; gap: 10px; padding: 16px; border-radius: 12px; background: rgba(18,14,45,0.5); border: 1px solid rgba(139,92,246,0.12); backdrop-filter: blur(8px); transition: all 0.2s; }
.metric-card:hover { border-color: rgba(139,92,246,0.25); }
.mc-icon { font-size: 28px; flex-shrink: 0; margin-top: 2px; }
.mc-body { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.mc-val { font-size: 22px; font-weight: 800; color: white; }
.mc-label { font-size: 12px; color: rgba(255,255,255,0.45); }
.mc-desc { font-size: 11px; color: rgba(255,255,255,0.25); }
.mc-badge { padding: 2px 8px; border-radius: 6px; font-size: 10px; font-weight: 600; flex-shrink: 0; align-self: flex-start; }
.mc-badge.good { background: rgba(16,185,129,0.1); color: #34d399; }
.mc-badge.ok { background: rgba(59,130,246,0.1); color: #60a5fa; }
.mc-badge.warn { background: rgba(245,158,11,0.1); color: #fbbf24; }

/* 折线图 */
.chart-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.chart-head h3 { margin-bottom: 0; }
.cw-btn { padding: 4px 12px; border-radius: 8px; border: 1px solid rgba(139,92,246,0.2); background: rgba(139,92,246,0.08); color: rgba(139,92,246,0.7); font-size: 12px; cursor: pointer; }
.cw-btn.active { background: rgba(139,92,246,0.15); color: #a78bfa; }
.chart-container { margin-bottom: 20px; }
.chart-label { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.6); margin-bottom: 6px; display: flex; align-items: center; gap: 8px; }
.chart-avg { font-size: 11px; color: rgba(255,255,255,0.3); font-weight: 400; }
.line-chart { width: 100%; height: 100px; display: block; }
.x-labels { display: flex; justify-content: space-between; padding: 4px 0; } .x-labels span { font-size: 10px; color: rgba(255,255,255,0.25); width: 14.28%; text-align: center; }

/* ====== 身体档案 ====== */
.bp-main { display: flex; gap: 20px; align-items: center; margin-bottom: 16px; }
.bp-avatar { flex-shrink: 0; }
.bp-silhouette { width: 80px; height: 100px; background: linear-gradient(135deg, rgba(139,92,246,0.15), rgba(59,130,246,0.1)); border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 48px; }
.bp-stats { flex: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.bp-stat { display: flex; flex-direction: column; gap: 2px; padding: 10px; border-radius: 10px; background: rgba(255,255,255,0.03); }
.bps-label { font-size: 11px; color: rgba(255,255,255,0.35); }
.bps-val { font-size: 20px; font-weight: 700; color: white; }
.bps-val small { font-size: 12px; color: rgba(255,255,255,0.35); font-weight: 400; margin-left: 2px; }
.bmi-label { padding: 2px 6px; border-radius: 4px; background: rgba(16,185,129,0.1); color: #34d399; margin-left: 6px; }
.bp-changes { margin-bottom: 12px; }
.bpc-title { font-size: 12px; color: rgba(255,255,255,0.35); display: block; margin-bottom: 6px; }
.bpc-row { display: flex; gap: 12px; flex-wrap: wrap; }
.bpc-item { font-size: 13px; color: rgba(255,255,255,0.5); }
.bpc-item b { color: rgba(255,255,255,0.6); margin-right: 4px; }
.bp-advice { padding: 10px 14px; border-radius: 10px; background: rgba(139,92,246,0.06); border: 1px solid rgba(139,92,246,0.1); font-size: 12px; color: rgba(255,255,255,0.45); line-height: 1.6; }
.bp-form { display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px; }
.bp-field { display: flex; flex-direction: column; gap: 4px; }
.bp-field label { font-size: 13px; color: rgba(255,255,255,0.5); }
.bp-field input { padding: 10px; border-radius: 8px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); color: white; font-size: 16px; outline: none; }

/* ====== 热力图 ====== */
.hm-period { font-size: 12px; color: rgba(255,255,255,0.3); margin-left: auto; }
.heatmap-cal { margin-bottom: 12px; }
.hm-weekdays { display: flex; gap: 4px; margin-bottom: 4px; padding-left: 2px; }
.hm-weekdays span { width: calc((100% - 24px) / 7); text-align: center; font-size: 10px; color: rgba(255,255,255,0.25); }
.hm-grid { display: flex; flex-wrap: wrap; gap: 4px; }
.hm-cell { width: calc((100% - 24px) / 7); aspect-ratio: 1; border-radius: 4px; position: relative; }
.hm-cell.lv0 { background: rgba(255,255,255,0.04); }
.hm-cell.lv1 { background: rgba(16,185,129,0.15); }
.hm-cell.lv2 { background: rgba(16,185,129,0.3); }
.hm-cell.lv3 { background: rgba(16,185,129,0.5); }
.hm-cell.lv4 { background: rgba(16,185,129,0.75); }
.hm-today-dot { position: absolute; top: 2px; right: 2px; width: 4px; height: 4px; border-radius: 50%; background: white; }
.hm-legend { display: flex; align-items: center; gap: 4px; margin-top: 8px; justify-content: flex-end; }
.hml-label { font-size: 10px; color: rgba(255,255,255,0.25); }
.hml-box { width: 12px; height: 12px; border-radius: 2px; }
.hml-box.lv0 { background: rgba(255,255,255,0.04); } .hml-box.lv1 { background: rgba(16,185,129,0.15); } .hml-box.lv2 { background: rgba(16,185,129,0.3); } .hml-box.lv3 { background: rgba(16,185,129,0.5); } .hml-box.lv4 { background: rgba(16,185,129,0.75); }
.hm-stats { display: flex; gap: 20px; }
.hms-item { font-size: 13px; color: rgba(255,255,255,0.45); }
.hms-item b { color: #10b981; font-weight: 700; }

/* ====== 改进计划 ====== */
.plans-grid { display: flex; flex-direction: column; gap: 12px; }
.plan-item { display: flex; gap: 12px; align-items: flex-start; padding: 16px; border-radius: 12px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); }
.plan-icon { font-size: 32px; flex-shrink: 0; }
.plan-body { flex: 1; display: flex; flex-direction: column; gap: 6px; }
.plan-title { font-size: 14px; font-weight: 600; color: white; }
.plan-desc { font-size: 12px; color: rgba(255,255,255,0.4); line-height: 1.4; }
.plan-progress { display: flex; align-items: center; gap: 8px; }
.plan-bar { flex: 1; height: 6px; background: rgba(255,255,255,0.06); border-radius: 3px; overflow: hidden; }
.plan-fill { height: 100%; background: linear-gradient(90deg, #3b82f6, #8b5cf6); border-radius: 3px; transition: width 0.5s; }
.plan-pct { font-size: 11px; color: rgba(255,255,255,0.35); min-width: 40px; }
.plan-go { padding: 8px 16px; border-radius: 8px; border: 1px solid rgba(59,130,246,0.2); background: rgba(59,130,246,0.08); color: #60a5fa; font-size: 12px; font-weight: 600; cursor: pointer; flex-shrink: 0; align-self: center; }

/* AI 对话 */
.ai-chat-card { display: flex; flex-direction: column; }
.ai-chat-body { max-height: 300px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; padding: 4px; }
.ai-msg { max-width: 85%; padding: 10px 14px; border-radius: 12px; font-size: 13px; line-height: 1.6; white-space: pre-wrap; display: flex; gap: 8px; align-items: flex-start; }
.ai-msg.ai { background: rgba(139,92,246,0.08); color: rgba(255,255,255,0.7); align-self: flex-start; border-bottom-left-radius: 4px; }
.ai-msg.user { background: rgba(59,130,246,0.15); color: white; align-self: flex-end; border-bottom-right-radius: 4px; }
.msg-avatar { font-size: 16px; flex-shrink: 0; }
.msg-text { display: block; }
.ai-chat-input { display: flex; gap: 8px; }
.ai-chat-input input { flex: 1; padding: 10px 14px; border-radius: 10px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: white; font-size: 13px; outline: none; }
.ai-chat-input input::placeholder { color: rgba(255,255,255,0.25); }
.ai-chat-input button { padding: 10px 20px; border-radius: 10px; border: none; background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; font-size: 13px; font-weight: 600; cursor: pointer; }
.ai-chat-input button:disabled { opacity: 0.5; }

/* 历史 */
.history-item { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 10px; cursor: pointer; transition: all 0.15s; }
.history-item:hover { background: rgba(255,255,255,0.04); }
.hi-date { font-size: 14px; font-weight: 600; color: white; min-width: 90px; }
.hi-tags { flex: 1; font-size: 12px; color: rgba(255,255,255,0.4); display: flex; gap: 8px; }
.hi-grade { padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; }
.hig-A { background: rgba(16,185,129,0.1); color: #34d399; } .hig-B { background: rgba(59,130,246,0.1); color: #60a5fa; } .hig-C { background: rgba(245,158,11,0.1); color: #fbbf24; } .hig-D { background: rgba(239,68,68,0.1); color: #f87171; }
.hi-arrow { color: rgba(255,255,255,0.2); font-size: 18px; }
.load-more-btn { width: 100%; padding: 10px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.08); background: transparent; color: rgba(255,255,255,0.4); font-size: 13px; cursor: pointer; margin-top: 8px; }
.empty-hint { text-align: center; padding: 40px 0; color: rgba(255,255,255,0.3); font-size: 14px; }

/* ====== Tab3: 广场 ====== */
.plaza-header { max-width: 720px; margin: 0 auto 20px; }
.ph-title-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.ph-title { font-size: 24px; font-weight: 800; color: white; }
.ph-publish-btn { padding: 8px 20px; border-radius: 20px; border: none; background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; font-size: 13px; font-weight: 600; cursor: pointer; }
.ph-subtitle { font-size: 13px; color: rgba(255,255,255,0.35); margin-bottom: 12px; }
.ph-stats { display: flex; gap: 16px; flex-wrap: wrap; }
.phs { font-size: 12px; color: rgba(255,255,255,0.35); }
.phs b { color: rgba(255,255,255,0.6); }

.plaza-layout { display: flex; gap: 20px; max-width: 1100px; margin: 0 auto; }
.plaza-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 16px; }
.plaza-sidebar { width: 300px; flex-shrink: 0; display: flex; flex-direction: column; gap: 16px; }

.plaza-filters { display: flex; gap: 8px; flex-wrap: wrap; }
.fbtn { padding: 8px 18px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.08); background: transparent; color: rgba(255,255,255,0.5); font-size: 13px; font-weight: 600; cursor: pointer; }
.fbtn.on { background: rgba(255,255,255,0.08); color: white; }
.fbtn.disabled { opacity: 0.35; cursor: not-allowed; }
.plaza-feed { display: flex; flex-direction: column; gap: 16px; }
.load-more-plaza { width: 100%; padding: 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.08); background: transparent; color: rgba(255,255,255,0.4); font-size: 13px; cursor: pointer; }

/* 帖子卡片 */
.ph-user { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.pa { width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #3b82f6, #ef4444); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; color: white; flex-shrink: 0; background-size: cover; background-position: center; }
.pi { display: flex; flex-direction: column; flex: 1; }
.pn-row { display: flex; align-items: center; gap: 6px; }
.pn { font-size: 14px; font-weight: 600; color: white; } .pt { font-size: 12px; color: rgba(255,255,255,0.3); }
.user-badge { font-size: 10px; padding: 1px 6px; border-radius: 4px; background: rgba(16,185,129,0.12); color: #34d399; }
.ptxt { font-size: 14px; color: rgba(255,255,255,0.7); line-height: 1.6; margin-bottom: 10px; }
.report-btn { background: none; border: none; font-size: 14px; cursor: pointer; opacity: 0.4; margin-left: auto; }

/* 帖子数据卡片 */
.post-data-card { padding: 14px; border-radius: 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); margin-bottom: 10px; }
.pdc-type { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.6); margin-bottom: 10px; display: flex; align-items: center; gap: 6px; }
.pdc-icon { font-size: 18px; }
.pdc-metrics { display: flex; gap: 16px; }
.pdc-m { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.pdc-v { font-size: 22px; font-weight: 800; color: white; }
.pdc-u { font-size: 11px; color: rgba(255,255,255,0.3); }
.sleep-data { background: linear-gradient(135deg, rgba(139,92,246,0.06), rgba(59,130,246,0.03)); border-color: rgba(139,92,246,0.1); }
.pdc-sleep-info { display: flex; justify-content: space-between; align-items: center; }
.pdc-sleep-label { font-size: 12px; color: rgba(255,255,255,0.4); }
.pdc-sleep-dur { font-size: 20px; font-weight: 700; color: #8b5cf6; }
.pdc-sleep-qual { margin-top: 6px; }
.pdc-badge { padding: 3px 10px; border-radius: 6px; background: rgba(139,92,246,0.1); color: #a78bfa; font-size: 11px; }

.psum { display: flex; gap: 8px; margin-bottom: 10px; flex-wrap: wrap; } .ps { padding: 4px 10px; border-radius: 8px; font-size: 12px; background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.5); }
.ptags { display: flex; gap: 6px; margin-bottom: 10px; } .ptg { font-size: 12px; color: #60a5fa; }
.pai { padding: 10px 14px; border-radius: 10px; margin-bottom: 12px; background: rgba(139,92,246,0.06); border: 1px solid rgba(139,92,246,0.1); font-size: 13px; color: rgba(255,255,255,0.5); }
.pacts { display: flex; gap: 12px; margin-bottom: 8px; }
.ab { background: transparent; border: none; color: rgba(255,255,255,0.4); font-size: 13px; cursor: pointer; padding: 4px 8px; border-radius: 6px; }
.ab:hover { background: rgba(255,255,255,0.05); } .ab.liked { color: #ef4444; }
.cmt-sec { border-top: 1px solid rgba(255,255,255,0.06); padding-top: 10px; }
.cmt-item { font-size: 13px; color: rgba(255,255,255,0.5); padding: 4px 0; } .cmt-item b { color: rgba(255,255,255,0.7); }
.cmt-row { display: flex; gap: 8px; margin-top: 8px; }
.cmt-in { flex: 1; padding: 8px 12px; border-radius: 8px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: white; font-size: 13px; outline: none; }
.cmt-in::placeholder { color: rgba(255,255,255,0.25); }
.cmt-send { padding: 8px 16px; border-radius: 8px; border: none; background: rgba(59,130,246,0.15); color: #60a5fa; font-size: 13px; font-weight: 600; cursor: pointer; }
.cmt-send:disabled { opacity: 0.3; }

/* 侧栏 */
.sidebar-card { padding: 16px; }
.sidebar-card h4 { font-size: 14px; font-weight: 700; color: white; margin: 0; }
.sc-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.sc-more { background: none; border: none; color: rgba(255,255,255,0.3); font-size: 11px; cursor: pointer; }

.hot-challenges { display: flex; flex-direction: column; gap: 10px; }
.hc-item { display: flex; align-items: center; gap: 10px; }
.hci-icon { font-size: 20px; }
.hci-body { flex: 1; display: flex; flex-direction: column; gap: 1px; }
.hci-title { font-size: 13px; font-weight: 600; color: white; }
.hci-count { font-size: 11px; color: rgba(255,255,255,0.3); }
.hci-join { padding: 4px 10px; border-radius: 6px; border: 1px solid rgba(139,92,246,0.2); background: rgba(139,92,246,0.08); color: rgba(139,92,246,0.7); font-size: 11px; cursor: pointer; }

.leaderboard { display: flex; flex-direction: column; gap: 8px; margin-bottom: 10px; }
.lb-item { display: flex; align-items: center; gap: 8px; }
.lb-rank { width: 22px; height: 22px; border-radius: 50%; background: rgba(255,255,255,0.06); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.5); flex-shrink: 0; }
.rank-1 { background: rgba(245,158,11,0.2); color: #f59e0b; } .rank-2 { background: rgba(156,163,175,0.2); color: #9ca3af; } .rank-3 { background: rgba(180,83,9,0.2); color: #d97706; }
.lb-avatar { width: 28px; height: 28px; border-radius: 50%; background: linear-gradient(135deg, #3b82f6, #8b5cf6); display: flex; align-items: center; justify-content: center; font-size: 11px; color: white; font-weight: 600; }
.lb-name { flex: 1; font-size: 13px; color: rgba(255,255,255,0.6); }
.lb-streak { font-size: 12px; color: rgba(245,158,11,0.7); }
.lb-me { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 8px; background: rgba(59,130,246,0.06); border: 1px solid rgba(59,130,246,0.1); }

.recommend-users { display: flex; flex-direction: column; gap: 10px; }
.ru-item { display: flex; align-items: center; gap: 8px; }
.ru-avatar { width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #10b981, #3b82f6); display: flex; align-items: center; justify-content: center; font-size: 12px; color: white; font-weight: 600; }
.ru-info { flex: 1; display: flex; flex-direction: column; gap: 1px; }
.ru-name { font-size: 13px; font-weight: 600; color: white; }
.ru-desc { font-size: 11px; color: rgba(255,255,255,0.3); }
.ru-follow { padding: 4px 12px; border-radius: 6px; border: 1px solid rgba(59,130,246,0.2); background: rgba(59,130,246,0.08); color: #60a5fa; font-size: 11px; cursor: pointer; }

.hot-topics { display: flex; flex-direction: column; gap: 8px; }
.ht-item { display: flex; justify-content: space-between; align-items: center; }
.ht-tag { font-size: 13px; font-weight: 600; color: #60a5fa; }
.ht-count { font-size: 11px; color: rgba(255,255,255,0.25); }

/* 弹窗 */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); z-index: 2000; display: flex; align-items: center; justify-content: center; }
.modal-body { background: #111118; border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 28px; width: 440px; max-width: 90vw; }
.modal-body h3 { font-size: 18px; margin-bottom: 16px; color: white; }
.modal-body p { font-size: 14px; color: rgba(255,255,255,0.6); margin: 0 0 8px; }
.hint { font-size: 12px !important; color: rgba(139,92,246,0.7) !important; }
.modal-btns { display: flex; gap: 10px; margin-top: 20px; }
.mbtn { flex: 1; padding: 10px; border-radius: 10px; font-size: 14px; cursor: pointer; }
.mbtn.cancel { border: 1px solid rgba(255,255,255,0.1); background: transparent; color: rgba(255,255,255,0.6); }
.mbtn.confirm { border: none; background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; font-weight: 600; }
.mbtn.confirm:disabled { opacity: 0.5; }
.close-btn { position: absolute; top: 16px; right: 16px; background: none; border: none; color: rgba(255,255,255,0.4); font-size: 18px; cursor: pointer; }
.record-detail { position: relative; } .rd-header { display: flex; justify-content: space-between; align-items: center; }
.rd-section { margin-bottom: 16px; } .rd-section b { font-size: 14px; color: white; display: block; margin-bottom: 6px; }
.rd-section p { font-size: 13px; color: rgba(255,255,255,0.5); margin: 0; }
.rd-meal { font-size: 13px; color: rgba(255,255,255,0.5); padding: 2px 0; }
.rd-dot { margin-right: 6px; } .rd-dot.done { color: #10b981; }
.report-reasons { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
.rr-btn { padding: 6px 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.08); background: transparent; color: rgba(255,255,255,0.5); font-size: 13px; cursor: pointer; }
.rr-btn.sel { background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.25); color: #f87171; }
.report-note { width: 100%; padding: 10px; border-radius: 10px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: white; font-size: 13px; outline: none; resize: none; height: 60px; box-sizing: border-box; }
.share-modal .share-preview { padding: 12px; border-radius: 10px; background: rgba(255,255,255,0.03); font-size: 13px; color: rgba(255,255,255,0.5); margin-bottom: 16px; }
.share-modal .share-btns { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }

/* Toast */
.htoast { position: fixed; bottom: 32px; left: 50%; transform: translateX(-50%); padding: 12px 28px; border-radius: 12px; font-size: 14px; z-index: 5000; backdrop-filter: blur(16px); }
.htoast.success { background: rgba(16,185,129,0.1); color: #34d399; border: 1px solid rgba(16,185,129,0.12); }
.htoast.error { background: rgba(239,68,68,0.1); color: #f87171; border: 1px solid rgba(239,68,68,0.12); }
.toast-enter-active, .toast-leave-active { transition: all 0.3s; } .toast-enter-from, .toast-leave-to { opacity: 0; transform: translate(-50%, 20px); }

/* 响应式 */
@media (max-width: 900px) {
  .plaza-sidebar { display: none; }
  .plaza-layout { flex-direction: column; }
  .ov-main { flex-direction: column; }
  .ov-score { min-width: unset; }
}
@media (max-width: 600px) {
  .health-page { padding: 16px 10px 60px; }
  .ring { width: 60px; height: 60px; } .ring::after { width: 44px; height: 44px; top: 8px; left: 8px; } .ring-val { font-size: 12px; }
  .sleep-time-row { flex-direction: column; align-items: flex-start; } .arrow { display: none; }
  .metric-cards-row { grid-template-columns: 1fr; }
  .bp-main { flex-direction: column; }
  .meal-actions { flex-wrap: wrap; }
  .ex-metrics { flex-wrap: wrap; }
}
</style>
