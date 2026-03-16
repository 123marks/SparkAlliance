<template>
  <div class="docs-page">
    <!-- 顶部导航 -->
    <nav class="docs-nav">
      <router-link to="/" class="nav-logo">✦ Spark Alliance</router-link>
      <div class="nav-links">
        <router-link to="/docs" class="active">文档</router-link>
        <router-link to="/community">社区</router-link>
        <router-link to="/changelog">更新日志</router-link>
        <router-link to="/login" class="nav-btn">登录</router-link>
      </div>
    </nav>

    <div class="docs-layout">
      <!-- 侧边栏目录 -->
      <aside class="docs-sidebar">
        <div class="sidebar-section">
          <div class="section-title">快速开始</div>
          <div class="section-item" :class="{ active: activeDoc === 'intro' }" @click="activeDoc = 'intro'">平台介绍</div>
          <div class="section-item" :class="{ active: activeDoc === 'quickstart' }" @click="activeDoc = 'quickstart'">快速上手</div>
          <div class="section-item" :class="{ active: activeDoc === 'faq' }" @click="activeDoc = 'faq'">常见问题</div>
        </div>
        <div class="sidebar-section">
          <div class="section-title">核心功能</div>
          <div class="section-item" :class="{ active: activeDoc === 'ai' }" @click="activeDoc = 'ai'">AI 智能助手</div>
          <div class="section-item" :class="{ active: activeDoc === 'wall' }" @click="activeDoc = 'wall'">校园墙</div>
          <div class="section-item" :class="{ active: activeDoc === 'talent' }" @click="activeDoc = 'talent'">Spark Talent</div>
          <div class="section-item" :class="{ active: activeDoc === 'news' }" @click="activeDoc = 'news'">星火资讯</div>
        </div>
        <div class="sidebar-section">
          <div class="section-title">开发者</div>
          <div class="section-item" :class="{ active: activeDoc === 'api' }" @click="activeDoc = 'api'">API 参考</div>
          <div class="section-item" :class="{ active: activeDoc === 'contributing' }" @click="activeDoc = 'contributing'">贡献指南</div>
        </div>
      </aside>

      <!-- 文档内容区 -->
      <main class="docs-content">
        <!-- 平台介绍 -->
        <article v-if="activeDoc === 'intro'" class="doc-article">
          <h1>✦ 欢迎来到星火校园</h1>
          <p class="lead">星火校园（Spark Alliance）是以 AI 为特色入口，深度融合社交、生活服务与个人管理的 <strong>校园超级平台</strong>。</p>

          <div class="info-card">
            <span class="info-icon">🎯</span>
            <div>
              <strong>目标</strong>
              <p>为大学生及青年群体提供一站式的智能学习与社交生活平台。</p>
            </div>
          </div>

          <h2>核心功能模块</h2>
          <div class="feature-grid">
            <div class="feature-card" v-for="feat in features" :key="feat.icon">
              <span class="feat-icon">{{ feat.icon }}</span>
              <h3>{{ feat.title }}</h3>
              <p>{{ feat.desc }}</p>
            </div>
          </div>

          <h2>技术栈</h2>
          <div class="tech-chips">
            <span class="chip" v-for="tech in techs" :key="tech">{{ tech }}</span>
          </div>
        </article>

        <!-- 快速上手 -->
        <article v-if="activeDoc === 'quickstart'" class="doc-article">
          <h1>🚀 快速上手</h1>
          <p class="lead">只需 3 步，即可开始你的星火校园之旅。</p>

          <div class="step-list">
            <div class="step" v-for="(step, i) in steps" :key="i">
              <div class="step-num">{{ i + 1 }}</div>
              <div class="step-body">
                <h3>{{ step.title }}</h3>
                <p>{{ step.desc }}</p>
                <div class="code-block" v-if="step.code">
                  <code>{{ step.code }}</code>
                </div>
              </div>
            </div>
          </div>
        </article>

        <!-- FAQ -->
        <article v-if="activeDoc === 'faq'" class="doc-article">
          <h1>❓ 常见问题</h1>
          <div class="faq-list">
            <div class="faq-item" v-for="(faq, i) in faqs" :key="i" @click="faq.open = !faq.open">
              <div class="faq-q">
                <span>{{ faq.q }}</span>
                <span class="faq-arrow" :class="{ rotated: faq.open }">▼</span>
              </div>
              <div class="faq-a" v-if="faq.open">{{ faq.a }}</div>
            </div>
          </div>
        </article>

        <!-- AI 智能助手 -->
        <article v-if="activeDoc === 'ai'" class="doc-article">
          <h1>🧠 AI 智能助手</h1>
          <p class="lead">基于本地授权方案，集成 DeepSeek、Doubao 等多模型，为你提供 24 小时学术辅导。</p>

          <h2>支持的功能</h2>
          <ul>
            <li><strong>智能答疑</strong>：数学、英语、专业课全覆盖，分步解析</li>
            <li><strong>图片识别</strong>：拍照上传题目，OCR 自动识别后 AI 解答</li>
            <li><strong>论文润色</strong>：学术写作辅助，语法优化和格式建议</li>
            <li><strong>代码调试</strong>：粘贴代码片段，AI 帮你定位和修复 Bug</li>
          </ul>

          <h2>本地授权方案</h2>
          <div class="info-card">
            <span class="info-icon">🔐</span>
            <div>
              <strong>你的数据，你做主</strong>
              <p>星火校园采用本地授权方案。你在本地登录 DeepSeek / Doubao，App 只获取你授予的访问令牌，所有对话记录独立存储。真正做到数据不出本地，隐私有保障。</p>
            </div>
          </div>
        </article>

        <!-- 校园墙 -->
        <article v-if="activeDoc === 'wall'" class="doc-article">
          <h1>📝 校园墙</h1>
          <p class="lead">半匿名公共社区信息板，分享你的校园生活点滴。</p>
          <ul>
            <li>支持匿名 / 实名发帖，自由选择身份</li>
            <li>多分类频道：吐槽、求助、表白、二手、拼车</li>
            <li>AI + 人工双重审核，保障内容安全</li>
            <li>点赞、评论、分享，互动零距离</li>
          </ul>
        </article>

        <!-- Spark Talent -->
        <article v-if="activeDoc === 'talent'" class="doc-article">
          <h1>🤝 Spark Talent 人才双向匹配</h1>
          <p class="lead">从「单向投递」到「双向寻访」，重新定义校园招聘。</p>
          <h2>青年侧</h2>
          <ul>
            <li>创建「能力名片」，展示你的技能与作品</li>
            <li>设置可见性：公开 / 仅企业可见 / 仅好友可见</li>
            <li>接收企业邀约，一键管理</li>
          </ul>
          <h2>企业侧</h2>
          <ul>
            <li>三重认证（营业执照 + 官方邮箱 + 工商核验）</li>
            <li>按技能标签、院校、城市等多维度搜索人才</li>
            <li>AI 语义匹配推荐，精准找到候选人</li>
          </ul>
        </article>

        <!-- 星火资讯 -->
        <article v-if="activeDoc === 'news'" class="doc-article">
          <h1>📰 星火资讯</h1>
          <p class="lead">打破信息茧房，让你不脱离社会脉搏。</p>
          <ul>
            <li>聚合 15+ 信息源：微博、知乎、B 站、36Kr 等</li>
            <li>AI 一键摘要 + 多角度解读</li>
            <li>个性化推荐 + 信息茧房破防机制</li>
            <li>每日简报推送，关键词订阅</li>
          </ul>
        </article>

        <!-- API 参考 -->
        <article v-if="activeDoc === 'api'" class="doc-article">
          <h1>⚡ API 参考</h1>
          <p class="lead">星火校园 RESTful API 文档（即将开放）</p>
          <div class="info-card">
            <span class="info-icon">🚧</span>
            <div>
              <strong>Coming Soon</strong>
              <p>API 文档正在编写中。后端基于 Supabase PostgreSQL，所有表均启用了 Row Level Security (RLS) 策略。详细的 Endpoint 文档将在 Beta 版本中发布。</p>
            </div>
          </div>
        </article>

        <!-- 贡献指南 -->
        <article v-if="activeDoc === 'contributing'" class="doc-article">
          <h1>💪 贡献指南</h1>
          <p class="lead">欢迎为星火校园贡献代码和创意！</p>
          <h2>如何参与</h2>
          <div class="step-list">
            <div class="step">
              <div class="step-num">1</div>
              <div class="step-body">
                <h3>Fork 仓库</h3>
                <p>从 GitHub 上 Fork 主仓库到你的账号。</p>
              </div>
            </div>
            <div class="step">
              <div class="step-num">2</div>
              <div class="step-body">
                <h3>创建分支</h3>
                <p>基于 main 分支创建你的功能分支。</p>
                <div class="code-block"><code>git checkout -b feat/your-feature</code></div>
              </div>
            </div>
            <div class="step">
              <div class="step-num">3</div>
              <div class="step-body">
                <h3>提交 PR</h3>
                <p>完成开发后提交 Pull Request，等待审查。</p>
              </div>
            </div>
          </div>
        </article>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'

