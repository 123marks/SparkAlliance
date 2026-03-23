# 智能日程模块 - 完整设计文档

## 📋 文档说明

**创建时间**: 2026-03-22
**版本**: v1.1
**状态**: 设计审查完成，可交付开发
**审查备注**: 修正数据库兼容性问题、精简组件架构、补充项目接入说明

**文档用途：**
- 作为智能日程模块开发的完整参考
- 包含功能设计、数据模型、UI设计、技术实现方案
- 指导前端和后端开发工作

---

## 一、模块定位与价值

### 1.1 核心定位

**智能日程**是星火校园项目的**个人时间管理中心**，帮助大学生高效管理学习、生活、社交等各类时间安排。

### 1.2 核心价值主张

| 价值点 | 说明 |
|--------|------|
| **不遗忘** | 智能提醒，重要事项不遗漏 |
| **不冲突** | 自动检测时间冲突，智能建议调整 |
| **有条理** | 可视化日历，一目了然 |
| **更智能** | AI辅助规划，根据习惯优化安排 |

### 1.3 差异化亮点

```
与传统日历App相比：

✅ 课表无缝整合
   - 一键导入教务系统课程表
   - 自动生成每周课程事件
   - 支持多学期管理

✅ 任务系统联动
   - 任务截止日期自动同步到日程
   - 任务进度可视化
   - 智能拆分大任务为日程块

✅ AI智能规划
   - 根据用户习惯推荐最佳时间
   - 自动检测并解决时间冲突
   - 生成个性化学习计划

✅ 校园场景适配
   - 支持周次显示（第1-18周）
   - 考试周特殊视图
   - 节假日自动标注
```

### 1.4 目标用户场景

```
场景1：课程管理
"每周一三五上午有课，二四下午实验，我想快速导入课表"

场景2：考试复习
"下周三要考操作系统，帮我规划复习时间"

场景3：任务追踪
"这周有三个作业要交，我不想错过截止日期"

场景4：生活安排
"我想记录社团活动时间，还要设置提醒"

场景5：时间分析
"我想看看这周时间都花在哪里了"
```

---

## 二、功能清单

### 2.1 核心功能（MVP）

| 功能 | 说明 | 优先级 | 复杂度 |
|------|------|--------|--------|
| 日历视图 | 月/周/日三种视图切换 | P0 | 中 |
| 事件创建 | 创建新日程事件 | P0 | 低 |
| 事件编辑 | 修改已有事件 | P0 | 低 |
| 事件删除 | 删除事件 | P0 | 低 |
| 事件详情 | 查看事件详细信息 | P0 | 低 |
| 基础提醒 | 提前N分钟提醒 | P0 | 中 |
| 事件类型 | 不同类型颜色区分 | P0 | 低 |

### 2.2 进阶功能（V2）

| 功能 | 说明 | 优先级 | 复杂度 |
|------|------|--------|--------|
| 课表导入 | 从教务系统导入 | P1 | 高 |
| 重复事件 | 每周/双周/每月重复 | P1 | 中 |
| 事件搜索 | 按关键词搜索事件 | P1 | 低 |
| 事件标签 | 自定义标签分类 | P1 | 低 |
| 拖拽调整 | 拖拽修改事件时间 | P1 | 中 |
| 迷你日历 | 侧边栏小日历导航 | P1 | 低 |

### 2.3 智能功能（V3）

| 功能 | 说明 | 优先级 | 复杂度 |
|------|------|--------|--------|
| AI时间建议 | 智能推荐最佳时间 | P2 | 高 |
| 冲突检测 | 自动检测时间冲突 | P2 | 中 |
| 智能规划 | AI生成学习计划 | P2 | 高 |
| 习惯学习 | 学习用户时间偏好 | P2 | 高 |

### 2.4 高级功能（V4）

| 功能 | 说明 | 优先级 | 复杂度 |
|------|------|--------|--------|
| 日程分享 | 分享日程给好友 | P3 | 中 |
| 时间分析 | 时间分配统计报告 | P3 | 中 |
| 日程订阅 | 订阅公共日程（如校历） | P3 | 中 |
| 多日历管理 | 创建多个日历分类 | P3 | 中 |

---

## 三、事件类型体系

### 3.1 预设事件类型

```
📚 课程类 (course)
   ├── 上课 (lecture)
   ├── 实验 (lab)
   ├── 答疑 (qa)
   └── 讲座 (seminar)

📝 考试类 (exam)
   ├── 期末考试 (final)
   ├── 期中考试 (midterm)
   ├── 测验 (quiz)
   └── 答辩 (defense)

🎯 任务类 (task)
   ├── 作业截止 (homework)
   ├── 项目提交 (project)
   ├── 报告截止 (report)
   └── 论文截止 (paper)

🏃 生活类 (life)
   ├── 运动 (exercise)
   ├── 聚餐 (dining)
   ├── 约会 (date)
   ├── 社团活动 (club)
   └── 兼职 (parttime)

⏰ 提醒类 (reminder)
   ├── 缴费 (payment)
   ├── 报名 (register)
   ├── 选课 (enroll)
   ├── 抢票 (ticket)
   └── 会议 (meeting)

🎉 节日类 (holiday)
   ├── 法定假日 (national)
   ├── 校历假日 (school)
   ├── 生日 (birthday)
   └── 纪念日 (anniversary)
```

### 3.2 颜色编码系统

```css
/* 主色调 */
--event-course: #4f8ef7      /* 蓝色 - 课程 */
--event-exam: #ef4444        /* 红色 - 考试 */
--event-task: #f97316        /* 橙色 - 任务 */
--event-life: #10b981        /* 绿色 - 生活 */
--event-reminder: #8b5cf6    /* 紫色 - 提醒 */
--event-holiday: #fbbf24     /* 金色 - 节日 */

/* 渐变效果 */
--event-course-gradient: linear-gradient(135deg, #4f8ef7, #60a5fa)
--event-exam-gradient: linear-gradient(135deg, #ef4444, #f87171)
--event-task-gradient: linear-gradient(135deg, #f97316, #fb923c)
--event-life-gradient: linear-gradient(135deg, #10b981, #34d399)
--event-reminder-gradient: linear-gradient(135deg, #8b5cf6, #a78bfa)
--event-holiday-gradient: linear-gradient(135deg, #fbbf24, #fcd34d)

/* 淡色背景（用于日历格子） */
--event-course-bg: rgba(79, 142, 247, 0.15)
--event-exam-bg: rgba(239, 68, 68, 0.15)
--event-task-bg: rgba(249, 115, 22, 0.15)
--event-life-bg: rgba(16, 185, 129, 0.15)
--event-reminder-bg: rgba(139, 92, 246, 0.15)
--event-holiday-bg: rgba(251, 191, 36, 0.15)
```

### 3.3 图标映射

```typescript
const eventIcons = {
  course: '📚',
  exam: '📝',
  task: '🎯',
  life: '🏃',
  reminder: '⏰',
  holiday: '🎉',
  
  // 子类型
  lecture: '📖',
  lab: '🔬',
  final: '🎓',
  homework: '✍️',
  exercise: '💪',
  birthday: '🎂',
}
```

