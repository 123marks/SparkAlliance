package main

import (
	"errors"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"golang.org/x/crypto/bcrypt"
)

type userDTO struct {
	ID        string `json:"id"`
	Email     string `json:"email"`
	Nickname  string `json:"nickname"`
	AvatarURL string `json:"avatar_url"`
	School    string `json:"school"`
	Region    string `json:"region"`
	Role      string `json:"role"`
	CreatedAt string `json:"created_at"`
}

const userCols = `id, email, nickname, avatar_url, school, region, role, created_at`

func scanUser(row rowScanner) (userDTO, error) {
	var u userDTO
	var createdAt time.Time
	err := row.Scan(&u.ID, &u.Email, &u.Nickname, &u.AvatarURL, &u.School,
		&u.Region, &u.Role, &createdAt)
	if err == nil {
		u.CreatedAt = fmtTime(createdAt)
	}
	return u, err
}

var emailRe = regexp.MustCompile(`^[^@\s]+@[^@\s]+\.[^@\s]+$`)

// POST /api/auth/register
func (a *app) handleRegister(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Email    string `json:"email"`
		Password string `json:"password"`
		Nickname string `json:"nickname"`
	}
	if !decodeJSON(w, r, &in) {
		return
	}
	in.Email = strings.ToLower(strings.TrimSpace(in.Email))
	in.Nickname = strings.TrimSpace(in.Nickname)
	if !emailRe.MatchString(in.Email) || len(in.Email) > 254 {
		writeError(w, http.StatusBadRequest, "VALIDATION", "邮箱格式不正确")
		return
	}
	if len(in.Password) < 8 || len(in.Password) > 72 {
		writeError(w, http.StatusBadRequest, "VALIDATION", "密码至少 8 位（最长 72 位）")
		return
	}
	if in.Nickname == "" {
		in.Nickname = strings.SplitN(in.Email, "@", 2)[0]
	}
	if len([]rune(in.Nickname)) > 50 {
		writeError(w, http.StatusBadRequest, "VALIDATION", "昵称过长（最多 50 字）")
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(in.Password), 10)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL", "服务器内部错误")
		return
	}
	u, err := scanUser(a.pool.QueryRow(r.Context(),
		`INSERT INTO users (email, password_hash, nickname) VALUES ($1, $2, $3)
		 RETURNING `+userCols,
		in.Email, string(hash), in.Nickname))
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			writeError(w, http.StatusConflict, "EMAIL_TAKEN", "该邮箱已被注册")
			return
		}
		writeDBError(w, err)
		return
	}
	token, err := a.signToken(u.ID, u.Role)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL", "签发令牌失败")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"token": token, "user": u})
}

// POST /api/auth/login
func (a *app) handleLogin(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if !decodeJSON(w, r, &in) {
		return
	}
	in.Email = strings.ToLower(strings.TrimSpace(in.Email))

	var u userDTO
	var createdAt time.Time
	var passwordHash, status string
	err := a.pool.QueryRow(r.Context(),
		`SELECT `+userCols+`, password_hash, status FROM users WHERE email = $1`, in.Email).
		Scan(&u.ID, &u.Email, &u.Nickname, &u.AvatarURL, &u.School, &u.Region,
			&u.Role, &createdAt, &passwordHash, &status)
	if errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusUnauthorized, "BAD_CREDENTIALS", "邮箱或密码不正确")
		return
	}
	if err != nil {
		writeDBError(w, err)
		return
	}
	if bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(in.Password)) != nil {
		writeError(w, http.StatusUnauthorized, "BAD_CREDENTIALS", "邮箱或密码不正确")
		return
	}
	if status != "active" {
		writeError(w, http.StatusForbidden, "ACCOUNT_DISABLED", "账号已被禁用，请联系管理员")
		return
	}
	u.CreatedAt = fmtTime(createdAt)
	token, err := a.signToken(u.ID, u.Role)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL", "签发令牌失败")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"token": token, "user": u})
}

// GET /api/auth/me
func (a *app) handleMe(w http.ResponseWriter, r *http.Request) {
	u, err := scanUser(a.pool.QueryRow(r.Context(),
		`SELECT `+userCols+` FROM users WHERE id = $1`, userID(r)))
	if err != nil {
		writeDBError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, u)
}

// PATCH /api/auth/me
func (a *app) handleUpdateMe(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Nickname  *string `json:"nickname"`
		AvatarURL *string `json:"avatar_url"`
		School    *string `json:"school"`
		Region    *string `json:"region"`
	}
	if !decodeJSON(w, r, &in) {
		return
	}
	var b updateBuilder
	if in.Nickname != nil {
		nn := strings.TrimSpace(*in.Nickname)
		if nn == "" || len([]rune(nn)) > 50 {
			writeError(w, http.StatusBadRequest, "VALIDATION", "昵称不能为空且最多 50 字")
			return
		}
		b.add("nickname", nn)
	}
	if in.AvatarURL != nil {
		if len(*in.AvatarURL) > 500 {
			writeError(w, http.StatusBadRequest, "VALIDATION", "头像地址过长")
			return
		}
		b.add("avatar_url", *in.AvatarURL)
	}
	if in.School != nil {
		if len([]rune(*in.School)) > 100 {
			writeError(w, http.StatusBadRequest, "VALIDATION", "学校名称过长")
			return
		}
		b.add("school", *in.School)
	}
	if in.Region != nil {
		if len([]rune(*in.Region)) > 100 {
			writeError(w, http.StatusBadRequest, "VALIDATION", "地区名称过长")
			return
		}
		b.add("region", *in.Region)
	}
	if b.empty() {
		writeError(w, http.StatusBadRequest, "EMPTY_PATCH", "没有可更新的字段")
		return
	}
	b.addExpr("updated_at = now()")
	b.args = append(b.args, userID(r))
	u, err := scanUser(a.pool.QueryRow(r.Context(),
		`UPDATE users SET `+strings.Join(b.sets, ", ")+
			` WHERE id = $`+itoa(len(b.args))+` RETURNING `+userCols, b.args...))
	if err != nil {
		writeDBError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, u)
}
