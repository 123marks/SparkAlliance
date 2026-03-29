<template>
  <div class="legal-page">
    <!-- 顶部导航 -->
    <nav class="page-nav">
      <router-link to="/" class="nav-logo">✦ Spark Alliance</router-link>
      <div class="nav-links">
        <router-link to="/docs">文档</router-link>
        <router-link to="/community">社区</router-link>
        <router-link to="/changelog">更新日志</router-link>
        <router-link to="/login" class="nav-btn">登录</router-link>
      </div>
    </nav>

    <main class="legal-content">
      <div class="legal-header">
        <h1>隐私政策</h1>
        <p class="update-date">最后更新日期：2026年3月18日</p>
      </div>

      <article class="legal-article">
        <div class="privacy-summary">
          <h3>🔒 隐私承诺摘要</h3>
          <ul>
            <li>我们不会出售您的个人数据</li>
            <li>AI 对话支持本地处理，数据不上传</li>
            <li>您可以随时导出或删除您的数据</li>
            <li>我们仅收集提供服务必需的最少信息</li>
          </ul>
        </div>

        <section>
          <h2>1. 引言</h2>
          <p>星火校园（Spark Alliance，以下简称"我们"）非常重视您的隐私。本隐私政策旨在说明我们如何收集、使用、存储和保护您的个人信息。</p>
          <p>请在使用我们的服务前仔细阅读本隐私政策。使用我们的服务即表示您同意本政策所述的数据处理方式。</p>
        </section>

        <section>
          <h2>2. 我们收集的信息</h2>
          <h3>2.1 您主动提供的信息</h3>
          <ul>
            <li><strong>注册信息</strong>：邮箱地址、用户名、密码（加密存储）</li>
            <li><strong>个人资料</strong>：昵称、头像、学校、专业等（可选）</li>
            <li><strong>用户生成内容</strong>：您在校园墙发布的帖子、评论等</li>
            <li><strong>反馈信息</strong>：您提交的问题反馈和建议</li>
          </ul>
          
          <h3>2.2 自动收集的信息</h3>
          <ul>
            <li><strong>设备信息</strong>：设备类型、操作系统、浏览器类型</li>
            <li><strong>使用数据</strong>：访问时间、功能使用频率、页面浏览记录</li>
            <li><strong>日志信息</strong>：IP 地址、访问时间戳（用于安全防护）</li>
          </ul>

          <h3>2.3 AI 服务相关数据</h3>
          <div class="highlight-box">
            <p><strong>重要说明：</strong>我们的 AI 服务支持本地授权方案。当您选择使用自己的 API Key 时，AI 对话数据不会经过我们的服务器，完全在您的设备与 AI 服务商之间直接传输。</p>
          </div>
        </section>

        <section>
          <h2>3. 信息使用目的</h2>
          <p>我们收集的信息仅用于以下目的：</p>
          <ul>
            <li>提供、维护和改进我们的服务</li>
            <li>个性化您的使用体验</li>
            <li>发送服务相关通知和更新</li>
            <li>检测和防止欺诈、滥用行为</li>
            <li>遵守法律法规要求</li>
            <li>匿名化统计分析，用于产品优化</li>
          </ul>
        </section>

        <section>
          <h2>4. 信息共享与披露</h2>
          <p>我们承诺不会出售您的个人信息。仅在以下情况下可能共享您的信息：</p>
          <ul>
            <li><strong>经您同意</strong>：在获得您明确同意后</li>
            <li><strong>服务提供商</strong>：与帮助我们运营服务的合作伙伴共享必要信息（如云服务商），这些合作伙伴受到严格的数据保护协议约束</li>
            <li><strong>法律要求</strong>：当法律法规要求或政府机关依法要求披露时</li>
            <li><strong>保护权益</strong>：为保护我们、用户或公众的权利、财产或安全时</li>
          </ul>
        </section>

        <section>
          <h2>5. 数据安全</h2>
          <p>我们采取多层次的安全措施保护您的数据：</p>
          <ul>
            <li>所有数据传输使用 HTTPS 加密</li>
            <li>密码使用行业标准的加密算法存储</li>
            <li>数据库启用行级安全策略（RLS）</li>
            <li>定期进行安全审计和漏洞扫描</li>
            <li>严格的内部访问控制和员工培训</li>
          </ul>
        </section>

        <section>
          <h2>6. 数据保留</h2>
          <p>我们仅在必要期限内保留您的个人信息：</p>
          <ul>
            <li><strong>账户信息</strong>：账户存续期间及注销后 30 天</li>
            <li><strong>用户生成内容</strong>：您删除后立即移除（备份保留 7 天）</li>
            <li><strong>日志数据</strong>：最多保留 90 天</li>
            <li><strong>统计数据</strong>：仅保留匿名化汇总数据</li>
          </ul>
        </section>

        <section>
          <h2>7. 您的权利</h2>
          <p>您对自己的个人信息享有以下权利：</p>
          <ul>
            <li><strong>访问权</strong>：查看我们持有的您的个人信息</li>
            <li><strong>更正权</strong>：更新或修正不准确的信息</li>
            <li><strong>删除权</strong>：请求删除您的个人信息</li>
            <li><strong>导出权</strong>：以通用格式导出您的数据</li>
            <li><strong>撤回同意</strong>：随时撤回您之前给予的同意</li>
          </ul>
          <p>您可以通过「个人中心 → 设置」或联系我们行使这些权利。</p>
        </section>

        <section>
          <h2>8. Cookie 和追踪技术</h2>
          <p>我们使用 Cookie 和类似技术来：</p>
          <ul>
            <li>保持您的登录状态</li>
            <li>记住您的偏好设置</li>
            <li>分析服务使用情况</li>
          </ul>
          <p>您可以通过浏览器设置管理 Cookie。禁用 Cookie 可能影响部分功能的正常使用。</p>
        </section>

        <section>
          <h2>9. 未成年人保护</h2>
          <p>我们的服务主要面向 18 岁及以上的用户。如果您是未成年人，请在监护人的指导下使用本服务。我们不会故意收集未满 14 岁儿童的个人信息。</p>
        </section>

        <section>
          <h2>10. 隐私政策更新</h2>
          <p>我们可能会不时更新本隐私政策。重大变更时，我们会通过平台通知或邮件告知您。您继续使用服务即表示接受更新后的政策。</p>
        </section>

        <section>
          <h2>11. 联系我们</h2>
          <p>如果您对本隐私政策有任何疑问或想行使您的数据权利，请通过以下方式联系我们：</p>
          <ul>
            <li>邮箱：privacy@sparkalliance.cn</li>
            <li>平台内反馈：个人中心 → 用户反馈</li>
          </ul>
          <p>我们将在 15 个工作日内回复您的请求。</p>
        </section>
      </article>

      <div class="legal-footer">
        <router-link to="/terms" class="footer-link">← 服务条款</router-link>
      </div>
    </main>
  </div>
