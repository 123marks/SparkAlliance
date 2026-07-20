package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type aiProvider struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	BaseURL   string `json:"base_url"`
	APIKey    string `json:"api_key"` // 列表响应中为打码值
	Model     string `json:"model"`
	Enabled   bool   `json:"enabled"`
	Priority  int    `json:"priority"`
	TimeoutMs int    `json:"timeout_ms"`
	CreatedAt string `json:"created_at"`
	UpdatedAt string `json:"updated_at"`
}

const aiProviderCols = `id, name, base_url, api_key, model, enabled, priority,
	timeout_ms, created_at, updated_at`

func scanAIProvider(row rowScanner) (aiProvider, error) {
	var p aiProvider
	var created, updated time.Time
	err := row.Scan(&p.ID, &p.Name, &p.BaseURL, &p.APIKey, &p.Model,
		&p.Enabled, &p.Priority, &p.TimeoutMs, &created, &updated)
	if err != nil {
		return p, err
	}
	p.CreatedAt = fmtTime(created)
	p.UpdatedAt = fmtTime(updated)
	return p, nil
}

// seedAIProvider 首启表空且配置了 AI_BASE_URL/AI_API_KEY 时导入第一条（契约 §4.3c）。
func (a *app) seedAIProvider(ctx context.Context, pool *pgxpool.Pool) error {
	if a.cfg.AIBaseURL == "" || a.cfg.AIAPIKey == "" {
		return nil
	}
	var count int
	if err := pool.QueryRow(ctx, `SELECT count(*) FROM ai_providers`).Scan(&count); err != nil {
		return err
	}
	if count > 0 {
		return nil
	}
	enc, err := a.encryptSecret(a.cfg.AIAPIKey)
	if err != nil {
		return err
	}
	_, err = pool.Exec(ctx,
		`INSERT INTO ai_providers (name, base_url, api_key, model, priority)
		 VALUES ('默认供应商', $1, $2, $3, 1)`,
		a.cfg.AIBaseURL, enc, envOr("AI_MODEL", "gpt-4o-mini"))
	if err == nil {
		log.Printf("[seed] 已从 AI_BASE_URL 导入默认 AI 供应商（%s）", a.cfg.AIBaseURL)
	}
	return err
}

// chatEndpoint base_url 规整为 /chat/completions 完整地址。
func chatEndpoint(baseURL string) string {
	return strings.TrimRight(baseURL, "/") + "/chat/completions"
}

// callProvider 向单个供应商发起请求；确认响应头 2xx 后才返回，保证 failover 安全。
func (a *app) callProvider(ctx context.Context, p aiProvider, body []byte, stream bool) (*http.Response, error) {
	apiKey, err := a.decryptSecret(p.APIKey)
	if err != nil {
		return nil, fmt.Errorf("api_key 解密失败: %w", err)
	}
	timeout := time.Duration(p.TimeoutMs) * time.Millisecond
	if timeout <= 0 {
		timeout = 60 * time.Second
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		chatEndpoint(p.BaseURL), bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	// 流式只限制响应头返回时间（长流不整体限时）；非流式整体限时
	client := &http.Client{Transport: &http.Transport{ResponseHeaderTimeout: timeout}}
	if !stream {
		client.Timeout = timeout
	}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		defer resp.Body.Close()
		snippet, _ := io.ReadAll(io.LimitReader(resp.Body, 300))
		return nil, fmt.Errorf("HTTP %d: %s", resp.StatusCode, string(snippet))
	}
	return resp, nil
}

