package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

func openDB(ctx context.Context, cfg config) (*pgxpool.Pool, error) {
	poolCfg, err := pgxpool.ParseConfig(cfg.DatabaseURL)
	if err != nil {
		return nil, fmt.Errorf("解析 DATABASE_URL: %w", err)
	}
	poolCfg.MaxConns = 10
	pool, err := pgxpool.NewWithConfig(ctx, poolCfg)
	if err != nil {
		return nil, fmt.Errorf("创建连接池: %w", err)
	}
	pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	if err := pool.Ping(pingCtx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("数据库不可达: %w", err)
	}
	return pool, nil
}

// applySchema 启动时执行 db/schema.sql（幂等）。
func applySchema(ctx context.Context, pool *pgxpool.Pool) error {
	candidates := []string{filepath.Join("db", "schema.sql")}
	if exe, err := os.Executable(); err == nil {
		candidates = append(candidates, filepath.Join(filepath.Dir(exe), "db", "schema.sql"))
	}
	var data []byte
	var err error
	for _, p := range candidates {
		if data, err = os.ReadFile(p); err == nil {
			break
		}
	}
	if err != nil {
		return fmt.Errorf("读取 db/schema.sql: %w", err)
	}
	if _, err := pool.Exec(ctx, string(data)); err != nil {
		return fmt.Errorf("执行 schema.sql: %w", err)
	}
	return nil
}

// seedAdmin 无 admin 时创建 admin@spark.local，密码取 ADMIN_INIT_PASSWORD。
func seedAdmin(ctx context.Context, pool *pgxpool.Pool, cfg config) error {
	var count int
	if err := pool.QueryRow(ctx, `SELECT count(*) FROM users WHERE role = 'admin'`).Scan(&count); err != nil {
		return fmt.Errorf("查询 admin 数量: %w", err)
	}
	if count > 0 {
		return nil
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(cfg.AdminInitPassword), 10)
	if err != nil {
		return fmt.Errorf("bcrypt: %w", err)
	}
	_, err = pool.Exec(ctx,
		`INSERT INTO users (email, password_hash, nickname, role)
		 VALUES ($1, $2, '管理员', 'admin')
		 ON CONFLICT (email) DO UPDATE SET role = 'admin'`,
		"admin@spark.local", string(hash))
	if err != nil {
		return fmt.Errorf("写入 seed admin: %w", err)
	}
	log.Println("[seed] 已创建管理员 admin@spark.local（密码来自 ADMIN_INIT_PASSWORD，生产环境请尽快修改）")
	return nil
}
