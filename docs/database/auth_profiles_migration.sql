-- ======================================================================
-- 星火联盟 — 用户注册信息扩展迁移
-- 前置条件：先执行 supabase-schema.sql 创建 profiles 表
-- ======================================================================

-- 注意：profiles 表已在 supabase-schema.sql 中创建
-- 这里只添加新字段（IF NOT EXISTS 安全幂等）

-- 手机号
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;
-- 公司/职位/行业 (职场青年)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS position TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS industry TEXT;
-- 技能/城市 (自由职业)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS skill TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city TEXT;

-- 手机号唯一约束（仅非空值唯一）
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_phone_unique
  ON profiles(phone)
  WHERE phone IS NOT NULL AND phone != '';

-- 更新触发器函数，同步更多字段
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, nickname, user_type, phone, college, major, grade, company, position, industry, skill, city)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'nickname', '星火用户'),
    COALESCE(NEW.raw_user_meta_data ->> 'identity', 'student'),
    NEW.raw_user_meta_data ->> 'phone',
    COALESCE(NEW.raw_user_meta_data ->> 'university', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'major', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'grade', ''),
    NEW.raw_user_meta_data ->> 'company',
    NEW.raw_user_meta_data ->> 'position',
    NEW.raw_user_meta_data ->> 'industry',
    NEW.raw_user_meta_data ->> 'skill',
    NEW.raw_user_meta_data ->> 'city'
  )
  ON CONFLICT (id) DO UPDATE SET
    nickname = COALESCE(EXCLUDED.nickname, public.profiles.nickname),
    user_type = COALESCE(EXCLUDED.user_type, public.profiles.user_type),
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
    college = COALESCE(EXCLUDED.college, public.profiles.college),
    major = COALESCE(EXCLUDED.major, public.profiles.major),
    grade = COALESCE(EXCLUDED.grade, public.profiles.grade);
  RETURN NEW;
END;
$$;

-- 重建触发器（幂等）
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 更新 user_type 约束以支持新的身份类型
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_user_type_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_user_type_check
  CHECK (user_type IN ('student', 'professional', 'freelancer', 'entrepreneur', 'job_seeker', 'worker'));
