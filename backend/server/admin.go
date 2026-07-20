package main

import (
	"net/http"
	"strconv"
	"strings"
	"time"
)

// GET /api/admin/stats/overview
func (a *app) handleAdminOverview(w http.ResponseWriter, r *http.Request) {
	var o struct {
		TotalUsers    int `json:"total_users"`
		NewUsersToday int `json:"new_users_today"`
		TotalPosts    int `json:"total_posts"`
		PostsToday    int `json:"posts_today"`
		TotalComments int `json:"total_comments"`
		TotalEvents   int `json:"total_events"`
		TotalTasks    int `json:"total_tasks"`
		ActiveUsers7d int `json:"active_users_7d"`
	}
	err := a.pool.QueryRow(r.Context(), `
		SELECT
		  (SELECT count(*) FROM users),
		  (SELECT count(*) FROM users WHERE created_at >= date_trunc('day', now())),
		  (SELECT count(*) FROM posts WHERE status <> 'deleted'),
		  (SELECT count(*) FROM posts WHERE status <> 'deleted' AND created_at >= date_trunc('day', now())),
		  (SELECT count(*) FROM post_comments),
		  (SELECT count(*) FROM schedule_events),
		  (SELECT count(*) FROM planner_tasks),
		  (SELECT count(DISTINCT user_id) FROM (
		     SELECT user_id FROM posts            WHERE created_at >= now() - interval '7 days'
		     UNION ALL
		     SELECT user_id FROM post_comments    WHERE created_at >= now() - interval '7 days'
		     UNION ALL
		     SELECT user_id FROM schedule_events  WHERE created_at >= now() - interval '7 days'
		     UNION ALL
		     SELECT user_id FROM planner_tasks    WHERE created_at >= now() - interval '7 days'
		     UNION ALL
		     SELECT user_id FROM health_checkins  WHERE created_at >= now() - interval '7 days'
		   ) recent)`).
		Scan(&o.TotalUsers, &o.NewUsersToday, &o.TotalPosts, &o.PostsToday,
			&o.TotalComments, &o.TotalEvents, &o.TotalTasks, &o.ActiveUsers7d)
	if err != nil {
		writeDBError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, o)
}

// GET /api/admin/stats/trend?days=30
func (a *app) handleAdminTrend(w http.ResponseWriter, r *http.Request) {
	days := 30
	if v, err := strconv.Atoi(r.URL.Query().Get("days")); err == nil && v > 0 && v <= 365 {
		days = v
	}
	rows, err := a.pool.Query(r.Context(), `
		WITH series AS (
		  SELECT generate_series(
		    date_trunc('day', now()) - ($1::int - 1) * interval '1 day',
		    date_trunc('day', now()), interval '1 day')::date AS d
		)
		SELECT s.d,
		  (SELECT count(*) FROM users         WHERE created_at::date = s.d),
		  (SELECT count(*) FROM posts         WHERE created_at::date = s.d),
		  (SELECT count(*) FROM post_comments WHERE created_at::date = s.d)
		FROM series s ORDER BY s.d`, days)
	if err != nil {
		writeDBError(w, err)
		return
	}
	defer rows.Close()

	type point struct {
		Date        string `json:"date"`
		NewUsers    int    `json:"new_users"`
		NewPosts    int    `json:"new_posts"`
		NewComments int    `json:"new_comments"`
	}
	trend := []point{}
	for rows.Next() {
		var p point
		var d time.Time
		if err := rows.Scan(&d, &p.NewUsers, &p.NewPosts, &p.NewComments); err != nil {
			writeDBError(w, err)
			return
		}
		p.Date = fmtDate(d)
		trend = append(trend, p)
	}
	writeJSON(w, http.StatusOK, map[string]any{"trend": trend})
}

