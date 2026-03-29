-- ======================================================================
-- 星火联盟 — 用户注册信息扩展迁移
-- 同步 Register.vue 新增的身份/职场/学校等字段到 profiles 表
-- ======================================================================

-- 确保 profiles 表存在基础字段后，添加新增字段
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS identity TEXT DEFAULT 'student';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS university TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS grade TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS major TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS position TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS industry TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS skill TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city TEXT;

-- 手机号唯一约束（仅非空值唯一）
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_phone_unique
  ON public.profiles(phone)
  WHERE phone IS NOT NULL AND phone != '';

-- 身份类型检查
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS check_identity_type;
ALTER TABLE public.profiles
  ADD CONSTRAINT check_identity_type
  CHECK (identity IN ('student', 'worker', 'freelancer'));

-- 行级安全策略（RLS）：用户只能读写自己的 profile
-- 假设已有 enable RLS，追加策略
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles' AND policyname = 'Users can update own profile extended fields'
  ) THEN
    CREATE POLICY "Users can update own profile extended fields"
      ON public.profiles FOR UPDATE
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- 同步 Supabase Auth metadata → profiles 的触发器函数更新
-- 这个函数在用户注册时自动将 auth.users.raw_user_meta_data 写入 profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id, nickname, avatar_url, identity, phone
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nickname', '星火用户'),
    '',
    COALESCE(NEW.raw_user_meta_data->>'identity', 'student'),
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (id) DO UPDATE SET
    nickname = COALESCE(EXCLUDED.nickname, public.profiles.nickname),
    identity = COALESCE(EXCLUDED.identity, public.profiles.identity),
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 触发器（幂等）
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
