# Spark Alliance 自建后端（Go）

契约见 `docs/project/BACKEND-CONTRACT.md`。Go 1.26 + net/http 方法路由 + pgx/v5 + golang-jwt/v5 + bcrypt，无 Web 框架。

## 启动步骤

```powershell
# 1. 启动 PostgreSQL 18（容器 spark-postgres，监听 127.0.0.1:5433）
cd backend
docker compose up -d

# 2. 准备配置（首次）
cd server
Copy-Item .env.example .env    # 按需修改 JWT_SECRET / ADMIN_INIT_PASSWORD

# 3. 编译并运行
$env:GOPROXY='https://goproxy.cn,direct'
go build -o server.exe .
.\server.exe
```

启动时自动执行 `db/schema.sql`（幂等建表/索引/触发器），并在无管理员时创建
`admin@spark.local`（密码取 `ADMIN_INIT_PASSWORD`）。服务监听 `127.0.0.1:<PORT>`。

## .env 说明

| 变量 | 说明 | 默认 |
|---|---|---|
| DATABASE_URL | PostgreSQL 连接串 | 指向容器 spark-postgres（5433） |
| JWT_SECRET | HS256 签名密钥，必填 | 无（缺失则拒绝启动） |
| PORT | 监听端口 | 8787 |
| CORS_ORIGINS | 允许的前端来源，逗号分隔 | 5180/5181 本地地址 |
| ADMIN_INIT_PASSWORD | 种子管理员初始密码 | SparkAdmin2026! |
| SECRET_KEY | AI 供应商 api_key 的 AES-GCM 主密钥 | 缺省由 JWT_SECRET 派生 |
| SMTP_HOST/PORT/USER/PASS/FROM | 五项齐全才真发邮件（STARTTLS） | 未配置走 dev_mode 明文回码 |
| SANDBOX_PAY_SECRET | 沙箱支付回调 HMAC 密钥 | sandbox_pay_dev_secret_2026 |
| ALIPAY_APP_ID/PRIVATE_KEY/PUBLIC_KEY | 支付宝当面付三件套，齐全即激活 | 未配置 alipay 支付 503 |
| ALIPAY_GATEWAY / ALIPAY_NOTIFY_URL | 网关与回调地址 | 官方网关 / 空 |
| AI_BASE_URL / AI_API_KEY / AI_MODEL | 首启 ai_providers 表空时自动 seed 第一条 | 空则不 seed |

进程环境变量优先于 `.env` 文件；`.env`、`uploads/`、`server.exe` 均已 gitignore。

## 端点清单

统一前缀 `/api`（healthz 和静态文件除外）。带 * 的需要登录，带 ** 的需要 admin。
错误体统一 `{"error":"人话","code":"MACHINE_CODE"}`。

| 端点 | 说明 |
|---|---|
| GET /healthz | 健康检查（含 DB 连通性） |
| POST /api/auth/register | 注册，返回 {token,user} |
| POST /api/auth/login | 登录，返回 {token,user} |
| GET /api/auth/me * | 当前用户信息 |
| PATCH /api/auth/me * | 更新昵称/头像/学校/地区 |
| GET /api/wall/posts | 帖子列表（visible，支持 category/search/分页，登录带 liked） |
| POST /api/wall/posts * | 发帖 |
| DELETE /api/wall/posts/:id * | 删帖（作者或 admin，软删） |
| POST /api/wall/posts/:id/like * | 点赞 toggle |
| GET /api/wall/posts/:id/comments | 评论列表（不含隐藏） |
| POST /api/wall/posts/:id/comments * | 发评论 |
| POST /api/wall/comments/:id/like * | 评论点赞 toggle |
| POST /api/wall/reports * | 举报帖子/评论（二选一） |
| GET /api/schedule/events?from=&to= * | 日程区间重叠查询 |
| POST/PATCH/DELETE /api/schedule/events(/:id) * | 日程增改删 |
| GET /api/planner/goals * | 目标列表（含 milestones） |
| POST/PATCH/DELETE /api/planner/goals(/:id) * | 目标增改删 |
| GET /api/planner/tasks?status=&due_before=&unscheduled=1 * | 任务列表 |
| POST/PATCH/DELETE /api/planner/tasks(/:id) * | 任务增改删 |
| GET /api/health/checkins?from=&to= * | 打卡记录查询 |
| POST /api/health/checkins * | 打卡 upsert（按 user+日期唯一） |
| GET /api/admin/stats/overview ** | 大盘统计 |
| GET /api/admin/stats/trend?days=30 ** | 按天趋势 |
| GET /api/admin/stats/modules ** | 各模块行数 |
| GET /api/admin/users ** | 用户管理列表（含 posts_count） |
| PATCH /api/admin/users/:id ** | 改用户 status/role（不能改自己） |
| GET /api/admin/posts ** | 帖子审核列表（含作者） |
| PATCH /api/admin/posts/:id ** | 改帖子 status（visible/hidden/deleted） |
| GET /api/admin/reports?status= ** | 举报列表（含内容摘要） |
| PATCH /api/admin/reports/:id ** | 处理举报（resolved 可带 hide_target） |
| POST /api/uploads * | 文件上传（≤5MB，png/jpg/jpeg/webp/gif/mp4/webm） |
| GET /uploads/:name | 上传文件静态访问 |

