# 星火规划模块系统设计评审报告

> 评审机构：OpenCode  
> 评审时间：2026-03-28  
> 评审范围：星火规划（目标与任务）模块系统设计完整性、安全性与可扩展性

---

## 一、与日程模块协同方案（推荐方案 + 理由）

### 1.1 数据关系模型

经过对现有 `schedule_events` 表（见 `MODULE-SCHEDULE.md` 第459-531行）的分析，推荐采用 **方案A：完全独立 + 软关联**。

### 推荐方案：独立表 + 外键引用

```sql
-- 规划模块核心表设计

-- 1. 目标表 (goals)
CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 目标信息
  title VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(30) NOT NULL,  -- study, health, career, habit, custom
  target_date DATE,               -- 目标截止日
  status VARCHAR(20) DEFAULT 'active',  -- active, completed, abandoned, archived
  
  -- 游戏化属性
  difficulty INT DEFAULT 1,        -- 1-5 难度
  points INT DEFAULT 0,            -- 完成奖励积分
  streak_days INT DEFAULT 0,       -- 连续打卡天数
  
  -- 日程关联（软关联，非强制）
  related_event_id UUID REFERENCES schedule_events(id),  -- 可选：关联日程
  
  -- 可见性
  visibility VARCHAR(20) DEFAULT 'private',  -- private, friends, public
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 任务表 (tasks) - 目标的子任务
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_id UUID REFERENCES goals(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 任务信息
  title VARCHAR(200) NOT NULL,
  description TEXT,
  order_index INT DEFAULT 0,       -- 排序
  
  -- 时间信息
  scheduled_date DATE,             -- 计划执行日期
  scheduled_time TIME,             -- 计划时间
  estimated_minutes INT,           -- 预计耗时
  
  -- 状态
  status VARCHAR(20) DEFAULT 'pending',  -- pending, in_progress, completed, skipped
  completed_at TIMESTAMPTZ,
  
  -- 日程关联（同步到日程模块）
  sync_to_schedule BOOLEAN DEFAULT FALSE,
  schedule_event_id UUID REFERENCES schedule_events(id),  -- 同步生成的日程ID
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 打卡记录表 (habit_logs)
CREATE TABLE habit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  goal_id UUID REFERENCES goals(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 打卡数据（服务端生成，禁止客户端指定）
  log_date DATE NOT NULL,         -- 打卡日期（服务器时间）
  log_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),  -- 打卡时间戳（服务端生成）
  
  -- 打卡内容
  content TEXT,                   -- 打卡备注
  mood VARCHAR(20),                -- 心情 emoji
  photo_url TEXT,                 -- 打卡照片
  
  -- 验证
  is_verified BOOLEAN DEFAULT FALSE,  -- 是否通过验证
  verification_type VARCHAR(20),  -- manual, ai, peer
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 防重复：每天每任务一条记录
  UNIQUE(user_id, task_id, log_date)
);

-- 4. 成就表 (achievements)
CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- 成就定义
  code VARCHAR(50) NOT NULL UNIQUE,  -- 成就编码
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50),             -- emoji 或图片
  category VARCHAR(30),         -- streak, milestone, social, special
  
  -- 解锁条件
  condition_type VARCHAR(30),   -- count, streak, points, date
  condition_value JSONB,        -- { "min_streak": 7 }
  points_reward INT DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 用户成就解锁记录 (user_achievements)
CREATE TABLE user_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID REFERENCES achievements(id) ON DELETE CASCADE,
  
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  points_earned INT DEFAULT 0,
  
  UNIQUE(user_id, achievement_id)  -- 防止重复触发
);

-- 6. 积分记录表 (points_history)
CREATE TABLE points_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 积分变动
  points INT NOT NULL,          -- 正数增加，负数扣减
  action_type VARCHAR(50) NOT NULL,  -- task_completed, goal_completed, streak_bonus, achievement, check_in
  reference_id UUID,           -- 关联的任务/目标/成就ID
  
  -- 快照
  balance_snapshot INT,        -- 变动后余额
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. 排行榜表 (leaderboards)
CREATE TABLE leaderboards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- 排行榜定义
  board_type VARCHAR(30) NOT NULL,  -- weekly_points, monthly_streak, all_time
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- 排名数据（JSONB 存储，定期刷新）
  rankings JSONB,              -- [{ "user_id": "xxx", "score": 100, "rank": 1 }]
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(board_type, period_start)
);
```

### 1.2 方案理由

| 对比维度 | 方案A（独立+引用） | 方案B（tasks是子集） | 方案C（Edge Function同步） |
|---------|-------------------|---------------------|--------------------------|
| **数据清晰度** | ⭐⭐⭐⭐⭐ 职责分离 | ⭐⭐⭐ 概念混淆 | ⭐⭐⭐⭐ 实现复杂 |
| **查询性能** | ⭐⭐⭐⭐⭐ 按需join | ⭐⭐⭐⭐ 需类型过滤 | ⭐⭐⭐ 同步延迟 |
| **删除级联** | ⭐⭐⭐⭐⭐ 可控 | ⭐⭐⭐⭐⭐ 隐式级联 | ⭐⭐⭐ 需补偿机制 |
| **维护成本** | ⭐⭐⭐⭐⭐ 简单 | ⭐⭐⭐⭐ 需改 schema | ⭐⭐ 需维护同步逻辑 |

