# 星火校园项目 - 数据模型设计

## 📋 文档说明

**创建时间**: 2026-03-16  
**最后更新**: 2026-03-16  
**版本**: v1.0

**重要说明：**
- 本文档记录所有新增功能的数据模型设计
- 包含数据库表结构、字段说明、索引设计
- 作为后端开发的参考文档

---

## 🎓 AI选课助手数据模型

### 1. 课程表 (courses)

```sql
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_code VARCHAR(50) NOT NULL,           -- 课程代码
  course_name VARCHAR(200) NOT NULL,          -- 课程名称
  teacher_id UUID REFERENCES users(id),       -- 教师ID
  department VARCHAR(100),                    -- 开课院系
  credit DECIMAL(3,1),                        -- 学分
  capacity INT,                               -- 容量
  enrolled INT DEFAULT 0,                     -- 已选人数
  semester VARCHAR(20),                       -- 学期（如：2026-Spring）
  schedule JSONB,                             -- 上课时间安排
  location VARCHAR(200),                      -- 上课地点
  description TEXT,                           -- 课程描述
  prerequisites TEXT[],                       -- 先修课程
  tags TEXT[],                                -- 标签（如：必修、选修、通识）
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(course_code, semester)
);

-- 索引
CREATE INDEX idx_courses_teacher ON courses(teacher_id);
CREATE INDEX idx_courses_semester ON courses(semester);
CREATE INDEX idx_courses_department ON courses(department);
CREATE INDEX idx_courses_tags ON courses USING GIN(tags);
```

### 2. 课程评价表 (course_reviews)

```sql
CREATE TABLE course_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- 评分维度
  difficulty_rating INT CHECK (difficulty_rating BETWEEN 1 AND 5),      -- 课程难度
  teaching_quality INT CHECK (teaching_quality BETWEEN 1 AND 5),        -- 教学质量
  practicality_rating INT CHECK (practicality_rating BETWEEN 1 AND 5),  -- 实用性
  workload_level VARCHAR(20) CHECK (workload_level IN ('少', '中', '多')), -- 作业量
  exam_type VARCHAR(50),                                                 -- 考试形式
  grading_style VARCHAR(20) CHECK (grading_style IN ('严格', '正常', '宽松')), -- 给分情况
  
  -- 评价内容
  comment TEXT,                          -- 文字评价
  pros TEXT[],                           -- 优点标签
  cons TEXT[],                           -- 缺点标签
  
  -- 统计数据
  likes_count INT DEFAULT 0,             -- 点赞数
  is_anonymous BOOLEAN DEFAULT TRUE,     -- 是否匿名
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(course_id, user_id)             -- 每个用户对每门课只能评价一次
);

-- 索引
CREATE INDEX idx_course_reviews_course ON course_reviews(course_id);
CREATE INDEX idx_course_reviews_user ON course_reviews(user_id);
CREATE INDEX idx_course_reviews_created ON course_reviews(created_at DESC);
```

### 3. 选课记录表 (enrollments)

```sql
CREATE TABLE enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  semester VARCHAR(20),
  status VARCHAR(20) DEFAULT 'active',    -- active, dropped, completed
  grade DECIMAL(5,2),                     -- 成绩
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id, course_id, semester)
);

-- 索引
CREATE INDEX idx_enrollments_user ON enrollments(user_id);
CREATE INDEX idx_enrollments_course ON enrollments(course_id);
CREATE INDEX idx_enrollments_semester ON enrollments(semester);
```

### 4. 选课推荐表 (course_recommendations)

```sql
CREATE TABLE course_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  
  -- 推荐信息
  match_score DECIMAL(5,2),              -- 匹配度分数（0-100）
  reason TEXT,                           -- 推荐理由
  priority INT,                          -- 推荐优先级
  
  -- 用户偏好
  user_preferences JSONB,                -- 用户偏好快照
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id, course_id)
);

-- 索引
CREATE INDEX idx_course_recommendations_user ON course_recommendations(user_id);
CREATE INDEX idx_course_recommendations_score ON course_recommendations(match_score DESC);
```

---

## 👨‍🎓 学长推荐系统数据模型

### 1. 学长认证表 (senior_certifications)