// GET /api/admin/stats/modules
func (a *app) handleAdminModules(w http.ResponseWriter, r *http.Request) {
	rows, err := a.pool.Query(r.Context(), `
		SELECT 'posts', count(*) FROM posts
		UNION ALL SELECT 'comments', count(*) FROM post_comments
		UNION ALL SELECT 'events',   count(*) FROM schedule_events
		UNION ALL SELECT 'goals',    count(*) FROM goals
		UNION ALL SELECT 'tasks',    count(*) FROM planner_tasks
		UNION ALL SELECT 'checkins', count(*) FROM health_checkins`)
	if err != nil {
		writeDBError(w, err)
		return
	}
	defer rows.Close()

	type mod struct {
		Module string `json:"module"`
		Rows   int    `json:"rows"`
	}
	modules := []mod{}
	for rows.Next() {
		var m mod
		if err := rows.Scan(&m.Module, &m.Rows); err != nil {
			writeDBError(w, err)
			return
		}
		modules = append(modules, m)
	}
	writeJSON(w, http.StatusOK, map[string]any{"modules": modules})
}

// GET /api/admin/users?search=&status=&limit=&offset=
func (a *app) handleAdminListUsers(w http.ResponseWriter, r *http.Request) {
	limit, offset := parsePagination(r)
	search := trimToNil(r.URL.Query().Get("search"))
	status := trimToNil(r.URL.Query().Get("status"))

	var total int
	if err := a.pool.QueryRow(r.Context(),
		`SELECT count(*) FROM users
		 WHERE ($1::text IS NULL OR email ILIKE '%' || $1 || '%' OR nickname ILIKE '%' || $1 || '%')
		   AND ($2::text IS NULL OR status = $2)`,
		search, status).Scan(&total); err != nil {
		writeDBError(w, err)
		return
	}

	rows, err := a.pool.Query(r.Context(),
		`SELECT u.id, u.email, u.nickname, u.avatar_url, u.school, u.region, u.role,
		        u.status, u.created_at,
		        (SELECT count(*) FROM posts p WHERE p.user_id = u.id AND p.status <> 'deleted')
		 FROM users u
		 WHERE ($1::text IS NULL OR u.email ILIKE '%' || $1 || '%' OR u.nickname ILIKE '%' || $1 || '%')
		   AND ($2::text IS NULL OR u.status = $2)
		 ORDER BY u.created_at DESC
		 LIMIT $3 OFFSET $4`,
		search, status, limit, offset)
	if err != nil {
		writeDBError(w, err)
		return
	}
	defer rows.Close()

	type adminUser struct {
		ID         string `json:"id"`
		Email      string `json:"email"`
		Nickname   string `json:"nickname"`
		AvatarURL  string `json:"avatar_url"`
		School     string `json:"school"`
		Region     string `json:"region"`
		Role       string `json:"role"`
		Status     string `json:"status"`
		CreatedAt  string `json:"created_at"`
		PostsCount int    `json:"posts_count"`
	}
	users := []adminUser{}
	for rows.Next() {
		var u adminUser
		var created time.Time
		if err := rows.Scan(&u.ID, &u.Email, &u.Nickname, &u.AvatarURL, &u.School,
			&u.Region, &u.Role, &u.Status, &created, &u.PostsCount); err != nil {
			writeDBError(w, err)
			return
		}
		u.CreatedAt = fmtTime(created)
		users = append(users, u)
	}
	writeJSON(w, http.StatusOK, map[string]any{"users": users, "total": total})
}

