<template>
  <div class="docs-page">
    <!-- 顶部导航 -->
    <nav class="docs-nav">
      <router-link to="/" class="nav-logo">✦ Spark Alliance</router-link>
      <div class="nav-center">
        <div class="search-box">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input placeholder="搜索文档..." disabled />
          <kbd>⌘K</kbd>
        </div>
      </div>
      <div class="nav-links">
        <router-link to="/docs" class="active">文档</router-link>
        <router-link to="/community">社区</router-link>
        <router-link to="/changelog">更新日志</router-link>
        <router-link to="/login" class="nav-btn">登录</router-link>
      </div>
    </nav>

    <div class="docs-layout">
      <!-- 左侧导航 -->
      <aside class="docs-sidebar">
        <div class="sidebar-section" v-for="section in sidebarSections" :key="section.title">
          <div class="section-title">{{ section.title }}</div>
          <div
            v-for="item in section.items"
            :key="item.id"
            class="section-item"
            :class="{ active: activeDoc === item.id }"
            @click="activeDoc = item.id"
          >{{ item.label }}</div>
        </div>
      </aside>

      <!-- 文档内容 -->
      <main class="docs-content">
        <!-- 平台介绍 -->
        <article v-if="activeDoc === 'intro'" class="doc-article">
          <h1>✦ 欢迎来到星火联盟</h1>
          <p class="lead">星火联盟（Spark Alliance）是接入多个顶级大模型 API，深度融合 AI 助手、社交协作与个人成长的<strong>青年超级平台</strong>。</p>

          <div class="callout info">
            <span class="callout-icon">🎯</span>
            <div><strong>定位</strong><p>面向大学生及青年群体，提供一站式的智能学习、协作与成长平台。未来将拓展至全球市场。</p></div>
          </div>

          <h2>你能用星火联盟做什么</h2>
          <div class="capability-grid">
            <div class="cap-card" v-for="cap in capabilities" :key="cap.icon">
              <div class="cap-icon">{{ cap.icon }}</div>
              <h3>{{ cap.title }}</h3>
              <p>{{ cap.desc }}</p>
            </div>
          </div>

          <h2>支持的 AI 模型</h2>
          <p>星火联盟通过 API 接入多个顶级大模型，你可以按需切换：</p>
          <div class="model-table">
            <div class="model-row header"><span>名称</span><span>类型</span><span>额度</span><span>能力</span></div>
            <div class="model-row" v-for="m in models" :key="m.name"><span>{{ m.name }}</span><span>{{ m.type }}</span><span>{{ m.quota }}</span><span>{{ m.ability }}</span></div>
          </div>

          <h2>技术栈</h2>
          <div class="tech-chips">
            <span class="chip" v-for="tech in techs" :key="tech">{{ tech }}</span>
          </div>
        </article>

        <!-- 快速上手 -->
        <article v-if="activeDoc === 'quickstart'" class="doc-article">
          <h1>🚀 快速上手</h1>
          <p class="lead">只需 3 步，即可开始你的星火之旅。</p>
          <div class="step-list">
            <div class="step" v-for="(step, i) in steps" :key="i">
              <div class="step-num">{{ i + 1 }}</div>
              <div class="step-body">
                <h3>{{ step.title }}</h3>
                <p>{{ step.desc }}</p>
                <div class="code-block" v-if="step.url"><code>{{ step.url }}</code></div>
              </div>
            </div>
          </div>
        </article>

        <!-- FAQ -->
        <article v-if="activeDoc === 'faq'" class="doc-article">
          <h1>❓ 常见问题</h1>
          <div class="faq-list">
            <div class="faq-item" v-for="(faq, i) in faqs" :key="i" @click="faq.open = !faq.open">
              <div class="faq-q"><span>{{ faq.q }}</span><span class="faq-arrow" :class="{ rotated: faq.open }">▼</span></div>
              <div class="faq-a" v-if="faq.open">{{ faq.a }}</div>
            </div>
          </div>
        </article>

        <!-- AI 智能助手 -->
        <article v-if="activeDoc === 'ai'" class="doc-article">
          <h1>🧠 AI 智能助手</h1>
          <p class="lead">通过 API 接入 DeepSeek、豆包、千问等多个顶级大模型，为你提供 24 小时智能答疑。</p>

          <h2>支持的功能</h2>
          <ul>
            <li><strong>智能答疑</strong>：数学、英语、专业课全覆盖，分步解析</li>
            <li><strong>图片识别</strong>：拍照上传题目，OCR 自动识别后 AI 解答</li>
            <li><strong>论文润色</strong>：学术写作辅助，语法优化和格式建议</li>
            <li><strong>代码调试</strong>：粘贴代码片段，AI 帮你定位和修复 Bug</li>
          </ul>

          <h2>使用额度</h2>
          <div class="callout warning">
            <span class="callout-icon">⚡</span>
            <div><strong>额度说明</strong><p>免费用户每天 20 次 AI 调用额度。付费用户（高级版 ¥19.9/月）可解锁无限调用 + 多模型自由切换。每次对话消耗 1 次额度，不同模型消耗相同。</p></div>
          </div>

          <h2>数据安全</h2>
          <div class="callout info">
            <span class="callout-icon">🔐</span>
            <div><strong>你的数据，你做主</strong><p>所有对话记录存储在你的个人账户中，受 Supabase RLS 行级安全策略保护。我们不会将你的对话数据用于训练模型，也不会向第三方共享。</p></div>
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
            <li>实时更新，动态零延迟</li>
          </ul>
          <router-link to="/app/wall" class="doc-cta">打开校园墙 →</router-link>
        </article>

        <!-- 星火人才 -->
        <article v-if="activeDoc === 'talent'" class="doc-article">
          <h1>🤝 星火人才</h1>
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
          <router-link to="/app/talent" class="doc-cta">查看星火人才 →</router-link>
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
          <router-link to="/app/news" class="doc-cta">浏览星火资讯 →</router-link>
        </article>

        <!-- 星火共创 -->
        <article v-if="activeDoc === 'cocreate'" class="doc-article">
          <h1>🚀 星火共创</h1>
          <p class="lead">让优秀项目被更多人看见，组队共创改变世界。</p>
          <h2>核心流程</h2>
          <ul>
            <li><strong>发现好项目</strong>：在广场浏览各类项目，按分类/状态/关键词筛选</li>
            <li><strong>组队共创</strong>：选择你想加入的角色，发起协作申请</li>
            <li><strong>互动反馈</strong>：点赞、评论，让项目获得更多曝光</li>
          </ul>
          <h2>支持的项目分类</h2>
          <div class="tech-chips">
            <span class="chip" v-for="c in ['Web应用', '移动App', 'AI/ML', '游戏', '设计', '工具', '教育', '其他']" :key="c">{{ c }}</span>
          </div>
          <router-link to="/app/cocreate" class="doc-cta">进入星火共创 →</router-link>
        </article>

        <!-- 星火自习室 -->
        <article v-if="activeDoc === 'studyroom'" class="doc-article">
          <h1>📖 星火自习室</h1>
          <p class="lead">专注学习、番茄钟计时、排行榜互助，营造沉浸式学习氛围。</p>
          <ul>
            <li>番茄钟专注模式（25分钟工作 / 5分钟休息）</li>
            <li>学习房间系统，和朋友一起在线自习</li>
            <li>每日/每周排行榜，学习时长可视化</li>
            <li>专注白噪音、自定义计时</li>
          </ul>
          <router-link to="/app/study-room" class="doc-cta">进入自习室 →</router-link>
        </article>

        <!-- 校园购物 -->
        <article v-if="activeDoc === 'shop'" class="doc-article">
          <h1>🛒 校园购物</h1>
          <p class="lead">C2C 二手交易平台，基于 IP 优先推送近距离商品。</p>
          <ul>
            <li><strong>智能推送</strong>：基于用户 IP 定位，优先展示附近校区的商品</li>
            <li><strong>快递支持</strong>：除面交外支持快递发货</li>
            <li><strong>流量加持</strong>：付费用户的商品获得更高曝光权重</li>
            <li>安全交易保障，买卖双方评价体系</li>
          </ul>
          <router-link to="/app/shop" class="doc-cta">浏览校园购物 →</router-link>
        </article>

        <!-- API -->
        <article v-if="activeDoc === 'api'" class="doc-article">
          <h1>⚡ API 参考</h1>
          <p class="lead">星火联盟 RESTful API 文档（即将开放）</p>
          <div class="callout warning">
            <span class="callout-icon">🚧</span>
            <div><strong>开发中</strong><p>开放 API 正在开发中，预计后续开放。如有企业合作需求，请联系 <code>admin@sparkalliance.cn</code>。</p></div>
          </div>
        </article>

        <!-- 贡献指南 -->
        <article v-if="activeDoc === 'contributing'" class="doc-article">
          <h1>🤝 贡献指南</h1>
          <p class="lead">我们欢迎社区贡献者参与星火联盟的建设。</p>
          <h2>如何贡献</h2>
          <ul>
            <li>在 <a href="https://github.com/sparkalliance" target="_blank">GitHub</a> 提交 Issue 或 Pull Request</li>
            <li>在社区<router-link to="/community">提交反馈</router-link>或功能建议</li>
            <li>撰写教程和使用指南，帮助新用户入门</li>
          </ul>
          <h2>行为准则</h2>
          <ul>
            <li>尊重每一位社区成员，禁止人身攻击</li>
            <li>使用中文或英文进行交流</li>
            <li>遵守开源许可协议</li>
          </ul>
        </article>

        <!-- 帮助中心 -->
        <article v-if="activeDoc === 'help'" class="doc-article">
          <h1>🆘 帮助中心</h1>
          <p class="lead">遇到问题？我们随时为你提供帮助。</p>
          <h2>获取帮助的方式</h2>
          <div class="help-grid">
            <div class="help-card">
              <span>💬</span>
              <h3>社区讨论</h3>
              <p>在社区发帖提问，其他用户和团队成员会及时回复。</p>
              <router-link to="/community">前往社区 →</router-link>
            </div>
            <div class="help-card">
              <span>📧</span>
              <h3>邮件联系</h3>
              <p>发送邮件至 <strong>support@sparkalliance.cn</strong>，我们会在 24 小时内回复。</p>
            </div>
            <div class="help-card">
              <span>📱</span>
              <h3>微信公众号</h3>
              <p>关注「星火联盟 SparkAlliance」公众号，获取最新消息和在线客服。</p>
            </div>
          </div>
        </article>

        <!-- 联系我们 -->
        <article v-if="activeDoc === 'contact'" class="doc-article">
          <h1>📞 联系我们</h1>
          <p class="lead">无论是合作、反馈还是建议，我们都期待你的来信。</p>
          <div class="contact-grid">
            <div class="contact-item"><span class="contact-label">商务合作</span><span>business@sparkalliance.cn</span></div>
            <div class="contact-item"><span class="contact-label">技术支持</span><span>support@sparkalliance.cn</span></div>
            <div class="contact-item"><span class="contact-label">媒体联络</span><span>media@sparkalliance.cn</span></div>
            <div class="contact-item"><span class="contact-label">安全漏洞</span><span>security@sparkalliance.cn</span></div>
          </div>
        </article>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'

