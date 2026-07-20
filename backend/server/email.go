package main

import (
	"crypto/tls"
	"fmt"
	"log"
	"math/big"
	"net/http"
	"net/smtp"
	"strings"
	"time"

	crand "crypto/rand"

	"golang.org/x/crypto/bcrypt"
)

func randomDigits(n int) string {
	var b strings.Builder
	for range n {
		d, _ := crand.Int(crand.Reader, big.NewInt(10))
		fmt.Fprintf(&b, "%d", d.Int64())
	}
	return b.String()
}

// sendMail net/smtp + STARTTLS 发送纯文本邮件。
func (a *app) sendMail(to, subject, body string) error {
	addr := a.cfg.SMTPHost + ":" + a.cfg.SMTPPort
	c, err := smtp.Dial(addr)
	if err != nil {
		return fmt.Errorf("连接 SMTP 失败: %w", err)
	}
	defer c.Close()
	if ok, _ := c.Extension("STARTTLS"); ok {
		if err := c.StartTLS(&tls.Config{ServerName: a.cfg.SMTPHost}); err != nil {
			return fmt.Errorf("STARTTLS 失败: %w", err)
		}
	}
	auth := smtp.PlainAuth("", a.cfg.SMTPUser, a.cfg.SMTPPass, a.cfg.SMTPHost)
	if err := c.Auth(auth); err != nil {
		return fmt.Errorf("SMTP 认证失败: %w", err)
	}
	if err := c.Mail(a.cfg.SMTPFrom); err != nil {
		return err
	}
	if err := c.Rcpt(to); err != nil {
		return err
	}
	wc, err := c.Data()
	if err != nil {
		return err
	}
	msg := fmt.Sprintf("From: %s\r\nTo: %s\r\nSubject: %s\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n%s\r\n",
		a.cfg.SMTPFrom, to, subject, body)
	if _, err := wc.Write([]byte(msg)); err != nil {
		return err
	}
	if err := wc.Close(); err != nil {
		return err
	}
	return c.Quit()
}

// POST /api/auth/email-code
func (a *app) handleEmailCode(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Email   string `json:"email"`
		Purpose string `json:"purpose"`
	}
	if !decodeJSON(w, r, &in) {
		return
	}
	in.Email = strings.ToLower(strings.TrimSpace(in.Email))
	if !emailRe.MatchString(in.Email) {
		writeError(w, http.StatusBadRequest, "VALIDATION", "邮箱格式不正确")
		return
	}
	if in.Purpose != "register" && in.Purpose != "reset_password" {
		writeError(w, http.StatusBadRequest, "VALIDATION", "purpose 只能是 register 或 reset_password")
		return
	}

	// 同邮箱同 purpose 60 秒冷却
	var lastAt *time.Time
	if err := a.pool.QueryRow(r.Context(),
		`SELECT max(created_at) FROM email_codes WHERE email = $1 AND purpose = $2`,
		in.Email, in.Purpose).Scan(&lastAt); err != nil {
		writeDBError(w, err)
		return
	}
	if lastAt != nil && time.Since(*lastAt) < 60*time.Second {
		writeError(w, http.StatusTooManyRequests, "CODE_COOLDOWN",
			"验证码发送过于频繁，请 60 秒后再试")
		return
	}

	code := randomDigits(6)
	if _, err := a.pool.Exec(r.Context(),
		`INSERT INTO email_codes (email, code, purpose, expires_at)
		 VALUES ($1, $2, $3, now() + interval '10 minutes')`,
		in.Email, code, in.Purpose); err != nil {
		writeDBError(w, err)
		return
	}

	if a.cfg.smtpConfigured() {
		subject := "Spark Alliance 验证码"
		body := fmt.Sprintf("你的验证码是 %s，10 分钟内有效。若非本人操作请忽略。", code)
		if err := a.sendMail(in.Email, subject, body); err != nil {
			log.Printf("[smtp] 发送到 %s 失败: %v", in.Email, err)
			writeError(w, http.StatusInternalServerError, "MAIL_SEND_FAILED", "邮件发送失败，请稍后再试")
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"sent": true})
		return
	}
	// dev 模式：不发真邮件，明文回码保证本地全链路可测
	log.Printf("[email-code][dev] %s purpose=%s code=%s", in.Email, in.Purpose, code)
	writeJSON(w, http.StatusOK, map[string]any{"sent": true, "dev_mode": true, "code": code})
}

// consumeEmailCode 校验并核销验证码（一次性）。
func (a *app) consumeEmailCode(r *http.Request, email, purpose, code string) bool {
	if code == "" {
		return false
	}
	tag, err := a.pool.Exec(r.Context(),
		`UPDATE email_codes SET used = true
		 WHERE id = (SELECT id FROM email_codes
		             WHERE email = $1 AND purpose = $2 AND code = $3
		               AND used = false AND expires_at > now()
		             ORDER BY created_at DESC LIMIT 1)`,
		email, purpose, code)
	return err == nil && tag.RowsAffected() == 1
}

// POST /api/auth/verify-reset
func (a *app) handleVerifyReset(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Email       string `json:"email"`
		Code        string `json:"code"`
		NewPassword string `json:"new_password"`
	}
	if !decodeJSON(w, r, &in) {
		return
	}
	in.Email = strings.ToLower(strings.TrimSpace(in.Email))
	if len(in.NewPassword) < 8 || len(in.NewPassword) > 72 {
		writeError(w, http.StatusBadRequest, "VALIDATION", "新密码至少 8 位（最长 72 位）")
		return
	}
	if !a.consumeEmailCode(r, in.Email, "reset_password", in.Code) {
		writeError(w, http.StatusBadRequest, "BAD_EMAIL_CODE", "验证码错误或已过期")
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(in.NewPassword), 10)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL", "服务器内部错误")
		return
	}
	// token_version +1：旧 JWT 全部失效
	tag, err := a.pool.Exec(r.Context(),
		`UPDATE users SET password_hash = $2, token_version = token_version + 1,
		        updated_at = now()
		 WHERE email = $1`, in.Email, string(hash))
	if err != nil {
		writeDBError(w, err)
		return
	}
	if tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "NOT_FOUND", "该邮箱未注册")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"reset": true})
}
