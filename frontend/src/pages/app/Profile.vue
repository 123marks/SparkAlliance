<template>
  <div class="profile-layout">
    <!-- Hero Banner -->
    <div class="profile-banner">
      <div class="banner-overlay"></div>
    </div>

    <div class="profile-container">
      <!-- Profile Header -->
      <div class="profile-header">
        <div class="p-avatar-wrapper">
          <div class="p-avatar">{{ avatarInitial }}</div>
          <button class="edit-avatar-btn">📷</button>
        </div>
        <div class="p-info">
          <h1>{{ userName }} <span class="badge pro">PRO</span></h1>
          <p>{{ userEmail }} &middot; 加入了 {{ daysSinceJoined }} 天</p>
          <div class="bio">"代码改变世界，探索从未停止。"</div>
        </div>
        <div class="header-actions">
          <button class="btn-primary">编辑资料</button>
          <button class="btn-ghost icon-only">⚙️</button>
        </div>
      </div>

      <!-- Content Grid -->
      <div class="content-grid">
        <!-- Main Column -->
        <div class="main-col">
          <!-- Calendar / Activity -->
          <div class="widget">
            <div class="widget-header">
              <h3>活跃热力图</h3>
            </div>
            <div class="widget-body">
              <div class="heatmap">
                <div class="h-col" v-for="w in 24" :key="w">
                  <div class="h-cell" v-for="d in 7" :key="d" :class="getRandomIntensity()"></div>
                </div>
              </div>
              <div class="heatmap-legend">
                <span>Less</span>
                <div class="h-cell lv-0"></div><div class="h-cell lv-1"></div><div class="h-cell lv-2"></div><div class="h-cell lv-3"></div><div class="h-cell lv-4"></div>
                <span>More</span>
              </div>
            </div>
          </div>

          <!-- Pinned Data -->
          <div class="widget">
            <div class="widget-header">
              <h3>学习目标进度</h3>
            </div>
            <div class="widget-body goal-list">
              <div class="goal-item">
                <div class="g-info">
                  <span>完成《编译原理》视频课程</span>
                  <span class="pct">75%</span>
                </div>
                <div class="progress-track"><div class="progress-bar" style="width: 75%; background: var(--color-brand-blue)"></div></div>
              </div>
              <div class="goal-item">
                <div class="g-info">
                  <span>六级英语词汇背诵</span>
                  <span class="pct">40%</span>
                </div>
                <div class="progress-track"><div class="progress-bar" style="width: 40%; background: var(--color-brand-purple)"></div></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Side Column -->
        <div class="side-col">
          <!-- Stats Widget -->
          <div class="widget">
            <div class="widget-body grid-stats">
               <div class="s-brick">
                 <span class="num">126</span>
                 <span class="lbl">获赞总数</span>
               </div>
               <div class="s-brick">
                 <span class="num">42</span>
                 <span class="lbl">动态发布</span>
               </div>
               <div class="s-brick">
                 <span class="num">3.5k</span>
                 <span class="lbl">AI 交互次数</span>
               </div>
               <div class="s-brick">
                 <span class="num">5</span>
                 <span class="lbl">已获勋章</span>
               </div>
            </div>
          </div>

          <!-- Radar Chart Mock -->
          <div class="widget">
             <div class="widget-header">
               <h3>能力雷达</h3>
             </div>
             <div class="widget-body radar-mock">
                <!-- CSS drawing of a hexagon radar chart for mockup purposes -->
                <div class="radar-bg">
                  <div class="r-poly l1"></div>
                  <div class="r-poly l2"></div>
                  <div class="r-poly l3"></div>
                  <div class="r-axis a1"></div><div class="r-axis a2"></div><div class="r-axis a3"></div>
                  <!-- Data polygon mock -->
                  <div class="r-data"></div>
                </div>
                <div class="radar-labels">
                  <span>编程</span><span>算法</span><span>生活</span><span>社交</span><span>运动</span><span>专注</span>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAuth } from '../../composables/useAuth'

const { user } = useAuth()

// 用户信息
const userName = computed(() => {
  if (user.value?.user_metadata?.nickname) return user.value.user_metadata.nickname
  if (user.value?.email) return user.value.email.split('@')[0]
  return '同学'
})
const userEmail = computed(() => user.value?.email || '')
const avatarInitial = computed(() => userName.value ? userName.value.charAt(0).toUpperCase() : '?')
const daysSinceJoined = computed(() => {
  if (!user.value?.created_at) return 1
  const diff = new Date().getTime() - new Date(user.value.created_at).getTime()
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)))
})

// 热力图随机强度
const getRandomIntensity = () => {
  const rand = Math.random();
  if (rand < 0.6) return 'lv-0';
  if (rand < 0.8) return 'lv-1';
  if (rand < 0.9) return 'lv-2';
  if (rand < 0.95) return 'lv-3';
  return 'lv-4';
}
</script>

<style scoped>
.profile-layout {
  min-height: calc(100vh - 72px);
  overflow-y: auto;
  overflow-x: hidden;
}

.profile-banner {
  height: 200px;
  width: 100%;
  background: url('https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=1470&auto=format&fit=crop') center/cover;
  position: relative;
}
.banner-overlay {
  position: absolute; top:0;left:0;right:0;bottom:0;
  background: linear-gradient(to bottom, rgba(10,10,15,0) 0%, rgba(10,10,15,1) 100%);
}

