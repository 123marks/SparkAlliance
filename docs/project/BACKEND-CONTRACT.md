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

### 4.3b 规划扩展与健康扩展（v2，后端第二批交付）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /planner/goals/:id/milestones | 该目标的里程碑列表（sort_order 升序） |
| POST | /planner/goals/:id/milestones | {title,description?,target_date,weight?,sort_order?} |
| PATCH | /planner/milestones/:id | {title?,target_date?,weight?,status?(pending/completed/missed),sort_order?} |
| DELETE | /planner/milestones/:id | 删除 |
| GET | /planner/goals/:id/reviews | 复盘列表 |
| POST | /planner/goals/:id/reviews | {rating(1-5),content,improvements?} |
| GET | /health/streak | {current_streak,longest_streak,last_checkin_date}（由 health_checkins 按天连续性实时计算，不单独建表） |
| GET | /health/challenges?status=active | 挑战列表 |
| POST | /health/challenges | {challenge_type,title,description,target_days,reward_xp} → 自动 start_date=今天,end_date=+target_days |
| PATCH | /health/challenges/:id | {completed_days?,status?} |

新增表：`goal_reviews`（id,goal_id,user_id,rating int,content,improvements,shared_to_wall bool default false,created_at）、`health_challenges`（契约字段同 useHealth.ts 的 HealthChallenge）。`goal_milestones` 已在 v1 建表。
health_checkins 表 v2 增列（如 v1 未含）：`sleep_start text`,`sleep_end text`,`sleep_quality int`,`exercise_type text`,`exercise_intensity text`,`exercise_image_url text`,`is_public bool default false`,`share_text text`,`share_tags text[]`,`ai_comment text`；`date` 命名对齐前端（v1 若用 checkin_date 则 `ALTER RENAME`，保持 `date`）。

### 4.3c AI 代理（v2 · 多供应商可切换，CC-switch 风格）

不写死任何单一 AI 来源。供应商存库、admin 可视化管理、请求时按优先级故障转移；任何 OpenAI 兼容端点（sub2api/OneAPI/DeepSeek/Moonshot/通义/OpenAI/Ollama…）都能接。

表 `ai_providers`：id, name, base_url, api_key（AES-GCM 加密存储，密钥 env `SECRET_KEY`）, model, enabled bool, priority int（小者优先）, timeout_ms int default 60000, created_at, updated_at。

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | /ai/chat | 登录；{messages,stream?,max_tokens?,provider_id?}。未指定 provider_id → 按 enabled+priority 顺序尝试，失败（网络/5xx/超时）自动切下一家（故障转移记入日志）；全部失败或无可用供应商 → 503 {code:"AI_UNCONFIGURED"}。stream=true 原样透传 SSE，禁用缓冲 |
| GET | /admin/ai-providers | 列表（api_key 打码显示末 4 位） |
| POST | /admin/ai-providers | 新增 {name,base_url,api_key,model,priority,timeout_ms} |
| PATCH | /admin/ai-providers/:id | 改配置/enabled；api_key 传空 = 不变 |
| DELETE | /admin/ai-providers/:id | 删除 |
| POST | /admin/ai-providers/:id/test | 发一条 "ping" 到该供应商，返回 {ok,latency_ms,error?}（连通性体检） |

seed：首次启动若表为空且 env 存在 `AI_BASE_URL`/`AI_API_KEY`，自动导入为第一条（本机 sub2api 即走此路）。admin 控制台新增「AI 供应商」页：列表 + 新增/编辑抽屉 + 一键测试 + 启停开关。

### 4.3d 邮箱验证码（v2）

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | /auth/email-code | {email, purpose: "register"\|"reset_password"}；生成 6 位数字码，10 分钟有效，同邮箱 60s 冷却。配置了 SMTP（env `SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS/SMTP_FROM`）→ 真发邮件（net/smtp + STARTTLS）；未配置 → 响应带 `{dev_mode:true, code:"123456"}` 并打日志，保证本地全链路可测。 |
| POST | /auth/verify-reset | {email, code, new_password}；校验通过改密并使旧 token 失效（users 加 `token_version int default 0`，JWT claim 带 tv，改密 +1） |

注册流程：POST /auth/register 增加可选 `email_code` 字段——配置了 SMTP 时强校验；dev 模式跳过。表：`email_codes`（id, email, code, purpose, expires_at, used bool default false, created_at；索引 email+purpose）。

### 4.3e 订单与支付（v2 · 校园二手交易闭环）

设计原则：支付网关抽象成 Provider 接口，先交付两个实现——`sandbox`（本地模拟，完整走单簿/签名回调/幂等）与 `alipay`（支付宝当面付/扫码协议按官方规范实现签名与验签，填入商户密钥即激活）。所有金额用整数分存储，杜绝浮点。

