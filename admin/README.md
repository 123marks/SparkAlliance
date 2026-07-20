# Spark Admin · 星火联盟管理控制台

独立于用户前端（`frontend/`，端口 5180）的后台管理应用。

- 技术栈：Vue 3 + TypeScript + Vite + vue-router + ECharts（fetch 直连，无 axios / pinia / UI 框架）
- 开发端口：**5181**（strictPort）
- 后端 API：默认 `http://127.0.0.1:8787`，可在 `.env.local` 里用 `VITE_API_BASE` 覆盖
- 契约：`docs/project/BACKEND-CONTRACT.md`（§2 认证、§4.4 Admin API）

## 命令

```bash
npm install            # 网络慢可加 --registry=https://registry.npmmirror.com
npm run dev            # http://127.0.0.1:5181
npm run build          # vue-tsc --noEmit + vite build
npm run preview
```

## 登录

仅 `role=admin` 的账号可进入（seed 管理员 `admin@spark.local`，见 `backend/server/.env.example`）。
Token 存 localStorage `spark_admin_token`；任何接口返回 401 会自动清 token 并回登录页。

## 页面

| 路由 | 功能 |
|---|---|
| `/login` | 管理员登录（非 admin 拒绝） |
| `/` | 总览：8 统计卡 + 30 天趋势折线 + 模块数据量条形图 |
| `/users` | 用户管理：搜索 / 分页 / 禁用启用 / 设撤管理员 |
| `/posts` | 内容审核：状态 tab / 搜索 / 隐藏恢复删除 |
| `/reports` | 举报处理：忽略或处理并隐藏被举报内容 |
