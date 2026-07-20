package main

import (
	"net/http"
	"strings"
	"time"
)

type postDTO struct {
	ID             string   `json:"id"`
	UserID         string   `json:"user_id"`
	Content        string   `json:"content"`
	Category       string   `json:"category"`
	Tags           []string `json:"tags"`
	MediaURLs      []string `json:"media_urls"`
	IsAnonymous    bool     `json:"is_anonymous"`
	AnonymousSeed  string   `json:"anonymous_seed"`
	LikesCount     int      `json:"likes_count"`
	CommentsCount  int      `json:"comments_count"`
	Status         string   `json:"status"`
	CreatedAt      string   `json:"created_at"`
	AuthorNickname string   `json:"author_nickname"`
	AuthorAvatar   string   `json:"author_avatar"`
	Liked          bool     `json:"liked"`
}

// maskAnonymous 匿名帖对非作者且非管理员的查看者隐藏作者身份。
func (p *postDTO) maskAnonymous(viewerID string, viewerIsAdmin bool) {
	if p.IsAnonymous && p.UserID != viewerID && !viewerIsAdmin {
		p.UserID = ""
		p.AuthorNickname = "匿名星火"
		p.AuthorAvatar = ""
	}
}

// GET /api/wall/posts?category=&search=&limit=&offset=
func (a *app) handleListPosts(w http.ResponseWriter, r *http.Request) {
	limit, offset := parsePagination(r)
	category := trimToNil(r.URL.Query().Get("category"))
	search := trimToNil(r.URL.Query().Get("search"))
	viewer := trimToNil(userID(r))

	var total int
	if err := a.pool.QueryRow(r.Context(),
		`SELECT count(*) FROM posts p
		 WHERE p.status = 'visible'
		   AND ($1::text IS NULL OR p.category = $1)
		   AND ($2::text IS NULL OR p.content ILIKE '%' || $2 || '%')`,
		category, search).Scan(&total); err != nil {
		writeDBError(w, err)
		return
	}

	rows, err := a.pool.Query(r.Context(),
		`SELECT p.id, p.user_id, p.content, p.category, p.tags, p.media_urls,
		        p.is_anonymous, p.anonymous_seed, p.likes_count, p.comments_count,
		        p.status, p.created_at, u.nickname, u.avatar_url,
		        ($3::uuid IS NOT NULL AND EXISTS(
		           SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = $3::uuid))
		 FROM posts p JOIN users u ON u.id = p.user_id
		 WHERE p.status = 'visible'
		   AND ($1::text IS NULL OR p.category = $1)
		   AND ($2::text IS NULL OR p.content ILIKE '%' || $2 || '%')
		 ORDER BY p.created_at DESC
		 LIMIT $4 OFFSET $5`,
		category, search, viewer, limit, offset)
	if err != nil {
		writeDBError(w, err)
		return
	}
	defer rows.Close()

	posts := []postDTO{}
	for rows.Next() {
		var p postDTO
		var createdAt time.Time
		if err := rows.Scan(&p.ID, &p.UserID, &p.Content, &p.Category, &p.Tags,
			&p.MediaURLs, &p.IsAnonymous, &p.AnonymousSeed, &p.LikesCount,
			&p.CommentsCount, &p.Status, &createdAt,
			&p.AuthorNickname, &p.AuthorAvatar, &p.Liked); err != nil {
			writeDBError(w, err)
			return
		}
		p.CreatedAt = fmtTime(createdAt)
		p.maskAnonymous(userID(r), isAdmin(r))
		posts = append(posts, p)
	}
	writeJSON(w, http.StatusOK, map[string]any{"posts": posts, "total": total})
}