const activeDoc = ref('intro')

const features = [
  { icon: '🧠', title: 'AI 智能助手', desc: '集成多模型，24小时学术辅导、答疑、代码调试' },
  { icon: '📝', title: '校园墙', desc: '半匿名社区，自由表达校园生活' },
  { icon: '💬', title: '社交伴侣', desc: '人格化AI助手 + 真人社交网络' },
  { icon: '🤝', title: 'Spark Talent', desc: '企业与青年的双向智能匹配' },
  { icon: '📰', title: '星火资讯', desc: '全网热点聚合与AI解读' },
  { icon: '🎯', title: '目标与任务', desc: '游戏化个人成长体系' },
]

const techs = ['Vue 3', 'TypeScript', 'Vite', 'Supabase', 'PostgreSQL', 'DeepSeek', 'Doubao', 'TailwindCSS']

const steps = [
  { title: '注册账号', desc: '使用邮箱快速注册一个星火校园账号。', code: null },
  { title: '完善资料', desc: '选择你的身份类型（学生 / 职场 / 自由职业），填写学校和专业信息。', code: null },
  { title: '开始探索', desc: '进入应用主页，体验 AI 答疑、校园墙、个人目标等核心功能！', code: null },
]

const faqs = reactive([
  { q: '星火校园是免费的吗？', a: '核心功能全部免费！包括 AI 答疑、校园墙、社交功能等。高级功能（如企业服务、深度报告）未来可能推出付费版本。', open: false },
  { q: 'AI 对话数据会被上传吗？', a: '不会！我们采用本地授权方案，你的对话数据存储在本地，不会上传至任何服务器。', open: false },
  { q: '支持哪些学校？', a: '目前正在邀请高校加入，所有大学生均可注册使用。校园特色功能（如课表导入、二手交易）将逐步覆盖更多学校。', open: false },
  { q: '如何反馈问题或建议？', a: '可以通过 App 内「个人中心 → 反馈」入口提交，也可以在 GitHub Issues 中反馈。', open: false },
  { q: '是否开放开发者 API？', a: 'API 文档正在编写中，将在 Beta 阶段开放。欢迎关注我们的 GitHub 仓库获取最新进展。', open: false },
])
</script>