const activeDoc = ref('intro')

// 侧边栏分组
const sidebarSections = [
  {
    title: '快速开始',
    items: [
      { id: 'intro', label: '平台介绍' },
      { id: 'quickstart', label: '快速上手' },
      { id: 'faq', label: '常见问题' },
    ]
  },
  {
    title: '核心功能',
    items: [
      { id: 'ai', label: 'AI 智能助手' },
      { id: 'wall', label: '校园墙' },
      { id: 'talent', label: '星火人才' },
      { id: 'news', label: '星火资讯' },
      { id: 'cocreate', label: '星火共创' },
      { id: 'studyroom', label: '星火自习室' },
      { id: 'shop', label: '校园购物' },
    ]
  },
  {
    title: '开发者',
    items: [
      { id: 'api', label: 'API 参考' },
      { id: 'contributing', label: '贡献指南' },
    ]
  },
  {
    title: '帮助与支持',
    items: [
      { id: 'help', label: '帮助中心' },
      { id: 'contact', label: '联系我们' },
    ]
  },
]

// 平台能力卡片
const capabilities = [
  { icon: '🔍', title: '智能答疑', desc: '接入多个大模型API，找到合适的学习起点' },
  { icon: '🚀', title: '项目协作', desc: '发布项目、组建团队，共创更大价值' },
  { icon: '🛠', title: '效率工具', desc: '日程管理、番茄钟、目标规划一站搞定' },
  { icon: '📝', title: '社区互动', desc: '校园墙、社交伴侣、话题讨论' },
  { icon: '💼', title: '人才连接', desc: '能力名片、双向匹配、AI推荐' },
  { icon: '📰', title: '信息聚合', desc: '全网资讯、AI摘要、打破信息茧房' },
]

