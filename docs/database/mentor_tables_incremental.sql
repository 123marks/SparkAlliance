-- =============================================
-- 星火学长分享模块 — 增量更新脚本
-- mentor_article_likes 表 + RPC 函数
-- =============================================

-- ====== 6. mentor_article_likes — 文章点赞表（防重复） ======
CREATE TABLE IF NOT EXISTS mentor_article_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES mentor_articles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, article_id)
);

ALTER TABLE mentor_article_likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS mal_sel ON mentor_article_likes;
DROP POLICY IF EXISTS mal_ins ON mentor_article_likes;
DROP POLICY IF EXISTS mal_del ON mentor_article_likes;
CREATE POLICY mal_sel ON mentor_article_likes FOR SELECT USING (true);
CREATE POLICY mal_ins ON mentor_article_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY mal_del ON mentor_article_likes FOR DELETE USING (auth.uid() = user_id);

-- 点赞数自动更新触发器
CREATE OR REPLACE FUNCTION mentor_update_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE mentor_articles SET like_count = like_count + 1 WHERE id = NEW.article_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE mentor_articles SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.article_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_mentor_like_count ON mentor_article_likes;
CREATE TRIGGER trg_mentor_like_count
  AFTER INSERT OR DELETE ON mentor_article_likes
  FOR EACH ROW EXECUTE FUNCTION mentor_update_like_count();

-- ====== 原子计数器 RPC ======

CREATE OR REPLACE FUNCTION increment_article_view(article_id_input UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE mentor_articles SET view_count = view_count + 1 WHERE id = article_id_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
