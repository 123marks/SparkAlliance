<template>
  <div class="wall-layout">
    <div class="wall-container">
      
      <!-- Feed Header -->
      <div class="feed-header">
        <h1 class="page-title">校园动态墙</h1>
        <div class="tabs">
          <button class="tab active">推荐</button>
          <button class="tab">最新</button>
          <button class="tab">关注</button>
          <button class="tab">热议表白</button>
        </div>
      </div>

      <!-- Composer Placeholder -->
      <div class="composer-card">
        <div class="c-avatar"></div>
        <input type="text" placeholder="分享你的星火校园新鲜事..." class="c-input" />
        <button class="c-btn">图片</button>
      </div>

      <!-- Feed List -->
      <div class="feed-list">
        <!-- Post 1 -->
        <div class="post-card">
          <div class="post-header">
            <div class="p-author">
              <div class="p-avatar" style="background: linear-gradient(135deg, #10b981, #3b82f6)"></div>
              <div class="p-info">
                <h4>计科吴彦祖 <span class="tag">身份认证</span></h4>
                <span class="time">10 分钟前</span>
              </div>
            </div>
            <button class="more-btn">•••</button>
          </div>
          <div class="post-content">
            <p>有没有兄弟知道软工的课设如果使用 Vue3，老师那边查重容忍度高不高啊？我用 Composition API 写了一套，感觉大家代码结构都很像 😂</p>
          </div>
          <div class="post-tags">
            <span class="p-tag">#软件工程</span>
            <span class="p-tag">#求助交流</span>
          </div>
          <div class="post-actions">
            <button class="action-btn"><span class="icon">👍</span> 24</button>
            <button class="action-btn"><span class="icon">💬</span> 8</button>
            <button class="action-btn"><span class="icon">🔁</span></button>
          </div>
        </div>

        <!-- Post 2 -->
        <div class="post-card">
          <div class="post-header">
            <div class="p-author">
              <div class="p-avatar" style="background: rgba(255,255,255,0.1)">
                 <span class="anon-icon">🕵️</span>
              </div>
              <div class="p-info">
                <h4>匿名同学 <span class="tag anon">半匿名</span></h4>
                <span class="time">1 小时前</span>
              </div>
            </div>
          </div>
          <div class="post-content">
            <p>今天在二食堂二楼那个打麻辣烫的阿姨，手真的太抖了！好几片肉硬生生地被抖回了锅里！心碎 💔</p>
          </div>
          <div class="post-tags">
            <span class="p-tag">#生活吐槽</span>
          </div>
          <div class="post-actions">
            <button class="action-btn"><span class="icon">👍</span> 156</button>
            <button class="action-btn"><span class="icon">💬</span> 45</button>
            <button class="action-btn"><span class="icon">🔁</span></button>
          </div>
        </div>

        <!-- Post 3 -->
        <div class="post-card">
          <div class="post-header">
            <div class="p-author">
              <div class="p-avatar" style="background: linear-gradient(135deg, #8b5cf6, #ec4899)"></div>
              <div class="p-info">
                <h4>校园社团联盟 <span class="tag official">官方</span></h4>
                <span class="time">昨天 18:00</span>
              </div>
            </div>
          </div>
          <div class="post-content">
            <p>【百团大战预告】本周六，中心广场，校团委联合 80+ 社团等你来玩！现场扫码加入即送精美文创，还有随机掉落的抽奖机会哦！🎉</p>
            <div class="post-image-mock">
              <span class="img-icon">🖼️ 海报图片</span>
            </div>
          </div>
          <div class="post-actions">
            <button class="action-btn active"><span class="icon">❤️</span> 890</button>
            <button class="action-btn"><span class="icon">💬</span> 120</button>
            <button class="action-btn"><span class="icon">🔁</span> 34</button>
          </div>
        </div>
      </div>

    </div>

    <!-- Floating Action Button -->
    <button class="fab">
      <span class="cross">+</span>
    </button>
  </div>
</template>

<style scoped>
.wall-layout {
  position: relative;
  min-height: calc(100vh - 72px);
  padding: 32px 0;
}