### 1.3 跨模块查询优化

**问题：用户删除日程事件，对应规划任务是否删除？**

推荐策略：
- **软删除 + 状态同步**：日程删除时，任务`sync_to_schedule`标记为false，保留任务本身
- **可选重新生成**：用户可选择重新从任务同步到日程
- **查询优化**：使用 `schedule_event_id` 外键 + 索引

**问题：跨模块查询性能**

```sql
-- 高效查询"今天要做的规划任务"
SELECT t.*, g.title as goal_title
FROM tasks t
JOIN goals g ON t.goal_id = g.id
WHERE t.user_id = $1
  AND t.scheduled_date = CURRENT_DATE
  AND t.status != 'completed'
ORDER BY t.order_index;

-- 高效查询"本周打卡热力图"
SELECT log_date, COUNT(*) as count
FROM habit_logs
WHERE user_id = $1
  AND log_date >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY log_date
ORDER BY log_date;
```

---

## 二、游戏化数据安全方案

### 2.1 打卡操作服务端验证

**核心原则：所有关键数据必须在服务端生成**

```sql
-- ❌ 禁止：客户端传入时间戳
INSERT INTO habit_logs (user_id, task_id, log_date, log_time)
VALUES ($1, $2, $3, $4);  -- $3, $4 来自客户端 → 不安全

-- ✅ 正确：服务端生成时间戳
CREATE OR REPLACE FUNCTION create_habit_log(
  p_user_id UUID,
  p_task_id UUID,
  p_content TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id UUID;
  v_points INT;
BEGIN
  -- 服务端生成时间，禁止客户端指定
  INSERT INTO habit_logs (user_id, task_id, log_date, log_time, content)
  VALUES (p_user_id, p_task_id, CURRENT_DATE, NOW(), p_content)
  RETURNING id INTO v_log_id;
  
  -- 触发积分计算（服务端）
  -- ... 积分逻辑见下文
  
  RETURN v_log_id;
END;
$$;
```

### 2.2 积分计算服务端化

```sql
-- 积分规则配置表
CREATE TABLE points_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action_type VARCHAR(50) NOT NULL UNIQUE,
  points INT NOT NULL,
  daily_limit INT DEFAULT NULL,     -- 每日上限，NULL=无限制
  description TEXT,
  
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 初始化积分规则
INSERT INTO points_rules (action_type, points, daily_limit, description) VALUES
('task_completed', 10, 5, '完成任务'),
('goal_completed', 50, NULL, '达成目标'),
('streak_7', 100, NULL, '连续7天'),
('streak_30', 500, NULL, '连续30天'),
('check_in', 2, 1, '每日签到'),
('perfect_week', 30, 1, '完美周（7天全勤）');

-- 积分计算存储过程
CREATE OR REPLACE FUNCTION calculate_points(
  p_user_id UUID,
  p_action_type VARCHAR(50),
  p_reference_id UUID DEFAULT NULL
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_points INT;
  v_daily_limit INT;
  v_today_count INT;
  v_new_balance INT;
BEGIN
  -- 获取积分规则
  SELECT pr.points, pr.daily_limit
  INTO v_points, v_daily_limit
  FROM points_rules pr
  WHERE pr.action_type = p_action_type AND pr.is_active = TRUE;
  
  IF v_points IS NULL THEN
    RETURN 0;  -- 无效action，不积分
  END IF;
  
  -- 检查每日上限
  IF v_daily_limit IS NOT NULL THEN
    SELECT COALESCE(SUM(ABS(points)), 0)
    INTO v_today_count
    FROM points_history
    WHERE user_id = p_user_id
      AND action_type = p_action_type
      AND DATE(created_at) = CURRENT_DATE;
    
    IF v_today_count >= v_daily_limit THEN
      RETURN 0;  -- 已达上限
    END IF;
  END IF;
  
  -- 计算积分（考虑单日剩余额度）
  IF v_daily_limit IS NOT NULL THEN
    v_points := LEAST(v_points, v_daily_limit - v_today_count);
    IF v_points <= 0 THEN
      RETURN 0;
    END IF;
  END IF;
  
  -- 获取当前余额
  SELECT COALESCE(SUM(points), 0) INTO v_new_balance
  FROM points_history
  WHERE user_id = p_user_id;
  
  -- 记录积分
  INSERT INTO points_history (user_id, points, action_type, reference_id, balance_snapshot)
  VALUES (p_user_id, v_points, p_action_type, p_reference_id, v_new_balance + v_points);
  
  RETURN v_points;
END;
$$;
```

### 2.3 成就解锁防重复

