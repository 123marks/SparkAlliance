package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type app struct {
	cfg      config
	pool     *pgxpool.Pool
	globalRL *rateLimiter
	authRL   *rateLimiter
}

func main() {
	log.SetFlags(log.LstdFlags | log.LUTC)
	cfg := loadConfig()

	ctx := context.Background()
	pool, err := openDB(ctx, cfg)
	if err != nil {
		log.Fatalf("[启动失败] %v", err)
	}
	defer pool.Close()

	if err := applySchema(ctx, pool); err != nil {
		log.Fatalf("[启动失败] %v", err)
	}
	if err := seedAdmin(ctx, pool, cfg); err != nil {
		log.Fatalf("[启动失败] %v", err)
	}

	a := &app{
		cfg:      cfg,
		pool:     pool,
		globalRL: newRateLimiter(300),
		authRL:   newRateLimiter(20),
	}
	go a.globalRL.cleanupLoop()
	go a.authRL.cleanupLoop()

	mux := http.NewServeMux()

	// 健康检查
	mux.HandleFunc("GET /healthz", a.handleHealthz)

	// Auth（注册/登录带更严限速）
	mux.HandleFunc("POST /api/auth/register", a.authRate(a.handleRegister))
	mux.HandleFunc("POST /api/auth/login", a.authRate(a.handleLogin))
	mux.HandleFunc("GET /api/auth/me", a.requireAuth(a.handleMe))
	mux.HandleFunc("PATCH /api/auth/me", a.requireAuth(a.handleUpdateMe))

	// 校园墙
	mux.HandleFunc("GET /api/wall/posts", a.handleListPosts)
	mux.HandleFunc("POST /api/wall/posts", a.requireAuth(a.handleCreatePost))
	mux.HandleFunc("DELETE /api/wall/posts/{id}", a.requireAuth(a.handleDeletePost))
	mux.HandleFunc("POST /api/wall/posts/{id}/like", a.requireAuth(a.handleTogglePostLike))
	mux.HandleFunc("GET /api/wall/posts/{id}/comments", a.handleListComments)
	mux.HandleFunc("POST /api/wall/posts/{id}/comments", a.requireAuth(a.handleCreateComment))
	mux.HandleFunc("POST /api/wall/comments/{id}/like", a.requireAuth(a.handleToggleCommentLike))
	mux.HandleFunc("POST /api/wall/reports", a.requireAuth(a.handleCreateReport))

	// 日程
	mux.HandleFunc("GET /api/schedule/events", a.requireAuth(a.handleListEvents))
	mux.HandleFunc("POST /api/schedule/events", a.requireAuth(a.handleCreateEvent))
	mux.HandleFunc("PATCH /api/schedule/events/{id}", a.requireAuth(a.handleUpdateEvent))
	mux.HandleFunc("DELETE /api/schedule/events/{id}", a.requireAuth(a.handleDeleteEvent))

	// 规划（目标 + 任务）
	mux.HandleFunc("GET /api/planner/goals", a.requireAuth(a.handleListGoals))
	mux.HandleFunc("POST /api/planner/goals", a.requireAuth(a.handleCreateGoal))
	mux.HandleFunc("PATCH /api/planner/goals/{id}", a.requireAuth(a.handleUpdateGoal))
	mux.HandleFunc("DELETE /api/planner/goals/{id}", a.requireAuth(a.handleDeleteGoal))
	mux.HandleFunc("GET /api/planner/tasks", a.requireAuth(a.handleListTasks))
	mux.HandleFunc("POST /api/planner/tasks", a.requireAuth(a.handleCreateTask))
	mux.HandleFunc("PATCH /api/planner/tasks/{id}", a.requireAuth(a.handleUpdateTask))
	mux.HandleFunc("DELETE /api/planner/tasks/{id}", a.requireAuth(a.handleDeleteTask))

	// 健康打卡
	mux.HandleFunc("GET /api/health/checkins", a.requireAuth(a.handleListCheckins))
	mux.HandleFunc("POST /api/health/checkins", a.requireAuth(a.handleUpsertCheckin))

	// Admin
	mux.HandleFunc("GET /api/admin/stats/overview", a.requireAdmin(a.handleAdminOverview))
	mux.HandleFunc("GET /api/admin/stats/trend", a.requireAdmin(a.handleAdminTrend))
	mux.HandleFunc("GET /api/admin/stats/modules", a.requireAdmin(a.handleAdminModules))
	mux.HandleFunc("GET /api/admin/users", a.requireAdmin(a.handleAdminListUsers))
	mux.HandleFunc("PATCH /api/admin/users/{id}", a.requireAdmin(a.handleAdminUpdateUser))
	mux.HandleFunc("GET /api/admin/posts", a.requireAdmin(a.handleAdminListPosts))
	mux.HandleFunc("PATCH /api/admin/posts/{id}", a.requireAdmin(a.handleAdminUpdatePost))
	mux.HandleFunc("GET /api/admin/reports", a.requireAdmin(a.handleAdminListReports))
	mux.HandleFunc("PATCH /api/admin/reports/{id}", a.requireAdmin(a.handleAdminUpdateReport))

	// 上传
	mux.HandleFunc("POST /api/uploads", a.requireAuth(a.handleUpload))
	mux.HandleFunc("GET /uploads/{name}", a.handleServeUpload)

	srv := &http.Server{
		Addr:              "127.0.0.1:" + cfg.Port,
		Handler:           a.wrap(mux),
		ReadHeaderTimeout: 10 * time.Second,
	}

	go func() {
		log.Printf("Spark Alliance API 监听 http://%s", srv.Addr)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("[HTTP] %v", err)
		}
	}()

	// 优雅退出
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
	<-quit
	log.Println("正在关闭……")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Printf("[关闭] %v", err)
	}
	log.Println("已退出")
}