---

## 四、页面结构与交互

### 4.1 整体布局

```
┌─────────────────────────────────────────────────────────────┐
│  顶部导航栏                                                  │
│  ┌─────────┐  ┌──────────────────┐  ┌─────────┐  ┌────────┐ │
│  │ ◀ 今天  │  │  2026年3月 ▼     │  │ 月 周 日│  │ + 新建 │ │
│  └─────────┘  └──────────────────┘  └─────────┘  └────────┘ │
├─────────────────────────────────────────────────────────────┤
│                                        │                    │
│  ┌─────────────────────────────────┐   │  ┌──────────────┐  │
│  │                                 │   │  │ 即将到来     │  │
│  │      主日历区域                 │   │  │ ────────────│  │
│  │      (月/周/日视图)             │   │  │ 14:00 微机   │  │
│  │                                 │   │  │ 18:00 算法   │  │
│  │                                 │   │  │ ────────────│  │
│  │                                 │   │  │ 明天         │  │
│  │                                 │   │  │ 09:00 操作   │  │
│  └─────────────────────────────────┘   │  └──────────────┘  │
│                                        │                    │
│  ┌─────────────────────────────────┐   │  ┌──────────────┐  │
│  │  迷你月历 (可选显示)            │   │  │ 类型筛选     │  │
│  └─────────────────────────────────┘   │  │ ☑ 课程       │  │
│                                        │  │ ☑ 考试       │  │
│                                        │  │ ☑ 任务       │  │
│                                        │  │ ☐ 生活       │  │
│                                        │  └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 月视图设计

```
      2026年3月
日  一  二  三  四  五  六
────────────────────────────
    1   2   3   4   5   6
    │   │   │   │   │
    📚  📚      📚  📚
        📝
        
 7   8   9  10  11  12  13
 │   │   │   │   │   │   │
 📚  📚  🎯  📚  📚      📚
     📝          🏃
     
14  15  16  17  18  19  20
 │   │   │   │   │   │   │
 📚  📚      📚  📚  📝  📚
     📝              🎉
     
21  22  23  24  25  26  27
 │   │   │   │   │   │   │
 📚  📚  🎯  📚  📚      📚
     📝
     
28  29  30  31
 │   │   │   │
 📚  📚      📚
     📝

图例：
📚 = 课程  📝 = 考试  🎯 = 任务  🏃 = 生活  🎉 = 节日
```

### 4.3 周视图设计

```
        2026年3月 第12周
        
        一(18)    二(19)    三(20)    四(21)    五(22)    六(23)    日(24)
        ─────    ─────    ─────    ─────    ─────    ─────    ─────
08:00   ┌────┐            ┌────┐            ┌────┐
        │微机│            │操作│            │算法│
        └────┘            └────┘            └────┘
        
10:00   ┌────┐   ┌────┐   ┌────┐   ┌────┐   ┌────┐
        │软工│   │数据│   │软工│   │数据│   │软工│
        └────┘   └────┘   └────┘   └────┘   └────┘
        
12:00   ═══════════════════════════════════════════════════
        午休
        
14:00            ┌────┐            ┌────┐
                 │实验│            │实验│
                 └────┘            └────┘
                 
16:00   ┌────┐                     ┌────┐            ┌────┐
        │社团│                     │运动│            │聚餐│
        └────┘                     └────┘            └────┘
        
18:00   ═══════════════════════════════════════════════════
        晚餐
        
20:00   ┌────────────────────────────────────────────┐
        │              自习时间                      │
        └────────────────────────────────────────────┘
        
22:00   ┌────┐
        │作业│ (截止提醒)
        └────┘
```

### 4.4 日视图设计

```
        2026年3月18日 星期三
        
00:00 ─┤
      │
02:00 ─┤
      │
04:00 ─┤
      │
06:00 ─┤
      │
08:00 ─┤
      │  ┌─────────────────────────────┐
      │  │ 📚 操作系统                 │
      │  │ 教四-302  08:00-09:35      │
      │  └─────────────────────────────┘
10:00 ─┤
      │  ┌─────────────────────────────┐
      │  │ 📚 软件工程                 │
      │  │ 教三-201  10:00-11:35      │
      │  └─────────────────────────────┘
12:00 ─┤
      │  ═════════════════════════════
      │  午休
14:00 ─┤
      │
16:00 ─┤
      │  ┌─────────────────────────────┐
      │  │ 🏃 篮球训练                 │
      │  │ 体育馆  16:00-18:00        │
      │  └─────────────────────────────┘
18:00 ─┤
      │  ═════════════════════════════
      │  晚餐
20:00 ─┤
      │  ┌─────────────────────────────┐
      │  │ 📖 自习                     │
      │  │ 图书馆3B  20:00-22:00      │
      │  └─────────────────────────────┘
22:00 ─┤
      │
      │  ┌─────────────────────────────┐
      │  │ ⏰ 作业截止提醒             │
      │  │ 数据结构实验报告            │
      │  └─────────────────────────────┘
      │