```sql
CREATE TABLE senior_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- 认证信息
  certification_type VARCHAR(50),         -- 认证类型（学生证、成绩单、获奖证书等）
  certification_level VARCHAR(50),        -- 认证等级（普通、优秀、金牌）
  
  -- 认证材料
  document_url TEXT,                      -- 证明材料URL
  description TEXT,                       -- 认证说明
  
  -- 审核状态
  status VARCHAR(20) DEFAULT 'pending',   -- pending, approved, rejected
  reviewed_by UUID REFERENCES users(id),  -- 审核人
  reviewed_at TIMESTAMP,
  review_comment TEXT,                    -- 审核意见
  
  -- 统计数据
  helpful_count INT DEFAULT 0,            -- 帮助人数
  experience_count INT DEFAULT 0,         -- 分享经验数
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_senior_certifications_user ON senior_certifications(user_id);
CREATE INDEX idx_senior_certifications_status ON senior_certifications(status);
CREATE INDEX idx_senior_certifications_level ON senior_certifications(certification_level);
```

### 2. 经验分享表 (experience_shares)

```sql
CREATE TABLE experience_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- 内容信息
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(50),                   -- 分类（学习、生活、职业、考研留学）
  subcategory VARCHAR(50),                -- 子分类
  tags TEXT[],                            -- 标签
  
  -- 内容形式
  content_type VARCHAR(20) DEFAULT 'text', -- text, video, live, qa
  media_urls TEXT[],                      -- 媒体文件URL
  
  -- 统计数据
  likes_count INT DEFAULT 0,
  views_count INT DEFAULT 0,
  comments_count INT DEFAULT 0,
  bookmarks_count INT DEFAULT 0,
  
  -- 状态
  status VARCHAR(20) DEFAULT 'published', -- draft, published, archived
  is_featured BOOLEAN DEFAULT FALSE,      -- 是否精选
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_experience_shares_author ON experience_shares(author_id);
CREATE INDEX idx_experience_shares_category ON experience_shares(category);
CREATE INDEX idx_experience_shares_tags ON experience_shares USING GIN(tags);
CREATE INDEX idx_experience_shares_created ON experience_shares(created_at DESC);
CREATE INDEX idx_experience_shares_featured ON experience_shares(is_featured) WHERE is_featured = TRUE;
```

### 3. 咨询表 (consultations)

```sql
CREATE TABLE consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  senior_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- 咨询信息
  question TEXT NOT NULL,
  answer TEXT,
  
  -- 咨询类型
  consultation_type VARCHAR(20),          -- text, voice, video, offline
  price DECIMAL(10,2),                    -- 价格（付费咨询）
  
  -- 状态
  status VARCHAR(20) DEFAULT 'pending',   -- pending, accepted, completed, cancelled
  
  -- 评价
  rating INT CHECK (rating BETWEEN 1 AND 5),
  feedback TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- 索引
CREATE INDEX idx_consultations_student ON consultations(student_id);
CREATE INDEX idx_consultations_senior ON consultations(senior_id);
CREATE INDEX idx_consultations_status ON consultations(status);
```

---

## 🤖 AI学习助手数据模型

### 1. 答疑记录表 (qa_records)

```sql
CREATE TABLE qa_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- 问题信息
  question TEXT NOT NULL,
  question_type VARCHAR(20),              -- text, image, voice
  question_media_url TEXT,                -- 图片或语音URL
  
  -- 答案信息
  answer TEXT,
  steps TEXT[],                           -- 分步骤解答
  related_questions TEXT[],               -- 相关问题推荐
  
  -- 学科信息
  subject VARCHAR(50),                    -- 学科
  topic VARCHAR(100),                     -- 知识点
  
  -- 统计数据
  helpful_count INT DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_qa_records_user ON qa_records(user_id);
CREATE INDEX idx_qa_records_subject ON qa_records(subject);
CREATE INDEX idx_qa_records_created ON qa_records(created_at DESC);
```

### 2. 学习计划表 (study_plans)

```sql
CREATE TABLE study_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- 计划信息
  title VARCHAR(200),
  goal TEXT,                              -- 学习目标
  start_date DATE,
  end_date DATE,
  
  -- 计划内容
  daily_plan JSONB,                       -- 每日计划
  milestones JSONB,                       -- 里程碑
  
  -- 进度
  progress DECIMAL(5,2) DEFAULT 0,        -- 完成进度（0-100）
  
  -- 状态
  status VARCHAR(20) DEFAULT 'active',    -- active, completed, abandoned
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_study_plans_user ON study_plans(user_id);
CREATE INDEX idx_study_plans_status ON study_plans(status);
```

### 3. 知识图谱表 (knowledge_graphs)