### v2 扩展端点

| 端点 | 说明 |
|---|---|
| POST /api/auth/email-code | 发验证码（register/reset_password；SMTP 未配置时 dev_mode 明文回码；60s 冷却 429） |
| POST /api/auth/verify-reset | 验证码改密；token_version+1 使旧 JWT 全部失效 |
| GET/POST /api/planner/goals/:id/milestones * | 里程碑列表/新建 |
| PATCH/DELETE /api/planner/milestones/:id * | 里程碑改（status: pending/completed/missed）/删 |
| GET/POST /api/planner/goals/:id/reviews * | 目标复盘列表/新建（rating 1-5） |
| GET /api/health/streak * | {current_streak,longest_streak,last_checkin_date}（实时计算） |
| GET/POST /api/health/challenges * | 挑战列表（?status=）/创建（start=今天，end=+target_days） |
| PATCH /api/health/challenges/:id * | 更新 completed_days/current_value/status |
| POST /api/ai/chat * | OpenAI 兼容代理；enabled+priority 故障转移；stream=true SSE 逐块透传；无可用供应商 503 AI_UNCONFIGURED |
| GET/POST /api/admin/ai-providers ** | 供应商列表（api_key 打码末 4 位）/新增（AES-GCM 加密存库） |
| PATCH/DELETE /api/admin/ai-providers/:id ** | 改配置（api_key 传空不变）/删除 |
| POST /api/admin/ai-providers/:id/test ** | 发一条 ping 实测连通，返回 {ok,latency_ms,error?} |
| GET /api/shop/items | 在售商品列表（公开，search/category/分页） |
| POST /api/shop/items * | 发布商品（price_cents 整数分） |
| PATCH /api/shop/items/:id * | 卖家/管理员改价、上下架（sold 不可手改） |
| POST /api/shop/orders * | 下单 {item_id,idempotency_key}；同 key 重放返回原订单；不能买自己的 |
| GET /api/shop/orders?role=buyer\|seller * | 我的订单（买家/卖家视角） |
| POST /api/shop/orders/:id/pay * | {provider:sandbox\|alipay}；sandbox 返回确认地址+HMAC 签名；alipay 未配置 503 |
| POST /api/pay/sandbox/:order_id/confirm | 沙箱回调（HMAC-SHA256 验签）；幂等置 paid + 商品 sold + 流水 |
| POST /api/pay/alipay/notify | 支付宝异步通知（RSA2 验签框架，填 ALIPAY_* 即激活） |
| POST /api/shop/orders/:id/cancel * | 买家取消 pending 订单 |
| GET /api/admin/orders?status= ** | 订单管理 + total/paid 金额汇总 |
| GET /api/wall/recommended?limit= | 可解释推荐（0.45 heat+0.35 affinity+0.20 freshness，带 reason）；未登录纯热度 |

## 安全基线

- CORS 白名单；全局限速 300 req/min/IP，auth 端点 20 req/min/IP（内存令牌桶）。
- JWT HS256（sub/role/exp 24h）；每请求核对 users.status，disabled 即时失效。
- 所有 SQL 参数化（pgx）；非 admin 只能操作自己 user_id 的行。
- 请求日志一行（method path status ms user_id），不打印 body/token。

## 停止服务

前台运行按 Ctrl+C（优雅退出）；后台进程用 `Stop-Process -Name server`。
