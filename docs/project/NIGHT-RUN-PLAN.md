# 2026-07-20 夜间自动推进计划（大脑调度板）

> 我（主会话）是大脑：定规格、派 worker、验收合并、跑测试、提交推送。任一时刻并行 worker ≤ 2，避免机器卡顿。
> 每完成一批：跑 `vue-tsc`/`vitest`/`go vet`/冒烟脚本 → 修错 → 更新 DEVELOPMENT-HANDOFF.md → git commit + push。

## 批次状态

| 批次 | 内容 | 执行者 | 状态 |
|---|---|---|---|
| B1 | Go 后端 v1（契约 §4.1-4.5） | worker#1 | 🟡 进行中 |
| B1 | admin 控制台（登录/大盘/用户/内容/举报） | worker#2 | 🟡 进行中 |
| B2 | 后端 v1 + 前端认证/日程 + admin 三方联调冒烟，修断点 | 大脑 | ⬜ 等 B1 |
| B3 | 后端 v2 全量：§4.3b 规划/健康扩展 + §4.3c AI 代理 + §4.3d 邮箱验证码 + §4.3e 订单支付（sandbox+支付宝协议）+ §4.3f 推荐算法 | resume worker#1 | ⬜ 等 B2 |
| B3 | usePlanner/useHealth 前端迁移（对齐 v2 契约，优雅降级到位） | worker#3 | ⬜ 等 B2 |
| B4 | CampusWall.vue 全量迁移 /api/wall/*（含推荐 tab 接 /wall/recommended + reason 展示） | worker#4 | ⬜ 等 B3 |
| B4 | AppHome 主控台聚合迁移 + Register/ForgotPassword 邮箱验证码链路接通 | 大脑 | ⬜ 等 B3 |
| B5 | Shop 迁移 + 下单/支付/订单状态闭环 UI（沙箱支付全流程可点通） | worker#5 | ⬜ 等 B4 |
| B5 | AI 助手接 /api/ai/chat（流式），无配置时真实降级；useSparkAI 去 supabase 化 | 大脑 | ⬜ 等 B4 |
| B6 | admin 补订单管理页 + AI 供应商管理页；DEPLOYMENT.md（Nginx/systemd 三站点拓扑）；全链路回归：冒烟脚本 + 三视口截图 + 测试 + handoff + 最终 push | 大脑 | ⬜ 等 B5 |

## 监督纪律（大脑对 worker）

- 任何 worker 交付先过我三道验收：编译/类型零错、冒烟脚本真实输出、不越权改契约外文件；不合格就地返工或我亲自修。
- 并行 worker ≤ 2；重编译/测试串行跑，避免 CPU 峰值卡机。
- worker 只许改自己领地（backend/server、admin、指定前端文件），.gitignore/契约/调度板只有大脑动。

## 联调冒烟清单（B2，脚本化）

1. `cd backend && docker compose up -d`；`cd backend/server && .\server.exe`（或 go run .）
2. `/healthz` → ok
3. API 层：注册 night_user → 登录 → 建 3 个日程事件 → 查询区间命中
4. UI 层（playwright，复用 frontend/scripts/capture.mjs 思路）：/login 真实登录 → /app/schedule 看到事件 → 新建事件弹窗保存 → 刷新仍在
5. admin：admin@spark.local 登录 → 大盘数字非零 → 用户列表看到 night_user → 禁用再启用
6. 破坏性检查：错误密码 401 文案、未登录访问 /app 跳转、禁用用户登录 403 文案

## 生产激活项（代码链路完整，填密钥即真实生效；明早向用户说明）

- 邮箱验证码：SMTP 五个 env 一填即真发邮件；未配置时 dev_mode 返回验证码，链路照样可测（不是假流程，是可切换的传输层）。
- 支付宝支付：RSA2 签名/验签、异步通知、幂等置态全部按官方协议实现；填 ALIPAY_APP_ID/私钥/公钥即激活。沙箱 provider 今晚全流程可点通（下单→支付→订单已支付→商品已售出→admin 可见）。
- AI 网关：/api/ai/chat 默认指向本机 sub2api (127.0.0.1:8080/v1)，backend/server/.env 填 AI_API_KEY 即真实对话；未配置显示诚实「未配置」态。
- 伴侣/资源/自习室/学习中心等长尾模块本晚不强行迁移（保持本地态/不可用态，不崩）；配方已固化，逐模块照抄。
