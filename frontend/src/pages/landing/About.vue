<template>
  <div class="about-page">
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

    <!-- Hero -->
    <section class="about-hero">
      <div class="hero-glow"></div>
      <h1>关于星火校园</h1>
      <p class="hero-subtitle">点亮校园时光，连接每一个追光的你</p>
    </section>

    <!-- Mission -->
    <section class="about-section mission-section">
      <div class="section-content">
        <div class="section-label">OUR MISSION</div>
        <h2>我们的使命</h2>
        <p class="mission-text">
          星火校园（Spark Alliance）致力于为大学生及青年群体打造一个<strong>以 AI 为特色的一站式数字生活平台</strong>。
          我们相信，每一个年轻人都值得拥有更智能、更高效、更有温度的成长伙伴。
        </p>
        <div class="mission-values">
          <div class="value-card">
            <span class="value-icon">🚀</span>
            <h3>赋能成长</h3>
            <p>用 AI 技术降低学习和求职门槛，让每个人都能触达优质资源</p>
          </div>
          <div class="value-card">
            <span class="value-icon">🤝</span>
            <h3>连接彼此</h3>
            <p>打破信息孤岛，让志同道合的人更容易找到彼此</p>
          </div>
          <div class="value-card">
            <span class="value-icon">🔒</span>
            <h3>隐私优先</h3>
            <p>数据主权归用户所有，本地授权方案保护你的隐私</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Story -->
    <section class="about-section story-section">
      <div class="section-content">
        <div class="section-label">OUR STORY</div>
        <h2>我们的故事</h2>
        <div class="story-timeline">
          <div class="story-item">
            <div class="story-marker"></div>
            <div class="story-content">
              <h3>🌱 萌芽</h3>
              <p>2026年初，一群热爱技术的大学生在校园里发现：现有的工具要么功能分散、要么对学生不够友好。我们想，能不能做一个真正懂学生的平台？</p>
            </div>
          </div>
          <div class="story-item">
            <div class="story-marker"></div>
            <div class="story-content">
              <h3>🔥 点燃</h3>
              <p>我们把 AI 大模型带入校园场景，从智能答疑到日程管理，从校园社交到求职匹配——星火校园的雏形诞生了。</p>
            </div>
          </div>
          <div class="story-item">
            <div class="story-marker active"></div>
            <div class="story-content">
              <h3>✨ 现在</h3>
              <p>我们正在邀请更多学校的同学加入公测，持续迭代产品。每一条反馈、每一个建议，都在让星火变得更好。</p>
            </div>
          </div>
          <div class="story-item">
            <div class="story-marker future"></div>
            <div class="story-content">
              <h3>🌍 未来</h3>
              <p>从校园到社区，从中国到全球——我们希望星火能陪伴每一个年轻人，在人生的每个阶段都能找到光。</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Team -->
    <section class="about-section team-section">
      <div class="section-content">
        <div class="section-label">OUR TEAM</div>
        <h2>核心团队</h2>
        <p class="team-intro">我们是一群热爱技术、关注用户体验的年轻人</p>
        <div class="team-grid">
          <div class="team-card">
            <div class="team-avatar founder">✦</div>
            <h3>创始人 & 产品负责人</h3>
            <p>负责产品愿景、用户体验和整体战略规划</p>
          </div>
          <div class="team-card">
            <div class="team-avatar tech">💻</div>
            <h3>技术团队</h3>
            <p>前端开发、后端架构、AI 集成与数据安全</p>
          </div>
          <div class="team-card">
            <div class="team-avatar design">🎨</div>
            <h3>设计团队</h3>
            <p>UI/UX 设计、视觉系统与交互体验优化</p>
          </div>
          <div class="team-card">
            <div class="team-avatar community">🌟</div>
            <h3>社区运营</h3>
            <p>用户反馈、社区建设与校园推广</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Tech Stack -->
    <section class="about-section tech-section">
      <div class="section-content">
        <div class="section-label">TECH STACK</div>
        <h2>技术架构</h2>
        <p class="tech-intro">我们采用现代化的技术栈，追求性能与开发效率的平衡</p>
        <div class="tech-grid">
          <div class="tech-item">
            <span class="tech-icon">⚡</span>
            <div class="tech-info">
              <h4>Vue 3 + TypeScript</h4>
              <p>高性能前端框架</p>
            </div>
          </div>
          <div class="tech-item">
            <span class="tech-icon">🗄️</span>
            <div class="tech-info">
              <h4>Supabase</h4>
              <p>实时数据库 + Auth</p>
            </div>
          </div>
          <div class="tech-item">
            <span class="tech-icon">🤖</span>
            <div class="tech-info">
              <h4>多模型 API</h4>
              <p>DeepSeek / 豆包 / 千问</p>
            </div>
          </div>
          <div class="tech-item">
            <span class="tech-icon">🔒</span>
            <div class="tech-info">
              <h4>本地授权</h4>
              <p>隐私数据不出本地</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Contact -->
    <section class="about-section contact-section">
      <div class="section-content">
        <h2>联系我们</h2>
        <p class="contact-intro">无论是合作咨询、媒体采访还是加入团队，我们都欢迎与你交流</p>
        <div class="contact-grid">
          <div class="contact-card">
            <span class="contact-icon">📧</span>
            <h4>商务合作</h4>
            <p>business@sparkalliance.cn</p>
          </div>
          <div class="contact-card">
            <span class="contact-icon">💼</span>
            <h4>加入我们</h4>
            <p>hr@sparkalliance.cn</p>
          </div>
          <div class="contact-card">
            <span class="contact-icon">🐛</span>
            <h4>问题反馈</h4>
            <p>support@sparkalliance.cn</p>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="about-cta">
      <h2>准备好加入星火了吗？</h2>
      <p>与数千名大学生一起，开启智能化的校园生活</p>
      <router-link to="/register" class="cta-btn">立即注册 →</router-link>
    </section>
  </div>