<style scoped>
.docs-page {
  min-height: 100vh;
  background: var(--color-bg-primary);
}

/* Nav */
.docs-nav {
  height: 64px;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 40px;
  backdrop-filter: blur(20px);
  background: rgba(10,10,15,0.8);
  position: sticky;
  top: 0;
  z-index: 50;
}
.nav-logo { font-weight: 800; font-size: 18px; color: var(--color-brand-blue); }
.nav-links { display: flex; gap: 24px; align-items: center; }
.nav-links a { color: var(--color-text-secondary); font-size: 14px; font-weight: 500; transition: color 0.2s; }
.nav-links a:hover, .nav-links a.active { color: white; }
.nav-btn { background: var(--gradient-brand); padding: 8px 20px !important; border-radius: 8px; color: white !important; }

/* Layout */
.docs-layout { display: flex; min-height: calc(100vh - 64px); }

/* Sidebar */
.docs-sidebar {
  width: 260px;
  border-right: 1px solid var(--color-border);
  padding: 24px 16px;
  overflow-y: auto;
  position: sticky;
  top: 64px;
  height: calc(100vh - 64px);
}
.sidebar-section { margin-bottom: 28px; }
.section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: var(--color-text-muted); margin-bottom: 12px; padding: 0 12px; }
.section-item {
  padding: 10px 12px;
  font-size: 14px;
  color: var(--color-text-secondary);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 2px;
}
.section-item:hover { background: rgba(255,255,255,0.05); color: white; }
.section-item.active { background: rgba(79, 142, 247, 0.1); color: var(--color-brand-blue); font-weight: 500; }

