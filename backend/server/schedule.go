package main

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"
)

type scheduleEventDTO struct {
	ID             string          `json:"id"`
	UserID         string          `json:"user_id"`
	Title          string          `json:"title"`
	Description    string          `json:"description"`
	Location       string          `json:"location"`
	StartTime      string          `json:"start_time"`
	EndTime        *string         `json:"end_time"`
	AllDay         bool            `json:"all_day"`
	EventType      string          `json:"event_type"`
	EventSubtype   string          `json:"event_subtype"`
	Color          string          `json:"color"`
	RecurrenceType string          `json:"recurrence_type"`
	RecurrenceDays []int32         `json:"recurrence_days"`
	RecurrenceEnd  *string         `json:"recurrence_end"`
	Reminders      json.RawMessage `json:"reminders"`
	Status         string          `json:"status"`
	Priority       int             `json:"priority"`
	CreatedAt      string          `json:"created_at"`
	UpdatedAt      string          `json:"updated_at"`
}

const scheduleCols = `id, user_id, title, description, location, start_time, end_time,
	all_day, event_type, event_subtype, color, recurrence_type, recurrence_days,
	recurrence_end, reminders, status, priority, created_at, updated_at`

func scanScheduleEvent(row rowScanner) (scheduleEventDTO, error) {
	var e scheduleEventDTO
	var start, created, updated time.Time
	var end, recEnd *time.Time
	var reminders []byte
	err := row.Scan(&e.ID, &e.UserID, &e.Title, &e.Description, &e.Location,
		&start, &end, &e.AllDay, &e.EventType, &e.EventSubtype, &e.Color,
		&e.RecurrenceType, &e.RecurrenceDays, &recEnd, &reminders,
		&e.Status, &e.Priority, &created, &updated)
	if err != nil {
		return e, err
	}
	e.StartTime = fmtTime(start)
	e.EndTime = fmtTimePtr(end)
	e.RecurrenceEnd = fmtDatePtr(recEnd)
	e.Reminders = reminders
	e.RecurrenceDays = orEmptyInt32s(e.RecurrenceDays)
	e.CreatedAt = fmtTime(created)
	e.UpdatedAt = fmtTime(updated)
	return e, nil
}

// GET /api/schedule/events?from=&to=（区间重叠：start_time < to AND coalesce(end_time,start_time) >= from）
func (a *app) handleListEvents(w http.ResponseWriter, r *http.Request) {
	var from, to *time.Time
	if s := strings.TrimSpace(r.URL.Query().Get("from")); s != "" {
		t, err := parseTimeParam(s)
		if err != nil {
			writeError(w, http.StatusBadRequest, "BAD_TIME", "from 时间格式不正确")
			return
		}
		from = &t
	}
	if s := strings.TrimSpace(r.URL.Query().Get("to")); s != "" {
		t, err := parseTimeParam(s)
		if err != nil {
			writeError(w, http.StatusBadRequest, "BAD_TIME", "to 时间格式不正确")
			return
		}
		to = &t
	}

	rows, err := a.pool.Query(r.Context(),
		`SELECT `+scheduleCols+` FROM schedule_events
		 WHERE user_id = $1
		   AND ($2::timestamptz IS NULL OR coalesce(end_time, start_time) >= $2)
		   AND ($3::timestamptz IS NULL OR start_time < $3)
		 ORDER BY start_time ASC`,
		userID(r), from, to)
	if err != nil {
		writeDBError(w, err)
		return
	}
	defer rows.Close()

	events := []scheduleEventDTO{}
	for rows.Next() {
		e, err := scanScheduleEvent(rows)
		if err != nil {
			writeDBError(w, err)
			return
		}
		events = append(events, e)
	}
	writeJSON(w, http.StatusOK, map[string]any{"events": events})
}

type scheduleEventInput struct {
	Title          *string         `json:"title"`
	Description    *string         `json:"description"`
	Location       *string         `json:"location"`
	StartTime      *string         `json:"start_time"`
	EndTime        *string         `json:"end_time"`
	AllDay         *bool           `json:"all_day"`
	EventType      *string         `json:"event_type"`
	EventSubtype   *string         `json:"event_subtype"`
	Color          *string         `json:"color"`
	RecurrenceType *string         `json:"recurrence_type"`
	RecurrenceDays *[]int32        `json:"recurrence_days"`
	RecurrenceEnd  *string         `json:"recurrence_end"`
	Reminders      json.RawMessage `json:"reminders"`
	Status         *string         `json:"status"`
	Priority       *int            `json:"priority"`
}