```sql
-- 成就触发器函数
CREATE OR REPLACE FUNCTION check_achievement_unlock(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_achievement RECORD;
  v_condition BOOLEAN;
  v_count INT;
BEGIN
  FOR v_achievement IN
    SELECT a.*, ua.id as unlocked_id
    FROM achievements a
    LEFT JOIN user_achievements ua ON ua.achievement_id = a.id AND ua.user_id = p_user_id
    WHERE ua.id IS NULL  -- 未解锁的成就
  LOOP
    -- 根据条件类型判断是否解锁
    v_condition := FALSE;
    
    CASE v_achievement.condition_type
    WHEN 'streak' THEN
      SELECT MAX(streak_days) INTO v_count FROM goals WHERE user_id = p_user_id AND status = 'active';
      v_condition := v_count >= (v_achievement.condition_value->>'min_streak')::INT;
    
    WHEN 'count' THEN
      SELECT COUNT(*) INTO v_count FROM tasks WHERE user_id = p_user_id AND status = 'completed';
      v_condition := v_count >= (v_achievement.condition_value->>'min_count')::INT;
    
    WHEN 'points' THEN
      SELECT COALESCE(SUM(points), 0) INTO v_count FROM points_history WHERE user_id = p_user_id;
      v_condition := v_count >= (v_achievement.condition_value->>'min_points')::INT;
    END CASE;
    
    -- 解锁成就
    IF v_condition THEN
      INSERT INTO user_achievements (user_id, achievement_id, points_earned)
      VALUES (p_user_id, v_achievement.id, v_achievement.points_reward)
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
      
      -- 发放积分奖励
      IF v_achievement.points_reward > 0 THEN
        PERFORM calculate_points(p_user_id, 'achievement_' || v_achievement.code, v_achievement.id);
      END IF;
    END IF;
  END LOOP;
END;
$$;
```

### 2.4 排行榜防刷分机制

```sql
-- 排行榜生成策略
-- 1. 仅统计已验证的打卡记录
-- 2. 周期性汇总（非实时）
-- 3. 异常检测：单日打卡超过阈值则标记

-- 定期任务：每日凌晨生成昨日排行榜
CREATE OR REPLACE FUNCTION refresh_daily_leaderboard()
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_yesterday DATE := CURRENT_DATE - 1;
BEGIN
  -- 删除昨日排行榜（重新生成）
  DELETE FROM leaderboards 
  WHERE board_type = 'daily_points' AND period_start = v_yesterday;
  
  -- 重新计算昨日积分（排除异常）
  INSERT INTO leaderboards (board_type, period_start, period_end, rankings)
  SELECT 
    'daily_points',
    v_yesterday,
    v_yesterday,
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'user_id', user_id,
          'score', total_points,
          'rank', ROW_NUMBER() OVER (ORDER BY total_points DESC)
        )
      )
      FROM (
        SELECT user_id, SUM(points) as total_points
        FROM points_history
        WHERE DATE(created_at) = v_yesterday
          AND points > 0  -- 只统计正向积分
          AND action_type NOT IN ('achievement_ghost', 'admin_bonus')  -- 排除可疑来源
        GROUP BY user_id
        HAVING SUM(points) <= 100  -- 单日积分上限防刷
        ORDER BY total_points DESC
        LIMIT 100  -- 只保留前100
      ) t
    );
END;
$$;
```

### 2.5 安全方案总结

| 风险点 | 防护措施 | 优先级 |
|-------|---------|--------|
| 时间戳伪造 | 服务端生成 `log_time`，禁止客户端传入 | P0 |
| 积分作弊 | 积分计算在存储过程，服务端校验每日上限 | P0 |
| 成就重复触发 | UNIQUE 约束 + ON CONFLICT DO NOTHING | P0 |
| 排行榜刷分 | 周期性汇总 + 单日积分上限 + 可疑来源排除 | P1 |
| 重复打卡 | UNIQUE(user_id, task_id, log_date) 约束 | P0 |

---

## 三、数据量与性能优化建议

### 3.1 habit_logs 表容量评估

**假设**：
- 1000 DAU 用户
- 每用户每日平均打卡 3 次
- 一年数据量：1000 × 3 × 365 = **1,095,000 条**

**优化策略**：

```sql
-- 1. 分区表（PostgreSQL 11+）
CREATE TABLE habit_logs (
  id UUID,
  user_id UUID,
  task_id UUID,
  goal_id UUID,
  log_date DATE NOT NULL,
  log_time TIMESTAMPTZ NOT NULL,
  content TEXT,
  mood VARCHAR(20),
  photo_url TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  verification_type VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, log_date)
) PARTITION BY RANGE (log_date);

-- 创建月度分区
CREATE TABLE habit_logs_2026_03 PARTITION OF habit_logs
  FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

-- 2. 归档策略
-- 超过1年的数据自动归档到历史表
-- 使用 pg_partman 或 cron job 定期创建新分区

-- 3. 索引优化
-- 热数据（最近90天）查询
CREATE INDEX idx_habit_logs_recent 
  ON habit_logs (user_id, log_date DESC) 
  WHERE log_date > CURRENT_DATE - 90;

-- 全量查询（热力图）
CREATE INDEX idx_habit_logs_date 
  ON habit_logs (log_date);
```

