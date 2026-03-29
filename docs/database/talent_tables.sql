-- ============================================
-- 星火人才模块 — 数据库建表脚本
-- 创建时间: 2026-03-29
-- 产品定位: 从「单向投递」到「双向寻访」的人才匹配平台
-- ============================================

-- ====== 1. 技能标签表 ======
CREATE TABLE talent_skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) NOT NULL UNIQUE,                -- 技能名称（如：Python / UI设计 / 数据分析）
  category VARCHAR(30) NOT NULL DEFAULT 'tech',    -- tech/design/business/language/other
  hot_score INT DEFAULT 0,                         -- 热度分（用于推荐排序）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 预置热门技能标签
INSERT INTO talent_skills (name, category, hot_score) VALUES
  ('Python', 'tech', 95), ('Java', 'tech', 90), ('JavaScript', 'tech', 88),
  ('C/C++', 'tech', 85), ('Go', 'tech', 70), ('TypeScript', 'tech', 72),
  ('Vue.js', 'tech', 78), ('React', 'tech', 80), ('Node.js', 'tech', 75),
  ('SQL', 'tech', 82), ('机器学习', 'tech', 85), ('深度学习', 'tech', 80),
  ('数据分析', 'tech', 88), ('大数据', 'tech', 75), ('云计算', 'tech', 70),
  ('UI设计', 'design', 82), ('平面设计', 'design', 75), ('视频剪辑', 'design', 78),
  ('产品设计', 'design', 80), ('3D建模', 'design', 68),
  ('市场营销', 'business', 80), ('新媒体运营', 'business', 85), ('财务分析', 'business', 72),
  ('项目管理', 'business', 78), ('商业分析', 'business', 75),
  ('英语', 'language', 90), ('日语', 'language', 65), ('法语', 'language', 50),
  ('写作', 'other', 70), ('演讲', 'other', 65), ('摄影', 'other', 68);

-- ====== 2. 能力名片表（青年侧核心） ======
CREATE TABLE talent_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,

  -- 基本信息
  display_name VARCHAR(50) NOT NULL,               -- 展示名称
  headline VARCHAR(100),                           -- 一句话定位（如：全栈开发 · 创业中）
  bio TEXT,                                        -- 自我介绍
  avatar_url TEXT,                                 -- 头像

  -- 教育背景
  university VARCHAR(100),                         -- 学校
  major VARCHAR(100),                              -- 专业
  degree VARCHAR(20),                              -- bachelor/master/phd
  graduation_year INT,                             -- 毕业年份
  gpa VARCHAR(10),                                 -- GPA（可选展示）

  -- 求职状态
  job_status VARCHAR(30) DEFAULT 'open',           -- open(找机会)/looking(积极)/not_looking(暂不)
  preferred_roles TEXT[],                           -- 期望岗位（如：前端工程师、产品经理）
  preferred_cities TEXT[],                          -- 期望城市
  preferred_types TEXT[],                           -- fulltime/parttime/internship/freelance/remote

  -- 技能（关联技能表）
  skill_ids UUID[] DEFAULT '{}',                   -- 技能标签ID列表
  skill_levels JSONB DEFAULT '{}',                 -- {"skill_id": "proficiency(1-5)"}

  -- 作品集
  portfolio_items JSONB DEFAULT '[]',              -- [{title, description, url, image_url, tags}]

  -- 经历
  experiences JSONB DEFAULT '[]',                  -- [{title, company, start_date, end_date, description}]

  -- 联系方式（仅匹配后可见）
  contact_email VARCHAR(255),
  contact_phone VARCHAR(20),
  wechat_id VARCHAR(50),
  github_url TEXT,
  linkedin_url TEXT,
  personal_site TEXT,

  -- 可见性
  visibility VARCHAR(20) DEFAULT 'public',         -- public/recruiters_only/private

  -- 统计
  view_count INT DEFAULT 0,
  invite_count INT DEFAULT 0,                      -- 收到邀约次数

  -- 状态
  is_verified BOOLEAN DEFAULT FALSE,               -- 是否认证
  is_featured BOOLEAN DEFAULT FALSE,               -- 是否推荐

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_talent_profiles_user ON talent_profiles(user_id);
CREATE INDEX idx_talent_profiles_status ON talent_profiles(job_status);
CREATE INDEX idx_talent_profiles_visibility ON talent_profiles(visibility);
CREATE INDEX idx_talent_profiles_university ON talent_profiles(university);
CREATE INDEX idx_talent_profiles_skills ON talent_profiles USING gin(skill_ids);

