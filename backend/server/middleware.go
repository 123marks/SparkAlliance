package main

import (
	"context"
	"log"
	"net"
	"net/http"
	"runtime/debug"
	"slices"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type ctxKey int

const (
	ctxUserID ctxKey = iota
	ctxRole
)

func userID(r *http.Request) string {
	v, _ := r.Context().Value(ctxUserID).(string)
	return v
}

func userRole(r *http.Request) string {
	v, _ := r.Context().Value(ctxRole).(string)
	return v
}

func isAdmin(r *http.Request) bool { return userRole(r) == "admin" }

// ---- 响应状态记录（请求日志用）----

type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (sr *statusRecorder) WriteHeader(code int) {
	sr.status = code
	sr.ResponseWriter.WriteHeader(code)
}

// ---- IP 令牌桶限速（契约 §5：全局 300/min，auth 端点 20/min）----

type bucket struct {
	tokens float64
	last   time.Time
}

type rateLimiter struct {
	mu      sync.Mutex
	buckets map[string]*bucket
	rate    float64 // 每秒补充令牌数
	burst   float64
}

func newRateLimiter(perMinute float64) *rateLimiter {
	return &rateLimiter{
		buckets: make(map[string]*bucket),
		rate:    perMinute / 60.0,
		burst:   perMinute,
	}
}

func (rl *rateLimiter) allow(ip string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	now := time.Now()
	b, ok := rl.buckets[ip]
	if !ok {
		b = &bucket{tokens: rl.burst, last: now}
		rl.buckets[ip] = b
	}
	b.tokens += now.Sub(b.last).Seconds() * rl.rate
	if b.tokens > rl.burst {
		b.tokens = rl.burst
	}
	b.last = now
	if b.tokens < 1 {
		return false
	}
	b.tokens--
	return true
}

// cleanupLoop 定期清理不活跃的桶，防止内存无限增长。
func (rl *rateLimiter) cleanupLoop() {
	for {
		time.Sleep(5 * time.Minute)
		rl.mu.Lock()
		cutoff := time.Now().Add(-10 * time.Minute)
		for ip, b := range rl.buckets {
			if b.last.Before(cutoff) {
				delete(rl.buckets, ip)
			}
		}
		rl.mu.Unlock()
	}
}

func clientIP(r *http.Request) string {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

// ---- 外层中间件：recover → 日志 → CORS → 全局限速 → 尽力解析身份 ----

func (a *app) wrap(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		sr := &statusRecorder{ResponseWriter: w, status: http.StatusOK}

		// 尽力解析身份：公开端点也能拿到 liked 等个性化字段；失败不拦截。
		if uid, role, ok := a.authenticate(r); ok {
			ctx := context.WithValue(r.Context(), ctxUserID, uid)
			ctx = context.WithValue(ctx, ctxRole, role)
			r = r.WithContext(ctx)
		}

		defer func() {
			if rec := recover(); rec != nil {
				log.Printf("[panic] %v\n%s", rec, debug.Stack())
				writeError(sr, http.StatusInternalServerError, "INTERNAL", "服务器内部错误")
			}
			uid := userID(r)
			if uid == "" {
				uid = "-"
			}
			// 契约 §5：每请求一行日志，不打印 body/token
			log.Printf("%s %s %d %dms %s", r.Method, r.URL.Path, sr.status,
				time.Since(start).Milliseconds(), uid)
		}()

		origin := r.Header.Get("Origin")
		if origin != "" && slices.Contains(a.cfg.CORSOrigins, origin) {
			h := sr.Header()
			h.Set("Access-Control-Allow-Origin", origin)
			h.Set("Vary", "Origin")
			h.Set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
			h.Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
			h.Set("Access-Control-Max-Age", "600")
		}
		if r.Method == http.MethodOptions {
			sr.WriteHeader(http.StatusNoContent)
			return
		}

		if !a.globalRL.allow(clientIP(r)) {
			writeError(sr, http.StatusTooManyRequests, "RATE_LIMITED", "请求过于频繁，请稍后再试")
			return
		}

		next.ServeHTTP(sr, r)
	})
}

// ---- JWT ----

func (a *app) signToken(uid, role string) (string, error) {
	claims := jwt.MapClaims{
		"sub":  uid,
		"role": role,
		"exp":  time.Now().Add(24 * time.Hour).Unix(),
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(a.cfg.JWTSecret))
}

// authenticate 校验 Bearer JWT，并每请求核对 users.status（disabled 立即失效，契约 §5）。
// role 以数据库当前值为准，管理员降权即时生效。
func (a *app) authenticate(r *http.Request) (uid, role string, ok bool) {
	h := r.Header.Get("Authorization")
	tokenStr, found := strings.CutPrefix(h, "Bearer ")
	if !found || tokenStr == "" {
		return "", "", false
	}
	token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (any, error) {
		if t.Method != jwt.SigningMethodHS256 {
			return nil, jwt.ErrSignatureInvalid
		}
		return []byte(a.cfg.JWTSecret), nil
	}, jwt.WithExpirationRequired())
	if err != nil || !token.Valid {
		return "", "", false
	}
	claims, _ := token.Claims.(jwt.MapClaims)
	sub, _ := claims["sub"].(string)
	if !isValidUUID(sub) {
		return "", "", false
	}
	var dbRole, dbStatus string
	if err := a.pool.QueryRow(r.Context(),
		`SELECT role, status FROM users WHERE id = $1`, sub).Scan(&dbRole, &dbStatus); err != nil {
		return "", "", false
	}
	if dbStatus != "active" {
		return "", "", false
	}
	return sub, dbRole, true
}

// requireAuth 登录保护（身份已在 wrap 里注入 ctx）。
func (a *app) requireAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if userID(r) == "" {
			writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "请先登录")
			return
		}
		next(w, r)
	}
}

// requireAdmin 管理员保护。
func (a *app) requireAdmin(next http.HandlerFunc) http.HandlerFunc {
	return a.requireAuth(func(w http.ResponseWriter, r *http.Request) {
		if !isAdmin(r) {
			writeError(w, http.StatusForbidden, "FORBIDDEN", "需要管理员权限")
			return
		}
		next(w, r)
	})
}

// authRate 注册/登录端点的更严限速。
func (a *app) authRate(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !a.authRL.allow(clientIP(r)) {
			writeError(w, http.StatusTooManyRequests, "RATE_LIMITED", "认证请求过于频繁，请稍后再试")
			return
		}
		next(w, r)
	}
}