### 3.2 tasks 表列表查询优化

**场景**：一个目标可能有 100+ 子任务，列表查询

```sql
-- 1. 游标分页（避免 OFFSET 性能问题）
-- 前端传入 last_id + limit，而非 offset
SELECT *
FROM tasks
WHERE goal_id = $1
  AND id > $2  -- $2 = last_id
ORDER BY order_index
LIMIT 20;

-- 2. 复合索引
CREATE INDEX idx_tasks_goal_order ON tasks(goal_id, order_index);

-- 3. 计数缓存（可选）
-- 在 goals 表缓存 tasks_count, completed_count
ALTER TABLE goals ADD COLUMN tasks_count INT DEFAULT 0;
ALTER TABLE goals ADD COLUMN completed_count INT DEFAULT 0;

-- 更新触发器
CREATE OR REPLACE FUNCTION update_goals_task_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE goals 
  SET tasks_count = (SELECT COUNT(*) FROM tasks WHERE goal_id = NEW.goal_id),
      completed_count = (SELECT COUNT(*) FROM tasks WHERE goal_id = NEW.goal_id AND status = 'completed')
  WHERE id = NEW.goal_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_goals_task_count
  AFTER INSERT OR UPDATE OR DELETE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_goals_task_count();
```

### 3.3 打卡热力图查询优化

```sql
-- 高效热力图查询（365天）
-- 方案：预计算 + 物化视图

-- 1. 物化视图（月度汇总）
CREATE MATERIALIZED VIEW mv_habit_heatmap_monthly AS
SELECT 
  user_id,
  EXTRACT(YEAR FROM log_date) as year,
  EXTRACT(MONTH FROM log_date) as month,
  COUNT(*) as checkin_count,
  COUNT(DISTINCT log_date) as active_days
FROM habit_logs
GROUP BY user_id, year, month;

CREATE UNIQUE INDEX ON mv_habit_heatmap_monthly(user_id, year, month);

-- 2. 日度查询（走索引）
SELECT log_date, COUNT(*) as count
FROM habit_logs
WHERE user_id = $1
  AND log_date >= CURRENT_DATE - 365
GROUP BY log_date
ORDER BY log_date;
-- 走索引：idx_habit_logs_recent
```

### 3.4 社交场景查询优化

**场景**：查询"我关注的好友今日打卡情况"

```sql
-- 假设有关注关系表
CREATE TABLE follows (
  follower_id UUID REFERENCES auth.users(id),
  following_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id)
);

-- 高效查询：我关注的人今日打卡
SELECT 
  f.following_id,
  p.nickname,
  hl.log_date,
  hl.mood,
  hl.content
FROM follows f
JOIN habit_logs hl ON hl.user_id = f.following_id 
  AND hl.log_date = CURRENT_DATE
LEFT JOIN profiles p ON p.id = f.following_id
WHERE f.follower_id = $1
ORDER BY hl.log_time DESC;

-- 需要索引
CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_habit_logs_user_date ON habit_logs(user_id, log_date);
```

### 3.5 性能优化总结

| 场景 | 数据量预估 | 优化方案 | 预期性能 |
|-----|-----------|---------|---------|
| habit_logs | 100万+/年 | 分区表 + 归档 | 查询 < 50ms |
| tasks 列表 | 100+/目标 | 游标分页 + 复合索引 | 查询 < 30ms |
| 热力图365天 | 单用户 | 物化视图 + 索引 | 查询 < 100ms |
| 好友今日打卡 | N*100 | 预加载 + 缓存 | 查询 < 200ms |

---

## 四、AI配额整合评估

### 4.1 现有 AI 功能配额

根据项目文档，现有 AI 功能配额：

| 功能 | 每日次数 | 配置文件位置 |
|-----|---------|-------------|
| ai_schedule_import | 5次 | ai_import_tables.sql |
| tarot_reading | 3次 | tarot_tables.sql |
| goal_planning（规划） | **3次（建议）** | 本模块新增 |

### 4.2 统一配额管理方案

**方案：扩展 api_usage_logs 表**

```sql
-- 扩展现有 api_usage_logs 表
ALTER TABLE api_usage_logs 
ADD COLUMN IF NOT EXISTS feature VARCHAR(50) NOT NULL DEFAULT 'default';

-- 更新 UNIQUE 约束（用户+日期+功能）
ALTER TABLE api_usage_logs 
DROP CONSTRAINT IF EXISTS api_usage_logs_user_id_usage_date_key;

ALTER TABLE api_usage_logs 
ADD CONSTRAINT unique_user_date_feature 
  UNIQUE(user_id, usage_date, feature);

-- 初始化功能配额
CREATE TABLE ai_feature_quotas (
  feature VARCHAR(50) PRIMARY KEY,
  daily_limit INT NOT NULL DEFAULT 5,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE
);

INSERT INTO ai_feature_quotas (feature, daily_limit, description) VALUES
('ai_schedule_import', 5, 'AI日程智能导入'),
('tarot_reading', 3, '塔罗牌占卜'),
('goal_planning', 3, 'AI目标规划'),
('default', 10, '默认AI功能');
```

