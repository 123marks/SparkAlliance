package main

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"
)

// GET /healthz（无鉴权）
func (a *app) handleHealthz(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()
	db := "up"
	status := http.StatusOK
	if err := a.pool.Ping(ctx); err != nil {
		db = "down"
		status = http.StatusServiceUnavailable
	}
	writeJSON(w, status, map[string]any{"ok": db == "up", "db": db})
}

// ---- 健康打卡 health_checkins ----

type checkinDTO struct {
	ID              string          `json:"id"`
	UserID          string          `json:"user_id"`
	Date            string          `json:"date"`
	Mood            string          `json:"mood"`
	SleepHours      *float64        `json:"sleep_hours"`
	WaterCups       *int            `json:"water_cups"`
	ExerciseMinutes *int            `json:"exercise_minutes"`
	Meals           json.RawMessage `json:"meals"`
	Note            string          `json:"note"`
	SleepStart      string          `json:"sleep_start"`
	SleepEnd        string          `json:"sleep_end"`
	SleepQuality    *int            `json:"sleep_quality"`
	ExerciseType    string          `json:"exercise_type"`
	ExerciseIntens  string          `json:"exercise_intensity"`
	ExerciseImage   string          `json:"exercise_image_url"`
	IsPublic        bool            `json:"is_public"`
	ShareText       string          `json:"share_text"`
	ShareTags       []string        `json:"share_tags"`
	AIComment       string          `json:"ai_comment"`
	CreatedAt       string          `json:"created_at"`
}

const checkinCols = `id, user_id, date, mood, sleep_hours, water_cups,
	exercise_minutes, meals, note, sleep_start, sleep_end, sleep_quality,
	exercise_type, exercise_intensity, exercise_image_url, is_public,
	share_text, share_tags, ai_comment, created_at`

func scanCheckin(row rowScanner) (checkinDTO, error) {
	var c checkinDTO
	var date, created time.Time
	var meals []byte
	err := row.Scan(&c.ID, &c.UserID, &date, &c.Mood, &c.SleepHours,
		&c.WaterCups, &c.ExerciseMinutes, &meals, &c.Note,
		&c.SleepStart, &c.SleepEnd, &c.SleepQuality,
		&c.ExerciseType, &c.ExerciseIntens, &c.ExerciseImage, &c.IsPublic,
		&c.ShareText, &c.ShareTags, &c.AIComment, &created)
	if err != nil {
		return c, err
	}
	c.Date = fmtDate(date)
	c.Meals = meals
	c.ShareTags = orEmptyStrs(c.ShareTags)
	c.CreatedAt = fmtTime(created)
	return c, nil
}

// GET /api/health/checkins?from=&to=
func (a *app) handleListCheckins(w http.ResponseWriter, r *http.Request) {
	var from, to *time.Time
	if s := strings.TrimSpace(r.URL.Query().Get("from")); s != "" {
		t, err := parseTimeParam(s)
		if err != nil {
			writeError(w, http.StatusBadRequest, "BAD_TIME", "from 日期格式不正确")
			return
		}
		from = &t
	}
	if s := strings.TrimSpace(r.URL.Query().Get("to")); s != "" {
		t, err := parseTimeParam(s)
		if err != nil {
			writeError(w, http.StatusBadRequest, "BAD_TIME", "to 日期格式不正确")
			return
		}
		to = &t
	}

	rows, err := a.pool.Query(r.Context(),
		`SELECT `+checkinCols+` FROM health_checkins
		 WHERE user_id = $1
		   AND ($2::date IS NULL OR date >= $2)
		   AND ($3::date IS NULL OR date <= $3)
		 ORDER BY date DESC`,
		userID(r), from, to)
	if err != nil {
		writeDBError(w, err)
		return
	}
	defer rows.Close()

	checkins := []checkinDTO{}
	for rows.Next() {
		c, err := scanCheckin(rows)
		if err != nil {
			writeDBError(w, err)
			return
		}
		checkins = append(checkins, c)
	}
	writeJSON(w, http.StatusOK, map[string]any{"checkins": checkins})
}

