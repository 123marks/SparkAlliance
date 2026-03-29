-- ============================================
-- 星火共创模块 — 数据库建表脚本
-- 创建时间: 2026-03-29
-- 产品定位: 让优秀项目被更多人看见的协作展示平台
-- 核心理念: 发现好项目 → 组队共创 → 展示成果
-- ============================================

-- ====== 1. 项目展示表 ======
CREATE TABLE IF NOT EXISTS cocreate_projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 基本信息
  title VARCHAR(200) NOT NULL,                     -- 项目名称
  tagline VARCHAR(300),                            -- 一句话介绍
  description TEXT,                                -- 详细描述（支持Markdown）
  cover_image TEXT,                                -- 封面图URL
  logo_url TEXT,                                   -- 项目Logo

  -- 链接
  demo_url TEXT,                                   -- 演示地址
  repo_url TEXT,                                   -- 仓库地址
  video_url TEXT,                                  -- 演示视频
  website_url TEXT,                                -- 官网

  -- 分类与标签
  category VARCHAR(30) DEFAULT 'web',              -- web/mobile/ai/game/design/tool/education/other
  tech_stack TEXT[] DEFAULT '{}',                   -- 技术栈标签
  tags TEXT[] DEFAULT '{}',                         -- 自定义标签

  -- 项目状态
  status VARCHAR(20) DEFAULT 'idea',               -- idea/recruiting/building/launched/archived
  looking_for TEXT[] DEFAULT '{}',                  -- 招募角色（如：前端/后端/设计/产品/运营）

  -- 统计
  upvotes INT DEFAULT 0,
  views INT DEFAULT 0,
  member_count INT DEFAULT 1,
  comment_count INT DEFAULT 0,

  -- 可见性
  visibility VARCHAR(20) DEFAULT 'public',         -- public/unlisted
  is_featured BOOLEAN DEFAULT FALSE,               -- 是否精选

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_creator ON cocreate_projects(creator_id);
CREATE INDEX IF NOT EXISTS idx_projects_category ON cocreate_projects(category);
CREATE INDEX IF NOT EXISTS idx_projects_status ON cocreate_projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_upvotes ON cocreate_projects(upvotes DESC);
CREATE INDEX IF NOT EXISTS idx_projects_created ON cocreate_projects(created_at DESC);
-- 全文搜索
CREATE INDEX IF NOT EXISTS idx_projects_search ON cocreate_projects
  USING gin(to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(tagline,'') || ' ' || coalesce(description,'')));

-- ====== 2. 项目成员表 ======
CREATE TABLE IF NOT EXISTS cocreate_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES cocreate_projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT '成员',                  -- 创建者/前端/后端/设计/产品/运营/成员
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_members_project ON cocreate_members(project_id);
CREATE INDEX IF NOT EXISTS idx_members_user ON cocreate_members(user_id);

-- ====== 3. 协作申请表 ======
CREATE TABLE IF NOT EXISTS cocreate_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES cocreate_projects(id) ON DELETE CASCADE,
  applicant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT '成员',                  -- 申请的角色
  message TEXT,                                    -- 申请留言
  status VARCHAR(20) DEFAULT 'pending',            -- pending/accepted/rejected
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, applicant_id)
);

CREATE INDEX IF NOT EXISTS idx_applications_project ON cocreate_applications(project_id);
CREATE INDEX IF NOT EXISTS idx_applications_applicant ON cocreate_applications(applicant_id);

-- ====== 4. 点赞表 ======
CREATE TABLE IF NOT EXISTS cocreate_upvotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES cocreate_projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_upvotes_project ON cocreate_upvotes(project_id);

-- ====== 5. 评论表 ======
CREATE TABLE IF NOT EXISTS cocreate_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES cocreate_projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES cocreate_comments(id) ON DELETE CASCADE, -- 支持楼中楼回复
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_project ON cocreate_comments(project_id);