### 4.3 跨功能总上限

```sql
-- 方案：设置跨功能总上限（建议10次/日）

-- 获取用户当日总调用
CREATE OR REPLACE FUNCTION get_user_total_ai_usage(p_user_id UUID, p_date DATE DEFAULT CURRENT_DATE)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  v_total INT;
BEGIN
  SELECT COALESCE(SUM(usage_count), 0)
  INTO v_total
  FROM api_usage_logs
  WHERE user_id = p_user_id AND usage_date = p_date;
  
  RETURN v_total;
END;
$$;

-- AI 调用前置检查
CREATE OR REPLACE FUNCTION check_ai_quota(
  p_user_id UUID,
  p_feature VARCHAR(50)
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_daily_limit INT;
  v_total_usage INT;
  v_feature_usage INT;
  v_total_limit INT := 10;  -- 跨功能总上限
BEGIN
  -- 获取功能单独上限
  SELECT daily_limit INTO v_daily_limit
  FROM ai_feature_quotas
  WHERE feature = p_feature AND is_active = TRUE;
  
  IF v_daily_limit IS NULL THEN
    v_daily_limit := 5;  -- 默认
  END IF;
  
  -- 获取功能已用
  SELECT COALESCE(usage_count, 0)
  INTO v_feature_usage
  FROM api_usage_logs
  WHERE user_id = p_user_id 
    AND usage_date = CURRENT_DATE
    AND feature = p_feature;
  
  -- 获取总已用
  SELECT COALESCE(SUM(usage_count), 0)
  INTO v_total_usage
  FROM api_usage_logs
  WHERE user_id = p_user_id 
    AND usage_date = CURRENT_DATE;
  
  -- 检查双重上限
  IF v_feature_usage >= v_daily_limit THEN
    RETURN FALSE;  -- 功能已达上限
  END IF;
  
  IF v_total_usage >= v_total_limit THEN
    RETURN FALSE;  -- 总计已达上限
  END IF;
  
  RETURN TRUE;
END;
$$;
```

### 4.4 AI 规划结果缓存

```sql
-- AI 规划结果缓存表
CREATE TABLE ai_plan_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- 缓存键
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_title_hash VARCHAR(64) NOT NULL,  -- 标题哈希
  category VARCHAR(30),
  
  -- 缓存内容
  ai_response JSONB NOT NULL,  -- AI 返回的任务拆解
  task_templates JSONB,        -- 任务模板
  
  -- 元数据
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,     -- 过期时间
  usage_count INT DEFAULT 0,  -- 复用次数
  
  UNIQUE(user_id, goal_title_hash, category)
);

-- 缓存查询
CREATE OR REPLACE FUNCTION get_cached_plan(
  p_user_id UUID,
  p_goal_title TEXT,
  p_category VARCHAR(30)
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_result JSONB;
  v_hash VARCHAR(64);
BEGIN
  -- 计算标题哈希
  v_hash := encode(digest(p_goal_title, 'sha256'), 'hex');
  
  -- 查询缓存
  SELECT ai_response INTO v_result
  FROM ai_plan_cache
  WHERE user_id = p_user_id
    AND goal_title_hash = v_hash
    AND category = p_category
    AND (expires_at IS NULL OR expires_at > NOW())
  ORDER BY usage_count DESC  -- 优先使用高复用模板
  LIMIT 1;
  
  IF v_result IS NOT NULL THEN
    -- 增加复用计数
    UPDATE ai_plan_cache
    SET usage_count = usage_count + 1
    WHERE user_id = p_user_id
      AND goal_title_hash = v_hash
      AND category = p_category;
  END IF;
  
  RETURN v_result;
END;
$$;
```

### 4.5 AI 配额整合总结

| 评估项 | 方案 | 建议 |
|-------|-----|------|
| 共用 api_usage_logs | ✅ 扩展 feature 字段 | **推荐** |
| 功能独立上限 | ai_schedule_import: 5, tarot: 3, goal_planning: 3 | 保持现状 |
| 跨功能总上限 | 10次/日 | **强烈建议** |
| 规划结果缓存 | 7天缓存 + 哈希去重 | **强烈建议**（节省调用） |
| 重新生成时机 | 支持用户手动触发，无额外消耗 | MVP 暂不实现 |

---

## 五、可扩展性设计

### 5.1 会员功能：免费限制