// PATCH /api/admin/users/{id}（不能改自己的 role/status，防锁死）
func (a *app) handleAdminUpdateUser(w http.ResponseWriter, r *http.Request) {
	id, ok := pathUUID(w, r, "id")
	if !ok {
		return
	}
	if id == userID(r) {
		writeError(w, http.StatusBadRequest, "SELF_FORBIDDEN", "不能修改自己的角色或状态")
		return
	}
	var req struct {
		Status *string `json:"status"`
		Role   *string `json:"role"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	var b updateBuilder
	if req.Status != nil {
		if *req.Status != "active" && *req.Status != "disabled" {
			writeError(w, http.StatusBadRequest, "BAD_STATUS", "status 只能是 active 或 disabled")
			return
		}
		b.add("status", *req.Status)
	}
	if req.Role != nil {
		if *req.Role != "user" && *req.Role != "admin" {
			writeError(w, http.StatusBadRequest, "BAD_ROLE", "role 只能是 user 或 admin")
			return
		}
		b.add("role", *req.Role)
	}
	if b.empty() {
		writeError(w, http.StatusBadRequest, "EMPTY_PATCH", "没有可更新的字段")
		return
	}
	b.addExpr("updated_at = now()")

	args := append(b.args, id)
	var uid, email, role, status string
	err := a.pool.QueryRow(r.Context(),
		`UPDATE users SET `+strings.Join(b.sets, ", ")+
			` WHERE id = $`+itoa(len(b.args)+1)+
			` RETURNING id, email, role, status`, args...).
		Scan(&uid, &email, &role, &status)
	if err != nil {
		writeDBError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{
		"id": uid, "email": email, "role": role, "status": status,
	})
}

// GET /api/admin/posts?status=&search=&limit=&offset=（审核列表，含作者信息）
func (a *app) handleAdminListPosts(w http.ResponseWriter, r *http.Request) {
	limit, offset := parsePagination(r)
	status := trimToNil(r.URL.Query().Get("status"))
	search := trimToNil(r.URL.Query().Get("search"))

	var total int
	if err := a.pool.QueryRow(r.Context(),
		`SELECT count(*) FROM posts p
		 WHERE ($1::text IS NULL OR p.status = $1)
		   AND ($2::text IS NULL OR p.content ILIKE '%' || $2 || '%')`,
		status, search).Scan(&total); err != nil {
		writeDBError(w, err)
		return
	}

	rows, err := a.pool.Query(r.Context(),
		`SELECT p.id, p.user_id, p.content, p.category, p.is_anonymous,
		        p.likes_count, p.comments_count, p.status, p.created_at,
		        u.email, u.nickname
		 FROM posts p JOIN users u ON u.id = p.user_id
		 WHERE ($1::text IS NULL OR p.status = $1)
		   AND ($2::text IS NULL OR p.content ILIKE '%' || $2 || '%')
		 ORDER BY p.created_at DESC
		 LIMIT $3 OFFSET $4`,
		status, search, limit, offset)
	if err != nil {
		writeDBError(w, err)
		return
	}
	defer rows.Close()

	type adminPost struct {
		ID             string `json:"id"`
		UserID         string `json:"user_id"`
		Content        string `json:"content"`
		Category       string `json:"category"`
		IsAnonymous    bool   `json:"is_anonymous"`
		LikesCount     int    `json:"likes_count"`
		CommentsCount  int    `json:"comments_count"`
		Status         string `json:"status"`
		CreatedAt      string `json:"created_at"`
		AuthorEmail    string `json:"author_email"`
		AuthorNickname string `json:"author_nickname"`
	}
	posts := []adminPost{}
	for rows.Next() {
		var p adminPost
		var created time.Time
		if err := rows.Scan(&p.ID, &p.UserID, &p.Content, &p.Category, &p.IsAnonymous,
			&p.LikesCount, &p.CommentsCount, &p.Status, &created,
			&p.AuthorEmail, &p.AuthorNickname); err != nil {
			writeDBError(w, err)
			return
		}
		p.CreatedAt = fmtTime(created)
		posts = append(posts, p)
	}
	writeJSON(w, http.StatusOK, map[string]any{"posts": posts, "total": total})
}

// PATCH /api/admin/posts/{id}（status: visible|hidden|deleted）
func (a *app) handleAdminUpdatePost(w http.ResponseWriter, r *http.Request) {
	id, ok := pathUUID(w, r, "id")
	if !ok {
		return
	}
	var req struct {
		Status string `json:"status"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	if req.Status != "visible" && req.Status != "hidden" && req.Status != "deleted" {
		writeError(w, http.StatusBadRequest, "BAD_STATUS", "status 只能是 visible、hidden 或 deleted")
		return
	}
	var pid, status string
	err := a.pool.QueryRow(r.Context(),
		`UPDATE posts SET status = $2 WHERE id = $1 RETURNING id, status`,
		id, req.Status).Scan(&pid, &status)
	if err != nil {
		writeDBError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"id": pid, "status": status})
}