-- ====== 3. 机会/职位表（企业侧/个人项目） ======
CREATE TABLE talent_opportunities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  poster_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 基本信息
  title VARCHAR(200) NOT NULL,                     -- 职位/项目名称
  description TEXT,                                -- 详细描述
  opportunity_type VARCHAR(30) NOT NULL DEFAULT 'job', -- job/internship/project/competition/volunteer

  -- 组织信息
  org_name VARCHAR(100),                           -- 公司/团队名
  org_logo_url TEXT,                               -- 组织logo
  org_type VARCHAR(30) DEFAULT 'company',          -- company/startup/school/personal/ngo

  -- 要求
  required_skills UUID[] DEFAULT '{}',             -- 所需技能ID
  experience_level VARCHAR(20) DEFAULT 'entry',    -- entry/junior/mid/senior/any
  location VARCHAR(100),                           -- 工作地点
  work_mode VARCHAR(20) DEFAULT 'onsite',          -- onsite/remote/hybrid
  salary_range VARCHAR(50),                        -- 薪资范围（如：8k-15k / 150/天）

  -- 申请相关
  apply_deadline TIMESTAMP WITH TIME ZONE,         -- 截止日期
  max_applicants INT DEFAULT 0,                    -- 最大申请人数（0=不限）
  current_applicants INT DEFAULT 0,                -- 当前申请人数

  -- 标签
  tags TEXT[] DEFAULT '{}',                        -- 额外标签

  -- 统计
  view_count INT DEFAULT 0,
  favorite_count INT DEFAULT 0,

  -- 状态
  status VARCHAR(20) DEFAULT 'active',             -- active/closed/draft
  is_pinned BOOLEAN DEFAULT FALSE,
  is_verified BOOLEAN DEFAULT FALSE,               -- 机会认证

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_opportunities_poster ON talent_opportunities(poster_id);
CREATE INDEX idx_opportunities_type ON talent_opportunities(opportunity_type);
CREATE INDEX idx_opportunities_status ON talent_opportunities(status);
CREATE INDEX idx_opportunities_skills ON talent_opportunities USING gin(required_skills);
CREATE INDEX idx_opportunities_created ON talent_opportunities(created_at DESC);

-- ====== 4. 申请/邀约表（双向匹配核心） ======
CREATE TABLE talent_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- 双向关系
  applicant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- 申请人
  opportunity_id UUID REFERENCES talent_opportunities(id) ON DELETE CASCADE, -- 机会
  profile_id UUID REFERENCES talent_profiles(id),                -- 关联名片

  -- 方向
  direction VARCHAR(20) NOT NULL DEFAULT 'apply',  -- apply(青年申请) / invite(企业邀约)

  -- 状态机：pending → accepted/rejected/withdrawn
  status VARCHAR(20) DEFAULT 'pending',            -- pending/reviewing/accepted/rejected/withdrawn

  -- 信息
  cover_letter TEXT,                               -- 申请信 / 邀约说明
  response_note TEXT,                              -- 回复说明

  -- 时间
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  responded_at TIMESTAMP WITH TIME ZONE,

  UNIQUE(applicant_id, opportunity_id, direction)
);

CREATE INDEX idx_applications_applicant ON talent_applications(applicant_id);
CREATE INDEX idx_applications_opportunity ON talent_applications(opportunity_id);
CREATE INDEX idx_applications_status ON talent_applications(status);
CREATE INDEX idx_applications_direction ON talent_applications(direction);

-- ====== 5. 机会收藏表 ======
CREATE TABLE talent_opportunity_favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  opportunity_id UUID REFERENCES talent_opportunities(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, opportunity_id)
);

CREATE INDEX idx_opp_favs_user ON talent_opportunity_favorites(user_id);

-- ====== RLS 策略 ======

ALTER TABLE talent_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE talent_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE talent_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE talent_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE talent_opportunity_favorites ENABLE ROW LEVEL SECURITY;

-- 技能标签：所有人可读
CREATE POLICY "skills_read" ON talent_skills FOR SELECT USING (true);

-- 名片：根据可见性控制
CREATE POLICY "profiles_read" ON talent_profiles FOR SELECT USING (
  visibility = 'public' OR user_id = auth.uid()
);
CREATE POLICY "profiles_insert" ON talent_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "profiles_update" ON talent_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "profiles_delete" ON talent_profiles FOR DELETE USING (auth.uid() = user_id);

-- 机会：所有人可看活跃的，发布者可管理
CREATE POLICY "opportunities_read" ON talent_opportunities FOR SELECT USING (status = 'active' OR poster_id = auth.uid());
CREATE POLICY "opportunities_insert" ON talent_opportunities FOR INSERT WITH CHECK (auth.uid() = poster_id);
CREATE POLICY "opportunities_update" ON talent_opportunities FOR UPDATE USING (auth.uid() = poster_id);
CREATE POLICY "opportunities_delete" ON talent_opportunities FOR DELETE USING (auth.uid() = poster_id);

-- 申请：双方可见
CREATE POLICY "applications_read" ON talent_applications FOR SELECT USING (
  applicant_id = auth.uid() OR
  opportunity_id IN (SELECT id FROM talent_opportunities WHERE poster_id = auth.uid())
);
CREATE POLICY "applications_insert" ON talent_applications FOR INSERT WITH CHECK (auth.uid() = applicant_id);
CREATE POLICY "applications_update" ON talent_applications FOR UPDATE USING (
  applicant_id = auth.uid() OR
  opportunity_id IN (SELECT id FROM talent_opportunities WHERE poster_id = auth.uid())
);

-- 收藏
CREATE POLICY "opp_favs_read" ON talent_opportunity_favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "opp_favs_insert" ON talent_opportunity_favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "opp_favs_delete" ON talent_opportunity_favorites FOR DELETE USING (auth.uid() = user_id);

-- ====== 触发器 ======

CREATE OR REPLACE FUNCTION update_talent_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_talent_profiles_updated
  BEFORE UPDATE ON talent_profiles FOR EACH ROW EXECUTE FUNCTION update_talent_updated_at();
CREATE TRIGGER trg_talent_opportunities_updated
  BEFORE UPDATE ON talent_opportunities FOR EACH ROW EXECUTE FUNCTION update_talent_updated_at();