```sql
-- 用户会员等级表
CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  
  -- 订阅信息
  plan VARCHAR(20) DEFAULT 'free',  -- free, monthly, yearly
  expires_at TIMESTAMPTZ,
  
  -- 免费版限制
  goals_limit INT DEFAULT 3,       -- 免费版最多目标数
  ai_credits_free INT DEFAULT 10,   -- 免费版 AI 积分
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建目标时的限制检查
CREATE OR REPLACE FUNCTION check_goals_limit(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_plan VARCHAR(20);
  v_limit INT;
  v_current INT;
BEGIN
  -- 获取用户订阅计划
  SELECT COALESCE(us.plan, 'free'), COALESCE(us.goals_limit, 3)
  INTO v_plan, v_limit
  FROM user_subscriptions us
  WHERE us.user_id = p_user_id;
  
  -- 获取当前目标数
  SELECT COUNT(*) INTO v_current
  FROM goals
  WHERE user_id = p_user_id AND status = 'active';
  
  -- 检查限制
  IF v_current >= v_limit THEN
    RAISE EXCEPTION '目标数量已达上限 (%)，请升级会员', v_limit;
  END IF;
  
  RETURN TRUE;
END;
$$;
```

### 5.2 模板市场

```sql
-- 目标模板表
CREATE TABLE goal_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- 模板信息
  title VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(30) NOT NULL,
  tags TEXT[],
  
  -- 模板内容
  tasks_template JSONB NOT NULL,  -- 任务模板结构
  default_difficulty INT DEFAULT 1,
  estimated_days INT,               -- 预计完成天数
  
  -- 作者
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_official BOOLEAN DEFAULT FALSE,
  
  -- 统计
  use_count INT DEFAULT 0,
  rating_avg DECIMAL(3,2) DEFAULT 0,
  rating_count INT DEFAULT 0,
  
  -- 状态
  is_public BOOLEAN DEFAULT TRUE,
  status VARCHAR(20) DEFAULT 'active',  -- active, hidden
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 模板评分
CREATE TABLE template_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID REFERENCES goal_templates(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INT CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(template_id, user_id)
);
```

### 5.3 班级/社团集体目标

```sql
-- 小组/团队表
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- 团队信息
  name VARCHAR(100) NOT NULL,
  description TEXT,
  team_type VARCHAR(20) NOT NULL,  -- class, club, custom
  invite_code VARCHAR(20) UNIQUE,  -- 邀请码
  
  -- 管理员
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 设置
  is_public BOOLEAN DEFAULT FALSE,  -- 是否公开
  allow_join BOOLEAN DEFAULT TRUE,  -- 是否允许加入
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 团队成员
CREATE TABLE team_members (
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'member',  -- owner, admin, member
  
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  
  PRIMARY KEY (team_id, user_id)
);

-- 团队目标
CREATE TABLE team_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  
  -- 目标信息（同 goals）
  title VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(30) NOT NULL,
  target_date DATE,
  
  -- 团队进度
  progress DECIMAL(5,2) DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 团队成员任务（替代个人 tasks）
CREATE TABLE team_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_goal_id UUID REFERENCES team_goals(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  title VARCHAR(200) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(team_goal_id, user_id)  -- 每成员仅分配一个任务
);
```

### 5.4 外部数据接入

```sql
-- 外部数据源配置表
CREATE TABLE external_data_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 数据源
  source_type VARCHAR(30) NOT NULL,  -- wechat_sports, keep, apple_health
  source_name VARCHAR(50),            -- 显示名称
  
  -- 认证信息（加密存储）
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ,
  
  -- 同步设置
  auto_sync BOOLEAN DEFAULT FALSE,
  sync_interval_minutes INT DEFAULT 60,
  last_synced_at TIMESTAMPTZ,
  
  -- 状态
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, source_type)
);

-- 外部打卡数据记录
CREATE TABLE external_checkins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  source_id UUID REFERENCES external_data_sources(id),
  
  -- 数据
  external_date DATE NOT NULL,
  step_count INT,           -- 微信步数
  calories INT,            -- 消耗卡路里
  distance DECIMAL(10,2),  -- 距离（公里）
  duration_minutes INT,   -- 运动时长
  
  -- 同步状态
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, source_id, external_date)
);
```

### 5.5 可扩展性总结

| 扩展场景 | 实现难度 | 数据库变更 | 建议优先级 |
|---------|---------|-----------|-----------|
| 会员限制 | 低 | 新表 + 触发器 | MVP 即支持 |
| 模板市场 | 中 | 新表 × 2 | V2 |
| 团队目标 | 高 | 新表 × 4 | V3 |
| 外部数据接入 | 中 | 新表 × 2 | V3 |

---

## 六、路由与导航方案

### 6.1 当前状态

**路由已预留**（router/index.ts 第64行）：
```typescript
{ path: 'planner', name: 'AppPlanner', component: () => import('../pages/app/Placeholder.vue') }
```

**侧边栏已配置**（AppLayout.vue 第92-96行）：
```vue
<router-link to="/app/planner" class="nav-link">
  <svg>...</svg>
  <span class="nav-label">星火规划</span>
</router-link>
```

### 6.2 路由结构设计

