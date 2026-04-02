<template>
  <div class="section">
    <h2>关于帮助</h2>
    <p class="section-desc">版本信息、团队介绍、技术栈和法律条款。</p>

    <!-- 版本信息 -->
    <div class="card">
      <div class="card-title">版本信息</div>
      <div class="info-row">
        <span class="info-label">产品名称</span>
        <span class="info-value">Spark Alliance 星火联盟</span>
      </div>
      <div class="info-row">
        <span class="info-label">当前版本</span>
        <span class="info-value version-badge">v2.0.0-beta</span>
      </div>
      <div class="info-row">
        <span class="info-label">发布日期</span>
        <span class="info-value">2026年3月</span>
      </div>
      <div class="info-row">
        <span class="info-label">更新日志</span>
        <router-link to="/changelog" class="text-link">查看更新记录 →</router-link>
      </div>
    </div>

    <!-- 团队介绍 -->
    <div class="card">
      <div class="card-title">关于星火联盟</div>
      <p class="about-text">
        星火联盟 (Spark Alliance) 是一个面向大学生的智能校园生态平台，
        致力于通过 AI 技术、社区互助和个性化工具，帮助每一位同学成为更好的自己。
        我们相信，每一个小小的火花，都能汇聚成照亮前路的星辰。
      </p>
      <div class="card-subtitle">技术栈</div>
      <div class="tech-stack">
        <span class="tech-tag">Vue 3</span>
        <span class="tech-tag">TypeScript</span>
        <span class="tech-tag">Vite</span>
        <span class="tech-tag">Supabase</span>
        <span class="tech-tag">PostgreSQL</span>
        <span class="tech-tag">AI 多模型集成</span>
        <span class="tech-tag">MapLibre GL</span>
        <span class="tech-tag">Canvas 粒子引擎</span>
      </div>
    </div>

    <!-- 帮助与反馈 -->
    <div class="card">
      <div class="card-title">帮助与反馈</div>
      <div class="link-list">
        <router-link to="/docs" class="action-link">
          <span class="link-icon">📖</span>
          <div>
            <strong>使用文档</strong>
            <span>快速入门和功能介绍。</span>
          </div>
        </router-link>
        <router-link to="/app/feedback" class="action-link">
          <span class="link-icon">💬</span>
          <div>
            <strong>反馈建议</strong>
            <span>提交 Bug 报告或功能建议。</span>
          </div>
        </router-link>
        <router-link to="/app/chat" class="action-link">
          <span class="link-icon">🤖</span>
          <div>
            <strong>AI 助手</strong>
            <span>快速获取使用指引和模块入口。</span>
          </div>
        </router-link>
        <router-link to="/app/wall" class="action-link">
          <span class="link-icon">👥</span>
          <div>
            <strong>校园墙讨论</strong>
            <span>和同学一起交流功能想法与使用场景。</span>
          </div>
        </router-link>
      </div>
    </div>

    <!-- 法律信息 -->
    <div class="card">
      <div class="card-title">法律信息</div>
      <div class="legal-links">
        <router-link to="/terms" class="legal-link">服务条款</router-link>
        <span class="legal-sep">·</span>
        <router-link to="/privacy-policy" class="legal-link">隐私政策</router-link>
        <span class="legal-sep">·</span>
        <router-link to="/open-source" class="legal-link">开源许可</router-link>
      </div>
      <p class="copyright">© 2026 Spark Alliance. All rights reserved.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
// 纯展示页面，无逻辑
</script>

<style scoped>
.section { display: flex; flex-direction: column; gap: 20px; }
.section h2 { margin: 0; font-size: 20px; font-weight: 800; color: var(--color-text-primary); }
.section-desc { margin: -8px 0 4px; font-size: 13px; color: var(--color-text-muted); }
.card { background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 24px; }
.card-title { margin-bottom: 20px; font-size: 15px; font-weight: 700; color: var(--color-text-primary); }
.card-subtitle { font-size: 13px; font-weight: 600; color: var(--color-text-secondary); margin: 16px 0 10px; }

/* 信息行 */
.info-row { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--color-border); }
.info-row:last-child { border-bottom: none; }
.info-label { width: 90px; flex-shrink: 0; font-size: 13px; color: var(--color-text-muted); }
.info-value { flex: 1; font-size: 14px; color: var(--color-text-primary); }
.version-badge { display: inline-flex; padding: 2px 12px; border-radius: 20px; background: rgba(139,92,246,0.12); color: #c4b5fd; font-weight: 700; font-size: 13px; }
.text-link { font-size: 13px; color: #60a5fa; text-decoration: none; transition: opacity 0.2s; }
.text-link:hover { opacity: 0.8; text-decoration: underline; }

/* 团队介绍 */
.about-text { font-size: 14px; color: var(--color-text-secondary); line-height: 1.8; margin: 0; }
.tech-stack { display: flex; flex-wrap: wrap; gap: 8px; }
.tech-tag { padding: 4px 14px; border-radius: 8px; background: var(--color-bg-card-hover); border: 1px solid var(--color-border); font-size: 12px; color: var(--color-text-secondary); font-weight: 500; }

/* 帮助链接 */
.link-list { display: flex; flex-direction: column; gap: 8px; }
.action-link { display: flex; align-items: center; gap: 14px; padding: 14px 16px; border-radius: 14px; text-decoration: none; transition: background 0.15s; border: 1px solid transparent; }
.action-link:hover { background: var(--color-bg-card-hover); border-color: var(--color-border); }
.link-icon { font-size: 22px; flex-shrink: 0; }
.action-link strong { display: block; font-size: 14px; color: var(--color-text-primary); margin-bottom: 2px; }
.action-link div span { font-size: 12px; color: var(--color-text-muted); line-height: 1.5; }

/* 法律信息 */
.legal-links { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.legal-link { font-size: 13px; color: #60a5fa; text-decoration: none; }
.legal-link:hover { text-decoration: underline; }
.legal-sep { color: var(--color-text-muted); font-size: 12px; }
.copyright { font-size: 12px; color: var(--color-text-muted); margin: 0; }
</style>
