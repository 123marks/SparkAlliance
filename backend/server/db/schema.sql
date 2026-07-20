-- Spark Alliance 自建后端数据库结构（契约 §3）
-- 幂等：可重复执行。gen_random_uuid() 为 PostgreSQL 13+ 内置，无需扩展。

CREATE TABLE IF NOT EXISTS users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  nickname      text NOT NULL DEFAULT '',
  avatar_url    text NOT NULL DEFAULT '',
  school        text NOT NULL DEFAULT '',
  region        text NOT NULL DEFAULT '',
  role          text NOT NULL DEFAULT 'user',     -- user | admin
  status        text NOT NULL DEFAULT 'active',   -- active | disabled
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS posts (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content        text NOT NULL,
  category       text NOT NULL DEFAULT '',
  tags           text[] NOT NULL DEFAULT '{}',
  media_urls     text[] NOT NULL DEFAULT '{}',
  is_anonymous   boolean NOT NULL DEFAULT false,
  anonymous_seed text NOT NULL DEFAULT '',
  likes_count    integer NOT NULL DEFAULT 0,
  comments_count integer NOT NULL DEFAULT 0,
  status         text NOT NULL DEFAULT 'visible', -- visible | hidden | deleted
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS post_comments (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id        uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content        text NOT NULL,
  media_urls     text[] NOT NULL DEFAULT '{}',
  is_anonymous   boolean NOT NULL DEFAULT false,
  anonymous_seed text NOT NULL DEFAULT '',
  reply_to_name  text NOT NULL DEFAULT '',
  like_count     integer NOT NULL DEFAULT 0,
  is_hidden      boolean NOT NULL DEFAULT false,
  report_count   integer NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS post_likes (
  post_id    uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS comment_likes (
  comment_id uuid NOT NULL REFERENCES post_comments(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (comment_id, user_id)
);

CREATE TABLE IF NOT EXISTS reports (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id     uuid REFERENCES posts(id) ON DELETE CASCADE,
  comment_id  uuid REFERENCES post_comments(id) ON DELETE CASCADE,
  reason      text NOT NULL,
  status      text NOT NULL DEFAULT 'pending',  -- pending | resolved | dismissed
  created_at  timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE TABLE IF NOT EXISTS schedule_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title           text NOT NULL,
  description     text NOT NULL DEFAULT '',
  location        text NOT NULL DEFAULT '',
  start_time      timestamptz NOT NULL,
  end_time        timestamptz,
  all_day         boolean NOT NULL DEFAULT false,
  event_type      text NOT NULL DEFAULT '',
  event_subtype   text NOT NULL DEFAULT '',
  color           text NOT NULL DEFAULT '',
  recurrence_type text NOT NULL DEFAULT 'none',
  recurrence_days integer[] NOT NULL DEFAULT '{}',
  recurrence_end  date,
  reminders       jsonb NOT NULL DEFAULT '[]',
  status          text NOT NULL DEFAULT 'active',
  priority        integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS goals (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title          text NOT NULL,
  description    text NOT NULL DEFAULT '',
  goal_type      text NOT NULL DEFAULT '',
  deadline       date,
  status         text NOT NULL DEFAULT 'active',
  total_progress numeric NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS goal_milestones (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id     uuid NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       text NOT NULL,
  description text NOT NULL DEFAULT '',
  target_date date,
  weight      numeric NOT NULL DEFAULT 1,
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS planner_tasks (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  goal_id           uuid REFERENCES goals(id) ON DELETE SET NULL,
  milestone_id      uuid REFERENCES goal_milestones(id) ON DELETE SET NULL,
  title             text NOT NULL,
  description       text NOT NULL DEFAULT '',
  estimated_minutes integer,
  difficulty        integer NOT NULL DEFAULT 2,
  due_date          date,
  is_completed      boolean NOT NULL DEFAULT false,
  completed_at      timestamptz,
  status            text NOT NULL DEFAULT 'pending',
  completion_note   text NOT NULL DEFAULT '',
  source            text NOT NULL DEFAULT 'manual',
  sort_order        integer NOT NULL DEFAULT 0,
  schedule_event_id uuid REFERENCES schedule_events(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS health_checkins (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  checkin_date     date NOT NULL,
  mood             text NOT NULL DEFAULT '',
  sleep_hours      numeric,
  water_cups       integer,
  exercise_minutes integer,
  meals            jsonb NOT NULL DEFAULT '{}',
  note             text NOT NULL DEFAULT '',
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, checkin_date)
);

CREATE TABLE IF NOT EXISTS habit_logs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  habit_id   text NOT NULL,
  log_date   date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 索引（契约 §3：所有 user_id、posts(created_at desc)、
-- schedule_events(user_id, start_time)、planner_tasks(user_id, status, due_date)）
CREATE INDEX IF NOT EXISTS idx_posts_user_id            ON posts (user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at         ON posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_comments_user_id    ON post_comments (user_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id    ON post_comments (post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id       ON post_likes (user_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id    ON comment_likes (user_id);
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id      ON reports (reporter_id);
CREATE INDEX IF NOT EXISTS idx_schedule_events_user_id  ON schedule_events (user_id);
CREATE INDEX IF NOT EXISTS idx_schedule_events_user_start ON schedule_events (user_id, start_time);
CREATE INDEX IF NOT EXISTS idx_goals_user_id            ON goals (user_id);
CREATE INDEX IF NOT EXISTS idx_goal_milestones_user_id  ON goal_milestones (user_id);
CREATE INDEX IF NOT EXISTS idx_goal_milestones_goal_id  ON goal_milestones (goal_id);
CREATE INDEX IF NOT EXISTS idx_planner_tasks_user_id    ON planner_tasks (user_id);
CREATE INDEX IF NOT EXISTS idx_planner_tasks_user_status_due ON planner_tasks (user_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_health_checkins_user_id  ON health_checkins (user_id);
CREATE INDEX IF NOT EXISTS idx_habit_logs_user_id       ON habit_logs (user_id);

-- 触发器：likes_count / comments_count / like_count 计数维护（契约 §3 统计口径）
CREATE OR REPLACE FUNCTION trg_post_likes_count() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET likes_count = greatest(likes_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS post_likes_count ON post_likes;
CREATE TRIGGER post_likes_count
AFTER INSERT OR DELETE ON post_likes
FOR EACH ROW EXECUTE FUNCTION trg_post_likes_count();

CREATE OR REPLACE FUNCTION trg_post_comments_count() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET comments_count = greatest(comments_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS post_comments_count ON post_comments;
CREATE TRIGGER post_comments_count
AFTER INSERT OR DELETE ON post_comments
FOR EACH ROW EXECUTE FUNCTION trg_post_comments_count();

CREATE OR REPLACE FUNCTION trg_comment_likes_count() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE post_comments SET like_count = like_count + 1 WHERE id = NEW.comment_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE post_comments SET like_count = greatest(like_count - 1, 0) WHERE id = OLD.comment_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS comment_likes_count ON comment_likes;
CREATE TRIGGER comment_likes_count
AFTER INSERT OR DELETE ON comment_likes
FOR EACH ROW EXECUTE FUNCTION trg_comment_likes_count();
