# Spark Alliance 自建后端契约（v1）

> 单一事实来源：Go 后端、admin 控制台、前端迁移、数据库 schema 都以本文件为准。
> 目标：摆脱对 Supabase 托管服务的依赖，全部落在本地 PostgreSQL 18 + Go 服务上。

## 1. 技术栈与端口

| 组件 | 技术 | 端口/位置 |
|---|---|---|
| 数据库 | PostgreSQL 18（Docker 容器 `spark-postgres`，`backend/docker-compose.yml`） | 127.0.0.1:5433，库名 `spark_alliance`，用户 spark / spark_dev_2026 |
| 后端 API | Go 1.26 + net/http(1.22 方法路由) + pgx/v5 + golang-jwt/v5 + x/crypto/bcrypt | 127.0.0.1:8787 |
| 用户前端 | 现有 Vue 3（`frontend/`） | 5180 |
| 管理控制台 | Vue 3 + vue-router + ECharts（`admin/`） | 5181 |

- 后端目录：`backend/server/`（`news-crawler` 不动）。
- 数据库启动：`cd backend && docker compose up -d`（本机原生 PG18 密码未知，用容器版隔离可控；生产迁移时 pg_dump 即可）。
- 配置：`backend/server/.env`（gitignored），模板 `backend/server/.env.example`。
  - `DATABASE_URL=postgres://spark:spark_dev_2026@127.0.0.1:5433/spark_alliance?sslmode=disable`
  - `JWT_SECRET=`（启动时必填，dev 默认见 .env.example）
  - `PORT=8787`
  - `CORS_ORIGINS=http://localhost:5180,http://127.0.0.1:5180,http://localhost:5181,http://127.0.0.1:5181`
- Go 模块代理：`GOPROXY=https://goproxy.cn,direct`（国内网络可靠性）。

## 2. 认证

- 注册/登录发 **HS256 JWT**（`sub`=user id, `role`, `exp` 24h），前端存 localStorage `spark_api_token`。
- 密码 bcrypt(cost 10)。邮箱唯一、小写归一。
- 中间件：`Authorization: Bearer <jwt>`；`role=admin` 才能访问 `/api/admin/*`。
- 统一错误体：`{"error": "人话", "code": "MACHINE_CODE"}`；2xx 之外必带。

## 3. 数据库命名

与原 Supabase schema 对齐（前端查询名不变，迁移机械化）：

- `users`（自建：id uuid PK default gen_random_uuid(), email unique, password_hash, nickname, avatar_url, school, region, role text default 'user', status text default 'active'（active|disabled）, created_at, updated_at）
- `posts`（校园墙：id, user_id FK, content, category, tags text[], media_urls text[], is_anonymous bool, anonymous_seed, likes_count int default 0, comments_count int default 0, status text default 'visible'（visible|hidden|deleted）, created_at）
- `post_comments`（id, post_id FK, user_id FK, content, media_urls text[], is_anonymous, anonymous_seed, reply_to_name, like_count int default 0, is_hidden bool default false, report_count int default 0, created_at）
- `post_likes`（post_id, user_id, PK(post_id,user_id), created_at）
- `comment_likes`（comment_id, user_id, PK 复合, created_at）
- `reports`（id, reporter_id, post_id nullable, comment_id nullable, reason, status text default 'pending'（pending|resolved|dismissed）, created_at, resolved_at nullable）
- `schedule_events`（id, user_id, title, description, location, start_time timestamptz, end_time nullable, all_day bool, event_type, event_subtype, color, recurrence_type default 'none', recurrence_days int[], recurrence_end, reminders jsonb default '[]', status default 'active', priority int default 0, created_at, updated_at）
- `goals`（id, user_id, title, description, goal_type, deadline date, status default 'active', total_progress numeric default 0, created_at, updated_at）
- `goal_milestones`（id, goal_id, user_id, title, description, target_date, weight numeric default 1, sort_order int, created_at）
- `planner_tasks`（id, user_id, goal_id nullable, milestone_id nullable, title, description, estimated_minutes int, difficulty int default 2, due_date date, is_completed bool default false, completed_at, status default 'pending', completion_note, source default 'manual', sort_order int default 0, schedule_event_id nullable, created_at）
- `health_checkins`（id, user_id, checkin_date date, mood, sleep_hours numeric, water_cups int, exercise_minutes int, meals jsonb, note, created_at；UNIQUE(user_id, checkin_date)）
- `habit_logs`（id, user_id, habit_id, log_date date, created_at）

索引：所有 `user_id`、`posts(created_at desc)`、`schedule_events(user_id, start_time)`、`planner_tasks(user_id, status, due_date)`。
统计口径：`likes_count/comments_count` 由触发器维护（insert/delete 时增减）。

## 4. REST API

前缀 `/api`。分页参数 `limit`(<=50 默认 20)、`offset`。时间一律 ISO8601 UTC。

