-- ============================================
-- 学习资源模块 — 数据库建表脚本
-- 创建时间: 2026-03-29
-- ============================================

-- ====== 1. 资源分类表 ======
CREATE TABLE resource_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) NOT NULL,                       -- 分类名称
  icon VARCHAR(10) DEFAULT '📁',                   -- 分类图标
  color VARCHAR(20) DEFAULT '#4f8ef7',             -- 分类颜色
  sort_order INT DEFAULT 0,                        -- 排序
  parent_id UUID REFERENCES resource_categories(id), -- 父分类（支持二级分类）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 预设分类
INSERT INTO resource_categories (name, icon, color, sort_order) VALUES
  ('课程资料', '📚', '#4f8ef7', 1),
  ('考试资料', '📝', '#ef4444', 2),
  ('学习工具', '🔧', '#8b5cf6', 3),
  ('视频教程', '🎬', '#f97316', 4),
  ('电子书籍', '📖', '#10b981', 5);

-- ====== 2. 学习资源表 ======
CREATE TABLE learning_resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  uploader_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 基本信息
  title VARCHAR(200) NOT NULL,                     -- 资源标题
  description TEXT,                                -- 资源描述
  category_id UUID REFERENCES resource_categories(id), -- 分类
  tags TEXT[] DEFAULT '{}',                        -- 标签（如：高数、线代、期末复习）

  -- 资源内容
  resource_type VARCHAR(20) NOT NULL DEFAULT 'file', -- file/link/text
  file_url TEXT,                                   -- 文件URL（Supabase Storage）
  file_name VARCHAR(255),                          -- 原始文件名
  file_size BIGINT DEFAULT 0,                      -- 文件大小（字节）
  file_type VARCHAR(50),                           -- MIME类型
  external_url TEXT,                               -- 外部链接
  content TEXT,                                    -- 纯文本内容（笔记类资源）

  -- 学科与课程
  subject VARCHAR(100),                            -- 学科（如：计算机科学、数学）
  course_name VARCHAR(100),                        -- 课程名（如：操作系统、高等数学）
  teacher_name VARCHAR(50),                        -- 授课教师

  -- 统计
  download_count INT DEFAULT 0,                    -- 下载次数
  view_count INT DEFAULT 0,                        -- 浏览次数
  favorite_count INT DEFAULT 0,                    -- 收藏次数
  avg_rating DECIMAL(2,1) DEFAULT 0,               -- 平均评分（1-5）
  rating_count INT DEFAULT 0,                      -- 评分人数

  -- 状态
  status VARCHAR(20) DEFAULT 'active',             -- active/pending/rejected/archived
  is_pinned BOOLEAN DEFAULT FALSE,                 -- 是否置顶
  is_featured BOOLEAN DEFAULT FALSE,               -- 是否精选

  -- 审核
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_note TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_resources_uploader ON learning_resources(uploader_id);
CREATE INDEX idx_resources_category ON learning_resources(category_id);
CREATE INDEX idx_resources_status ON learning_resources(status);
CREATE INDEX idx_resources_subject ON learning_resources(subject);
CREATE INDEX idx_resources_created ON learning_resources(created_at DESC);
CREATE INDEX idx_resources_downloads ON learning_resources(download_count DESC);
CREATE INDEX idx_resources_rating ON learning_resources(avg_rating DESC);
-- 全文搜索索引（标题+描述+课程）
CREATE INDEX idx_resources_search ON learning_resources
  USING gin(to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(description,'') || ' ' || coalesce(course_name,'') || ' ' || coalesce(subject,'')));

-- ====== 3. 资源收藏表 ======
CREATE TABLE resource_favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  resource_id UUID REFERENCES learning_resources(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, resource_id)
);

CREATE INDEX idx_favorites_user ON resource_favorites(user_id);
CREATE INDEX idx_favorites_resource ON resource_favorites(resource_id);

-- ====== 4. 资源评分表 ======
CREATE TABLE resource_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  resource_id UUID REFERENCES learning_resources(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5), -- 1-5星
  comment TEXT,                                       -- 评价内容
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, resource_id)
);