// POST /api/health/checkins（按 (user_id, date) upsert，默认打卡今天）
func (a *app) handleUpsertCheckin(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Date            *string         `json:"date"`
		CheckinDate     *string         `json:"checkin_date"` // v1 字段名兼容
		Mood            *string         `json:"mood"`
		SleepHours      *float64        `json:"sleep_hours"`
		WaterCups       *int            `json:"water_cups"`
		ExerciseMinutes *int            `json:"exercise_minutes"`
		Meals           json.RawMessage `json:"meals"`
		Note            *string         `json:"note"`
		SleepStart      *string         `json:"sleep_start"`
		SleepEnd        *string         `json:"sleep_end"`
		SleepQuality    *int            `json:"sleep_quality"`
		ExerciseType    *string         `json:"exercise_type"`
		ExerciseIntens  *string         `json:"exercise_intensity"`
		ExerciseImage   *string         `json:"exercise_image_url"`
		IsPublic        *bool           `json:"is_public"`
		ShareText       *string         `json:"share_text"`
		ShareTags       []string        `json:"share_tags"`
		AIComment       *string         `json:"ai_comment"`
	}
	if !decodeJSON(w, r, &in) {
		return
	}
	date := time.Now().UTC()
	dateStr := in.Date
	if dateStr == nil {
		dateStr = in.CheckinDate
	}
	if dateStr != nil && *dateStr != "" {
		t, err := parseTimeParam(*dateStr)
		if err != nil {
			writeError(w, http.StatusBadRequest, "BAD_TIME", "date 日期格式不正确")
			return
		}
		date = t
	}
	meals := []byte("{}")
	if len(in.Meals) > 0 {
		if !json.Valid(in.Meals) {
			writeError(w, http.StatusBadRequest, "BAD_JSON", "meals 不是合法 JSON")
			return
		}
		meals = in.Meals
	}
	strOr := func(p *string) string {
		if p == nil {
			return ""
		}
		return *p
	}

	c, err := scanCheckin(a.pool.QueryRow(r.Context(),
		`INSERT INTO health_checkins
		   (user_id, date, mood, sleep_hours, water_cups, exercise_minutes, meals, note,
		    sleep_start, sleep_end, sleep_quality, exercise_type, exercise_intensity,
		    exercise_image_url, is_public, share_text, share_tags, ai_comment)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
		 ON CONFLICT (user_id, date) DO UPDATE SET
		   mood               = EXCLUDED.mood,
		   sleep_hours        = EXCLUDED.sleep_hours,
		   water_cups         = EXCLUDED.water_cups,
		   exercise_minutes   = EXCLUDED.exercise_minutes,
		   meals              = EXCLUDED.meals,
		   note               = EXCLUDED.note,
		   sleep_start        = EXCLUDED.sleep_start,
		   sleep_end          = EXCLUDED.sleep_end,
		   sleep_quality      = EXCLUDED.sleep_quality,
		   exercise_type      = EXCLUDED.exercise_type,
		   exercise_intensity = EXCLUDED.exercise_intensity,
		   exercise_image_url = EXCLUDED.exercise_image_url,
		   is_public          = EXCLUDED.is_public,
		   share_text         = EXCLUDED.share_text,
		   share_tags         = EXCLUDED.share_tags,
		   ai_comment         = EXCLUDED.ai_comment
		 RETURNING `+checkinCols,
		userID(r), date, strOr(in.Mood), in.SleepHours, in.WaterCups,
		in.ExerciseMinutes, meals, strOr(in.Note),
		strOr(in.SleepStart), strOr(in.SleepEnd), in.SleepQuality,
		strOr(in.ExerciseType), strOr(in.ExerciseIntens), strOr(in.ExerciseImage),
		in.IsPublic != nil && *in.IsPublic, strOr(in.ShareText),
		orEmptyStrs(in.ShareTags), strOr(in.AIComment)))
	if err != nil {
		writeDBError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, c)
}

// ---- v2 连续打卡 streak（实时计算，不建表） ----

// GET /api/health/streak
func (a *app) handleHealthStreak(w http.ResponseWriter, r *http.Request) {
	rows, err := a.pool.Query(r.Context(),
		`SELECT date FROM health_checkins WHERE user_id = $1 ORDER BY date ASC`, userID(r))
	if err != nil {
		writeDBError(w, err)
		return
	}
	defer rows.Close()

	dates := []time.Time{}
	for rows.Next() {
		var d time.Time
		if err := rows.Scan(&d); err != nil {
			writeDBError(w, err)
			return
		}
		dates = append(dates, d)
	}

	current, longest := 0, 0
	var lastDate *string
	if len(dates) > 0 {
		last := dates[len(dates)-1]
		s := fmtDate(last)
		lastDate = &s

		run := 1
		longest = 1
		for i := 1; i < len(dates); i++ {
			if dates[i].Sub(dates[i-1]).Hours() == 24 {
				run++
			} else {
				run = 1
			}
			longest = max(longest, run)
		}
		// 最近一次打卡是今天或昨天才算"进行中"的连续
		today := time.Now().UTC().Truncate(24 * time.Hour)
		gap := int(today.Sub(last.Truncate(24*time.Hour)).Hours() / 24)
		if gap <= 1 {
			current = run
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"current_streak":    current,
		"longest_streak":    longest,
		"last_checkin_date": lastDate,
	})
}

// ---- v2 健康挑战 health_challenges ----

type challengeDTO struct {
	ID            string  `json:"id"`
	UserID        string  `json:"user_id"`
	ChallengeType string  `json:"challenge_type"`
	Title         string  `json:"title"`
	Description   string  `json:"description"`
	TargetValue   float64 `json:"target_value"`
	CurrentValue  float64 `json:"current_value"`
	TargetDays    int     `json:"target_days"`
	CompletedDays int     `json:"completed_days"`
	StartDate     string  `json:"start_date"`
	EndDate       string  `json:"end_date"`
	Status        string  `json:"status"`
	RewardXP      int     `json:"reward_xp"`
	CreatedAt     string  `json:"created_at"`
}