// POST /api/wall/posts
func (a *app) handleCreatePost(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Content     string   `json:"content"`
		Category    string   `json:"category"`
		Tags        []string `json:"tags"`
		MediaURLs   []string `json:"media_urls"`
		IsAnonymous bool     `json:"is_anonymous"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	req.Content = strings.TrimSpace(req.Content)
	if req.Content == "" {
		writeError(w, http.StatusBadRequest, "EMPTY_CONTENT", "内容不能为空")
		return
	}
	if len([]rune(req.Content)) > maxContentLen {
		writeError(w, http.StatusBadRequest, "CONTENT_TOO_LONG", "内容不能超过 5000 字")
		return
	}
	seed := ""
	if req.IsAnonymous {
		seed = randomHex(4)
	}

	var p postDTO
	var createdAt time.Time
	err := a.pool.QueryRow(r.Context(),
		`INSERT INTO posts (user_id, content, category, tags, media_urls, is_anonymous, anonymous_seed)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 RETURNING id, user_id, content, category, tags, media_urls, is_anonymous,
		           anonymous_seed, likes_count, comments_count, status, created_at`,
		userID(r), req.Content, strings.TrimSpace(req.Category),
		orEmptyStrs(req.Tags), orEmptyStrs(req.MediaURLs), req.IsAnonymous, seed).
		Scan(&p.ID, &p.UserID, &p.Content, &p.Category, &p.Tags, &p.MediaURLs,
			&p.IsAnonymous, &p.AnonymousSeed, &p.LikesCount, &p.CommentsCount,
			&p.Status, &createdAt)
	if err != nil {
		writeDBError(w, err)
		return
	}
	p.CreatedAt = fmtTime(createdAt)
	writeJSON(w, http.StatusCreated, p)
}

// DELETE /api/wall/posts/{id}（作者本人或 admin，软删 status='deleted'）
func (a *app) handleDeletePost(w http.ResponseWriter, r *http.Request) {
	id, ok := pathUUID(w, r, "id")
	if !ok {
		return
	}
	var ownerID string
	if err := a.pool.QueryRow(r.Context(),
		`SELECT user_id FROM posts WHERE id = $1 AND status <> 'deleted'`, id).
		Scan(&ownerID); err != nil {
		writeDBError(w, err)
		return
	}
	if ownerID != userID(r) && !isAdmin(r) {
		writeError(w, http.StatusForbidden, "FORBIDDEN", "只能删除自己的帖子")
		return
	}
	if _, err := a.pool.Exec(r.Context(),
		`UPDATE posts SET status = 'deleted' WHERE id = $1`, id); err != nil {
		writeDBError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"deleted": true})
}

// POST /api/wall/posts/{id}/like（toggle → {liked,likes_count}）
func (a *app) handleTogglePostLike(w http.ResponseWriter, r *http.Request) {
	id, ok := pathUUID(w, r, "id")
	if !ok {
		return
	}
	var exists bool
	if err := a.pool.QueryRow(r.Context(),
		`SELECT EXISTS(SELECT 1 FROM posts WHERE id = $1 AND status = 'visible')`, id).
		Scan(&exists); err != nil {
		writeDBError(w, err)
		return
	}
	if !exists {
		writeError(w, http.StatusNotFound, "NOT_FOUND", "帖子不存在")
		return
	}

	tag, err := a.pool.Exec(r.Context(),
		`DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2`, id, userID(r))
	if err != nil {
		writeDBError(w, err)
		return
	}
	liked := false
	if tag.RowsAffected() == 0 {
		if _, err := a.pool.Exec(r.Context(),
			`INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2)
			 ON CONFLICT DO NOTHING`, id, userID(r)); err != nil {
			writeDBError(w, err)
			return
		}
		liked = true
	}
	var likes int
	if err := a.pool.QueryRow(r.Context(),
		`SELECT likes_count FROM posts WHERE id = $1`, id).Scan(&likes); err != nil {
		writeDBError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"liked": liked, "likes_count": likes})
}

type commentDTO struct {
	ID             string   `json:"id"`
	PostID         string   `json:"post_id"`
	UserID         string   `json:"user_id"`
	Content        string   `json:"content"`
	MediaURLs      []string `json:"media_urls"`
	IsAnonymous    bool     `json:"is_anonymous"`
	AnonymousSeed  string   `json:"anonymous_seed"`
	ReplyToName    string   `json:"reply_to_name"`
	LikeCount      int      `json:"like_count"`
	CreatedAt      string   `json:"created_at"`
	AuthorNickname string   `json:"author_nickname"`
	AuthorAvatar   string   `json:"author_avatar"`
	Liked          bool     `json:"liked"`
}

// GET /api/wall/posts/{id}/comments（公开，只出 is_hidden=false）
func (a *app) handleListComments(w http.ResponseWriter, r *http.Request) {
	id, ok := pathUUID(w, r, "id")
	if !ok {
		return
	}
	limit, offset := parsePagination(r)
	viewer := trimToNil(userID(r))

	rows, err := a.pool.Query(r.Context(),
		`SELECT c.id, c.post_id, c.user_id, c.content, c.media_urls, c.is_anonymous,
		        c.anonymous_seed, c.reply_to_name, c.like_count, c.created_at,
		        u.nickname, u.avatar_url,
		        ($2::uuid IS NOT NULL AND EXISTS(
		           SELECT 1 FROM comment_likes cl WHERE cl.comment_id = c.id AND cl.user_id = $2::uuid))
		 FROM post_comments c JOIN users u ON u.id = c.user_id
		 WHERE c.post_id = $1 AND c.is_hidden = false
		 ORDER BY c.created_at ASC
		 LIMIT $3 OFFSET $4`,
		id, viewer, limit, offset)
	if err != nil {
		writeDBError(w, err)
		return
	}
	defer rows.Close()

	comments := []commentDTO{}
	for rows.Next() {
		var c commentDTO
		var createdAt time.Time
		if err := rows.Scan(&c.ID, &c.PostID, &c.UserID, &c.Content, &c.MediaURLs,
			&c.IsAnonymous, &c.AnonymousSeed, &c.ReplyToName, &c.LikeCount,
			&createdAt, &c.AuthorNickname, &c.AuthorAvatar, &c.Liked); err != nil {
			writeDBError(w, err)
			return
		}
		c.CreatedAt = fmtTime(createdAt)
		if c.IsAnonymous && c.UserID != userID(r) && !isAdmin(r) {
			c.UserID = ""
			c.AuthorNickname = "匿名星火"
			c.AuthorAvatar = ""
		}
		comments = append(comments, c)
	}
	writeJSON(w, http.StatusOK, map[string]any{"comments": comments})
}

// POST /api/wall/posts/{id}/comments
func (a *app) handleCreateComment(w http.ResponseWriter, r *http.Request) {
	id, ok := pathUUID(w, r, "id")
	if !ok {
		return
	}
	var req struct {
		Content     string   `json:"content"`
		IsAnonymous bool     `json:"is_anonymous"`
		ReplyToName string   `json:"reply_to_name"`
		MediaURLs   []string `json:"media_urls"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	req.Content = strings.TrimSpace(req.Content)
	if req.Content == "" {
		writeError(w, http.StatusBadRequest, "EMPTY_CONTENT", "评论不能为空")
		return
	}
	if len([]rune(req.Content)) > maxContentLen {
		writeError(w, http.StatusBadRequest, "CONTENT_TOO_LONG", "评论不能超过 5000 字")
		return
	}

	var postVisible bool
	if err := a.pool.QueryRow(r.Context(),
		`SELECT EXISTS(SELECT 1 FROM posts WHERE id = $1 AND status = 'visible')`, id).
		Scan(&postVisible); err != nil {
		writeDBError(w, err)
		return
	}
	if !postVisible {
		writeError(w, http.StatusNotFound, "NOT_FOUND", "帖子不存在")
		return
	}

	seed := ""
	if req.IsAnonymous {
		seed = randomHex(4)
	}
	var c commentDTO
	var createdAt time.Time
	err := a.pool.QueryRow(r.Context(),
		`INSERT INTO post_comments (post_id, user_id, content, media_urls, is_anonymous, anonymous_seed, reply_to_name)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 RETURNING id, post_id, user_id, content, media_urls, is_anonymous,
		           anonymous_seed, reply_to_name, like_count, created_at`,
		id, userID(r), req.Content, orEmptyStrs(req.MediaURLs), req.IsAnonymous, seed,
		strings.TrimSpace(req.ReplyToName)).
		Scan(&c.ID, &c.PostID, &c.UserID, &c.Content, &c.MediaURLs, &c.IsAnonymous,
			&c.AnonymousSeed, &c.ReplyToName, &c.LikeCount, &createdAt)
	if err != nil {
		writeDBError(w, err)
		return
	}
	c.CreatedAt = fmtTime(createdAt)
	writeJSON(w, http.StatusCreated, c)
}

