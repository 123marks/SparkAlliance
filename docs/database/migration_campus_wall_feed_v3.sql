-- 星火墙：本校/同城筛选、发布时心情、发帖时学校地区快照
-- 在 Supabase SQL Editor 中执行（幂等）

ALTER TABLE posts ADD COLUMN IF NOT EXISTS school TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS region TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS mood TEXT;

COMMENT ON COLUMN posts.school IS '发帖时用户资料中的学校快照，用于「本校」筛选';
COMMENT ON COLUMN posts.region IS '发帖时用户资料中的地区快照，用于「同城」筛选';
COMMENT ON COLUMN posts.mood IS '发帖时选择的心情/状态（可自定义短文本）';