// POST /api/ai/chat（登录；按 enabled+priority 故障转移；SSE 透传）
func (a *app) handleAIChat(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Messages   json.RawMessage `json:"messages"`
		Stream     bool            `json:"stream"`
		MaxTokens  *int            `json:"max_tokens"`
		ProviderID string          `json:"provider_id"`
	}
	if !decodeJSON(w, r, &in) {
		return
	}
	if len(in.Messages) == 0 || !json.Valid(in.Messages) {
		writeError(w, http.StatusBadRequest, "VALIDATION", "messages 必填且需为合法 JSON 数组")
		return
	}

	var rows []aiProvider
	var err error
	if in.ProviderID != "" {
		if !isValidUUID(in.ProviderID) {
			writeError(w, http.StatusNotFound, "NOT_FOUND", "供应商不存在")
			return
		}
		var p aiProvider
		p, err = scanAIProvider(a.pool.QueryRow(r.Context(),
			`SELECT `+aiProviderCols+` FROM ai_providers WHERE id = $1 AND enabled = true`,
			in.ProviderID))
		if err == nil {
			rows = []aiProvider{p}
		} else if isNoRows(err) {
			writeError(w, http.StatusNotFound, "NOT_FOUND", "供应商不存在或未启用")
			return
		}
	} else {
		rows, err = a.listEnabledProviders(r.Context())
	}
	if err != nil && !isNoRows(err) {
		writeDBError(w, err)
		return
	}
	if len(rows) == 0 {
		writeError(w, http.StatusServiceUnavailable, "AI_UNCONFIGURED", "暂无可用的 AI 供应商")
		return
	}

	for _, p := range rows {
		payload := map[string]any{
			"model":    p.Model,
			"messages": in.Messages,
			"stream":   in.Stream,
		}
		if in.MaxTokens != nil {
			payload["max_tokens"] = *in.MaxTokens
		}
		body, _ := json.Marshal(payload)

		resp, err := a.callProvider(r.Context(), p, body, in.Stream)
		if err != nil {
			log.Printf("[ai] 供应商 %s 失败，切换下一家: %v", p.Name, err)
			continue
		}
		defer resp.Body.Close()

		if in.Stream {
			w.Header().Set("Content-Type", "text/event-stream")
			w.Header().Set("Cache-Control", "no-cache")
			w.Header().Set("X-Accel-Buffering", "no")
			w.WriteHeader(http.StatusOK)
			flusher, canFlush := w.(http.Flusher)
			buf := make([]byte, 4096)
			for {
				n, readErr := resp.Body.Read(buf)
				if n > 0 {
					if _, writeErr := w.Write(buf[:n]); writeErr != nil {
						return
					}
					if canFlush {
						flusher.Flush()
					}
				}
				if readErr != nil {
					return
				}
			}
		}

		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		w.WriteHeader(http.StatusOK)
		_, _ = io.Copy(w, resp.Body)
		return
	}
	writeError(w, http.StatusServiceUnavailable, "AI_UNCONFIGURED", "所有 AI 供应商均不可用")
}