.profile-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 0 40px 60px;
  position: relative;
  margin-top: -60px;
}

/* Header */
.profile-header {
  display: flex; gap: 32px; align-items: flex-end; margin-bottom: 48px;
}
@media (max-width: 768px) {
  .profile-header { flex-direction: column; align-items: center; text-align: center; }
}

.p-avatar-wrapper { position: relative; }
.p-avatar { width: 140px; height: 140px; border-radius: 50%; background: linear-gradient(135deg, var(--color-brand-blue), var(--color-brand-purple)); border: 4px solid var(--color-bg-primary); box-shadow: 0 10px 30px rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; font-size: 48px; font-weight: 800; color: white;}
.edit-avatar-btn { position: absolute; bottom: 8px; right: 8px; width: 36px; height: 36px; border-radius: 50%; background: var(--color-bg-card); border: 1px solid var(--color-border); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
.edit-avatar-btn:hover { background: rgba(255,255,255,0.1); }

.p-info { flex: 1; margin-bottom: 12px; }
.p-info h1 { font-size: 32px; font-weight: 800; display: flex; align-items: center; gap: 12px; margin-bottom: 8px;}
.badge.pro { font-size: 12px; padding: 2px 8px; background: linear-gradient(135deg, #f97316, #f43f5e); border-radius: 6px; }
.p-info p { color: var(--color-text-secondary); margin-bottom: 12px; }
.bio { font-size: 14px; font-style: italic; color: var(--color-text-muted); }

.header-actions { display: flex; gap: 12px; margin-bottom: 12px; }
.btn-primary { background: var(--color-brand-blue); border: none; padding: 0 20px; height: 40px; border-radius: 8px; color: white; font-weight: 500; cursor: pointer; transition: background 0.2s;}
.btn-primary:hover { background: #3b82f6; }
.btn-ghost { background: transparent; border: 1px solid var(--color-border); height: 40px; border-radius: 8px; color: white; cursor: pointer; transition: all 0.2s;}
.btn-ghost:hover { background: rgba(255,255,255,0.05); }
.icon-only { width: 40px; display: flex; align-items: center; justify-content: center; }

/* Grid */
.content-grid {
  display: grid; grid-template-columns: 2fr 1fr; gap: 24px;
}
@media (max-width: 900px) { .content-grid { grid-template-columns: 1fr; } }

.main-col { display: flex; flex-direction: column; gap: 24px; }
.side-col { display: flex; flex-direction: column; gap: 24px; }

.widget { background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: 20px; padding: 24px; }
.widget-header { margin-bottom: 20px; }
.widget-header h3 { font-size: 16px; font-weight: 600; }

/* Heatmap */
.heatmap { display: flex; gap: 4px; overflow-x: auto; padding-bottom: 12px;}
.h-col { display: flex; flex-direction: column; gap: 4px; }
.h-cell { width: 14px; height: 14px; border-radius: 3px; background: rgba(255,255,255,0.05); }
.lv-0 { background: rgba(255,255,255,0.03); }
.lv-1 { background: rgba(16, 185, 129, 0.2); }
.lv-2 { background: rgba(16, 185, 129, 0.5); }
.lv-3 { background: rgba(16, 185, 129, 0.8); }
.lv-4 { background: #10b981; box-shadow: 0 0 10px rgba(16, 185, 129, 0.5); }
.heatmap-legend { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--color-text-muted); justify-content: flex-end;}

/* Goals */
.goal-list { display: flex; flex-direction: column; gap: 20px; }
.g-info { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 8px; }
.progress-track { width: 100%; height: 8px; background: rgba(0,0,0,0.3); border-radius: 4px; overflow: hidden; }
.progress-bar { height: 100%; border-radius: 4px; }

/* Side Stats */
.grid-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.s-brick { background: rgba(0,0,0,0.2); border-radius: 12px; padding: 16px; display: flex; flex-direction: column; align-items: center; text-align: center; border: 1px solid rgba(255,255,255,0.02);}
.s-brick .num { font-size: 24px; font-weight: 800; color: white; margin-bottom: 4px; }
.s-brick .lbl { font-size: 12px; color: var(--color-text-muted); }

/* Radar Mock */
.radar-mock { display: flex; flex-direction: column; align-items: center; padding: 20px 0;}
.radar-bg { position: relative; width: 160px; height: 160px; display: flex; align-items: center; justify-content: center;}
.r-poly { position: absolute; border: 1px dashed var(--color-border); border-radius: 50%; }
.l1 { width: 50px; height: 50px; } .l2 { width: 100px; height: 100px; } .l3 { width: 150px; height: 150px; }
.r-axis { position: absolute; width: 100%; height: 1px; background: var(--color-border); }
.a1 { transform: rotate(0deg); } .a2 { transform: rotate(60deg); } .a3 { transform: rotate(120deg); }
.r-data { position: absolute; width: 100px; height: 110px; background: rgba(139, 92, 246, 0.3); border: 2px solid var(--color-brand-purple); clip-path: polygon(50% 0%, 100% 25%, 80% 80%, 30% 100%, 0% 50%); filter: drop-shadow(0 0 10px rgba(139, 92, 246, 0.4));}
.radar-labels { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; margin-top: 24px;}
.radar-labels span { font-size: 11px; color: var(--color-text-secondary); background: rgba(255,255,255,0.05); padding: 4px 8px; border-radius: 4px;}
</style>