### 4.1 Auth
| 方法 | 路径 | 说明 |
|---|---|---|
| POST | /auth/register | {email,password,nickname} → {token,user}；邮箱重复 409 EMAIL_TAKEN |
| POST | /auth/login | {email,password} → {token,user}；错误 401 BAD_CREDENTIALS；disabled 403 ACCOUNT_DISABLED |
| GET | /auth/me | Bearer → user |
| PATCH | /auth/me | {nickname?,avatar_url?,school?,region?} → user |

user 序列化：`{id,email,nickname,avatar_url,school,region,role,created_at}`（不带 password_hash）。

### 4.2 校园墙
| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /wall/posts?category=&search=&limit=&offset= | 公开；status='visible'；按 created_at desc；返回 {posts,total}，登录时每条带 liked |
| POST | /wall/posts | 登录；{content,category,tags,media_urls,is_anonymous} |
| DELETE | /wall/posts/:id | 作者本人或 admin；软删（status='deleted'） |
| POST | /wall/posts/:id/like | 登录；toggle → {liked,likes_count} |
| GET | /wall/posts/:id/comments | 公开；is_hidden=false |
| POST | /wall/posts/:id/comments | 登录；{content,is_anonymous,reply_to_name,media_urls} |
| POST | /wall/comments/:id/like | 登录；toggle |
| POST | /wall/reports | 登录；{post_id?|comment_id?,reason} |

### 4.3 日程/规划/健康（全部登录、只操作本人数据）
| 方法 | 路径 |
|---|---|
| GET | /schedule/events?from=&to= （区间重叠查询：start_time < to AND coalesce(end_time,start_time) >= from） |
| POST/PATCH/DELETE | /schedule/events(/:id) |
| GET/POST/PATCH/DELETE | /planner/goals(/:id)（GET 含 milestones 汇总） |
| GET | /planner/tasks?status=&due_before=&unscheduled=1 |
| POST/PATCH/DELETE | /planner/tasks(/:id) |
| GET/POST | /health/checkins（GET ?from=&to=；POST upsert 当天） |

### 4.4 Admin（role=admin）
| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /admin/stats/overview | {total_users,new_users_today,total_posts,posts_today,total_comments,total_events,total_tasks,active_users_7d} |
| GET | /admin/stats/trend?days=30 | [{date,new_users,new_posts,new_comments}] 按天聚合 |
| GET | /admin/stats/modules | [{module,rows}]（posts/comments/events/goals/tasks/checkins 行数） |
| GET | /admin/users?search=&status=&limit=&offset= | {users,total}（含 status,role,posts_count） |
| PATCH | /admin/users/:id | {status?,role?}；不能改自己 role/status（防锁死） |
| GET | /admin/posts?status=&search=&limit=&offset= | 审核列表（含作者 email/nickname） |
| PATCH | /admin/posts/:id | {status: visible|hidden|deleted} |
| GET | /admin/reports?status= | 举报列表（关联帖子/评论摘要） |
| PATCH | /admin/reports/:id | {status: resolved|dismissed}；resolved 时可带 {hide_target:true} 顺带隐藏被举报内容 |

### 4.5 文件上传
| 方法 | 路径 | 说明 |
|---|---|---|
| POST | /uploads | 登录；multipart form（field=file，≤5MB，白名单 png/jpg/jpeg/webp/gif/mp4/webm）→ {url:"/uploads/<uuid>.<ext>"} |
| GET | /uploads/* | 静态文件服务（backend/server/uploads/，gitignored） |

### 4.6 健康检查
GET /healthz → {ok:true,db:"up"}（无鉴权）。

## 5. 安全基线

- CORS 白名单（见配置），仅 GET/POST/PATCH/DELETE + Authorization/Content-Type。
- 全局限速：每 IP 300 req/min（内存令牌桶），auth 端点 20 req/min。
- 输入校验：content ≤ 5000 字，email 格式，password ≥ 8；所有 SQL 走参数绑定（pgx），杜绝拼接。
- JWT 只放 sub/role/exp；服务端每请求查 users.status，disabled 立即 401。
- 日志：每请求一行（method path status ms user_id?），不打印 body/token。
- seed 管理员：`admin@spark.local` / 首次启动时若无 admin 则用 env `ADMIN_INIT_PASSWORD`（默认 dev 值见 .env.example）创建，日志提示修改。

## 6. 前端迁移策略

1. `frontend/src/api/client.ts`：fetch 封装（token 注入、错误规范化、401 跳登录）。
2. 模块迁移顺序：auth → wall → schedule → planner → health → 其余；每迁一个模块删掉对应 supabase 调用。
3. `VITE_API_BASE=http://127.0.0.1:8787` 写入 `frontend/.env.local`（gitignored）。
4. 迁移期两套并存：未迁移模块继续走 supabase 客户端，不破坏现有功能。