当前时间 ──▶ 21:30 (红色虚线标识)
```

### 4.5 事件详情弹窗

```
┌─────────────────────────────────────┐
│  📚 操作系统                        │
│  ─────────────────────────────────  │
│                                     │
│  📅 2026年3月18日 星期三            │
│  🕐 08:00 - 09:35                   │
│  📍 教四-302                        │
│  👨 张教授                          │
│                                     │
│  📝 备注                            │
│  ─────────────────────────────────  │
│  带教材，要签到                     │
│                                     │
│  ⏰ 提醒                            │
│  ─────────────────────────────────  │
│  • 课前30分钟提醒                   │
│                                     │
│  ─────────────────────────────────  │
│  🗑️ 删除    ✏️ 编辑    ✓ 完成       │
└─────────────────────────────────────┘
```

### 4.6 新建事件弹窗

```
┌─────────────────────────────────────┐
│  + 新建事件                         │
│  ─────────────────────────────────  │
│                                     │
│  标题                               │
│  ┌─────────────────────────────┐   │
│  │ 输入事件标题...              │   │
│  └─────────────────────────────┘   │
│                                     │
│  类型                               │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐   │
│  │📚课程│ │📝考试│ │🎯任务│ │🏃生活│   │
│  └─────┘ └─────┘ └─────┘ └─────┘   │
│                                     │
│  时间                               │
│  ┌─────────────┐ ┌─────────────┐   │
│  │ 2026-03-18  │ │ 08:00      │   │
│  └─────────────┘ └─────────────┘   │
│  至                                 │
│  ┌─────────────┐ ┌─────────────┐   │
│  │ 2026-03-18  │ │ 10:00      │   │
│  └─────────────┘ └─────────────┘   │
│  ☐ 全天事件                        │
│                                     │
│  地点                               │
│  ┌─────────────────────────────┐   │
│  │ 输入地点...                  │   │
│  └─────────────────────────────┘   │
│                                     │
│  重复                               │
│  ┌─────────────────────────────┐   │
│  │ 不重复              ▼       │   │
│  └─────────────────────────────┘   │
│  选项：不重复/每天/每周/双周/每月   │
│                                     │
│  提醒                               │
│  ┌─────────────────────────────┐   │
│  │ + 添加提醒                   │   │
│  └─────────────────────────────┘   │
│  选项：提前5分钟/15分钟/30分钟/1小时 │
│        /1天/自定义                 │
│                                     │
│  备注                               │
│  ┌─────────────────────────────┐   │
│  │ 添加备注...                  │   │
│  └─────────────────────────────┘   │
│                                     │
│  ─────────────────────────────────  │
│         取消           保存         │
└─────────────────────────────────────┘
```

---

## 五、数据模型设计

### 5.1 日程事件表 (schedule_events)

> ⚠️ **注意**：本项目统一使用 `uuid_generate_v4()`（与 posts、comments 表保持一致），用户外键引用 `auth.users(id)`（Supabase Auth）。

```sql
CREATE TABLE schedule_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 基本信息
  title VARCHAR(200) NOT NULL,           -- 事件标题
  description TEXT,                       -- 事件描述/备注
  location VARCHAR(200),                  -- 地点
  
  -- 时间信息
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,  -- 开始时间
  end_time TIMESTAMP WITH TIME ZONE,              -- 结束时间
  all_day BOOLEAN DEFAULT FALSE,                  -- 是否全天事件
  timezone VARCHAR(50) DEFAULT 'Asia/Shanghai',   -- 时区
  
  -- 事件类型
  event_type VARCHAR(20) NOT NULL,        -- course, exam, task, life, reminder, holiday
  event_subtype VARCHAR(20),              -- 子类型（如 lecture, lab, final 等）
  color VARCHAR(20),                      -- 自定义颜色（覆盖默认）
  icon VARCHAR(10),                       -- 自定义图标
  
  -- 重复设置
  recurrence_type VARCHAR(20) DEFAULT 'none',  -- none, daily, weekly, biweekly, monthly, yearly, custom
  recurrence_interval INT DEFAULT 1,           -- 间隔（每N天/周/月）
  recurrence_days INT[],                      -- 重复的星期几 [1,3,5] 表示周一三五
  recurrence_end DATE,                        -- 重复结束日期
  recurrence_count INT,                       -- 重复次数（与end二选一）
  parent_event_id UUID REFERENCES schedule_events(id),  -- 父事件ID（重复事件实例）
  
  -- 提醒设置
  reminders JSONB DEFAULT '[]',           -- [{type: 'minute', value: 30}, {type: 'hour', value: 1}]
  
  -- 关联信息
  related_course_id UUID,                 -- 关联课程ID
  related_task_id UUID,                   -- 关联任务ID
  related_user_id UUID,                   -- 关联用户ID（如约会对象）
  
  -- 状态
  status VARCHAR(20) DEFAULT 'active',    -- active, completed, cancelled
  is_completed BOOLEAN DEFAULT FALSE,     -- 是否完成
  completed_at TIMESTAMP,                 -- 完成时间
  
  -- 优先级
  priority INT DEFAULT 0,                 -- 优先级（-1低, 0普通, 1高, 2紧急）
  
  -- 可见性
  visibility VARCHAR(20) DEFAULT 'private',  -- private, friends, public
  
  -- 统计
  reminder_sent BOOLEAN DEFAULT FALSE,    -- 是否已发送提醒
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_schedule_events_user ON schedule_events(user_id);
CREATE INDEX idx_schedule_events_start ON schedule_events(start_time);
CREATE INDEX idx_schedule_events_end ON schedule_events(end_time);
CREATE INDEX idx_schedule_events_type ON schedule_events(event_type);
CREATE INDEX idx_schedule_events_status ON schedule_events(status);
CREATE INDEX idx_schedule_events_parent ON schedule_events(parent_event_id);
CREATE INDEX idx_schedule_events_course ON schedule_events(related_course_id);
CREATE INDEX idx_schedule_events_task ON schedule_events(related_task_id);

-- 复合索引（常用查询）
CREATE INDEX idx_schedule_events_user_time ON schedule_events(user_id, start_time, end_time);
```

### 5.2 课表缓存表 (course_schedules)

```sql
CREATE TABLE course_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 课程信息
  course_name VARCHAR(200) NOT NULL,      -- 课程名称
  course_code VARCHAR(50),                -- 课程代码
  teacher VARCHAR(100),                   -- 授课教师
  location VARCHAR(200),                  -- 上课地点
  credit DECIMAL(3,1),                    -- 学分
  
  -- 时间信息
  week_day INT CHECK (week_day BETWEEN 1 AND 7),  -- 星期几 (1=周一, 7=周日)
  start_week INT DEFAULT 1,                       -- 开始周次
  end_week INT DEFAULT 18,                        -- 结束周次
  start_time TIME NOT NULL,                       -- 开始时间
  end_time TIME NOT NULL,                         -- 结束时间
  
  -- 学期
  semester VARCHAR(20) NOT NULL,          -- 学期（如：2026-Spring）
  academic_year VARCHAR(20),              -- 学年（如：2025-2026）
  
  -- 课程类型
  course_type VARCHAR(20),                -- 必修, 选修, 通识, 实践
  week_count INT DEFAULT 18,              -- 总周数
  
  -- 同步信息
  source VARCHAR(20) DEFAULT 'manual',    -- manual, jwxt, chaoxing, wechat
  source_id VARCHAR(100),                 -- 来源系统ID
  last_synced TIMESTAMP,                  -- 最后同步时间
  sync_status VARCHAR(20) DEFAULT 'synced', -- synced, pending, failed
  
  -- 关联事件
  event_ids UUID[],                       -- 生成的日程事件ID列表
  
  -- 备注
  note TEXT,                              -- 备注
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, course_code, week_day, start_time, semester)
);

-- 索引
CREATE INDEX idx_course_schedules_user ON course_schedules(user_id);
CREATE INDEX idx_course_schedules_semester ON course_schedules(semester);
CREATE INDEX idx_course_schedules_weekday ON course_schedules(week_day);
CREATE INDEX idx_course_schedules_source ON course_schedules(source);
```

### 5.3 提醒记录表 (event_reminders)

```sql
CREATE TABLE event_reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES schedule_events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  remind_at TIMESTAMP WITH TIME ZONE NOT NULL,  -- 提醒时间
  remind_type VARCHAR(20) DEFAULT 'notification', -- notification, email, sms, wechat
  remind_offset INT,                             -- 提前多少分钟
  
  title VARCHAR(200),                     -- 提醒标题
  content TEXT,                           -- 提醒内容
  
  is_sent BOOLEAN DEFAULT FALSE,          -- 是否已发送
  sent_at TIMESTAMP,                      -- 发送时间
  
  is_read BOOLEAN DEFAULT FALSE,          -- 是否已读
  read_at TIMESTAMP,                      -- 阅读时间
  
  -- 重试
  retry_count INT DEFAULT 0,              -- 重试次数
  last_error TEXT,                        -- 最后错误信息
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_event_reminders_event ON event_reminders(event_id);
CREATE INDEX idx_event_reminders_user ON event_reminders(user_id);
CREATE INDEX idx_event_reminders_time ON event_reminders(remind_at);
CREATE INDEX idx_event_reminders_pending ON event_reminders(remind_at, is_sent) WHERE is_sent = FALSE;
```

### 5.4 日历订阅表 (calendar_subscriptions)

```sql
CREATE TABLE calendar_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 订阅信息
  calendar_name VARCHAR(100) NOT NULL,    -- 日历名称
  calendar_type VARCHAR(20),              -- school, club, public
  calendar_url TEXT,                      -- iCal/ICS 订阅链接
  
  -- 同步设置
  auto_sync BOOLEAN DEFAULT TRUE,         -- 自动同步
  sync_interval INT DEFAULT 1440,         -- 同步间隔（分钟）
  last_synced TIMESTAMP,                  -- 最后同步时间
  
  -- 显示设置
  color VARCHAR(20),                      -- 显示颜色
  is_visible BOOLEAN DEFAULT TRUE,        -- 是否显示
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 5.5 用户时间偏好表 (user_time_preferences)