.wall-container {
  max-width: 680px;
  margin: 0 auto;
  padding: 0 20px;
}

.feed-header {
  margin-bottom: 24px;
}
.page-title {
  font-size: 24px; font-weight: 800; margin-bottom: 20px; color: white;
}

.tabs {
  display: flex; gap: 12px; border-bottom: 1px solid var(--color-border); padding-bottom: 12px;
}
.tab { background: transparent; border: none; color: var(--color-text-secondary); font-size: 15px; font-weight: 500; padding: 4px 12px; cursor: pointer; transition: all 0.2s; position: relative;}
.tab:hover { color: white; }
.tab.active { color: white; font-weight: 600; }
.tab.active::after { content: ''; position: absolute; bottom: -13px; left: 0; width: 100%; height: 2px; background: var(--color-brand-blue); border-radius: 2px 2px 0 0; }

/* Composer */
.composer-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  padding: 16px;
  display: flex; align-items: center; gap: 16px;
  margin-bottom: 32px;
}
.c-avatar { width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, var(--color-brand-purple), var(--color-brand-orange)); flex-shrink: 0; }
.c-input { flex: 1; background: rgba(0,0,0,0.2); border: 1px solid var(--color-border); height: 44px; border-radius: 22px; padding: 0 20px; color: white; outline: none; transition: border-color 0.2s; }
.c-input:focus { border-color: var(--color-brand-blue); }
.c-btn { background: transparent; border: none; color: var(--color-brand-blue); font-weight: 500; cursor: pointer; }

/* Feed */
.feed-list {
  display: flex; flex-direction: column; gap: 24px;
}

.post-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 20px;
  padding: 24px;
  transition: transform 0.2s, box-shadow 0.2s;
}
.post-card:hover { transform: translateY(-2px); box-shadow: 0 10px 30px rgba(0,0,0,0.3); }

.post-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;}
.p-author { display: flex; gap: 12px; align-items: center; }
.p-avatar { width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center;}
.anon-icon { font-size: 24px; filter: grayscale(1); }
.p-info h4 { font-size: 15px; font-weight: 600; display: flex; align-items: center; gap: 8px; color: white; margin-bottom: 4px;}
.p-info .time { font-size: 12px; color: var(--color-text-muted); }
.tag { font-size: 10px; padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2); font-weight: normal;}
.tag.anon { border-color: var(--color-text-muted); color: var(--color-text-muted); }
.tag.official { background: rgba(249, 115, 22, 0.1); border-color: rgba(249, 115, 22, 0.3); color: var(--color-brand-orange); }

.more-btn { background: transparent; border: none; color: var(--color-text-muted); letter-spacing: 2px; }

.post-content { color: var(--color-text-primary); line-height: 1.6; font-size: 15px; margin-bottom: 16px; }
.post-image-mock { width: 100%; height: 200px; background: rgba(0,0,0,0.2); border-radius: 12px; margin-top: 16px; display: flex; align-items: center; justify-content: center; border: 1px dashed var(--color-border); color: var(--color-text-muted);}

.post-tags { display: flex; gap: 8px; margin-bottom: 16px; }
.p-tag { color: var(--color-brand-blue); font-size: 13px; cursor: pointer; }
.p-tag:hover { text-decoration: underline; }

.post-actions { display: flex; gap: 32px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 16px; }
.action-btn { background: transparent; border: none; color: var(--color-text-secondary); display: flex; align-items: center; gap: 8px; font-size: 14px; cursor: pointer; transition: color 0.2s;}
.action-btn:hover { color: white; }
.action-btn.active { color: #f43f5e; }

/* FAB */
.fab {
  position: fixed;
  bottom: 40px; right: 40px;
  width: 64px; height: 64px;
  border-radius: 32px;
  background: var(--gradient-brand);
  border: none; color: white; font-size: 32px;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 10px 20px rgba(139, 92, 246, 0.4);
  cursor: pointer; transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.fab:hover { transform: scale(1.1) rotate(90deg); }
.cross { line-height: 1; }
</style>