// AI 模型列表
const models = [
  { name: '🔵 DeepSeek-V3', type: '通用', quota: '免费20次/天', ability: '推理 · 代码 · 数学' },
  { name: '🟢 豆包(Doubao)', type: '对话', quota: '免费20次/天', ability: '对话 · 创意 · 写作' },
  { name: '🟡 千问(Qwen)', type: '多模态', quota: '付费用户', ability: '图片理解 · 推理' },
]

// 技术栈
const techs = ['Vue 3', 'TypeScript', 'Supabase', 'DeepSeek API', '豆包 API', 'Vite', 'TailwindCSS (部分)']

// 快速上手步骤
const steps = [
  { title: '注册账号', desc: '使用邮箱或手机号注册，30秒即可完成。', url: 'https://spark-alliance.app/register' },
  { title: '探索功能', desc: '进入主控台，浏览 AI 助手、校园墙、星火共创等模块。' },
  { title: '开始使用', desc: '开始你的第一次 AI 对话，发布第一条动态，或创建第一个共创项目。' },
]

// FAQ
const faqs = reactive([
  { q: '星火联盟收费吗？', a: '基础功能永久免费，AI 助手每天免费 20 次调用。如需无限 AI 调用和高级权益，可升级至高级版（¥19.9/月）或年度版（¥199/年）。', open: false },
  { q: 'AI 助手是调用哪些大模型？', a: '我们通过 API 接入 DeepSeek-V3、豆包(Doubao)、千问(Qwen) 等顶级大模型，不是本地运行。你的对话数据通过加密通道传输，不会被用于模型训练。', open: false },
  { q: '数据安全吗？', a: '所有用户数据存储在独立的 Supabase 数据库中，启用了行级安全策略(RLS)。你的数据只有你自己可以访问。', open: false },
  { q: '可以在手机上使用吗？', a: '星火联盟是响应式 Web 应用，可以在任何设备的浏览器中使用。原生 App 正在规划中。', open: false },
  { q: '如何联系客服？', a: '你可以在社区发帖、发送邮件至 support@sparkalliance.cn，或关注微信公众号「星火联盟 SparkAlliance」获得在线客服。', open: false },
])