```sql
CREATE TABLE user_time_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  
  -- 时间偏好
  morning_start TIME DEFAULT '06:00',     -- 早晨开始时间
  morning_end TIME DEFAULT '12:00',       -- 早晨结束时间
  afternoon_start TIME DEFAULT '12:00',   -- 下午开始时间
  afternoon_end TIME DEFAULT '18:00',     -- 下午结束时间
  evening_start TIME DEFAULT '18:00',     -- 晚上开始时间
  evening_end TIME DEFAULT '23:00',       -- 晚上结束时间
  
  -- 学习偏好
  preferred_study_time VARCHAR(20) DEFAULT 'morning',  -- morning, afternoon, evening
  preferred_study_duration INT DEFAULT 90,  -- 偏好学习时长（分钟）
  break_duration INT DEFAULT 10,            -- 休息时长（分钟）
  
  -- 提醒偏好
  default_reminder JSONB DEFAULT '[{"type":"minute","value":30}]',  -- 默认提醒
  quiet_hours_start TIME DEFAULT '22:00',  -- 免打扰开始
  quiet_hours_end TIME DEFAULT '08:00',    -- 免打扰结束
  
  -- 周偏好
  preferred_days INT[] DEFAULT '{1,2,3,4,5}',  -- 偏好的学习日（周一到周五）
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 六、组件设计

### 6.1 组件结构

> ⚠️ **架构精简说明（v1.1审查意见）**：原方案16个子组件拆分粒度过细，MVP 阶段建议合并为以下精简结构，减少文件间通信复杂度。V2 再按需拆分。

**MVP 精简结构（推荐优先实现）：**
```
frontend/src/pages/app/Schedule.vue          # 主页面（含视图切换、导航逻辑）

frontend/src/components/schedule/
├── CalendarMonth.vue      # 月视图（含EventCard内联）
├── CalendarWeek.vue       # 周视图（含TimeGrid内联）
├── CalendarDay.vue        # 日视图（含CurrentTimeLine内联）
├── EventModal.vue         # 创建/编辑/详情三合一弹窗（用mode prop区分）
└── UpcomingSidebar.vue    # 右侧边栏（即将到来 + 类型筛选）

frontend/src/composables/
├── useSchedule.ts         # 数据管理（CRUD + Supabase对接）
├── useCalendar.ts         # 日历计算（月格/周/日期范围）
└── useReminder.ts         # Web Notification 提醒

frontend/src/stores/
└── scheduleStore.ts       # Pinia状态（events, selectedDate, view）
```

**V2 扩展结构（待MVP稳定后拆分）：**
```
frontend/src/components/schedule/pickers/
├── RecurrencePicker.vue   # 重复设置
├── ReminderPicker.vue     # 提醒设置
└── ColorPicker.vue        # 颜色选择

frontend/src/composables/
├── useRecurrence.ts       # 重复事件展开
├── useDragDrop.ts         # 拖拽调整
└── useTimePreferences.ts  # 用户时间偏好
```

### 6.2 核心组件接口

```typescript
// EventCard.vue
interface EventCardProps {
  event: ScheduleEvent
  view: 'month' | 'week' | 'day'
  compact?: boolean  // 紧凑模式
}

// CalendarMonth.vue
interface CalendarMonthProps {
  year: number
  month: number
  events: ScheduleEvent[]
  selectedDate?: Date
}

// CalendarWeek.vue
interface CalendarWeekProps {
  startDate: Date  // 周开始日期
  events: ScheduleEvent[]
  showWeekends?: boolean
}

// CalendarDay.vue
interface CalendarDayProps {
  date: Date
  events: ScheduleEvent[]
  showAllDay?: boolean
  hourHeight?: number  // 每小时高度(px)
}

// CreateEventModal.vue
interface CreateEventModalProps {
  defaultDate?: Date
  defaultStartTime?: Date
  defaultEndTime?: Date
  defaultType?: EventType
}

// RecurrencePicker.vue
interface RecurrencePickerProps {
  modelValue: RecurrenceRule
  startDate: Date
}
interface RecurrenceRule {
  type: 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom'
  interval?: number
  days?: number[]  // 星期几
  endDate?: Date
  count?: number
}
```

---

## 七、核心算法

### 7.1 日历计算

```typescript
/**
 * 获取某月的日历网格（6周 x 7天）
 */
function getMonthGrid(year: number, month: number): Date[][] {
  const firstDay = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month, 0)
  
  // 计算第一周开始日期（可能包含上月日期）
  const startDate = new Date(firstDay)
  startDate.setDate(startDate.getDate() - startDate.getDay())
  
  const grid: Date[][] = []
  let current = new Date(startDate)
  
  for (let week = 0; week < 6; week++) {
    const weekDays: Date[] = []
    for (let day = 0; day < 7; day++) {
      weekDays.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }
    grid.push(weekDays)
  }
  
  return grid
}

/**
 * 获取某周的所有日期
 */
function getWeekDays(date: Date): Date[] {
  const days: Date[] = []
  const startOfWeek = new Date(date)
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
  
  for (let i = 0; i < 7; i++) {
    const day = new Date(startOfWeek)
    day.setDate(day.getDate() + i)
    days.push(day)
  }
  
  return days
}

/**
 * 判断事件是否在指定日期
 */
function isEventOnDate(event: ScheduleEvent, date: Date): boolean {
  const eventStart = new Date(event.start_time)
  const eventEnd = new Date(event.end_time)
  const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const nextDate = new Date(targetDate)
  nextDate.setDate(nextDate.getDate() + 1)
  
  return eventStart < nextDate && eventEnd >= targetDate
}

/**
 * 获取某日期范围内的事件
 */
function getEventsInRange(
  events: ScheduleEvent[],
  startDate: Date,
  endDate: Date
): ScheduleEvent[] {
  return events.filter(event => {
    const eventStart = new Date(event.start_time)
    const eventEnd = new Date(event.end_time)
    return eventStart < endDate && eventEnd >= startDate
  })
}
```

### 7.2 重复事件处理

```typescript
/**
 * 展开重复事件为具体实例
 */
