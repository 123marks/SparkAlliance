<template>
  <div class="app-home">
    <!-- Welcome Hero -->
    <div class="welcome-section">
      <div class="w-content">
        <h1>早上好，张同学 👋</h1>
        <p class="subtitle">今天是你加入 Spark Alliance 的第 24 天，继续你的发现之旅吧！</p>
      </div>
      <div class="w-illustration">
        <div class="glow-sphere"></div>
      </div>
    </div>

    <!-- Quick Stats -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon blue">⏱️</div>
        <div class="stat-info">
          <span class="label">今日专注学习</span>
          <span class="value">4h 20m</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon purple">🔥</div>
        <div class="stat-info">
          <span class="label">连续打卡天数</span>
          <span class="value">12 天</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon orange">📚</div>
        <div class="stat-info">
          <span class="label">本周待办任务</span>
          <span class="value">5 项</span>
        </div>
      </div>
    </div>

    <!-- Main Dashboard Areas -->
    <div class="dashboard-grid">
      <!-- Left Column -->
      <div class="d-col">
        <div class="card recent-chats">
          <div class="card-header">
            <h3>最近 AI 辅导</h3>
            <button class="btn-text">查看全部</button>
          </div>
          <div class="card-body">
            <div class="chat-item" v-for="i in 3" :key="'chat-'+i">
              <div class="c-icon">🧠</div>
              <div class="c-info">
                <h4>深入理解操作系统内存管理机制</h4>
                <span>今天 10:30 &middot; 包含 12 条对话</span>
              </div>
            </div>
            <button class="btn-outline w-full mt-4">+ 新建对话</button>
          </div>
        </div>
      </div>

      <!-- Right Column -->
      <div class="d-col">
        <div class="card timeline-card">
          <div class="card-header">
            <h3>近期日程</h3>
            <button class="btn-text">添加</button>
          </div>
          <div class="card-body timeline">
            <div class="tl-item">
              <div class="tl-dot highlight"></div>
              <div class="tl-content">
                <span class="time">14:00 - 15:30</span>
                <h4>微机原理与接口技术 实验课</h4>
                <span class="location">教四 402 机房</span>
              </div>
            </div>
            <div class="tl-item">
              <div class="tl-dot"></div>
              <div class="tl-content">
                <span class="time">18:00</span>
                <h4>算法设计小组讨论</h4>
                <span class="location">图书馆 3B 研讨室</span>
              </div>
            </div>
            <div class="tl-item">
              <div class="tl-dot empty"></div>
              <div class="tl-content">
                <span class="time">22:00</span>
                <h4>提交《软件工程》需求分析报告</h4>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.app-home {
  padding: 32px;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

/* Welcome */
.welcome-section {
  background: linear-gradient(135deg, rgba(79, 142, 247, 0.1), rgba(139, 92, 246, 0.05));
  border: 1px solid var(--color-border);
  border-radius: 20px;
  padding: 40px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  position: relative;
  overflow: hidden;
}

.w-content h1 { font-size: 28px; font-weight: 800; margin-bottom: 12px; color: white; }
.w-content .subtitle { color: var(--color-text-secondary); font-size: 16px; }

.w-illustration { position: absolute; right: 0; top: 0; width: 300px; height: 100%; pointer-events: none; }
.glow-sphere { position: absolute; top: -50%; right: -20%; width: 250px; height: 250px; border-radius: 50%; background: radial-gradient(circle, rgba(139, 92, 246, 0.4) 0%, transparent 70%); filter: blur(40px); animation: pulse 6s infinite alternate; }
@keyframes pulse { 0% { opacity: 0.5; transform: scale(1); } 100% { opacity: 1; transform: scale(1.2); } }

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  margin-bottom: 32px;
}

@media (max-width: 900px) {
  .stats-grid { grid-template-columns: 1fr; }
}

.stat-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 20px;
  transition: transform 0.2s, box-shadow 0.2s;
}
.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 20px rgba(0,0,0,0.2);
}

.stat-icon {
  width: 56px; height: 56px; border-radius: 16px;
  display: flex; align-items: center; justify-content: center; font-size: 24px;
}
.stat-icon.blue { background: rgba(79, 142, 247, 0.1); color: var(--color-brand-blue); }
.stat-icon.purple { background: rgba(139, 92, 246, 0.1); color: var(--color-brand-purple); }
.stat-icon.orange { background: rgba(249, 115, 22, 0.1); color: var(--color-brand-orange); }

.stat-info { display: flex; flex-direction: column; }
.stat-info .label { color: var(--color-text-secondary); font-size: 13px; margin-bottom: 4px; }
.stat-info .value { color: white; font-size: 24px; font-weight: 700; }

/* Dashboard Grid */
.dashboard-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;
}
@media (max-width: 1024px) {
  .dashboard-grid { grid-template-columns: 1fr; }
}

.card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 20px;
  display: flex;
  flex-direction: column;
}

.card-header {
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.card-header h3 { font-size: 16px; font-weight: 600; }
.btn-text { background: transparent; border: none; color: var(--color-brand-blue); cursor: pointer; font-size: 13px; }

.card-body { padding: 24px; }

/* Recent Chats */
.chat-item {
  display: flex; align-items: center; gap: 16px;
  padding: 16px; border-radius: 12px;
  transition: background 0.2s;
  cursor: pointer;
}
.chat-item:hover { background: rgba(255,255,255,0.05); }
.c-icon { width: 40px; height: 40px; border-radius: 10px; background: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; }
.c-info h4 { font-size: 15px; font-weight: 500; margin-bottom: 4px; }
.c-info span { font-size: 12px; color: var(--color-text-muted); }

.btn-outline {
  background: transparent; border: 1px dashed var(--color-border);
  color: var(--color-text-secondary); height: 44px; border-radius: 12px; transition: all 0.2s;
}
.btn-outline:hover { background: rgba(255,255,255,0.05); border-style: solid; color: white; }
.w-full { width: 100%; } .mt-4 { margin-top: 16px; }

/* Timeline */
.timeline { display: flex; flex-direction: column; gap: 24px; position: relative; }
.timeline::before { content: ''; position: absolute; left: 5px; top: 10px; bottom: 10px; width: 2px; background: rgba(255,255,255,0.1); }
.tl-item { display: flex; gap: 16px; position: relative; z-index: 2; }
.tl-dot { width: 12px; height: 12px; border-radius: 50%; background: var(--color-text-muted); margin-top: 4px; box-shadow: 0 0 0 4px var(--color-bg-card); }
.tl-dot.highlight { background: var(--color-brand-blue); box-shadow: 0 0 0 4px rgba(79, 142, 247, 0.2); }
.tl-dot.empty { background: transparent; border: 2px solid var(--color-text-muted); }

.tl-content .time { font-size: 12px; color: var(--color-brand-purple); font-weight: 600; display: block; margin-bottom: 4px; }
.tl-content h4 { font-size: 14px; font-weight: 500; margin-bottom: 4px; line-height: 1.4; }
.tl-content .location { font-size: 12px; color: var(--color-text-muted); background: rgba(255,255,255,0.05); padding: 2px 8px; border-radius: 4px; display: inline-block; }
</style>