CREATE INDEX idx_ratings_resource ON resource_ratings(resource_id);
CREATE INDEX idx_ratings_user ON resource_ratings(user_id);

-- ====== 5. 下载记录表 ======
CREATE TABLE resource_downloads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  resource_id UUID REFERENCES learning_resources(id) ON DELETE CASCADE,
  downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_downloads_user ON resource_downloads(user_id);
CREATE INDEX idx_downloads_resource ON resource_downloads(resource_id);

-- ====== RLS 策略 ======

ALTER TABLE resource_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_downloads ENABLE ROW LEVEL SECURITY;

-- 分类：所有人可读
CREATE POLICY "categories_read" ON resource_categories FOR SELECT USING (true);

-- 资源：所有人可查看已审核通过的，上传者可以管理自己的
CREATE POLICY "resources_read" ON learning_resources FOR SELECT USING (status = 'active' OR auth.uid() = uploader_id);
CREATE POLICY "resources_insert" ON learning_resources FOR INSERT WITH CHECK (auth.uid() = uploader_id);
CREATE POLICY "resources_update" ON learning_resources FOR UPDATE USING (auth.uid() = uploader_id);
CREATE POLICY "resources_delete" ON learning_resources FOR DELETE USING (auth.uid() = uploader_id);

-- 收藏：仅本人操作
CREATE POLICY "favorites_read" ON resource_favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "favorites_insert" ON resource_favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "favorites_delete" ON resource_favorites FOR DELETE USING (auth.uid() = user_id);

-- 评分：所有人可看，仅本人可写
CREATE POLICY "ratings_read" ON resource_ratings FOR SELECT USING (true);
CREATE POLICY "ratings_insert" ON resource_ratings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ratings_update" ON resource_ratings FOR UPDATE USING (auth.uid() = user_id);

-- 下载记录：仅本人可操作
CREATE POLICY "downloads_read" ON resource_downloads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "downloads_insert" ON resource_downloads FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ====== 触发器 ======

-- 自动更新 updated_at
CREATE OR REPLACE FUNCTION update_resource_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_resources_updated
  BEFORE UPDATE ON learning_resources
  FOR EACH ROW EXECUTE FUNCTION update_resource_updated_at();

-- 评分后自动更新资源的平均分和评分人数
CREATE OR REPLACE FUNCTION update_resource_avg_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE learning_resources SET
    avg_rating = (SELECT ROUND(AVG(rating)::numeric, 1) FROM resource_ratings WHERE resource_id = NEW.resource_id),
    rating_count = (SELECT COUNT(*) FROM resource_ratings WHERE resource_id = NEW.resource_id)
  WHERE id = NEW.resource_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_rating_update_avg
  AFTER INSERT OR UPDATE ON resource_ratings
  FOR EACH ROW EXECUTE FUNCTION update_resource_avg_rating();

-- ====== 原子计数器 RPC ======

-- 浏览量 +1
CREATE OR REPLACE FUNCTION increment_view_count(resource_id_input UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE learning_resources
  SET view_count = view_count + 1
  WHERE id = resource_id_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 下载量 +1
CREATE OR REPLACE FUNCTION increment_download_count(resource_id_input UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE learning_resources
  SET download_count = download_count + 1
  WHERE id = resource_id_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 收藏量原子增减（delta: +1 或 -1）
CREATE OR REPLACE FUNCTION adjust_favorite_count(resource_id_input UUID, delta INT)
RETURNS VOID AS $$
BEGIN
  UPDATE learning_resources
  SET favorite_count = GREATEST(0, favorite_count + delta)
  WHERE id = resource_id_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====== 全文搜索 RPC ======

-- 返回匹配全文搜索的资源 ID（利用 idx_resources_search 索引）
CREATE OR REPLACE FUNCTION search_resources_fts(query_text TEXT)
RETURNS TABLE(id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT lr.id FROM learning_resources lr
  WHERE lr.status = 'active'
    AND to_tsvector('simple',
          coalesce(lr.title,'') || ' ' ||
          coalesce(lr.description,'') || ' ' ||
          coalesce(lr.course_name,'') || ' ' ||
          coalesce(lr.subject,''))
        @@ to_tsquery('simple', query_text);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