// GET /api/admin/reports?status=（关联帖子/评论摘要）
func (a *app) handleAdminListReports(w http.ResponseWriter, r *http.Request) {
	limit, offset := parsePagination(r)
	status := trimToNil(r.URL.Query().Get("status"))

	rows, err := a.pool.Query(r.Context(),
		`SELECT rp.id, rp.reporter_id, ru.nickname, rp.post_id, rp.comment_id,
		        rp.reason, rp.status, rp.created_at, rp.resolved_at,
		        left(coalesce(p.content, ''), 120), left(coalesce(c.content, ''), 120)
		 FROM reports rp
		 JOIN users ru ON ru.id = rp.reporter_id
		 LEFT JOIN posts p ON p.id = rp.post_id
		 LEFT JOIN post_comments c ON c.id = rp.comment_id
		 WHERE ($1::text IS NULL OR rp.status = $1)
		 ORDER BY rp.created_at DESC
		 LIMIT $2 OFFSET $3`,
		status, limit, offset)
	if err != nil {
		writeDBError(w, err)
		return
	}
	defer rows.Close()

	type adminReport struct {
		ID               string  `json:"id"`
		ReporterID       string  `json:"reporter_id"`
		ReporterNickname string  `json:"reporter_nickname"`
		PostID           *string `json:"post_id"`
		CommentID        *string `json:"comment_id"`
		Reason           string  `json:"reason"`
		Status           string  `json:"status"`
		CreatedAt        string  `json:"created_at"`
		ResolvedAt       *string `json:"resolved_at"`
		PostExcerpt      string  `json:"post_excerpt"`
		CommentExcerpt   string  `json:"comment_excerpt"`
	}
	reports := []adminReport{}
	for rows.Next() {
		var rep adminReport
		var created time.Time
		var resolved *time.Time
		if err := rows.Scan(&rep.ID, &rep.ReporterID, &rep.ReporterNickname,
			&rep.PostID, &rep.CommentID, &rep.Reason, &rep.Status,
			&created, &resolved, &rep.PostExcerpt, &rep.CommentExcerpt); err != nil {
			writeDBError(w, err)
			return
		}
		rep.CreatedAt = fmtTime(created)
		rep.ResolvedAt = fmtTimePtr(resolved)
		reports = append(reports, rep)
	}
	writeJSON(w, http.StatusOK, map[string]any{"reports": reports})
}

// PATCH /api/admin/reports/{id}（resolved 可带 hide_target 顺带隐藏被举报内容）
func (a *app) handleAdminUpdateReport(w http.ResponseWriter, r *http.Request) {
	id, ok := pathUUID(w, r, "id")
	if !ok {
		return
	}
	var req struct {
		Status     string `json:"status"`
		HideTarget bool   `json:"hide_target"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	if req.Status != "resolved" && req.Status != "dismissed" {
		writeError(w, http.StatusBadRequest, "BAD_STATUS", "status 只能是 resolved 或 dismissed")
		return
	}

	var postID, commentID *string
	var newStatus string
	err := a.pool.QueryRow(r.Context(),
		`UPDATE reports SET status = $2, resolved_at = now()
		 WHERE id = $1 RETURNING post_id, comment_id, status`,
		id, req.Status).Scan(&postID, &commentID, &newStatus)
	if err != nil {
		writeDBError(w, err)
		return
	}

	hidden := false
	if req.Status == "resolved" && req.HideTarget {
		if postID != nil {
			if _, err := a.pool.Exec(r.Context(),
				`UPDATE posts SET status = 'hidden' WHERE id = $1`, *postID); err != nil {
				writeDBError(w, err)
				return
			}
			hidden = true
		}
		if commentID != nil {
			if _, err := a.pool.Exec(r.Context(),
				`UPDATE post_comments SET is_hidden = true WHERE id = $1`, *commentID); err != nil {
				writeDBError(w, err)
				return
			}
			hidden = true
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"id": id, "status": newStatus, "target_hidden": hidden,
	})
}