const challengeCols = `id, user_id, challenge_type, title, description, target_value,
	current_value, target_days, completed_days, start_date, end_date, status,
	reward_xp, created_at`

func scanChallenge(row rowScanner) (challengeDTO, error) {
	var c challengeDTO
	var start, end, created time.Time
	err := row.Scan(&c.ID, &c.UserID, &c.ChallengeType, &c.Title, &c.Description,
		&c.TargetValue, &c.CurrentValue, &c.TargetDays, &c.CompletedDays,
		&start, &end, &c.Status, &c.RewardXP, &created)
	if err != nil {
		return c, err
	}
	c.StartDate = fmtDate(start)
	c.EndDate = fmtDate(end)
	c.CreatedAt = fmtTime(created)
	return c, nil
}

// GET /api/health/challenges?status=active
func (a *app) handleListChallenges(w http.ResponseWriter, r *http.Request) {
	status := trimToNil(r.URL.Query().Get("status"))
	rows, err := a.pool.Query(r.Context(),
		`SELECT `+challengeCols+` FROM health_challenges
		 WHERE user_id = $1 AND ($2::text IS NULL OR status = $2)
		 ORDER BY created_at DESC`, userID(r), status)
	if err != nil {
		writeDBError(w, err)
		return
	}
	defer rows.Close()
	challenges := []challengeDTO{}
	for rows.Next() {
		c, err := scanChallenge(rows)
		if err != nil {
			writeDBError(w, err)
			return
		}
		challenges = append(challenges, c)
	}
	writeJSON(w, http.StatusOK, map[string]any{"challenges": challenges})
}

// POST /api/health/challenges（start_date=今天，end_date=+target_days）
func (a *app) handleCreateChallenge(w http.ResponseWriter, r *http.Request) {
	var in struct {
		ChallengeType string   `json:"challenge_type"`
		Title         string   `json:"title"`
		Description   string   `json:"description"`
		TargetValue   *float64 `json:"target_value"`
		TargetDays    int      `json:"target_days"`
		RewardXP      int      `json:"reward_xp"`
	}
	if !decodeJSON(w, r, &in) {
		return
	}
	in.Title = strings.TrimSpace(in.Title)
	if in.Title == "" {
		writeError(w, http.StatusBadRequest, "EMPTY_TITLE", "标题不能为空")
		return
	}
	if in.TargetDays < 1 || in.TargetDays > 365 {
		writeError(w, http.StatusBadRequest, "VALIDATION", "target_days 取值 1-365")
		return
	}
	switch in.ChallengeType {
	case "sleep", "exercise", "water", "meal", "custom":
	default:
		in.ChallengeType = "custom"
	}
	targetValue := 0.0
	if in.TargetValue != nil {
		targetValue = *in.TargetValue
	}

	c, err := scanChallenge(a.pool.QueryRow(r.Context(),
		`INSERT INTO health_challenges
		   (user_id, challenge_type, title, description, target_value, target_days,
		    reward_xp, start_date, end_date)
		 VALUES ($1, $2, $3, $4, $5, $6::int, $7, current_date, current_date + $6::int)
		 RETURNING `+challengeCols,
		userID(r), in.ChallengeType, in.Title, in.Description,
		targetValue, in.TargetDays, in.RewardXP))
	if err != nil {
		writeDBError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, c)
}

// PATCH /api/health/challenges/{id}
func (a *app) handleUpdateChallenge(w http.ResponseWriter, r *http.Request) {
	id, ok := pathUUID(w, r, "id")
	if !ok {
		return
	}
	var in struct {
		CompletedDays *int     `json:"completed_days"`
		CurrentValue  *float64 `json:"current_value"`
		Status        *string  `json:"status"`
	}
	if !decodeJSON(w, r, &in) {
		return
	}
	var b updateBuilder
	if in.CompletedDays != nil {
		b.add("completed_days", *in.CompletedDays)
	}
	if in.CurrentValue != nil {
		b.add("current_value", *in.CurrentValue)
	}
	if in.Status != nil {
		switch *in.Status {
		case "active", "completed", "failed", "abandoned":
		default:
			writeError(w, http.StatusBadRequest, "BAD_STATUS",
				"status 只能是 active、completed、failed 或 abandoned")
			return
		}
		b.add("status", *in.Status)
	}
	if b.empty() {
		writeError(w, http.StatusBadRequest, "EMPTY_PATCH", "没有可更新的字段")
		return
	}

	args := append(b.args, id, userID(r))
	c, err := scanChallenge(a.pool.QueryRow(r.Context(),
		`UPDATE health_challenges SET `+strings.Join(b.sets, ", ")+
			` WHERE id = $`+itoa(len(b.args)+1)+` AND user_id = $`+itoa(len(b.args)+2)+
			` RETURNING `+challengeCols, args...))
	if err != nil {
		writeDBError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, c)
}