```sql
CREATE TABLE knowledge_graphs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject VARCHAR(50) NOT NULL,
  
  -- 知识点信息
  topic VARCHAR(100) NOT NULL,
  description TEXT,
  
  -- 关系
  prerequisites UUID[],                   -- 前置知识点
  related_topics UUID[],                  -- 相关知识点
  
  -- 难度
  difficulty INT CHECK (difficulty BETWEEN 1 AND 5),
  
  -- 资源
  resources TEXT[],                       -- 学习资源链接
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(subject, topic)
);

-- 索引
CREATE INDEX idx_knowledge_graphs_subject ON knowledge_graphs(subject);
CREATE INDEX idx_knowledge_graphs_topic ON knowledge_graphs(topic);
```

### 4. 模拟考试表 (mock_exams)

```sql
CREATE TABLE mock_exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- 考试信息
  subject VARCHAR(50),
  questions JSONB,                        -- 题目列表
  answers JSONB,                          -- 用户答案
  
  -- 结果
  score DECIMAL(5,2),
  correct_count INT,
  total_count INT,
  
  -- 分析
  weak_points TEXT[],                     -- 薄弱点
  analysis TEXT,                          -- AI分析
  
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- 索引
CREATE INDEX idx_mock_exams_user ON mock_exams(user_id);
CREATE INDEX idx_mock_exams_subject ON mock_exams(subject);
```

---

## 📚 学习资源中心数据模型

### 1. 资源表 (resources)

```sql
CREATE TABLE resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uploader_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- 资源信息
  title VARCHAR(200) NOT NULL,
  description TEXT,
  resource_type VARCHAR(50),              -- 课程资料、考试资料、学习工具、视频、电子书
  category VARCHAR(50),                   -- 分类
  tags TEXT[],                            -- 标签
  
  -- 文件信息
  file_url TEXT,
  file_size BIGINT,                       -- 文件大小（字节）
  file_format VARCHAR(20),                -- 文件格式
  
  -- 统计数据
  downloads_count INT DEFAULT 0,
  views_count INT DEFAULT 0,
  likes_count INT DEFAULT 0,
  bookmarks_count INT DEFAULT 0,
  
  -- 质量控制
  rating DECIMAL(3,2) DEFAULT 0,          -- 评分（0-5）
  rating_count INT DEFAULT 0,             -- 评分人数
  status VARCHAR(20) DEFAULT 'active',    -- active, archived, deleted
  is_verified BOOLEAN DEFAULT FALSE,      -- 是否审核通过
  
  -- 积分
  points INT DEFAULT 0,                   -- 所需积分
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_resources_uploader ON resources(uploader_id);
CREATE INDEX idx_resources_type ON resources(resource_type);
CREATE INDEX idx_resources_category ON resources(category);
CREATE INDEX idx_resources_tags ON resources USING GIN(tags);
CREATE INDEX idx_resources_created ON resources(created_at DESC);
```

### 2. 资源评价表 (resource_reviews)

```sql
CREATE TABLE resource_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID REFERENCES resources(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  rating INT CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(resource_id, user_id)
);

-- 索引
CREATE INDEX idx_resource_reviews_resource ON resource_reviews(resource_id);
CREATE INDEX idx_resource_reviews_user ON resource_reviews(user_id);
```

---

## 📊 数据库关系图

```
用户表 (users)
  ├── 课程评价 (course_reviews)
  ├── 选课记录 (enrollments)
  ├── 选课推荐 (course_recommendations)
  ├── 学长认证 (senior_certifications)
  ├── 经验分享 (experience_shares)
  ├── 咨询记录 (consultations)
  ├── 答疑记录 (qa_records)
  ├── 学习计划 (study_plans)
  ├── 模拟考试 (mock_exams)
  └── 资源上传 (resources)

课程表 (courses)
  ├── 课程评价 (course_reviews)
  ├── 选课记录 (enrollments)
  └── 选课推荐 (course_recommendations)

知识图谱 (knowledge_graphs)
  └── 自关联（前置知识点、相关知识点）
```

---

## 🔧 数据库配置建议

### 1. 使用Supabase

**优势：**
- 提供完整的后端服务
- 自动生成API
- 实时订阅功能
- 行级安全策略

**配置：**
```javascript
// supabase/config.toml
[db]
port = 54322

[api]
port = 54321
schemas = ["public", "storage", "auth"]

[auth]
enabled = true
site_url = "http://localhost:3000"
```

### 2. 索引优化

**建议：**
- 为所有外键创建索引
- 为常用查询字段创建索引
- 为JSONB字段创建GIN索引
- 为数组字段创建GIN索引

### 3. 数据迁移

**注意事项：**
- 使用标准SQL，避免Supabase特有功能
- 预留数据导出接口
- 设计数据迁移方案
- 定期备份数据

---

**本文档作为后端开发的参考，需要根据实际需求持续更新！**
