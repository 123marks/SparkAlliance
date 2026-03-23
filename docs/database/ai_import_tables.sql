-- =============================================
-- AI 智能导入功能 - 数据库表结构
-- 在 Supabase SQL Editor 中执行
-- =============================================

-- 1. AI 导入日志表
CREATE TABLE IF NOT EXISTS ai_import_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 导入信息
  file_count INT DEFAULT 0,              -- 上传文件数
  event_count INT DEFAULT 0,             -- 识别出的事件数
  imported_count INT DEFAULT 0,          -- 实际导入的事件数

  -- AI 信息
  provider VARCHAR(20) NOT NULL,         -- gemini / qwen
  status VARCHAR(20) DEFAULT 'pending',  -- pending / success / failed / partial
  error_message TEXT,
  raw_response JSONB,                    -- AI 原始返回（调试用）

  -- 时间
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processing_time_ms INT                 -- AI 处理耗时
);

-- 2. API 使用量日志表（每日配额）
CREATE TABLE IF NOT EXISTS api_usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,  -- 使用日期
  usage_count INT DEFAULT 0,                       -- 当日已用次数
  daily_limit INT DEFAULT 5,                       -- 每日上限

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 每个用户每天只有一条记录
  UNIQUE(user_id, usage_date)
);

-- 3. 索引
CREATE INDEX IF NOT EXISTS idx_ai_import_user ON ai_import_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_import_created ON ai_import_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_api_usage_user_date ON api_usage_logs(user_id, usage_date);

-- 4. RLS 策略
ALTER TABLE ai_import_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- ai_import_logs: 用户只能管理自己的记录
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users manage own import logs' AND tablename = 'ai_import_logs') THEN
    CREATE POLICY "Users manage own import logs" ON ai_import_logs
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  -- api_usage_logs: 用户只能管理自己的配额记录
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users manage own usage logs' AND tablename = 'api_usage_logs') THEN
    CREATE POLICY "Users manage own usage logs" ON api_usage_logs
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 5. api_usage_logs 自动更新 updated_at
CREATE OR REPLACE FUNCTION update_api_usage_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_api_usage_updated_at ON api_usage_logs;
CREATE TRIGGER trigger_api_usage_updated_at
  BEFORE UPDATE ON api_usage_logs
  FOR EACH ROW EXECUTE FUNCTION update_api_usage_updated_at();