表：
- `shop_items`（id, seller_id, title, description, price_cents int, images text[], category, status: on_sale|sold|off_shelf, created_at, updated_at）
- `orders`（id, buyer_id, seller_id, item_id, amount_cents, status: pending|paid|cancelled|refunded, provider, provider_txn_id, created_at, paid_at, idempotency_key unique）
- `payment_events`（id, order_id, type, payload jsonb, created_at）——回调审计流水

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /shop/items?search=&category=&limit=&offset= | 在售商品列表（公开） |
| POST | /shop/items | 登录；发布商品 |
| PATCH | /shop/items/:id | 卖家/管理员；改价/下架 |
| POST | /shop/orders | 登录；{item_id, idempotency_key} → 创建 pending 订单（不能买自己的、不能重复未支付下单） |
| GET | /shop/orders?role=buyer\|seller | 我的订单 |
| POST | /shop/orders/:id/pay | {provider:"sandbox"\|"alipay"} → 返回 {pay_url 或 qr_code 内容}；sandbox 返回 `/api/pay/sandbox/:order_id` 确认页地址 |
| POST | /pay/sandbox/:order_id/confirm | 沙箱"支付成功"回调（仅 dev；HMAC-SHA256 签名校验，密钥 env `SANDBOX_PAY_SECRET`），幂等：paid 只置一次，item 置 sold |
| POST | /pay/alipay/notify | 支付宝异步通知：RSA2 验签（env `ALIPAY_PUBLIC_KEY` 等），成功置 paid；未配置密钥时 503 |
| POST | /shop/orders/:id/cancel | 买家取消 pending 订单 |
| Admin | GET /admin/orders?status= | 订单管理 + 金额汇总 |

前端：Shop 商品详情 → 「立即购买」创建订单 → 支付方式选择（沙箱支付一键完成 / 支付宝二维码占位提示未配置）→ 订单状态页实时刷新 → admin 订单页可见。

### 4.3f 推荐算法（v2 · 真实可解释）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /wall/recommended?limit=20 | 登录用户个性化推荐；未登录退化为纯热度榜 |

评分公式（服务端 SQL+Go 计算，响应带 `reason` 字段便于前端展示「因为你喜欢 #考研」）：
`score = 0.45*heat + 0.35*affinity + 0.20*freshness`
- heat = ln(1 + likes*2 + comments*3)（对数抑制头部）
- affinity = 用户近 30 天点赞/评论过的帖子的 tags/category 频率向量与候选帖 tags/category 的加权重合度（Jaccard 加权）
- freshness = exp(-小时龄/48)（48h 半衰）
- 排除：自己的帖子、已点赞过的帖子、hidden/deleted
- 冷启动（互动 < 3 条）：affinity 权重转给 heat

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

## 6. 部署拓扑（三个独立交付物，互不耦合）

| 交付物 | 构建产物 | 本地端口 | 服务器部署建议 |
|---|---|---|---|
| 用户前端（App + 官网公开页） | `frontend/dist/`（纯静态） | 5180 | Nginx 站点 A：`www.域名` / `app.域名` |
| 管理控制台 | `admin/dist/`（纯静态，独立应用独立仓目录） | 5181 | Nginx 站点 B：`admin.域名`（可加 IP 白名单/Basic Auth 双保险） |
| 后端 API | `backend/server/server`（单二进制）+ PostgreSQL | 8787 | systemd 服务，Nginx 反代 `api.域名`；数据库仅内网监听 |

原则：
- admin 与用户前端**物理分离**（不同构建、不同域名、不同静态目录），互相无 import；唯一共享物是 HTTP 契约。
- 官网公开页当前与 App 同构建（同一 Vue 应用的公开路由）；如需彻底拆分为第三站点，只拆路由不动后端，已列入后续切片。
- API 一律同源反代（`/api` → 8787），生产 CORS 收紧到正式域名，JWT_SECRET/SECRET_KEY 换强随机值。
- 示例 Nginx 配置随 B6 交付到 `docs/project/DEPLOYMENT.md`。

## 7. 前端迁移策略

1. `frontend/src/api/client.ts`：fetch 封装（token 注入、错误规范化、401 跳登录）。
2. 模块迁移顺序：auth → wall → schedule → planner → health → 其余；每迁一个模块删掉对应 supabase 调用。
3. `VITE_API_BASE=http://127.0.0.1:8787` 写入 `frontend/.env.local`（gitignored）。
4. 迁移期两套并存：未迁移模块继续走 supabase 客户端，不破坏现有功能。
