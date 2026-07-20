package main

import (
	"math"
	"net/http"
	"sort"
	"strings"
	"time"
)

type recommendedPost struct {
	postDTO
	Reason string  `json:"reason"`
	Score  float64 `json:"score"`
}

// GET /api/wall/recommended?limit=20
// score = 0.45*heat + 0.35*affinity + 0.20*freshness（契约 §4.3f）
// 冷启动（互动 < 3 条）affinity 权重转给 heat；未登录退化为纯热度榜。
func (a *app) handleRecommended(w http.ResponseWriter, r *http.Request) {
	limit, _ := parsePagination(r)
	viewer := userID(r)

	// 候选池：近 14 天 visible，排除自己的帖与已点赞的帖
	viewerParam := trimToNil(viewer)
	rows, err := a.pool.Query(r.Context(),
		`SELECT p.id, p.user_id, p.content, p.category, p.tags, p.media_urls,
		        p.is_anonymous, p.anonymous_seed, p.likes_count, p.comments_count,
		        p.status, p.created_at, u.nickname, u.avatar_url
		 FROM posts p JOIN users u ON u.id = p.user_id
		 WHERE p.status = 'visible'
		   AND p.created_at >= now() - interval '14 days'
		   AND ($1::uuid IS NULL OR p.user_id <> $1::uuid)
		   AND ($1::uuid IS NULL OR NOT EXISTS(
		         SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = $1::uuid))
		 ORDER BY p.created_at DESC
		 LIMIT 300`, viewerParam)
	if err != nil {
		writeDBError(w, err)
		return
	}
	defer rows.Close()

	type candidate struct {
		post      postDTO
		createdAt time.Time
	}
	candidates := []candidate{}
	for rows.Next() {
		var p postDTO
		var created time.Time
		if err := rows.Scan(&p.ID, &p.UserID, &p.Content, &p.Category, &p.Tags,
			&p.MediaURLs, &p.IsAnonymous, &p.AnonymousSeed, &p.LikesCount,
			&p.CommentsCount, &p.Status, &created,
			&p.AuthorNickname, &p.AuthorAvatar); err != nil {
			writeDBError(w, err)
			return
		}
		p.CreatedAt = fmtTime(created)
		candidates = append(candidates, candidate{post: p, createdAt: created})
	}
	rows.Close()

	// 用户画像：近 30 天点赞/评论过的帖子的 tags/category 频率
	freq := map[string]float64{}
	totalFreq := 0.0
	interactions := 0
	if viewer != "" {
		// UNION ALL + JOIN：每次互动各算一条（IN 会按帖子去重，导致互动数被低估）
		prows, err := a.pool.Query(r.Context(),
			`SELECT p.tags, p.category
			 FROM (
			   SELECT post_id FROM post_likes    WHERE user_id = $1 AND created_at >= now() - interval '30 days'
			   UNION ALL
			   SELECT post_id FROM post_comments WHERE user_id = $1 AND created_at >= now() - interval '30 days'
			 ) i JOIN posts p ON p.id = i.post_id`, viewer)
		if err != nil {
			writeDBError(w, err)
			return
		}
		defer prows.Close()
		for prows.Next() {
			var tags []string
			var category string
			if err := prows.Scan(&tags, &category); err != nil {
				writeDBError(w, err)
				return
			}
			interactions++
			for _, t := range tags {
				if t = strings.TrimSpace(t); t != "" {
					freq["tag:"+t]++
					totalFreq++
				}
			}
			if category = strings.TrimSpace(category); category != "" {
				freq["cat:"+category]++
				totalFreq++
			}
		}
	}

	// 权重：冷启动（互动 < 3）把 affinity 权重转给 heat；未登录纯热度
	wHeat, wAffinity, wFresh := 0.45, 0.35, 0.20
	if viewer == "" || interactions < 3 {
		wHeat, wAffinity = wHeat+wAffinity, 0
	}

	// heat 用候选池内最大值归一化，避免头部帖霸榜
	maxHeat := 0.0
	heats := make([]float64, len(candidates))
	for i, c := range candidates {
		h := math.Log(1 + float64(c.post.LikesCount*2+c.post.CommentsCount*3))
		heats[i] = h
		maxHeat = math.Max(maxHeat, h)
	}

	now := time.Now().UTC()
	recs := make([]recommendedPost, 0, len(candidates))
	for i, c := range candidates {
		heat := 0.0
		if maxHeat > 0 {
			heat = heats[i] / maxHeat
		}
		fresh := math.Exp(-now.Sub(c.createdAt).Hours() / 48)

		// affinity：加权 Jaccard——候选 tokens 命中的用户频率 / (总频率 + 未命中 token 数)
		affinity := 0.0
		bestToken, bestWeight := "", 0.0
		if wAffinity > 0 {
			tokens := make([]string, 0, len(c.post.Tags)+1)
			for _, t := range c.post.Tags {
				if t = strings.TrimSpace(t); t != "" {
					tokens = append(tokens, "tag:"+t)
				}
			}
			if cat := strings.TrimSpace(c.post.Category); cat != "" {
				tokens = append(tokens, "cat:"+cat)
			}
			matched, missCount := 0.0, 0.0
			for _, tk := range tokens {
				if f := freq[tk]; f > 0 {
					matched += f
					if f > bestWeight {
						bestWeight, bestToken = f, tk
					}
				} else {
					missCount++
				}
			}
			if totalFreq+missCount > 0 {
				affinity = matched / (totalFreq + missCount)
			}
		}

		score := wHeat*heat + wAffinity*affinity + wFresh*fresh

		// 可解释理由：兴趣匹配显著就给个性化叙事，其次新鲜度，兜底热门
		reason := "全站热门"
		switch {
		case bestToken != "" && affinity > 0.25:
			if name, ok := strings.CutPrefix(bestToken, "tag:"); ok {
				reason = "因为你常互动 #" + name
			} else if name, ok := strings.CutPrefix(bestToken, "cat:"); ok {
				reason = "因为你关注「" + name + "」"
			}
		case wFresh*fresh > wHeat*heat && now.Sub(c.createdAt).Hours() <= 24:
			reason = "新鲜出炉"
		}

		p := c.post
		p.maskAnonymous(viewer, isAdmin(r))
		recs = append(recs, recommendedPost{postDTO: p, Reason: reason,
			Score: math.Round(score*10000) / 10000})
	}

	sort.SliceStable(recs, func(i, j int) bool { return recs[i].Score > recs[j].Score })
	if len(recs) > limit {
		recs = recs[:limit]
	}
	writeJSON(w, http.StatusOK, map[string]any{"posts": recs})
}