function expandRecurrence(
  event: ScheduleEvent,
  rangeStart: Date,
  rangeEnd: Date
): ScheduleEvent[] {
  if (event.recurrence_type === 'none') {
    return [event]
  }
  
  const instances: ScheduleEvent[] = []
  const duration = new Date(event.end_time).getTime() - new Date(event.start_time).getTime()
  
  let current = new Date(event.start_time)
  let count = 0
  
  while (current < rangeEnd) {
    // 检查是否在范围内
    if (current >= rangeStart) {
      // 检查星期几是否符合
      if (shouldIncludeDate(current, event)) {
        instances.push({
          ...event,
          id: generateInstanceId(event.id, current),
          start_time: new Date(current),
          end_time: new Date(current.getTime() + duration),
          parent_event_id: event.id
        })
      }
    }
    
    // 移动到下一个重复日期
    current = getNextRecurrenceDate(current, event)
    count++
    
    // 检查是否达到重复次数限制
    if (event.recurrence_count && count >= event.recurrence_count) break
    if (event.recurrence_end && current > new Date(event.recurrence_end)) break
  }
  
  return instances
}

/**
 * 判断日期是否应该包含在重复序列中
 */
function shouldIncludeDate(date: Date, event: ScheduleEvent): boolean {
  if (!event.recurrence_days || event.recurrence_days.length === 0) {
    return true
  }
  const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay()  // 转换为周一=1
  return event.recurrence_days.includes(dayOfWeek)
}

/**
 * 获取下一个重复日期
 */
function getNextRecurrenceDate(current: Date, event: ScheduleEvent): Date {
  const next = new Date(current)
  const interval = event.recurrence_interval || 1
  
  switch (event.recurrence_type) {
    case 'daily':
      next.setDate(next.getDate() + interval)
      break
    case 'weekly':
      next.setDate(next.getDate() + 7 * interval)
      break
    case 'biweekly':
      next.setDate(next.getDate() + 14)
      break
    case 'monthly':
      next.setMonth(next.getMonth() + interval)
      break
    case 'yearly':
      next.setFullYear(next.getFullYear() + interval)
      break
  }
  
  return next
}
```

### 7.3 冲突检测

```typescript
/**
 * 检测时间冲突
 */
interface Conflict {
  event1: ScheduleEvent
  event2: ScheduleEvent
  type: 'overlap' | 'adjacent'  // 重叠或相邻
  severity: 'warning' | 'error'  // 警告或错误
}

function detectConflicts(
  newEvent: ScheduleEvent,
  existingEvents: ScheduleEvent[]
): Conflict[] {
  const conflicts: Conflict[] = []
  
  for (const existing of existingEvents) {
    // 跳过已完成或取消的事件
    if (existing.status !== 'active') continue
    
    // 检查时间重叠
    const newStart = new Date(newEvent.start_time).getTime()
    const newEnd = new Date(newEvent.end_time).getTime()
    const existStart = new Date(existing.start_time).getTime()
    const existEnd = new Date(existing.end_time).getTime()
    
    if (newStart < existEnd && newEnd > existStart) {
      conflicts.push({
        event1: newEvent,
        event2: existing,
        type: 'overlap',
        severity: 'error'
      })
    }
    
    // 检查相邻（可选，作为警告）
    const gap = 15 * 60 * 1000  // 15分钟
    if ((newEnd >= existStart - gap && newEnd < existStart) ||
        (newStart > existEnd && newStart <= existEnd + gap)) {
      conflicts.push({
        event1: newEvent,
        event2: existing,
        type: 'adjacent',
        severity: 'warning'
      })
    }
  }
  
  return conflicts
}

/**
 * 智能解决冲突
 */
function resolveConflict(
  newEvent: ScheduleEvent,
  conflict: Conflict,
  strategy: 'move' | 'shorten' | 'ignore'
): ScheduleEvent {
  if (strategy === 'ignore') return newEvent
  
  const resolved = { ...newEvent }
  
  if (strategy === 'move') {
    // 移动到冲突事件之后
    const newStart = new Date(conflict.event2.end_time)
    const duration = new Date(newEvent.end_time).getTime() - new Date(newEvent.start_time).getTime()
    resolved.start_time = newStart
    resolved.end_time = new Date(newStart.getTime() + duration)
  }
  
  if (strategy === 'shorten') {
    // 缩短时长以避免冲突
    resolved.end_time = conflict.event2.start_time
  }
  
  return resolved
}
```

### 7.4 AI智能建议

```typescript
/**
 * 智能时间建议
 */
interface TimeSuggestion {
  startTime: Date
  endTime: Date
  score: number  // 推荐分数 0-100
  reasons: string[]  // 推荐理由
}

async function suggestBestTime(
  eventTitle: string,
  eventType: EventType,
  duration: number,  // 分钟
  dateRange: { start: Date, end: Date },
  preferences: UserTimePreferences,
  existingEvents: ScheduleEvent[]
): Promise<TimeSuggestion[]> {
  const suggestions: TimeSuggestion[] = []
  
  // 1. 获取用户偏好时间段
  const preferredSlots = getPreferredTimeSlots(preferences, eventType)
  
  // 2. 遍历日期范围
  let currentDate = new Date(dateRange.start)
  while (currentDate <= dateRange.end) {
    // 3. 检查是否是偏好学习日
    const dayOfWeek = currentDate.getDay() === 0 ? 7 : currentDate.getDay()
    if (preferences.preferred_days.includes(dayOfWeek)) {
      
      // 4. 在每个偏好时间段内寻找空闲时间
      for (const slot of preferredSlots) {
        const freeSlots = findFreeSlots(
          currentDate,
          slot.start,
          slot.end,
          duration,
          existingEvents
        )
        
        for (const free of freeSlots) {
          // 5. 计算推荐分数
          const score = calculateScore(free, preferences, eventType)
          
          suggestions.push({
            startTime: free.start,
            endTime: free.end,
            score,
            reasons: generateReasons(free, preferences, eventType)
          })
        }
      }
    }
    
    currentDate.setDate(currentDate.getDate() + 1)
  }
  
  // 6. 按分数排序，返回前3个
  return suggestions
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
}

/**
 * 计算推荐分数
 */
function calculateScore(
  slot: { start: Date, end: Date },
  preferences: UserTimePreferences,
  eventType: EventType
): number {
  let score = 50  // 基础分
  
  const hour = slot.start.getHours()
  
  // 根据偏好时间段加分
  if (preferences.preferred_study_time === 'morning' && hour >= 6 && hour < 12) {
    score += 20
  } else if (preferences.preferred_study_time === 'afternoon' && hour >= 12 && hour < 18) {
    score += 20
  } else if (preferences.preferred_study_time === 'evening' && hour >= 18 && hour < 23) {
    score += 20
  }
  
  // 根据事件类型调整
  if (eventType === 'exam') {
    // 考试复习建议安排在精力充沛的时段
    if (hour >= 9 && hour < 12) score += 10
    if (hour >= 14 && hour < 17) score += 5
  }
  
  if (eventType === 'life') {
    // 生活事件建议安排在非学习黄金时段
    if (hour >= 18) score += 10
  }
  
  return Math.min(100, score)
}
```

---

## 八、课表导入方案

### 8.1 支持的导入源

| 来源 | 方式 | 难度 | 说明 |
|------|------|------|------|
| 手动添加 | 表单输入 | 低 | 用户手动输入课程信息 |
| 教务系统 | 模拟登录 | 高 | 需要适配各学校教务系统 |
| 超星/学习通 | API/爬虫 | 中 | 获取课程和签到信息 |
| iCal/ICS | 文件导入 | 低 | 标准日历格式导入 |
| 图片识别 | OCR | 中 | 拍照识别课表 |

### 8.2 教务系统导入流程

```
用户操作流程：