func (a *app) listEnabledProviders(ctx context.Context) ([]aiProvider, error) {
	rows, err := a.pool.Query(ctx,
		`SELECT `+aiProviderCols+` FROM ai_providers WHERE enabled = true
		 ORDER BY priority ASC, created_at ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	providers := []aiProvider{}
	for rows.Next() {
		p, err := scanAIProvider(rows)
		if err != nil {
			return nil, err
		}
		providers = append(providers, p)
	}
	return providers, nil
}

// maskProviderKey 解密后打码；解密失败统一 "****"。
func (a *app) maskProviderKey(enc string) string {
	if enc == "" {
		return ""
	}
	plain, err := a.decryptSecret(enc)
	if err != nil {
		return "****"
	}
	return maskSecret(plain)
}

// GET /api/admin/ai-providers
func (a *app) handleAdminListAIProviders(w http.ResponseWriter, r *http.Request) {
	rows, err := a.pool.Query(r.Context(),
		`SELECT `+aiProviderCols+` FROM ai_providers ORDER BY priority ASC, created_at ASC`)
	if err != nil {
		writeDBError(w, err)
		return
	}
	defer rows.Close()
	providers := []aiProvider{}
	for rows.Next() {
		p, err := scanAIProvider(rows)
		if err != nil {
			writeDBError(w, err)
			return
		}
		p.APIKey = a.maskProviderKey(p.APIKey)
		providers = append(providers, p)
	}
	writeJSON(w, http.StatusOK, map[string]any{"providers": providers})
}

// POST /api/admin/ai-providers
func (a *app) handleAdminCreateAIProvider(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Name      string `json:"name"`
		BaseURL   string `json:"base_url"`
		APIKey    string `json:"api_key"`
		Model     string `json:"model"`
		Priority  *int   `json:"priority"`
		TimeoutMs *int   `json:"timeout_ms"`
	}
	if !decodeJSON(w, r, &in) {
		return
	}
	in.Name = strings.TrimSpace(in.Name)
	in.BaseURL = strings.TrimSpace(in.BaseURL)
	if in.Name == "" || in.BaseURL == "" {
		writeError(w, http.StatusBadRequest, "VALIDATION", "name 和 base_url 必填")
		return
	}
	if !strings.HasPrefix(in.BaseURL, "http://") && !strings.HasPrefix(in.BaseURL, "https://") {
		writeError(w, http.StatusBadRequest, "VALIDATION", "base_url 必须以 http(s):// 开头")
		return
	}
	enc := ""
	if in.APIKey != "" {
		var err error
		if enc, err = a.encryptSecret(in.APIKey); err != nil {
			writeError(w, http.StatusInternalServerError, "INTERNAL", "密钥加密失败")
			return
		}
	}
	priority, timeoutMs := 100, 60000
	if in.Priority != nil {
		priority = *in.Priority
	}
	if in.TimeoutMs != nil && *in.TimeoutMs > 0 {
		timeoutMs = *in.TimeoutMs
	}

	p, err := scanAIProvider(a.pool.QueryRow(r.Context(),
		`INSERT INTO ai_providers (name, base_url, api_key, model, priority, timeout_ms)
		 VALUES ($1, $2, $3, $4, $5, $6) RETURNING `+aiProviderCols,
		in.Name, in.BaseURL, enc, strings.TrimSpace(in.Model), priority, timeoutMs))
	if err != nil {
		writeDBError(w, err)
		return
	}
	p.APIKey = a.maskProviderKey(p.APIKey)
	writeJSON(w, http.StatusCreated, p)
}

// PATCH /api/admin/ai-providers/{id}（api_key 传空 = 不变）
func (a *app) handleAdminUpdateAIProvider(w http.ResponseWriter, r *http.Request) {
	id, ok := pathUUID(w, r, "id")
	if !ok {
		return
	}
	var in struct {
		Name      *string `json:"name"`
		BaseURL   *string `json:"base_url"`
		APIKey    *string `json:"api_key"`
		Model     *string `json:"model"`
		Enabled   *bool   `json:"enabled"`
		Priority  *int    `json:"priority"`
		TimeoutMs *int    `json:"timeout_ms"`
	}
	if !decodeJSON(w, r, &in) {
		return
	}
	var b updateBuilder
	if in.Name != nil && strings.TrimSpace(*in.Name) != "" {
		b.add("name", strings.TrimSpace(*in.Name))
	}
	if in.BaseURL != nil && strings.TrimSpace(*in.BaseURL) != "" {
		u := strings.TrimSpace(*in.BaseURL)
		if !strings.HasPrefix(u, "http://") && !strings.HasPrefix(u, "https://") {
			writeError(w, http.StatusBadRequest, "VALIDATION", "base_url 必须以 http(s):// 开头")
			return
		}
		b.add("base_url", u)
	}
	if in.APIKey != nil && *in.APIKey != "" {
		enc, err := a.encryptSecret(*in.APIKey)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "INTERNAL", "密钥加密失败")
			return
		}
		b.add("api_key", enc)
	}
	if in.Model != nil {
		b.add("model", strings.TrimSpace(*in.Model))
	}
	if in.Enabled != nil {
		b.add("enabled", *in.Enabled)
	}
	if in.Priority != nil {
		b.add("priority", *in.Priority)
	}
	if in.TimeoutMs != nil && *in.TimeoutMs > 0 {
		b.add("timeout_ms", *in.TimeoutMs)
	}
	if b.empty() {
		writeError(w, http.StatusBadRequest, "EMPTY_PATCH", "没有可更新的字段")
		return
	}
	b.addExpr("updated_at = now()")

	args := append(b.args, id)
	p, err := scanAIProvider(a.pool.QueryRow(r.Context(),
		`UPDATE ai_providers SET `+strings.Join(b.sets, ", ")+
			` WHERE id = $`+itoa(len(b.args)+1)+` RETURNING `+aiProviderCols, args...))
	if err != nil {
		writeDBError(w, err)
		return
	}
	p.APIKey = a.maskProviderKey(p.APIKey)
	writeJSON(w, http.StatusOK, p)
}

// DELETE /api/admin/ai-providers/{id}
func (a *app) handleAdminDeleteAIProvider(w http.ResponseWriter, r *http.Request) {
	id, ok := pathUUID(w, r, "id")
	if !ok {
		return
	}
	tag, err := a.pool.Exec(r.Context(), `DELETE FROM ai_providers WHERE id = $1`, id)
	if err != nil {
		writeDBError(w, err)
		return
	}
	if tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "NOT_FOUND", "供应商不存在")
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"deleted": true})
}

// POST /api/admin/ai-providers/{id}/test（连通性体检）
func (a *app) handleAdminTestAIProvider(w http.ResponseWriter, r *http.Request) {
	id, ok := pathUUID(w, r, "id")
	if !ok {
		return
	}
	p, err := scanAIProvider(a.pool.QueryRow(r.Context(),
		`SELECT `+aiProviderCols+` FROM ai_providers WHERE id = $1`, id))
	if err != nil {
		writeDBError(w, err)
		return
	}

	body, _ := json.Marshal(map[string]any{
		"model":      p.Model,
		"messages":   []map[string]string{{"role": "user", "content": "ping"}},
		"max_tokens": 8,
	})
	start := time.Now()
	resp, err := a.callProvider(r.Context(), p, body, false)
	latency := time.Since(start).Milliseconds()
	if err != nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"ok": false, "latency_ms": latency, "error": err.Error(),
		})
		return
	}
	resp.Body.Close()
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "latency_ms": latency})
}