</script>

<style scoped>
.docs-page { min-height: 100vh; background: var(--color-bg-primary); display: flex; flex-direction: column; }

/* 导航 */
.docs-nav { height: 56px; border-bottom: 1px solid var(--color-border); display: flex; align-items: center; justify-content: space-between; padding: 0 24px; backdrop-filter: blur(20px); background: rgba(10,10,15,0.9); position: sticky; top: 0; z-index: 50; gap: 20px; }
.nav-logo { font-weight: 800; font-size: 16px; color: var(--color-brand-blue); flex-shrink: 0; }
.nav-center { flex: 1; max-width: 400px; }
.search-box { display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 6px 12px; color: var(--color-text-muted); }
.search-box input { flex: 1; background: none; border: none; outline: none; color: white; font-size: 13px; }
.search-box input::placeholder { color: var(--color-text-muted); }
.search-box kbd { font-size: 10px; background: rgba(255,255,255,0.06); padding: 2px 6px; border-radius: 4px; color: var(--color-text-muted); }
.nav-links { display: flex; gap: 20px; align-items: center; flex-shrink: 0; }
.nav-links a { color: var(--color-text-secondary); font-size: 13px; font-weight: 500; transition: color 0.2s; }
.nav-links a:hover, .nav-links a.active { color: white; }
.nav-btn { background: var(--gradient-brand); padding: 6px 16px !important; border-radius: 8px; color: white !important; }

