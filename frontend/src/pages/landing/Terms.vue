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
        <h1>服务条款</h1>
        <p class="update-date">最后更新日期：2026年3月18日</p>
      </div>

      <article class="legal-article">
        <section>
          <h2>1. 服务协议的接受</h2>
          <p>欢迎使用星火校园（Spark Alliance）。本服务条款（以下简称"本条款"）是您与星火校园平台之间关于使用本平台服务的法律协议。</p>
          <p>通过访问或使用本平台，您确认已阅读、理解并同意接受本条款的约束。如果您不同意本条款的任何内容，请勿使用本服务。</p>
        </section>

        <section>
          <h2>2. 服务内容</h2>
          <p>星火校园是一个以 AI 为特色的校园超级平台，为大学生及青年群体提供以下服务：</p>
          <ul>
            <li><strong>AI 智能助手</strong>：集成多模型 API，提供学术辅导、答疑解惑等服务</li>
            <li><strong>校园动态墙</strong>：半匿名社区交流平台</li>
            <li><strong>星火伴侣</strong>：AI 原生社交功能</li>
            <li><strong>智能日程</strong>：日历管理与课表导入</li>
            <li><strong>星火人才</strong>：企业与人才的双向匹配服务</li>
            <li><strong>星火资讯</strong>：热点聚合与 AI 解读</li>
            <li>以及其他在平台上提供的功能和服务</li>
          </ul>
        </section>

        <section>
          <h2>3. 用户账户</h2>
          <h3>3.1 注册</h3>
          <p>您需要注册账户才能使用本平台的大部分功能。注册时，您必须提供真实、准确、完整的信息。</p>
          
          <h3>3.2 账户安全</h3>
          <p>您有责任保管好自己的账户信息和密码。因您的过失导致的账户被盗用或信息泄露，由您自行承担相应后果。</p>
          
          <h3>3.3 账户使用</h3>
          <p>您的账户仅供您个人使用，不得转让、出借或与他人共享。</p>
        </section>

        <section>
          <h2>4. 用户行为规范</h2>
          <p>使用本服务时，您同意：</p>
          <ul>
            <li>遵守中华人民共和国相关法律法规</li>
            <li>不发布任何违法、有害、威胁、辱骂、骚扰、侵权、色情或其他不当内容</li>
            <li>不进行任何可能损害本平台或其他用户利益的行为</li>
            <li>不使用自动化工具或脚本批量访问本平台</li>
            <li>不干扰或破坏本平台的正常运行</li>
            <li>尊重他人的知识产权和隐私权</li>
          </ul>
        </section>

        <section>
          <h2>5. 内容与知识产权</h2>
          <h3>5.1 用户生成内容</h3>
          <p>您在本平台发布的内容（包括但不限于文字、图片、评论等）的知识产权归您所有。您授予本平台非排他性、免费的许可，用于展示、传播您的内容。</p>
          
          <h3>5.2 平台内容</h3>
          <p>本平台的商标、标识、软件、界面设计等知识产权归星火校园所有，未经许可不得使用。</p>
        </section>

        <section>
          <h2>6. AI 服务说明</h2>
          <p>本平台提供的 AI 服务基于第三方大模型 API。请注意：</p>
          <ul>
            <li>AI 生成的内容仅供参考，不构成专业建议</li>
            <li>您对 AI 对话内容的使用承担全部责任</li>
            <li>我们会持续优化 AI 服务质量，但不保证 AI 输出的绝对准确性</li>
          </ul>
        </section>

        <section>
          <h2>7. 免责声明</h2>
          <p>本平台按"现状"提供服务，不作任何明示或暗示的保证。在法律允许的最大范围内，我们不对以下情况承担责任：</p>
          <ul>
            <li>因不可抗力或平台无法控制的原因导致的服务中断</li>
            <li>用户之间的纠纷或交易风险</li>
            <li>用户因使用本服务而遭受的任何间接损失</li>
          </ul>
        </section>

        <section>
          <h2>8. 服务变更与终止</h2>
          <p>我们保留随时修改、暂停或终止服务（或其任何部分）的权利，恕不另行通知。对于服务的修改、暂停或终止，我们不对您或任何第三方承担责任。</p>
        </section>

        <section>
          <h2>9. 条款修订</h2>
          <p>我们可能会不时修订本条款。修订后的条款将在本页面发布后立即生效。您继续使用本服务即表示您接受修订后的条款。</p>
        </section>

        <section>
          <h2>10. 联系我们</h2>
          <p>如果您对本服务条款有任何疑问，请通过以下方式联系我们：</p>
          <ul>
            <li>邮箱：support@sparkalliance.cn</li>
            <li>平台内反馈：个人中心 → 用户反馈</li>
          </ul>
        </section>
      </article>

      <div class="legal-footer">
        <router-link to="/privacy" class="footer-link">隐私政策 →</router-link>
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
