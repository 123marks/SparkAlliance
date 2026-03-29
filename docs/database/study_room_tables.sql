-- ============================================
-- 星火自习室模块 — 数据库建表脚本
-- 创建时间: 2026-03-29
-- ============================================

-- ====== 1. 自习室房间表 ======
CREATE TABLE study_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 房间基本信息
  name VARCHAR(100) NOT NULL,                     -- 房间名称
  description TEXT,                                -- 房间描述
  room_type VARCHAR(20) NOT NULL DEFAULT 'public', -- public/private/solo
  password_hash VARCHAR(255),                      -- 私密房间密码（bcrypt）
  max_members INT DEFAULT 20,                      -- 最大人数

  -- 房间设置
  focus_duration INT DEFAULT 25,                   -- 默认专注时长（分钟）
  short_break INT DEFAULT 5,                       -- 短休息（分钟）
  long_break INT DEFAULT 15,                       -- 长休息（分钟）
  long_break_interval INT DEFAULT 4,               -- 每N个番茄钟后长休息
  category VARCHAR(30) DEFAULT 'general',          -- general/exam/reading/coding/writing

  -- 统计
  current_members INT DEFAULT 0,                   -- 当前在线人数（缓存）
  total_sessions INT DEFAULT 0,                    -- 累计完成的专注次数

  -- 状态
  status VARCHAR(20) DEFAULT 'active',             -- active/archived
  is_pinned BOOLEAN DEFAULT FALSE,                 -- 是否置顶

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_study_rooms_creator ON study_rooms(creator_id);
CREATE INDEX idx_study_rooms_type ON study_rooms(room_type);
CREATE INDEX idx_study_rooms_status ON study_rooms(status);
CREATE INDEX idx_study_rooms_category ON study_rooms(category);

-- ====== 2. 房间成员表 ======
CREATE TABLE study_room_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES study_rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 成员状态
  status VARCHAR(20) DEFAULT 'online',             -- online/focusing/break/offline
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- 当前专注信息
  current_session_id UUID,                         -- 当前正在进行的session
  focus_started_at TIMESTAMP WITH TIME ZONE,       -- 本次专注开始时间

  UNIQUE(room_id, user_id)
);

-- 索引
CREATE INDEX idx_study_members_room ON study_room_members(room_id);
CREATE INDEX idx_study_members_user ON study_room_members(user_id);
CREATE INDEX idx_study_members_status ON study_room_members(status);

-- ====== 3. 专注会话记录表 ======
CREATE TABLE study_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  room_id UUID REFERENCES study_rooms(id) ON DELETE SET NULL,

  -- 会话信息
  planned_duration INT NOT NULL,                   -- 计划时长（分钟）
  actual_duration INT DEFAULT 0,                   -- 实际时长（分钟）
  session_type VARCHAR(20) DEFAULT 'focus',         -- focus/short_break/long_break

  -- 状态机：focusing → completed | interrupted
  status VARCHAR(20) NOT NULL DEFAULT 'focusing',  -- focusing/completed/interrupted
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,

  -- 中断原因（若中断）
  interrupt_reason VARCHAR(100),                   -- 主动中断 / 关闭页面 / 网络断开

  -- 备注
  note TEXT,                                       -- 用户备注（本次学了什么）

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_study_sessions_user ON study_sessions(user_id);
CREATE INDEX idx_study_sessions_room ON study_sessions(room_id);
CREATE INDEX idx_study_sessions_status ON study_sessions(status);
CREATE INDEX idx_study_sessions_started ON study_sessions(started_at);
-- 复合索引：按用户+时间查询（排行榜核心）
CREATE INDEX idx_study_sessions_user_time ON study_sessions(user_id, started_at, status);

-- ====== 4. 每日学习统计表 ======
CREATE TABLE study_daily_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  stat_date DATE NOT NULL,                         -- 统计日期

  -- 今日数据
  total_focus_minutes INT DEFAULT 0,               -- 总专注时长（分钟）
  completed_sessions INT DEFAULT 0,                -- 完成的番茄钟数
  interrupted_sessions INT DEFAULT 0,              -- 中断的番茄钟数
  longest_streak INT DEFAULT 0,                    -- 最长连续专注（分钟）

  -- 时段分布（JSONB记录每小时专注分钟数）
  hourly_distribution JSONB DEFAULT '{}',          -- {"8":25,"9":50,...}

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id, stat_date)
);

-- 索引
CREATE INDEX idx_study_stats_user ON study_daily_stats(user_id);
CREATE INDEX idx_study_stats_date ON study_daily_stats(stat_date);
CREATE INDEX idx_study_stats_user_date ON study_daily_stats(user_id, stat_date);

-- ====== RLS 策略 ======

ALTER TABLE study_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_daily_stats ENABLE ROW LEVEL SECURITY;

-- 房间：所有人可查看，创建者可修改
CREATE POLICY "rooms_select" ON study_rooms FOR SELECT USING (true);
CREATE POLICY "rooms_insert" ON study_rooms FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "rooms_update" ON study_rooms FOR UPDATE USING (auth.uid() = creator_id);
CREATE POLICY "rooms_delete" ON study_rooms FOR DELETE USING (auth.uid() = creator_id);

-- 成员：所有人可查看（显示在线人数），登录用户可加入/退出
CREATE POLICY "members_select" ON study_room_members FOR SELECT USING (true);
CREATE POLICY "members_insert" ON study_room_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "members_update" ON study_room_members FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "members_delete" ON study_room_members FOR DELETE USING (auth.uid() = user_id);

-- 会话：仅本人可操作
CREATE POLICY "sessions_select" ON study_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "sessions_insert" ON study_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sessions_update" ON study_sessions FOR UPDATE USING (auth.uid() = user_id);

-- 统计：本人可查看自己的，排行时需要所有人可查看
CREATE POLICY "stats_select" ON study_daily_stats FOR SELECT USING (true);
CREATE POLICY "stats_insert" ON study_daily_stats FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "stats_update" ON study_daily_stats FOR UPDATE USING (auth.uid() = user_id);

-- ====== 触发器：自动更新 updated_at ======

CREATE OR REPLACE FUNCTION update_study_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_study_rooms_updated
  BEFORE UPDATE ON study_rooms
  FOR EACH ROW EXECUTE FUNCTION update_study_updated_at();

CREATE TRIGGER trg_study_daily_stats_updated
  BEFORE UPDATE ON study_daily_stats
  FOR EACH ROW EXECUTE FUNCTION update_study_updated_at();