/* 三栏布局 */
.docs-layout { display: flex; flex: 1; }

/* 左侧边栏 */
.docs-sidebar { width: 220px; border-right: 1px solid var(--color-border); padding: 16px 8px; overflow-y: auto; flex-shrink: 0; position: sticky; top: 56px; height: calc(100vh - 56px); }
.sidebar-section { margin-bottom: 16px; }
.section-title { font-size: 11px; color: var(--color-text-muted); font-weight: 700; letter-spacing: 1px; text-transform: uppercase; padding: 8px 12px 4px; }
.section-item { padding: 6px 12px; font-size: 13px; color: var(--color-text-secondary); border-radius: 6px; cursor: pointer; transition: all 0.15s; margin-bottom: 2px; }
.section-item:hover { background: rgba(255,255,255,0.04); color: white; }
.section-item.active { background: rgba(139,92,246,0.12); color: white; font-weight: 600; }

/* 主内容区 - 居中显示 */
.docs-content { flex: 1; padding: 32px 48px; max-width: 900px; margin: 0 auto; overflow-y: auto; }

/* 右侧辅助面板 */
.docs-toc { width: 220px; padding: 16px; position: sticky; top: 56px; height: calc(100vh - 56px); border-left: 1px solid rgba(255,255,255,0.04); flex-shrink: 0; overflow-y: auto; }
.toc-group { margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid rgba(255,255,255,0.03); }
.toc-group:last-child { border-bottom: none; }
.toc-title { font-size: 11px; color: var(--color-text-muted); font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 8px; }
.toc-item { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--color-text-secondary); padding: 5px 8px; border-radius: 6px; cursor: pointer; transition: all 0.12s; margin-bottom: 2px; }
.toc-item:hover { background: rgba(255,255,255,0.04); color: white; }
.toc-item.active { background: rgba(139,92,246,0.12); color: white; font-weight: 600; }
.toc-link { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--color-text-secondary); padding: 5px 8px; border-radius: 6px; transition: all 0.12s; margin-bottom: 2px; text-decoration: none; }
.toc-link:hover { background: rgba(255,255,255,0.04); color: white; }
.version-box { background: rgba(139,92,246,0.06); border: 1px solid rgba(139,92,246,0.12); border-radius: 10px; padding: 14px !important; text-align: center; }
.version-label { font-size: 10px; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
.version-num { font-size: 18px; font-weight: 800; background: var(--gradient-brand); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 2px; }
.version-date { font-size: 11px; color: var(--color-text-muted); }
.share-btns { display: flex; gap: 6px; }
.share-btn { flex: 1; padding: 8px 12px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; color: var(--color-text-secondary); font-size: 12px; cursor: pointer; transition: all 0.12s; }
.share-btn:hover { background: rgba(255,255,255,0.08); color: white; }

/* 文档排版 */
.doc-article h1 { font-size: 32px; font-weight: 800; margin-bottom: 16px; }
.doc-article h2 { font-size: 22px; font-weight: 700; margin-top: 32px; margin-bottom: 16px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.04); }
.lead { font-size: 17px; color: var(--color-text-secondary); line-height: 1.7; margin-bottom: 24px; }
.doc-article ul { padding-left: 20px; margin-bottom: 16px; }
.doc-article li { color: var(--color-text-secondary); line-height: 1.8; margin-bottom: 4px; }
.doc-article li strong { color: white; }
.doc-article a { color: var(--color-brand-blue); }
.doc-cta { display: inline-block; margin-top: 16px; padding: 10px 24px; background: var(--gradient-brand); border-radius: 10px; font-weight: 700; color: white; font-size: 14px; transition: transform 0.2s; text-decoration: none; }
.doc-cta:hover { transform: translateY(-2px); }