// POST /api/wall/comments/{id}/like（toggle）
func (a *app) handleToggleCommentLike(w http.ResponseWriter, r *http.Request) {
	id, ok := pathUUID(w, r, "id")
	if !ok {
		return
	}
	var exists bool
	if err := a.pool.QueryRow(r.Context(),
		`SELECT EXISTS(SELECT 1 FROM post_comments WHERE id = $1 AND is_hidden = false)`, id).
		Scan(&exists); err != nil {
		writeDBError(w, err)
		return
	}
	if !exists {
		writeError(w, http.StatusNotFound, "NOT_FOUND", "评论不存在")
		return
	}

	tag, err := a.pool.Exec(r.Context(),
		`DELETE FROM comment_likes WHERE comment_id = $1 AND user_id = $2`, id, userID(r))
	if err != nil {
		writeDBError(w, err)
		return
	}
	liked := false
	if tag.RowsAffected() == 0 {
		if _, err := a.pool.Exec(r.Context(),
			`INSERT INTO comment_likes (comment_id, user_id) VALUES ($1, $2)
			 ON CONFLICT DO NOTHING`, id, userID(r)); err != nil {
			writeDBError(w, err)
			return
		}
		liked = true
	}
	var likes int
	if err := a.pool.QueryRow(r.Context(),
		`SELECT like_count FROM post_comments WHERE id = $1`, id).Scan(&likes); err != nil {
		writeDBError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"liked": liked, "like_count": likes})
}

