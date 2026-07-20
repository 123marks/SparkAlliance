package main

import (
	crand "crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

const maxContentLen = 5000

// rowScanner 兼容 pgx.Row 与 pgx.Rows，便于复用扫描函数。
type rowScanner interface{ Scan(dest ...any) error }

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

// writeError 统一错误体：{"error":"人话","code":"MACHINE_CODE"}
func writeError(w http.ResponseWriter, status int, code, msg string) {
	writeJSON(w, status, map[string]string{"error": msg, "code": code})
}

func isNoRows(err error) bool { return errors.Is(err, pgx.ErrNoRows) }

// writeDBError 数据库错误统一出口：no rows → 404，其余 → 500。
func writeDBError(w http.ResponseWriter, err error) {
	if isNoRows(err) {
		writeError(w, http.StatusNotFound, "NOT_FOUND", "资源不存在")
		return
	}
	log.Printf("[db] %v", err)
	writeError(w, http.StatusInternalServerError, "DB_ERROR", "数据库操作失败")
}

func decodeJSON(w http.ResponseWriter, r *http.Request, dst any) bool {
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	if err := json.NewDecoder(r.Body).Decode(dst); err != nil {
		writeError(w, http.StatusBadRequest, "BAD_JSON", "请求体不是合法 JSON")
		return false
	}
	return true
}

// parsePagination limit<=50 默认 20，offset>=0。
func parsePagination(r *http.Request) (limit, offset int) {
	limit = 20
	if v := r.URL.Query().Get("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			limit = n
		}
	}
	if limit < 1 {
		limit = 1
	}
	if limit > 50 {
		limit = 50
	}
	if v := r.URL.Query().Get("offset"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			offset = n
		}
	}
	return limit, offset
}

// parseTimeParam 接受 RFC3339 或 YYYY-MM-DD，统一转 UTC。
func parseTimeParam(s string) (time.Time, error) {
	for _, layout := range []string{time.RFC3339, "2006-01-02"} {
		if t, err := time.Parse(layout, s); err == nil {
			return t.UTC(), nil
		}
	}
	return time.Time{}, fmt.Errorf("非法时间格式: %s", s)
}

func fmtTime(t time.Time) string { return t.UTC().Format(time.RFC3339) }

func fmtTimePtr(t *time.Time) *string {
	if t == nil {
		return nil
	}
	s := fmtTime(*t)
	return &s
}

func fmtDate(t time.Time) string { return t.Format("2006-01-02") }

func fmtDatePtr(t *time.Time) *string {
	if t == nil {
		return nil
	}
	s := fmtDate(*t)
	return &s
}

func itoa(n int) string { return strconv.Itoa(n) }

var uuidRe = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)

func isValidUUID(s string) bool { return uuidRe.MatchString(s) }

// pathUUID 取路径参数并校验 uuid 格式；不合法时写 404 并返回 false。
func pathUUID(w http.ResponseWriter, r *http.Request, name string) (string, bool) {
	id := r.PathValue(name)
	if !isValidUUID(id) {
		writeError(w, http.StatusNotFound, "NOT_FOUND", "资源不存在")
		return "", false
	}
	return id, true
}

// trimToNil 空白字符串转 nil（配合 SQL 里 $n::type IS NULL 的可选过滤）。
func trimToNil(s string) *string {
	s = strings.TrimSpace(s)
	if s == "" {
		return nil
	}
	return &s
}

func randomHex(n int) string {
	b := make([]byte, n)
	_, _ = crand.Read(b)
	return hex.EncodeToString(b)
}

func uuidv4() string {
	b := make([]byte, 16)
	_, _ = crand.Read(b)
	b[6] = (b[6] & 0x0f) | 0x40
	b[8] = (b[8] & 0x3f) | 0x80
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
}

func orEmptyStrs(s []string) []string {
	if s == nil {
		return []string{}
	}
	return s
}

func orEmptyInt32s(s []int32) []int32 {
	if s == nil {
		return []int32{}
	}
	return s
}

// updateBuilder 动态拼 UPDATE 的 SET 子句；列名全部为代码内常量，无注入面。
type updateBuilder struct {
	sets []string
	args []any
}

func (b *updateBuilder) add(col string, val any) {
	b.args = append(b.args, val)
	b.sets = append(b.sets, fmt.Sprintf("%s = $%d", col, len(b.args)))
}

func (b *updateBuilder) addExpr(expr string) { b.sets = append(b.sets, expr) }

func (b *updateBuilder) empty() bool { return len(b.sets) == 0 }