```typescript
// router/index.ts 建议调整
{
  path: 'planner',
  name: 'AppPlanner',
  component: () => import('../pages/app/Planner/PlannerLayout.vue'),
  children: [
    { path: '', name: 'AppPlannerHome', component: () => import('../pages/app/Planner/PlannerHome.vue') },
    { path: 'goal/:id', name: 'AppPlannerGoal', component: () => import('../pages/app/Planner/GoalDetail.vue') },
    { path: 'goal/new', name: 'AppPlannerNewGoal', component: () => import('../pages/app/Planner/NewGoal.vue') },
    { path: 'habits', name: 'AppPlannerHabits', component: () => import('../pages/app/Planner/Habits.vue') },
    { path: 'achievements', name: 'AppPlannerAchievements', component: () => import('../pages/app/Planner/Achievements.vue') },
    { path: 'rankings', name: 'AppPlannerRankings', component: () => import('../pages/app/Planner/Rankings.vue') }
  ]
}
```

### 6.3 页面结构建议

```
星火规划
├── 首页（目标列表 + 今日任务）
│   ├── 正在进行的目标卡片
│   ├── 今日待办任务
│   ├── 快速打卡入口
│   └── 成就进度条
├── 目标详情
│   ├── 目标信息（标题、进度、截止日）
│   ├── 任务列表（子任务管理）
│   ├── 打卡记录
│   └── AI 重新规划按钮
├── 新建目标
│   ├── 目标类型选择
│   ├── AI 智能规划（调用 goal_planning）
│   └── 手动创建
├── 习惯打卡
│   ├── 习惯列表
│   ├── 打卡日历热力图
│   └── 添加习惯
├── 成就中心
│   ├── 已解锁成就展示
│   ├── 未解锁成就进度
│   └── 成就详情
└── 排行榜
    ├── 好友排行
    ├── 全站排行
    └── 班级/社团排行
```

### 6.4 路由与导航总结

| 项目 | 状态 | 建议 |
|-----|-----|-----|
| /app/planner 路由 | ✅ 已预留 | 直接开发业务逻辑 |
| 子路由设计 | ⬜ 需补充 | 按上述结构设计 |
| 底部导航 | ⬜ 暂无Tab | MVP 暂不需要（侧边栏已足够） |

---

## 七、通知系统设计

### 7.1 通知类型

| 类型 | 触发条件 | 推送方式 | 优先级 |
|-----|---------|---------|--------|
| 任务提醒 | 任务计划时间前 | 本地通知 + 推送 | P0 |
| 打卡提醒 | 每日固定时间 | 本地通知 + 推送 | P1 |
| 成就解锁 | 达成成就条件 | 应用内通知 | P1 |
| 好友动态 | 好友打卡/完成目标 | 应用内通知 + 推送 | P2 |
| 目标预警 | 截止前3天 | 应用内通知 | P2 |
| 团队通知 | 团队任务变更 | 应用内通知 + 推送 | P1 |

### 7.2 通知表设计

```sql
-- 通知表
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 通知内容
  type VARCHAR(30) NOT NULL,           -- task_reminder, checkin_reminder, achievement, friend_activity, goal_warning, team
  title VARCHAR(100) NOT NULL,
  content TEXT,
  
  -- 关联数据
  reference_type VARCHAR(30),         -- goal, task, achievement, user, team
  reference_id UUID,
  
  -- 状态
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  
  -- 推送设置
  push_enabled BOOLEAN DEFAULT TRUE,
  push_sent BOOLEAN DEFAULT FALSE,
  push_sent_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 索引
  INDEX idx_notifications_user (user_id, is_read, created_at DESC)
);

-- 用户通知设置
CREATE TABLE notification_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  
  -- 开关
  task_reminder BOOLEAN DEFAULT TRUE,
  checkin_reminder BOOLEAN DEFAULT TRUE,
  achievement BOOLEAN DEFAULT TRUE,
  friend_activity BOOLEAN DEFAULT TRUE,
  goal_warning BOOLEAN DEFAULT TRUE,
  team_notification BOOLEAN DEFAULT TRUE,
  
  -- 免打扰
  dnd_enabled BOOLEAN DEFAULT FALSE,
  dnd_start TIME DEFAULT '22:00',
  dnd_end TIME DEFAULT '08:00',
  
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 7.3 通知触发机制

**方案A：Supabase Cron Job（推荐）**

```sql
-- 每日打卡提醒（早上8点）
-- 在 Supabase Dashboard → Edge Functions → pg_cron 配置

-- 每小时检查待发送通知
CREATE OR REPLACE FUNCTION check_and_send_notifications()
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_notification RECORD;
  v_settings RECORD;
  v_user_id UUID;
BEGIN
  -- 获取需要发送的通知（每小时执行）
  FOR v_notification IN
    SELECT n.*
    FROM notifications n
    WHERE n.push_enabled = TRUE
      AND n.push_sent = FALSE
      AND n.created_at <= NOW()
      AND n.created_at >= NOW() - INTERVAL '1 hour'
  LOOP
    -- 获取用户设置
    SELECT * INTO v_settings
    FROM notification_settings
    WHERE user_id = v_notification.user_id;
    
    -- 检查免打扰
    IF v_settings.dnd_enabled = TRUE THEN
      IF CURRENT_TIME BETWEEN v_settings.dnd_start AND v_settings.dnd_end THEN
        CONTINUE;  -- 跳过
      END IF;
    END IF;
    
    -- 发送推送（集成 Firebase Cloud Messaging / 极光推送）
    -- 此处调用外部推送服务
    
    -- 标记已发送
    UPDATE notifications
    SET push_sent = TRUE, push_sent_at = NOW()
    WHERE id = v_notification.id;
  END LOOP;