1. 选择学校
   └─> 显示学校列表或搜索

2. 输入账号密码
   └─> 教务系统学号和密码

3. 验证登录
   └─> 模拟登录教务系统
   └─> 获取验证码（如有）

4. 获取课表
   └─> 爬取课表页面
   └─> 解析课程信息

5. 预览确认
   └─> 显示解析结果
   └─> 用户确认/修改

6. 导入完成
   └─> 保存到数据库
   └─> 生成日程事件
```

### 8.3 课表解析示例

```typescript
/**
 * 解析教务系统课表
 */
interface ParsedCourse {
  name: string
  code?: string
  teacher: string
  location: string
  weekDay: number  // 1-7
  startWeek: number
  endWeek: number
  startTime: string  // HH:mm
  endTime: string
  semester: string
}

function parseJWXTSchedule(html: string): ParsedCourse[] {
  const courses: ParsedCourse[] = []
  
  // 根据不同教务系统格式解析
  // 这里以正方教务系统为例
  
  const $ = cheerio.load(html)
  const rows = $('#kbtable tr')
  
  rows.each((rowIndex, row) => {
    if (rowIndex === 0) return  // 跳过表头
    
    $(row).find('td').each((colIndex, cell) => {
      if (colIndex === 0) return  // 跳过时间列
      
      const content = $(cell).text()
      if (!content.trim()) return
      
      // 解析课程信息
      // 格式示例：操作系统\n张三\n教四-302\n(1-16周)
      const lines = content.split('\n').filter(l => l.trim())
      
      if (lines.length >= 3) {
        const weekMatch = lines[lines.length - 1].match(/\((\d+)-(\d+)周\)/)
        
        courses.push({
          name: lines[0].trim(),
          teacher: lines[1].trim(),
          location: lines[2].trim(),
          weekDay: colIndex,
          startWeek: weekMatch ? parseInt(weekMatch[1]) : 1,
          endWeek: weekMatch ? parseInt(weekMatch[2]) : 18,
          startTime: getTimeByRowIndex(rowIndex),
          endTime: getEndTimeByRowIndex(rowIndex),
          semester: getCurrentSemester()
        })
      }
    })
  })
  
  return courses
}

/**
 * 从课表生成日程事件
 */
function generateEventsFromCourse(
  course: ParsedCourse,
  semesterInfo: SemesterInfo
): ScheduleEvent[] {
  const events: ScheduleEvent[] = []
  
  // 计算学期开始日期
  const semesterStart = new Date(semesterInfo.startDate)
  
  // 为每周生成事件
  for (let week = course.startWeek; week <= course.endWeek; week++) {
    // 计算该周该天的日期
    const eventDate = new Date(semesterStart)
    eventDate.setDate(eventDate.getDate() + (week - 1) * 7 + (course.weekDay - 1))
    
    const [startHour, startMin] = course.startTime.split(':').map(Number)
    const [endHour, endMin] = course.endTime.split(':').map(Number)
    
    events.push({
      title: course.name,
      event_type: 'course',
      event_subtype: 'lecture',
      location: course.location,
      start_time: new Date(eventDate.setHours(startHour, startMin)),
      end_time: new Date(eventDate.setHours(endHour, endMin)),
      recurrence_type: 'none',  // 已经展开为具体事件
      reminders: [{ type: 'minute', value: 30 }],
      status: 'active'
    })
  }
  
  return events
}
```

---

## 九、提醒通知系统

### 9.1 提醒类型

```typescript
type ReminderType = 'notification' | 'email' | 'sms' | 'wechat'

interface Reminder {
  type: ReminderType
  offset: number  // 提前多少分钟
  offsetType: 'minute' | 'hour' | 'day'
}
```

### 9.2 Web Notification 实现

```typescript
/**
 * 请求通知权限
 */
async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('浏览器不支持通知')
    return false
  }
  
  if (Notification.permission === 'granted') {
    return true
  }
  
  const permission = await Notification.requestPermission()
  return permission === 'granted'
}

/**
 * 发送桌面通知
 */
function sendNotification(event: ScheduleEvent, reminder: Reminder): void {
  if (Notification.permission !== 'granted') return
  
  const notification = new Notification(`⏰ ${event.title}`, {
    body: `将在 ${reminder.offset} 分钟后开始\n地点: ${event.location || '未设置'}`,
    icon: '/favicon.ico',
    tag: event.id,  // 相同tag的通知会替换
    requireInteraction: true,  // 需要用户交互才关闭
    actions: [
      { action: 'view', title: '查看详情' },
      { action: 'snooze', title: '稍后提醒' }
    ]
  })
  
  notification.onclick = () => {
    window.focus()
    router.push(`/app/schedule?event=${event.id}`)
    notification.close()
  }
}

/**
 * 调度提醒
 */
function scheduleReminders(event: ScheduleEvent): void {
  for (const reminder of event.reminders) {
    const remindAt = new Date(event.start_time)
    remindAt.setMinutes(remindAt.getMinutes() - reminder.offset)
    
    const now = new Date()
    const delay = remindAt.getTime() - now.getTime()
    
    if (delay > 0) {
      setTimeout(() => {
        sendNotification(event, reminder)
      }, delay)
    }
  }
}
```

### 9.3 Service Worker 后台提醒（V3 实现，MVP 暂不需要）

> 说明：MVP 阶段使用 `setTimeout` 调度页面内提醒即可（见 9.2 scheduleReminders 函数），Service Worker 后台提醒在应用关闭后仍可触发，列为 V3 功能，MVP 不做要求。

```typescript
// service-worker.ts

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// 定时检查提醒
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-reminders') {
    event.waitUntil(checkReminders())
  }
})

async function checkReminders(): Promise<void> {
  const now = new Date()
  
  // 从 IndexedDB 获取待发送的提醒
  const pendingReminders = await getPendingReminders(now)
  
  for (const reminder of pendingReminders) {
    // 发送通知
    self.registration.showNotification(reminder.title, {
      body: reminder.content,
      tag: reminder.id
    })
    
    // 标记为已发送
    await markReminderAsSent(reminder.id)
  }
}
```

---

## 九点五、项目接入说明（开发前必读）

### 接入 AppLayout 侧边栏导航

文件路径：`frontend/src/pages/app/AppLayout.vue`

在侧边栏导航列表中找到 schedule 对应的导航项，确认 `to` 值为 `/app/schedule`，图标使用日历图标（SVG或emoji均可）。该路由已在 `router/index.ts` 注册，当前指向 `Placeholder.vue`，开发完成后将 import 替换为：

```typescript
// router/index.ts 中修改
{ 
  path: 'schedule', 
  name: 'AppSchedule', 
  component: () => import('../pages/app/Schedule.vue')  // 替换 Placeholder
}
```

### Supabase 数据库建表顺序

必须按以下顺序执行（存在外键依赖）：
1. `schedule_events`（无外部依赖）
2. `course_schedules`（无外部依赖）  
3. `event_reminders`（依赖 schedule_events）
4. `calendar_subscriptions`（无外部依赖）
5. `user_time_preferences`（无外部依赖）

然后执行 RLS 策略：
```sql
ALTER TABLE schedule_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own events" ON schedule_events USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE course_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own courses" ON course_schedules USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE user_time_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own preferences" ON user_time_preferences USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

