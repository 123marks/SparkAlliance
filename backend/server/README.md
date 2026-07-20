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

## 安全基线

- CORS 白名单；全局限速 300 req/min/IP，auth 端点 20 req/min/IP（内存令牌桶）。
- JWT HS256（sub/role/exp 24h）；每请求核对 users.status，disabled 即时失效。
- 所有 SQL 参数化（pgx）；非 admin 只能操作自己 user_id 的行。
- 请求日志一行（method path status ms user_id），不打印 body/token。

## 停止服务

前台运行按 Ctrl+C（优雅退出）；后台进程用 `Stop-Process -Name server`。