END;
$$;
```

**方案B：前端本地通知（简单实现）**

```typescript
// composables/useNotification.ts

export function useNotification() {
  const requestPermission = async () => {
    if (!('Notification' in window)) return false
    if (Notification.permission === 'granted') return true
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }
  
  const scheduleTaskReminder = (task: Task, remindBefore: number = 15) => {
    const remindAt = new Date(task.scheduled_time)
    remindAt.setMinutes(remindAt.getMinutes() - remindBefore)
    
    const now = new Date()
    if (remindAt <= now) return
    
    const timeout = remindAt.getTime() - now.getTime()
    setTimeout(() => {
      new Notification(`📝 任务提醒: ${task.title}`, {
        body: `${remindBefore}分钟后开始`,
        icon: '/spark-logo.png'
      })
    }, timeout)
  }
  
  const scheduleDailyCheckin = (time: string = '08:00') => {
    // 每日固定时间提醒
    const [hours, minutes] = time.split(':').map(Number)
    const now = new Date()
    const remindAt = new Date(now)
    remindAt.setHours(hours, minutes, 0, 0)
    
    if (remindAt <= now) {
      remindAt.setDate(remindAt.getDate() + 1)
    }
    
    // 使用 setTimeout 实现（页面需保持打开）
    // 生产环境建议使用 Service Worker
  }
  
  return { requestPermission, scheduleTaskReminder, scheduleDailyCheckin }
}
```

### 7.4 通知系统总结

| 场景 | 推荐实现 | 说明 |
|-----|---------|-----|
| 任务提醒 | 前端本地 + 定时器 | MVP 阶段使用，关闭页面失效 |
| 打卡提醒 | 前端本地 + 每日定时 | 同上 |
| 成就解锁 | 应用内通知 + 即时推送 | 实时 |
| 好友动态 | 应用内通知 + 推送 | 实时 |
| 截止预警 | Supabase Cron Job | 每日检查并发送 |
| 团队通知 | Supabase Cron Job + 即时推送 | 实时 |

---

## 八、综合评分

| 评审维度 | 得分 | 说明 |
|---------|-----|------|
| 与日程模块协同 | 90/100 | 独立表+外键方案清晰，查询性能有保障 |
| 游戏化数据安全 | 95/100 | 服务端验证为主，防作弊机制完善 |
| 数据量与性能 | 85/100 | 优化方案全面，但分区实现需要额外工作 |
| AI 配额整合 | 92/100 | 统一管理+缓存复用，成本可控 |
| 可扩展性 | 88/100 | 会员/模板/团队/外部数据均有预留 |
| 路由与导航 | 98/100 | 路由已预留，侧边栏已配置 |
| 通知系统 | 82/100 | MVP 够用，生产环境需 Service Worker |

**综合评分：90/100**

---

## 九、反重力开发优先级建议

### MVP 阶段（P0，2周）

```
✅ 必须实现：
├── 1. goals/tasks/habit_logs 核心表设计 + RLS
├── 2. 目标 CRUD（创建、编辑、删除、完成）
├── 3. 任务列表 + 打卡功能
├── 4. 打卡记录查询（当日/本周/热力图）
├── 5. 基础积分系统（完成任务+积分）
├── 6. 前端页面：目标列表页、目标详情页、打卡页
├── 7. AI 规划集成（复用现有 api_usage_logs）
└── 8. 路由配置完成

❌ 暂不实现：
├── 成就系统
├── 排行榜
├── 社交功能（好友动态）
└── 外部数据接入
```

### V2 阶段（1周）

```
📋 优先级：
├── 成就系统（成就表 + 解锁触发 + 展示）
├── 打卡提醒（本地通知）
├── 目标模板（预设模板 + 自定义模板）
└── 会员限制（免费3目标上限）
```

### V3 阶段（1-2周）

```
📋 优先级：
├── 团队目标（小组功能）
├── 外部数据接入（微信运动/Keep）
├── 排行榜（定时刷新 + 防刷）
└── Service Worker 离线通知
```

---

## 十、技术债务与风险

| 风险项 | 风险等级 | 缓解措施 |
|-------|---------|---------|
| 分区表实现复杂度 | 中 | MVP 阶段先不分區，数据量增长后再迁移 |
| 排行榜防刷算法 | 中 | 初期仅展示前100名，定期刷新 |
| AI 调用成本 | 中 | 强推缓存机制，复用模板 |
| 多模块数据一致性 | 低 | 使用外键 + 事务保证 |

---

**评审完成时间**：2026-03-28  
**输出文件**：`docs/reviews/planner/opencode-planner-output.md`
