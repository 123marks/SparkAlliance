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
	CheckinDate     string          `json:"checkin_date"`
	Mood            string          `json:"mood"`
	SleepHours      *float64        `json:"sleep_hours"`
	WaterCups       *int            `json:"water_cups"`
	ExerciseMinutes *int            `json:"exercise_minutes"`
	Meals           json.RawMessage `json:"meals"`
	Note            string          `json:"note"`
	CreatedAt       string          `json:"created_at"`
}

const checkinCols = `id, user_id, checkin_date, mood, sleep_hours, water_cups,
	exercise_minutes, meals, note, created_at`

func scanCheckin(row rowScanner) (checkinDTO, error) {
	var c checkinDTO
	var date, created time.Time
	var meals []byte
	err := row.Scan(&c.ID, &c.UserID, &date, &c.Mood, &c.SleepHours,
		&c.WaterCups, &c.ExerciseMinutes, &meals, &c.Note, &created)
	if err != nil {
		return c, err
	}
	c.CheckinDate = fmtDate(date)
	c.Meals = meals
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
		   AND ($2::date IS NULL OR checkin_date >= $2)
		   AND ($3::date IS NULL OR checkin_date <= $3)
		 ORDER BY checkin_date DESC`,
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

// POST /api/health/checkins（按 (user_id, checkin_date) upsert，默认打卡今天）
func (a *app) handleUpsertCheckin(w http.ResponseWriter, r *http.Request) {
	var req struct {
		CheckinDate     *string         `json:"checkin_date"`
		Mood            *string         `json:"mood"`
		SleepHours      *float64        `json:"sleep_hours"`
		WaterCups       *int            `json:"water_cups"`
		ExerciseMinutes *int            `json:"exercise_minutes"`
		Meals           json.RawMessage `json:"meals"`
		Note            *string         `json:"note"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	date := time.Now().UTC()
	if req.CheckinDate != nil && *req.CheckinDate != "" {
		t, err := parseTimeParam(*req.CheckinDate)
		if err != nil {
			writeError(w, http.StatusBadRequest, "BAD_TIME", "checkin_date 日期格式不正确")
			return
		}
		date = t
	}
	meals := []byte("{}")
	if len(req.Meals) > 0 {
		if !json.Valid(req.Meals) {
			writeError(w, http.StatusBadRequest, "BAD_JSON", "meals 不是合法 JSON")
			return
		}
		meals = req.Meals
	}
	mood, note := "", ""
	if req.Mood != nil {
		mood = strings.TrimSpace(*req.Mood)
	}
	if req.Note != nil {
		note = *req.Note
	}

	c, err := scanCheckin(a.pool.QueryRow(r.Context(),
		`INSERT INTO health_checkins
		   (user_id, checkin_date, mood, sleep_hours, water_cups, exercise_minutes, meals, note)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		 ON CONFLICT (user_id, checkin_date) DO UPDATE SET
		   mood             = EXCLUDED.mood,
		   sleep_hours      = EXCLUDED.sleep_hours,
		   water_cups       = EXCLUDED.water_cups,
		   exercise_minutes = EXCLUDED.exercise_minutes,
		   meals            = EXCLUDED.meals,
		   note             = EXCLUDED.note
		 RETURNING `+checkinCols,
		userID(r), date, mood, req.SleepHours, req.WaterCups,
		req.ExerciseMinutes, meals, note))
	if err != nil {
		writeDBError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, c)
}