/* Content */
.docs-content {
  flex: 1;
  padding: 48px 64px;
  max-width: 800px;
}
.doc-article h1 { font-size: 36px; font-weight: 800; margin-bottom: 16px; }
.doc-article h2 { font-size: 24px; font-weight: 700; margin-top: 40px; margin-bottom: 16px; }
.doc-article .lead { font-size: 18px; color: var(--color-text-secondary); line-height: 1.6; margin-bottom: 32px; }
.doc-article p { color: var(--color-text-secondary); line-height: 1.7; margin-bottom: 16px; }
.doc-article ul { margin-left: 20px; margin-bottom: 24px; }
.doc-article li { color: var(--color-text-secondary); line-height: 1.8; margin-bottom: 8px; }
.doc-article strong { color: white; }

/* Info Card */
.info-card {
  display: flex;
  gap: 16px;
  background: rgba(79, 142, 247, 0.08);
  border: 1px solid rgba(79, 142, 247, 0.2);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 32px;
}
.info-icon { font-size: 28px; flex-shrink: 0; }
.info-card strong { display: block; margin-bottom: 6px; }

/* Feature Grid */
.feature-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; margin-bottom: 32px; }
.feature-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 20px;
  transition: transform 0.2s, border-color 0.2s;
}
.feature-card:hover { transform: translateY(-4px); border-color: rgba(79, 142, 247, 0.3); }
.feat-icon { font-size: 28px; display: block; margin-bottom: 12px; }
.feature-card h3 { font-size: 16px; margin-bottom: 8px; }
.feature-card p { font-size: 13px; color: var(--color-text-secondary); }

/* Tech Chips */
.tech-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.chip {
  background: rgba(139, 92, 246, 0.1);
  border: 1px solid rgba(139, 92, 246, 0.25);
  color: #c4b5fd;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
}

/* Steps */
.step-list { display: flex; flex-direction: column; gap: 24px; margin-bottom: 32px; }
.step { display: flex; gap: 20px; }
.step-num {
  width: 36px; height: 36px; border-radius: 50%;
  background: var(--gradient-brand);
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 16px; flex-shrink: 0;
}
.step-body h3 { font-size: 18px; margin-bottom: 6px; }
.code-block {
  background: rgba(0,0,0,0.3);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 12px 16px;
  margin-top: 12px;
  overflow-x: auto;
}
.code-block code { color: #a5f3fc; font-family: 'Fira Code', monospace; font-size: 14px; }

/* FAQ */
.faq-list { display: flex; flex-direction: column; gap: 12px; }
.faq-item {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: border-color 0.2s;
}
.faq-item:hover { border-color: rgba(79, 142, 247, 0.3); }
.faq-q { display: flex; justify-content: space-between; align-items: center; font-weight: 600; }
.faq-arrow { font-size: 12px; color: var(--color-text-muted); transition: transform 0.2s; }
.faq-arrow.rotated { transform: rotate(180deg); }
.faq-a { margin-top: 12px; color: var(--color-text-secondary); line-height: 1.6; font-size: 14px; }

/* Responsive */
@media (max-width: 768px) {
  .docs-sidebar { display: none; }
  .docs-content { padding: 24px 20px; }
  .feature-grid { grid-template-columns: 1fr; }
}
</style>