</template>

<style scoped>
.about-page { min-height: 100vh; background: var(--color-bg-primary); }

/* Nav */
.page-nav { height: 64px; border-bottom: 1px solid var(--color-border); display: flex; align-items: center; justify-content: space-between; padding: 0 40px; backdrop-filter: blur(20px); background: rgba(10,10,15,0.8); position: sticky; top: 0; z-index: 50; }
.nav-logo { font-weight: 800; font-size: 18px; color: var(--color-brand-blue); }
.nav-links { display: flex; gap: 24px; align-items: center; }
.nav-links a { color: var(--color-text-secondary); font-size: 14px; font-weight: 500; transition: color 0.2s; }
.nav-links a:hover { color: white; }
.nav-btn { background: var(--gradient-brand); padding: 8px 20px !important; border-radius: 8px; color: white !important; }

/* Hero */
.about-hero { 
  text-align: center; 
  padding: 100px 40px 80px; 
  position: relative; 
  overflow: hidden;
}
.hero-glow { 
  position: absolute; 
  top: -100px; left: 50%; 
  transform: translateX(-50%); 
  width: 600px; height: 400px; 
  background: radial-gradient(circle, rgba(139,92,246,0.15), transparent 70%); 
  pointer-events: none; 
}
.about-hero h1 { 
  font-size: 56px; 
  font-weight: 800; 
  margin-bottom: 16px; 
  position: relative;
  background: var(--gradient-brand);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.hero-subtitle { 
  color: var(--color-text-secondary); 
  font-size: 20px; 
  position: relative;
}

/* Sections */
.about-section { padding: 80px 40px; }
.section-content { max-width: 1000px; margin: 0 auto; }
.section-label { 
  font-size: 12px; 
  font-weight: 700; 
  letter-spacing: 2px; 
  color: var(--color-brand-blue);
  margin-bottom: 12px;
}
.about-section h2 { 
  font-size: 36px; 
  font-weight: 800; 
  margin-bottom: 24px; 
}

/* Mission */
.mission-text { 
  font-size: 18px; 
  color: var(--color-text-secondary); 
  line-height: 1.8; 
  max-width: 700px;
  margin-bottom: 48px;
}
.mission-text strong { color: white; }

.mission-values { 
  display: grid; 
  grid-template-columns: repeat(3, 1fr); 
  gap: 24px; 
}
.value-card { 
  background: var(--color-bg-card); 
  border: 1px solid var(--color-border); 
  border-radius: 16px; 
  padding: 28px; 
  transition: transform 0.2s, border-color 0.2s;
}
.value-card:hover { 
  transform: translateY(-4px); 
  border-color: rgba(79,142,247,0.3); 
}
.value-icon { font-size: 32px; display: block; margin-bottom: 16px; }
.value-card h3 { font-size: 18px; margin-bottom: 8px; }
.value-card p { font-size: 14px; color: var(--color-text-secondary); line-height: 1.6; }

/* Story */
.story-section { background: var(--color-bg-secondary); }
.story-timeline { 
  position: relative; 
  padding-left: 48px;
  margin-top: 40px;
}
.story-timeline::before { 
  content: ''; 
  position: absolute; 
  left: 10px; top: 8px; bottom: 8px; 
  width: 2px; 
  background: linear-gradient(to bottom, var(--color-brand-blue), var(--color-brand-purple), rgba(255,255,255,0.1));
}
.story-item { 
  position: relative; 
  margin-bottom: 40px; 
}
.story-marker { 
  position: absolute; 
  left: -38px; top: 6px; 
  width: 12px; height: 12px; 
  border-radius: 50%; 
  background: rgba(255,255,255,0.1); 
  border: 2px solid rgba(255,255,255,0.2);
}
.story-marker.active { 
  background: var(--color-brand-blue); 
  border-color: var(--color-brand-blue);
  box-shadow: 0 0 12px rgba(79,142,247,0.5);
}
.story-marker.future { 
  background: transparent;
  border-style: dashed;
}
.story-content h3 { font-size: 18px; margin-bottom: 8px; }
.story-content p { color: var(--color-text-secondary); line-height: 1.7; }

/* Team */
.team-intro { color: var(--color-text-secondary); margin-bottom: 40px; }
.team-grid { 
  display: grid; 
  grid-template-columns: repeat(4, 1fr); 
  gap: 20px; 
}
.team-card { 
  background: var(--color-bg-card); 
  border: 1px solid var(--color-border); 
  border-radius: 16px; 
  padding: 28px; 
  text-align: center;
  transition: transform 0.2s;
}
.team-card:hover { transform: translateY(-4px); }
.team-avatar { 
  width: 64px; height: 64px; 
  margin: 0 auto 16px; 
  border-radius: 50%; 
  display: flex; align-items: center; justify-content: center; 
  font-size: 28px;
}
.team-avatar.founder { background: linear-gradient(135deg, rgba(79,142,247,0.2), rgba(139,92,246,0.2)); }
.team-avatar.tech { background: rgba(16,185,129,0.15); }
.team-avatar.design { background: rgba(236,72,153,0.15); }
.team-avatar.community { background: rgba(249,115,22,0.15); }
.team-card h3 { font-size: 15px; margin-bottom: 8px; }
.team-card p { font-size: 13px; color: var(--color-text-muted); }

/* Tech */
.tech-section { background: var(--color-bg-secondary); }
.tech-intro { color: var(--color-text-secondary); margin-bottom: 40px; }
.tech-grid { 
  display: grid; 
  grid-template-columns: repeat(4, 1fr); 
  gap: 20px; 
}
.tech-item { 
  background: var(--color-bg-card); 
  border: 1px solid var(--color-border); 
  border-radius: 12px; 
  padding: 20px; 
  display: flex; align-items: center; gap: 16px;
}
.tech-icon { font-size: 28px; flex-shrink: 0; }
.tech-info h4 { font-size: 14px; margin-bottom: 4px; }
.tech-info p { font-size: 12px; color: var(--color-text-muted); }

/* Contact */
.contact-intro { color: var(--color-text-secondary); margin-bottom: 40px; }
.contact-grid { 
  display: grid; 
  grid-template-columns: repeat(3, 1fr); 
  gap: 20px; 
}
.contact-card { 
  background: var(--color-bg-card); 
  border: 1px solid var(--color-border); 
  border-radius: 16px; 
  padding: 28px; 
  text-align: center;
}
.contact-icon { font-size: 32px; display: block; margin-bottom: 12px; }
.contact-card h4 { font-size: 16px; margin-bottom: 8px; }
.contact-card p { font-size: 14px; color: var(--color-brand-blue); }

/* CTA */
.about-cta { 
  text-align: center; 
  padding: 100px 40px; 
  background: linear-gradient(to bottom, var(--color-bg-primary), rgba(79,142,247,0.05));
}
.about-cta h2 { font-size: 36px; font-weight: 700; margin-bottom: 16px; }
.about-cta p { color: var(--color-text-secondary); font-size: 18px; margin-bottom: 32px; }
.cta-btn { 
  display: inline-block; 
  background: var(--gradient-brand); 
  padding: 16px 40px; 
  border-radius: 12px; 
  font-weight: 600; 
  font-size: 17px; 
  transition: transform 0.2s, box-shadow 0.2s; 
}
.cta-btn:hover { 
  transform: translateY(-2px); 
  box-shadow: 0 8px 25px rgba(79,142,247,0.3); 
}

/* Responsive */
@media (max-width: 900px) {
  .mission-values, .tech-grid { grid-template-columns: repeat(2, 1fr); }
  .team-grid { grid-template-columns: repeat(2, 1fr); }
  .contact-grid { grid-template-columns: 1fr; }
}

@media (max-width: 600px) {
  .page-nav { padding: 0 20px; }
  .about-hero { padding: 60px 20px 40px; }
  .about-hero h1 { font-size: 36px; }
  .about-section { padding: 60px 20px; }
  .about-section h2 { font-size: 28px; }
  .mission-values, .team-grid, .tech-grid { grid-template-columns: 1fr; }
}
</style>