-- ====== 点赞计数触发器 ======
CREATE OR REPLACE FUNCTION update_project_upvotes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE cocreate_projects SET upvotes = upvotes + 1 WHERE id = NEW.project_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE cocreate_projects SET upvotes = GREATEST(0, upvotes - 1) WHERE id = OLD.project_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_upvote_count ON cocreate_upvotes;
CREATE TRIGGER trg_upvote_count
  AFTER INSERT OR DELETE ON cocreate_upvotes
  FOR EACH ROW EXECUTE FUNCTION update_project_upvotes();

-- ====== 评论计数触发器 ======
CREATE OR REPLACE FUNCTION update_project_comments()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE cocreate_projects SET comment_count = comment_count + 1 WHERE id = NEW.project_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE cocreate_projects SET comment_count = GREATEST(0, comment_count - 1) WHERE id = OLD.project_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_comment_count ON cocreate_comments;
CREATE TRIGGER trg_comment_count
  AFTER INSERT OR DELETE ON cocreate_comments
  FOR EACH ROW EXECUTE FUNCTION update_project_comments();

-- ====== RLS 策略 ======

ALTER TABLE cocreate_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE cocreate_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE cocreate_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE cocreate_upvotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cocreate_comments ENABLE ROW LEVEL SECURITY;

-- 项目：所有人可查看public，创建者可增改删
DROP POLICY IF EXISTS "projects_select" ON cocreate_projects;
CREATE POLICY "projects_select" ON cocreate_projects FOR SELECT USING (visibility = 'public' OR creator_id = auth.uid());
DROP POLICY IF EXISTS "projects_insert" ON cocreate_projects;
CREATE POLICY "projects_insert" ON cocreate_projects FOR INSERT WITH CHECK (auth.uid() = creator_id);
DROP POLICY IF EXISTS "projects_update" ON cocreate_projects;
CREATE POLICY "projects_update" ON cocreate_projects FOR UPDATE USING (auth.uid() = creator_id);
DROP POLICY IF EXISTS "projects_delete" ON cocreate_projects;
CREATE POLICY "projects_delete" ON cocreate_projects FOR DELETE USING (auth.uid() = creator_id);

-- 成员：所有人可读，项目创建者可管理
DROP POLICY IF EXISTS "members_select" ON cocreate_members;
CREATE POLICY "members_select" ON cocreate_members FOR SELECT USING (true);
DROP POLICY IF EXISTS "members_insert" ON cocreate_members;
CREATE POLICY "members_insert" ON cocreate_members FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "members_delete" ON cocreate_members;
CREATE POLICY "members_delete" ON cocreate_members FOR DELETE USING (auth.uid() IS NOT NULL);

-- 申请：申请人和项目创建者可见
DROP POLICY IF EXISTS "applications_all" ON cocreate_applications;
CREATE POLICY "applications_all" ON cocreate_applications FOR ALL USING (
  auth.uid() = applicant_id OR
  auth.uid() IN (SELECT creator_id FROM cocreate_projects WHERE id = project_id)
);

-- 点赞：所有人可读，登录用户可操作自己的
DROP POLICY IF EXISTS "upvotes_select" ON cocreate_upvotes;
CREATE POLICY "upvotes_select" ON cocreate_upvotes FOR SELECT USING (true);
DROP POLICY IF EXISTS "upvotes_insert" ON cocreate_upvotes;
CREATE POLICY "upvotes_insert" ON cocreate_upvotes FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "upvotes_delete" ON cocreate_upvotes;
CREATE POLICY "upvotes_delete" ON cocreate_upvotes FOR DELETE USING (auth.uid() = user_id);

-- 评论：所有人可读，登录用户可写自己的
DROP POLICY IF EXISTS "comments_select" ON cocreate_comments;
CREATE POLICY "comments_select" ON cocreate_comments FOR SELECT USING (true);
DROP POLICY IF EXISTS "comments_insert" ON cocreate_comments;
CREATE POLICY "comments_insert" ON cocreate_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "comments_delete" ON cocreate_comments;
CREATE POLICY "comments_delete" ON cocreate_comments FOR DELETE USING (auth.uid() = user_id);