### 与现有模块的联动

| 联动模块 | 联动方式 | 优先级 |
|----------|----------|--------|
| 校园墙(CampusWall) | 发帖时可关联活动日程（可选，V2做） | P2 |
| AI助手(Chat) | 通过自然语言新建日程（可选，V3做） | P3 |
| 个人中心(Profile) | 展示本周课程安排摘要 | P1 |

---

## 十、开发计划

### 10.1 阶段划分

| 阶段 | 内容 | 预计时间 | 依赖 |
|------|------|----------|------|
| **MVP** | 日历视图 + 事件CRUD + 基础提醒 | 5天 | 无 |
| **V2** | 课表导入 + 重复事件 + 拖拽调整 | 4天 | MVP |
| **V2.5** | **AI智能识别导入**（图片/文件→日程） | 3天 | MVP |
| **V3** | AI时间建议 + 冲突检测 | 3天 | V2 |
| **V4** | 日程分享 + 时间分析 | 3天 | V3 |

### 10.2 MVP 详细任务

```
Day 1: 基础架构
□ 创建 Schedule.vue 主页面
□ 创建日历视图组件框架
□ 实现日期导航逻辑
□ 实现视图切换（月/周/日）

Day 2: 月视图
□ 实现 CalendarMonth 组件
□ 实现日期网格计算
□ 实现事件显示
□ 实现日期点击交互

Day 3: 周视图 + 日视图
□ 实现 CalendarWeek 组件
□ 实现 CalendarDay 组件
□ 实现时间网格
□ 实现当前时间线

Day 4: 事件管理
□ 实现 CreateEventModal
□ 实现 EventModal（详情/编辑）
□ 实现事件类型选择
□ 实现时间选择器

Day 5: 提醒 + 数据持久化
□ 实现提醒设置
□ 实现 Web Notification
□ 对接 Supabase 数据库
□ 测试完整流程
```

### 10.3 技术栈

```
前端：
- Vue 3 + TypeScript（项目已有）
- Pinia（状态管理，需 npm install pinia）
- VueUse（工具函数，需 npm install @vueuse/core）
- date-fns（日期处理，需 npm install date-fns）
- @vueuse/gesture（拖拽，V2再装）

后端：
- Supabase（数据库，项目已接入，直接复用 src/supabase.ts 中的 supabase 实例）
- Edge Functions（V3提醒调度，MVP不需要）

通知：
- Web Notification API（MVP使用，setTimeout调度）
- Service Worker（V3后台提醒，MVP不需要）
```

> ⚠️ **MVP 必装依赖（共2个）**：`npm install date-fns @vueuse/core`

---

## 十点五、AI智能识别导入（V2.5）

### 功能概述

用户上传图片或文件，系统通过多模态AI自动识别其中的时间安排信息，提取为结构化日程事件，经用户确认后批量导入日历。

**解决的核心痛点**：
- 课表截图手动录入太麺烦（大学生最高频需求）
- 考试通知、活动海报信息散乱，不想逐条新建
- 作业要求文档里截止日期需要人工查找

---

### 支持的输入类型

| 类型 | 示例场景 | 识别内容 |
|------|---------|----------|
| 课表截图 | 教务系统/超星课表截图 | 课程名、教师、教室、时间、周次 |
| 考试通知图片 | 学院群消息截图 | 考试科目、时间、地点、考场 |
| 活动海报 | 社团/讲座海报图片 | 活动名、时间、地点、主办方 |
| 作业文档 | Word/PDF/图片 | 作业名称、提交截止时间 |
| 微信截图 | 群聊消息截图 | 散落在对话中的时间安排 |
| 日历/行程表 | 手写或打印的周计划 | 各时间段的事项 |

---

### 技术方案

**推荐：Vision API 直传（最简方案）**

```
前端上传图片
    ↓
Supabase Storage 临时存储
    ↓
Edge Function 调用多模态 AI
（Google Gemini Vision / GPT-4o / 通义千问VL）
    ↓
AI 返回结构化 JSON
    ↓
前端展示识别结果 → 用户确认/编辑
    ↓
批量写入 schedule_events 表
```

**AI Prompt 设计**：

```
你是一个日程助手，请从图片/文本中提取所有时间安排信息。

输出 JSON 数组，每个事件包含：
{
  "title": "事件标题",
  "event_type": "course|exam|task|life|reminder",
  "start_time": "ISO8601格式",
  "end_time": "ISO8601格式",
  "location": "地点",
  "recurrence": "none|weekly",
  "recurrence_days": [1,3,5],
  "recurrence_end": "2026-06-30",
  "confidence": 0.95
}

当前日期：{today}
当前学期开始日期：{semesterStart}
无法识别的字段填 null，不要编造信息。
```

---

### 前端交互流程

```
① 入口
   Schedule.vue 顶部工具栏 → "智能导入" 按鈕（魔法棒图标✨）
   或 EventModal 中的 "从图片创建" 选项

② 上传界面
   - 拖拽上传区域（支持 jpg/png/webp/pdf/docx）
   - 支持多文件批量上传（最多5个）
   - 文件大小限制：10MB

③ 识别中状态
   - 动态提示文字：
     "正在识别图片内容..."
     "正在提取日程信息..."
     "即将完成..."
   - 预计耗时 3-8 秒

④ 识别结果确认界面（核心）
   ┌─────────────────────────────────────┐
   │ ✨ 识别到 6 个日程事件              │
   │ 请确认后导入                        │
   ├─────────────────────────────────────┤
   │ ☑ 📚 操作系统  周一三五 08:00-09:35  │
   │    教四-302  重复至 2026-06-30       │
   │    置信度: ██████████ 98%           │
   │                                     │
   │ ☑ 📝 期末考试  2026-06-25 14:00     │
   │    考场: 教一-101                   │
   │    置信度: ████████░░ 85%           │
   │                                     │
   │ ⚠ 🎯 [作业截止] 时间识别不确定      │
   │    "下周五" → 2026-03-28？          │
   │    [修改时间]                        │
   ├─────────────────────────────────────┤
   │  全选  [取消]        [确认导入 5项] │
   └─────────────────────────────────────┘

⑤ 导入结果
   - Toast: "已成功导入 5 个日程事件"
   - 日历视图自动跳转到最近事件的日期
   - 新导入的事件高亮显示 2 秒
```

---

### 数据结构扩展