/* 提示框 */
.callout { display: flex; gap: 14px; padding: 16px 20px; border-radius: 12px; margin-bottom: 20px; border-left: 3px solid; }
.callout.info { background: rgba(59,130,246,0.06); border-color: #3b82f6; }
.callout.warning { background: rgba(249,115,22,0.06); border-color: #f97316; }
.callout-icon { font-size: 20px; flex-shrink: 0; }
.callout p { color: var(--color-text-secondary); font-size: 14px; line-height: 1.6; margin-top: 4px; }
.callout code { background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px; font-size: 12px; }

/* 能力卡片 */
.capability-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 16px; }
.cap-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 20px; transition: transform 0.2s; cursor: default; }
.cap-card:hover { transform: translateY(-3px); }
.cap-icon { font-size: 24px; margin-bottom: 10px; }
.cap-card h3 { font-size: 15px; font-weight: 700; margin-bottom: 6px; }
.cap-card p { font-size: 13px; color: var(--color-text-secondary); line-height: 1.5; }

/* 模型表 */
.model-table { border: 1px solid var(--color-border); border-radius: 10px; overflow: hidden; margin-bottom: 16px; }
.model-row { display: grid; grid-template-columns: 2fr 1fr 1.5fr 2fr; padding: 12px 16px; font-size: 13px; border-bottom: 1px solid rgba(255,255,255,0.04); }
.model-row.header { background: rgba(255,255,255,0.03); font-weight: 700; color: var(--color-text-muted); font-size: 11px; text-transform: uppercase; letter-spacing: 1px; }
.model-row:last-child { border-bottom: none; }
.model-row span { color: var(--color-text-secondary); }
.model-row span:first-child { color: white; font-weight: 500; }

/* 技术栈标签 */
.tech-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
.chip { padding: 5px 14px; border-radius: 999px; background: rgba(139,92,246,0.1); border: 1px solid rgba(139,92,246,0.2); font-size: 12px; color: #c4b5fd; }

/* 步骤 */
.step-list { display: flex; flex-direction: column; gap: 24px; }
.step { display: flex; gap: 16px; }
.step-num { width: 36px; height: 36px; border-radius: 50%; background: var(--gradient-brand); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 16px; flex-shrink: 0; }
.step-body h3 { font-size: 18px; font-weight: 700; margin-bottom: 6px; }
.step-body p { color: var(--color-text-secondary); line-height: 1.6; }
.code-block { margin-top: 12px; padding: 12px 16px; background: rgba(0,0,0,0.4); border-radius: 8px; border: 1px solid rgba(255,255,255,0.06); }
.code-block code { font-family: monospace; font-size: 13px; color: #10b981; }

/* FAQ */
.faq-list { display: flex; flex-direction: column; gap: 8px; }
.faq-item { border: 1px solid var(--color-border); border-radius: 10px; padding: 16px; cursor: pointer; transition: border-color 0.2s; }
.faq-item:hover { border-color: rgba(139,92,246,0.3); }
.faq-q { display: flex; justify-content: space-between; align-items: center; font-weight: 600; font-size: 15px; }
.faq-arrow { font-size: 10px; color: var(--color-text-muted); transition: transform 0.2s; }
.faq-arrow.rotated { transform: rotate(180deg); }
.faq-a { margin-top: 12px; color: var(--color-text-secondary); line-height: 1.7; font-size: 14px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.05); }

/* 帮助中心  */
.help-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.help-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 24px; text-align: center; }
.help-card span { font-size: 32px; display: block; margin-bottom: 12px; }
.help-card h3 { font-size: 16px; font-weight: 700; margin-bottom: 8px; }
.help-card p { font-size: 13px; color: var(--color-text-secondary); line-height: 1.5; margin-bottom: 12px; }
.help-card a { color: var(--color-brand-blue); font-size: 13px; font-weight: 600; }

/* 联系我们 */
.contact-grid { display: flex; flex-direction: column; gap: 12px; }
.contact-item { display: flex; align-items: center; gap: 16px; padding: 14px 20px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; }
.contact-label { font-size: 13px; font-weight: 700; color: white; min-width: 80px; }
.contact-item span:last-child { font-size: 14px; color: var(--color-text-secondary); }

/* 响应式 */
@media (max-width: 900px) {
  .docs-sidebar { display: none; }
  .docs-toc { display: none; }
  .docs-content { padding: 24px 20px; }
  .capability-grid { grid-template-columns: 1fr; }
  .help-grid { grid-template-columns: 1fr; }
  .model-row { grid-template-columns: 1fr 1fr; }
}
</style>
