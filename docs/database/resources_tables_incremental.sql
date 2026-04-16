-- ============================================
-- 学习资源模块 — 增量更新脚本（表已存在时执行）
-- 仅包含 RPC 函数，不重复创建表
-- ============================================

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