```typescript
interface AIRecognitionResult {
  events: AIExtractedEvent[]
  sourceType: 'course_table' | 'exam_notice' | 'activity' | 'assignment' | 'chat' | 'unknown'
  rawText: string
  processingTime: number
}

interface AIExtractedEvent {
  title: string
  event_type: EventType
  start_time: string | null
  end_time: string | null
  location: string
  recurrence: 'none' | 'weekly'
  recurrence_days: number[]
  recurrence_end: string | null
  confidence: number       // 0-1，低于0.7时前端显示警告
  needsConfirm: boolean    // confidence < 0.7 时为 true
}
```

```sql
-- ai_import_logs 表（记录识别历史）
CREATE TABLE IF NOT EXISTS ai_import_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  source_type TEXT,
  events_extracted INT,
  events_imported INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### Edge Function 实现

```typescript
// supabase/functions/ai-schedule-import/index.ts
import { serve } from 'https://deno.land/std/http/server.ts'

serve(async (req) => {
  const { imageUrl, fileText, today, semesterStart } = await req.json()
  
  const response = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': Deno.env.get('GEMINI_API_KEY')!
      },
      body: JSON.stringify({
        contents: [{ parts: [
          { text: buildPrompt(today, semesterStart) },
          imageUrl
            ? { inline_data: { mime_type: 'image/jpeg', data: await fetchBase64(imageUrl) } }
            : { text: fileText }
        ]}],
        generationConfig: { response_mime_type: 'application/json' }
      })
    }
  )
  
  const result = await response.json()
  const events = JSON.parse(result.candidates[0].content.parts[0].text)
  return new Response(JSON.stringify({ events }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

---

### AI 服务选型

| 服务 | 价格 | 中文识别 | 推荐指数 |
|------|------|----------|----------|
| Google Gemini 1.5 Flash | 免费额度充足 | ★★★★★ | ⭐⭐⭐⭐⭐（首选） |
| 通义千问VL（qwen-vl-plus） | 国内免费额度大 | ★★★★★ | ⭐⭐⭐⭐（备选） |
| GPT-4o | 较贵 | ★★★★☆ | ⭐⭐⭐ |

**API Key 管理策略（重要）**

API Key 由项目方统一提供，存储在 Supabase Edge Function 的环境变量中，**不以任何形式暴露给前端或用户**。

为了控制使用成本并为后续管理平台预留空间，采用以下机制：

```
每个用户每日调用限额：5次
超出限额后提示："今日识别次数已用完，明天再试"
```

```sql
-- api_usage_logs 表（记录每个用户每日调用次数）
CREATE TABLE IF NOT EXISTS api_usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  feature TEXT NOT NULL,         -- 功能标识，如 'ai_schedule_import'
  used_at DATE DEFAULT CURRENT_DATE,
  call_count INT DEFAULT 1,
  UNIQUE(user_id, feature, used_at)
);
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own usage" ON api_usage_logs FOR SELECT USING (auth.uid() = user_id);
```

Edge Function 调用前先查配额：
```typescript
// 查当日使用次数
const { data } = await supabaseAdmin
  .from('api_usage_logs')
  .select('call_count')
  .eq('user_id', userId)
  .eq('feature', 'ai_schedule_import')
  .eq('used_at', new Date().toISOString().split('T')[0])
  .single()

const DAILY_LIMIT = parseInt(Deno.env.get('AI_DAILY_LIMIT') ?? '5')
if (data && data.call_count >= DAILY_LIMIT) {
  return new Response(JSON.stringify({ error: 'quota_exceeded', limit: DAILY_LIMIT }), { status: 429 })
}

// 调用AI成功后，upsert计数
await supabaseAdmin.from('api_usage_logs').upsert({
  user_id: userId,
  feature: 'ai_schedule_import',
  used_at: new Date().toISOString().split('T')[0],
  call_count: (data?.call_count ?? 0) + 1
}, { onConflict: 'user_id,feature,used_at' })
```

**后续管理平台预留接口**（在管理后台可配置）：
- `AI_DAILY_LIMIT` 环境变量：全局默认每日限额（当前5次）
- `AI_PROVIDER` 环境变量：切换AI服务商（`gemini` / `qwen` / `openai`）
- `api_usage_logs` 表：管理员可查看各用户使用情况，发现滥用可手动封禁
- 未来可扩展为会员制（普通用户5次/天，会员用户50次/天）

---

### 隐私与安全

- 上传图片存入 `ai-temp` bucket，识别完成后 **24小时自动删除**
- API Key 在 Edge Function 环境变量中配置，**绝不暴露给前端**
- 每日调用限额防止滥用，超限返回 HTTP 429
- V2.5 必装额外依赖：无（纯利用现有Supabase Edge Function）

---

## 十一、UI设计规范

### 11.1 整体风格

```
风格：玻璃拟态 + 暗黑主题 + 星火配色

日历网格：
- 背景：rgba(255, 255, 255, 0.03)
- 边框：rgba(255, 255, 255, 0.08)
- 悬停：rgba(255, 255, 255, 0.06)
- 今日：rgba(79, 142, 247, 0.1) 高亮

事件卡片：
- 左侧彩色竖条标识类型
- 背景：对应类型淡色
- 悬停：微微上浮 + 阴影
- 点击：展开详情

时间线：
- 当前时间：红色虚线
- 过去时间：灰色淡化
- 未来时间：正常显示
```

### 11.2 响应式设计

```css
/* 桌面端 */
@media (min-width: 1024px) {
  .schedule-layout {
    display: grid;
    grid-template-columns: 1fr 280px;  /* 主区域 + 侧边栏 */
  }
}

/* 平板端 */
@media (min-width: 768px) and (max-width: 1023px) {
  .schedule-layout {
    display: block;
  }
  .sidebar {
    position: fixed;
    right: 0;
    transform: translateX(100%);
  }
}

/* 移动端 */
@media (max-width: 767px) {
  .view-switcher {
    /* 默认显示日视图 */
  }
  .month-view {
    /* 简化显示 */
  }
}
```

---

## 十二、测试要点

### 12.1 功能测试

```
□ 日历视图切换正常
□ 日期导航（上一月/下一月/今天）正常
□ 事件创建/编辑/删除正常
□ 事件类型颜色显示正确
□ 重复事件展开正确
□ 提醒按时触发
□ 时间冲突检测正确
```

### 12.2 边界测试

```
□ 跨月/跨年日期计算正确
□ 重复事件结束条件正确
□ 时区处理正确
□ 全天事件显示正确
□ 空数据状态处理
```

### 12.3 性能测试

```
□ 大量事件渲染性能
□ 重复事件展开性能
□ 拖拽操作流畅度
□ 移动端滚动性能
```

---

## 十三、附录

### 13.1 相关文档

- `SparkAlliance.md` - 项目整体规划
- `docs/AGENTS.md` - 开发进度追踪
- `docs/DATA-MODELS.md` - 数据模型设计

### 13.2 参考资料

- [FullCalendar](https://fullcalendar.io/) - 日历组件参考
- [Google Calendar](https://calendar.google.com/) - 交互设计参考
- [date-fns](https://date-fns.org/) - 日期处理库文档

---

**文档维护：** 随着开发进度持续更新