// POST /api/wall/reports（post_id / comment_id 二选一）
func (a *app) handleCreateReport(w http.ResponseWriter, r *http.Request) {
	var req struct {
		PostID    string `json:"post_id"`
		CommentID string `json:"comment_id"`
		Reason    string `json:"reason"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	req.Reason = strings.TrimSpace(req.Reason)
	if req.Reason == "" {
		writeError(w, http.StatusBadRequest, "EMPTY_REASON", "请填写举报理由")
		return
	}
	hasPost := req.PostID != ""
	hasComment := req.CommentID != ""
	if hasPost == hasComment {
		writeError(w, http.StatusBadRequest, "BAD_TARGET", "post_id 和 comment_id 必须二选一")
		return
	}
	if (hasPost && !isValidUUID(req.PostID)) || (hasComment && !isValidUUID(req.CommentID)) {
		writeError(w, http.StatusNotFound, "NOT_FOUND", "举报对象不存在")
		return
	}

	var reportID string
	err := a.pool.QueryRow(r.Context(),
		`INSERT INTO reports (reporter_id, post_id, comment_id, reason)
		 VALUES ($1, $2, $3, $4) RETURNING id`,
		userID(r), trimToNil(req.PostID), trimToNil(req.CommentID), req.Reason).
		Scan(&reportID)
	if err != nil {
		writeDBError(w, err)
		return
	}
	if hasComment {
		_, _ = a.pool.Exec(r.Context(),
			`UPDATE post_comments SET report_count = report_count + 1 WHERE id = $1`,
			req.CommentID)
	}
	writeJSON(w, http.StatusCreated, map[string]any{"id": reportID, "status": "pending"})
}