// POST /api/schedule/events
func (a *app) handleCreateEvent(w http.ResponseWriter, r *http.Request) {
	var req scheduleEventInput
	if !decodeJSON(w, r, &req) {
		return
	}
	if req.Title == nil || strings.TrimSpace(*req.Title) == "" {
		writeError(w, http.StatusBadRequest, "EMPTY_TITLE", "标题不能为空")
		return
	}
	if req.StartTime == nil {
		writeError(w, http.StatusBadRequest, "BAD_TIME", "start_time 必填")
		return
	}
	start, err := parseTimeParam(*req.StartTime)
	if err != nil {
		writeError(w, http.StatusBadRequest, "BAD_TIME", "start_time 时间格式不正确")
		return
	}
	var end *time.Time
	if req.EndTime != nil && *req.EndTime != "" {
		t, err := parseTimeParam(*req.EndTime)
		if err != nil {
			writeError(w, http.StatusBadRequest, "BAD_TIME", "end_time 时间格式不正确")
			return
		}
		if t.Before(start) {
			writeError(w, http.StatusBadRequest, "BAD_TIME_RANGE", "end_time 不能早于 start_time")
			return
		}
		end = &t
	}
	var recEnd *time.Time
	if req.RecurrenceEnd != nil && *req.RecurrenceEnd != "" {
		t, err := parseTimeParam(*req.RecurrenceEnd)
		if err != nil {
			writeError(w, http.StatusBadRequest, "BAD_TIME", "recurrence_end 日期格式不正确")
			return
		}
		recEnd = &t
	}
	reminders := []byte("[]")
	if len(req.Reminders) > 0 {
		if !json.Valid(req.Reminders) {
			writeError(w, http.StatusBadRequest, "BAD_JSON", "reminders 不是合法 JSON")
			return
		}
		reminders = req.Reminders
	}
	strOr := func(p *string, def string) string {
		if p == nil {
			return def
		}
		return strings.TrimSpace(*p)
	}
	boolOr := func(p *bool) bool { return p != nil && *p }
	intOr := func(p *int, def int) int {
		if p == nil {
			return def
		}
		return *p
	}
	days := []int32{}
	if req.RecurrenceDays != nil {
		days = *req.RecurrenceDays
	}

	e, err := scanScheduleEvent(a.pool.QueryRow(r.Context(),
		`INSERT INTO schedule_events
		   (user_id, title, description, location, start_time, end_time, all_day,
		    event_type, event_subtype, color, recurrence_type, recurrence_days,
		    recurrence_end, reminders, status, priority)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
		 RETURNING `+scheduleCols,
		userID(r), strings.TrimSpace(*req.Title), strOr(req.Description, ""),
		strOr(req.Location, ""), start, end, boolOr(req.AllDay),
		strOr(req.EventType, ""), strOr(req.EventSubtype, ""), strOr(req.Color, ""),
		strOr(req.RecurrenceType, "none"), days, recEnd, reminders,
		strOr(req.Status, "active"), intOr(req.Priority, 0)))
	if err != nil {
		writeDBError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, e)
}

// PATCH /api/schedule/events/{id}（属主校验：WHERE user_id = 当前用户）
func (a *app) handleUpdateEvent(w http.ResponseWriter, r *http.Request) {
	id, ok := pathUUID(w, r, "id")
	if !ok {
		return
	}
	var req scheduleEventInput
	if !decodeJSON(w, r, &req) {
		return
	}

	var b updateBuilder
	if req.Title != nil {
		if strings.TrimSpace(*req.Title) == "" {
			writeError(w, http.StatusBadRequest, "EMPTY_TITLE", "标题不能为空")
			return
		}
		b.add("title", strings.TrimSpace(*req.Title))
	}
	if req.Description != nil {
		b.add("description", *req.Description)
	}
	if req.Location != nil {
		b.add("location", *req.Location)
	}
	if req.StartTime != nil {
		t, err := parseTimeParam(*req.StartTime)
		if err != nil {
			writeError(w, http.StatusBadRequest, "BAD_TIME", "start_time 时间格式不正确")
			return
		}
		b.add("start_time", t)
	}
	if req.EndTime != nil {
		if *req.EndTime == "" {
			b.add("end_time", nil)
		} else {
			t, err := parseTimeParam(*req.EndTime)
			if err != nil {
				writeError(w, http.StatusBadRequest, "BAD_TIME", "end_time 时间格式不正确")
				return
			}
			b.add("end_time", t)
		}
	}
	if req.AllDay != nil {
		b.add("all_day", *req.AllDay)
	}
	if req.EventType != nil {
		b.add("event_type", *req.EventType)
	}
	if req.EventSubtype != nil {
		b.add("event_subtype", *req.EventSubtype)
	}
	if req.Color != nil {
		b.add("color", *req.Color)
	}
	if req.RecurrenceType != nil {
		b.add("recurrence_type", *req.RecurrenceType)
	}
	if req.RecurrenceDays != nil {
		b.add("recurrence_days", *req.RecurrenceDays)
	}
	if req.RecurrenceEnd != nil {
		if *req.RecurrenceEnd == "" {
			b.add("recurrence_end", nil)
		} else {
			t, err := parseTimeParam(*req.RecurrenceEnd)
			if err != nil {
				writeError(w, http.StatusBadRequest, "BAD_TIME", "recurrence_end 日期格式不正确")
				return
			}
			b.add("recurrence_end", t)
		}
	}
	if len(req.Reminders) > 0 {
		if !json.Valid(req.Reminders) {
			writeError(w, http.StatusBadRequest, "BAD_JSON", "reminders 不是合法 JSON")
			return
		}
		b.add("reminders", []byte(req.Reminders))
	}
	if req.Status != nil {
		b.add("status", *req.Status)
	}
	if req.Priority != nil {
		b.add("priority", *req.Priority)
	}
	if b.empty() {
		writeError(w, http.StatusBadRequest, "EMPTY_PATCH", "没有可更新的字段")
		return
	}
	b.addExpr("updated_at = now()")

	args := append(b.args, id, userID(r))
	e, err := scanScheduleEvent(a.pool.QueryRow(r.Context(),
		`UPDATE schedule_events SET `+strings.Join(b.sets, ", ")+
			` WHERE id = $`+itoa(len(b.args)+1)+` AND user_id = $`+itoa(len(b.args)+2)+
			` RETURNING `+scheduleCols, args...))
	if err != nil {
		writeDBError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, e)
}

// DELETE /api/schedule/events/{id}
func (a *app) handleDeleteEvent(w http.ResponseWriter, r *http.Request) {
	id, ok := pathUUID(w, r, "id")
	if !ok {
		return
	}
	tag, err := a.pool.Exec(r.Context(),
		`DELETE FROM schedule_events WHERE id = $1 AND user_id = $2`, id, userID(r))
	if err != nil {
		writeDBError(w, err)
		return
	}
	if tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "NOT_FOUND", "日程不存在")
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"deleted": true})
}
