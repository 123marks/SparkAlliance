package main

import (
	"log"
	"os"
	"path/filepath"
	"strings"
)

type config struct {
	DatabaseURL       string
	JWTSecret         string
	Port              string
	CORSOrigins       []string
	AdminInitPassword string
	UploadDir         string

	// v2
	SecretKey        string // AES-GCM 主密钥原文（缺省由 JWT_SECRET 派生）
	SMTPHost         string
	SMTPPort         string
	SMTPUser         string
	SMTPPass         string
	SMTPFrom         string
	SandboxPaySecret string
	AlipayAppID      string
	AlipayPrivateKey string // 商户应用私钥 PEM（PKCS1/PKCS8）
	AlipayPublicKey  string // 支付宝公钥 PEM
	AlipayGateway    string
	AlipayNotifyURL  string
	AIBaseURL        string // 首启 seed 用
	AIAPIKey         string
}

// smtpConfigured SMTP 五项 env 齐全才真发邮件，否则 dev_mode。
func (c config) smtpConfigured() bool {
	return c.SMTPHost != "" && c.SMTPPort != "" && c.SMTPUser != "" &&
		c.SMTPPass != "" && c.SMTPFrom != ""
}

func (c config) alipayConfigured() bool {
	return c.AlipayAppID != "" && c.AlipayPrivateKey != "" && c.AlipayPublicKey != ""
}

// loadDotEnv 手写解析 KEY=VALUE 格式的 .env；已存在的环境变量优先，不被覆盖。
func loadDotEnv(path string) {
	data, err := os.ReadFile(path)
	if err != nil {
		return
	}
	for _, line := range strings.Split(string(data), "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		key, val, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}
		key = strings.TrimSpace(key)
		val = strings.TrimSpace(val)
		if len(val) >= 2 && ((val[0] == '"' && val[len(val)-1] == '"') || (val[0] == '\'' && val[len(val)-1] == '\'')) {
			val = val[1 : len(val)-1]
		}
		if key == "" {
			continue
		}
		if os.Getenv(key) == "" {
			_ = os.Setenv(key, val)
		}
	}
}

func envOr(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func loadConfig() config {
	loadDotEnv(".env")
	// 兜底：从二进制所在目录找 .env（Start-Process 未指定工作目录时也能启动）
	if exe, err := os.Executable(); err == nil {
		loadDotEnv(filepath.Join(filepath.Dir(exe), ".env"))
	}

	cfg := config{
		DatabaseURL:       envOr("DATABASE_URL", "postgres://spark:spark_dev_2026@127.0.0.1:5433/spark_alliance?sslmode=disable"),
		JWTSecret:         os.Getenv("JWT_SECRET"),
		Port:              envOr("PORT", "8787"),
		AdminInitPassword: envOr("ADMIN_INIT_PASSWORD", "SparkAdmin2026!"),
		UploadDir:         envOr("UPLOAD_DIR", "uploads"),

		SecretKey:        os.Getenv("SECRET_KEY"),
		SMTPHost:         os.Getenv("SMTP_HOST"),
		SMTPPort:         os.Getenv("SMTP_PORT"),
		SMTPUser:         os.Getenv("SMTP_USER"),
		SMTPPass:         os.Getenv("SMTP_PASS"),
		SMTPFrom:         os.Getenv("SMTP_FROM"),
		SandboxPaySecret: envOr("SANDBOX_PAY_SECRET", "sandbox_pay_dev_secret_2026"),
		AlipayAppID:      os.Getenv("ALIPAY_APP_ID"),
		AlipayPrivateKey: os.Getenv("ALIPAY_PRIVATE_KEY"),
		AlipayPublicKey:  os.Getenv("ALIPAY_PUBLIC_KEY"),
		AlipayGateway:    envOr("ALIPAY_GATEWAY", "https://openapi.alipay.com/gateway.do"),
		AlipayNotifyURL:  os.Getenv("ALIPAY_NOTIFY_URL"),
		AIBaseURL:        os.Getenv("AI_BASE_URL"),
		AIAPIKey:         os.Getenv("AI_API_KEY"),
	}
	for _, o := range strings.Split(envOr("CORS_ORIGINS", ""), ",") {
		if o = strings.TrimSpace(o); o != "" {
			cfg.CORSOrigins = append(cfg.CORSOrigins, o)
		}
	}
	if cfg.JWTSecret == "" {
		log.Fatal("JWT_SECRET 未配置：请在 backend/server/.env 或环境变量中设置")
	}
	return cfg
}