</template>

<style scoped>
.legal-page { min-height: 100vh; background: var(--color-bg-primary); }

/* Nav */
.page-nav { height: 64px; border-bottom: 1px solid var(--color-border); display: flex; align-items: center; justify-content: space-between; padding: 0 40px; backdrop-filter: blur(20px); background: rgba(10,10,15,0.8); position: sticky; top: 0; z-index: 50; }
.nav-logo { font-weight: 800; font-size: 18px; color: var(--color-brand-blue); }
.nav-links { display: flex; gap: 24px; align-items: center; }
.nav-links a { color: var(--color-text-secondary); font-size: 14px; font-weight: 500; transition: color 0.2s; }
.nav-links a:hover { color: white; }
.nav-btn { background: var(--gradient-brand); padding: 8px 20px !important; border-radius: 8px; color: white !important; }

/* Content */
.legal-content { max-width: 800px; margin: 0 auto; padding: 60px 40px 100px; }

.legal-header { text-align: center; margin-bottom: 48px; }
.legal-header h1 { font-size: 42px; font-weight: 800; margin-bottom: 12px; }
.update-date { color: var(--color-text-muted); font-size: 14px; }

/* Privacy Summary */
.privacy-summary {
  background: rgba(79, 142, 247, 0.08);
  border: 1px solid rgba(79, 142, 247, 0.2);
  border-radius: 16px;
  padding: 24px 28px;
  margin-bottom: 40px;
}

.privacy-summary h3 {
  font-size: 18px;
  font-weight: 700;
  color: white;
  margin-bottom: 16px;
}

.privacy-summary ul {
  margin: 0;
  padding-left: 20px;
  list-style: none;
}

.privacy-summary li {
  position: relative;
  color: var(--color-text-secondary);
  margin-bottom: 8px;
  padding-left: 20px;
}

.privacy-summary li::before {
  content: '✓';
  position: absolute;
  left: 0;
  color: #10b981;
  font-weight: 700;
}

.legal-article { color: var(--color-text-secondary); line-height: 1.8; }

.legal-article section { margin-bottom: 40px; }

.legal-article h2 { 
  font-size: 22px; 
  font-weight: 700; 
  color: white; 
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--color-border);
}

.legal-article h3 {
  font-size: 17px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 20px 0 10px;
}

.legal-article p { margin-bottom: 12px; }

.legal-article ul { 
  margin-left: 20px; 
  margin-bottom: 16px;
  list-style: disc;
}

.legal-article li { 
  margin-bottom: 8px; 
  padding-left: 4px;
}

.legal-article strong { color: white; }

.highlight-box {
  background: rgba(139, 92, 246, 0.08);
  border-left: 3px solid var(--color-brand-purple);
  padding: 16px 20px;
  border-radius: 0 8px 8px 0;
  margin: 16px 0;
}

.highlight-box p { margin: 0; }

.legal-footer {
  margin-top: 60px;
  padding-top: 32px;
  border-top: 1px solid var(--color-border);
  text-align: center;
}

.footer-link {
  color: var(--color-brand-blue);
  font-weight: 600;
  font-size: 15px;
  transition: color 0.2s;
}

.footer-link:hover { color: var(--color-brand-purple); }

@media (max-width: 768px) {
  .page-nav { padding: 0 20px; }
  .legal-content { padding: 40px 20px 80px; }
  .legal-header h1 { font-size: 32px; }
}
</style>
