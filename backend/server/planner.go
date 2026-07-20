package main

import (
	"net/http"
	"strings"
	"time"
)

// ---- 目标 goals ----

type milestoneDTO struct {
	ID          string  `json:"id"`
	GoalID      string  `json:"goal_id"`
	Title       string  `json:"title"`
	Description string  `json:"description"`
	TargetDate  *string `json:"target_date"`
	Weight      float64 `json:"weight"`
	SortOrder   int     `json:"sort_order"`
	CreatedAt   string  `json:"created_at"`
}

type goalDTO struct {
	ID            string         `json:"id"`
	UserID        string         `json:"user_id"`
	Title         string         `json:"title"`
	Description   string         `json:"description"`
	GoalType      string         `json:"goal_type"`
	Deadline      *string        `json:"deadline"`
	Status        string         `json:"status"`
	TotalProgress float64        `json:"total_progress"`
	CreatedAt     string         `json:"created_at"`
	UpdatedAt     string         `json:"updated_at"`
	Milestones    []milestoneDTO `json:"milestones"`
}

const goalCols = `id, user_id, title, description, goal_type, deadline, status,
	total_progress, created_at, updated_at`

func scanGoal(row rowScanner) (goalDTO, error) {
	var g goalDTO
	var deadline *time.Time
	var created, updated time.Time
	err := row.Scan(&g.ID, &g.UserID, &g.Title, &g.Description, &g.GoalType,
		&deadline, &g.Status, &g.TotalProgress, &created, &updated)
	if err != nil {
		return g, err
	}
	g.Deadline = fmtDatePtr(deadline)
	g.CreatedAt = fmtTime(created)
	g.UpdatedAt = fmtTime(updated)
	g.Milestones = []milestoneDTO{}
	return g, nil
}

// GET /api/planner/goals?status=（含 milestones 汇总）
func (a *app) handleListGoals(w http.ResponseWriter, r *http.Request) {
	status := trimToNil(r.URL.Query().Get("status"))
	rows, err := a.pool.Query(r.Context(),
		`SELECT `+goalCols+` FROM goals
		 WHERE user_id = $1 AND ($2::text IS NULL OR status = $2)
		 ORDER BY created_at DESC`,
		userID(r), status)
	if err != nil {
		writeDBError(w, err)
		return
	}
	defer rows.Close()

	goals := []goalDTO{}
	index := map[string]int{}
	for rows.Next() {
		g, err := scanGoal(rows)
		if err != nil {
			writeDBError(w, err)
			return
		}
		index[g.ID] = len(goals)
		goals = append(goals, g)
	}
	rows.Close()

	if len(goals) > 0 {
		mrows, err := a.pool.Query(r.Context(),
			`SELECT id, goal_id, title, description, target_date, weight, sort_order, created_at
			 FROM goal_milestones WHERE user_id = $1
			 ORDER BY sort_order ASC, created_at ASC`, userID(r))
		if err != nil {
			writeDBError(w, err)
			return
		}
		defer mrows.Close()
		for mrows.Next() {
			var m milestoneDTO
			var target *time.Time
			var created time.Time
			if err := mrows.Scan(&m.ID, &m.GoalID, &m.Title, &m.Description,
				&target, &m.Weight, &m.SortOrder, &created); err != nil {
				writeDBError(w, err)
				return
			}
			m.TargetDate = fmtDatePtr(target)
			m.CreatedAt = fmtTime(created)
			if i, ok := index[m.GoalID]; ok {
				goals[i].Milestones = append(goals[i].Milestones, m)
			}
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"goals": goals})
}

type goalInput struct {
	Title         *string  `json:"title"`
	Description   *string  `json:"description"`
	GoalType      *string  `json:"goal_type"`
	Deadline      *string  `json:"deadline"`
	Status        *string  `json:"status"`
	TotalProgress *float64 `json:"total_progress"`
}

// POST /api/planner/goals
func (a *app) handleCreateGoal(w http.ResponseWriter, r *http.Request) {
	var req goalInput
	if !decodeJSON(w, r, &req) {
		return
	}
	if req.Title == nil || strings.TrimSpace(*req.Title) == "" {
		writeError(w, http.StatusBadRequest, "EMPTY_TITLE", "标题不能为空")
		return
	}
	var deadline *time.Time
	if req.Deadline != nil && *req.Deadline != "" {
		t, err := parseTimeParam(*req.Deadline)
		if err != nil {
			writeError(w, http.StatusBadRequest, "BAD_TIME", "deadline 日期格式不正确")
			return
		}
		deadline = &t
	}
	desc, gtype := "", ""
	if req.Description != nil {
		desc = *req.Description
	}
	if req.GoalType != nil {
		gtype = strings.TrimSpace(*req.GoalType)
	}

	g, err := scanGoal(a.pool.QueryRow(r.Context(),
		`INSERT INTO goals (user_id, title, description, goal_type, deadline)
		 VALUES ($1, $2, $3, $4, $5) RETURNING `+goalCols,
		userID(r), strings.TrimSpace(*req.Title), desc, gtype, deadline))
	if err != nil {
		writeDBError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, g)
}

// PATCH /api/planner/goals/{id}
func (a *app) handleUpdateGoal(w http.ResponseWriter, r *http.Request) {
	id, ok := pathUUID(w, r, "id")
	if !ok {
		return
	}
	var req goalInput
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
	if req.GoalType != nil {
		b.add("goal_type", *req.GoalType)
	}
	if req.Deadline != nil {
		if *req.Deadline == "" {
			b.add("deadline", nil)
		} else {
			t, err := parseTimeParam(*req.Deadline)
			if err != nil {
				writeError(w, http.StatusBadRequest, "BAD_TIME", "deadline 日期格式不正确")
				return
			}
			b.add("deadline", t)
		}
	}
	if req.Status != nil {
		b.add("status", *req.Status)
	}
	if req.TotalProgress != nil {
		b.add("total_progress", *req.TotalProgress)
	}
	if b.empty() {
		writeError(w, http.StatusBadRequest, "EMPTY_PATCH", "没有可更新的字段")
		return
	}
	b.addExpr("updated_at = now()")

	args := append(b.args, id, userID(r))
	g, err := scanGoal(a.pool.QueryRow(r.Context(),
		`UPDATE goals SET `+strings.Join(b.sets, ", ")+
			` WHERE id = $`+itoa(len(b.args)+1)+` AND user_id = $`+itoa(len(b.args)+2)+
			` RETURNING `+goalCols, args...))
	if err != nil {
		writeDBError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, g)
}

// DELETE /api/planner/goals/{id}
func (a *app) handleDeleteGoal(w http.ResponseWriter, r *http.Request) {
	id, ok := pathUUID(w, r, "id")
	if !ok {
		return
	}
	tag, err := a.pool.Exec(r.Context(),
		`DELETE FROM goals WHERE id = $1 AND user_id = $2`, id, userID(r))
	if err != nil {
		writeDBError(w, err)
		return
	}
	if tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "NOT_FOUND", "目标不存在")
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"deleted": true})
}

// ---- 任务 planner_tasks ----

type taskDTO struct {
	ID               string  `json:"id"`
	UserID           string  `json:"user_id"`
	GoalID           *string `json:"goal_id"`
	MilestoneID      *string `json:"milestone_id"`
	Title            string  `json:"title"`
	Description      string  `json:"description"`
	EstimatedMinutes *int    `json:"estimated_minutes"`
	Difficulty       int     `json:"difficulty"`
	DueDate          *string `json:"due_date"`
	IsCompleted      bool    `json:"is_completed"`
	CompletedAt      *string `json:"completed_at"`
	Status           string  `json:"status"`
	CompletionNote   string  `json:"completion_note"`
	Source           string  `json:"source"`
	SortOrder        int     `json:"sort_order"`
	ScheduleEventID  *string `json:"schedule_event_id"`
	CreatedAt        string  `json:"created_at"`
}

const taskCols = `id, user_id, goal_id, milestone_id, title, description,
	estimated_minutes, difficulty, due_date, is_completed, completed_at, status,
	completion_note, source, sort_order, schedule_event_id, created_at`

func scanTask(row rowScanner) (taskDTO, error) {
	var t taskDTO
	var due, completedAt *time.Time
	var created time.Time
	err := row.Scan(&t.ID, &t.UserID, &t.GoalID, &t.MilestoneID, &t.Title,
		&t.Description, &t.EstimatedMinutes, &t.Difficulty, &due, &t.IsCompleted,
		&completedAt, &t.Status, &t.CompletionNote, &t.Source, &t.SortOrder,
		&t.ScheduleEventID, &created)
	if err != nil {
		return t, err
	}
	t.DueDate = fmtDatePtr(due)
	t.CompletedAt = fmtTimePtr(completedAt)
	t.CreatedAt = fmtTime(created)
	return t, nil
}

// GET /api/planner/tasks?status=&due_before=&unscheduled=1
func (a *app) handleListTasks(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	status := trimToNil(q.Get("status"))
	var dueBefore *time.Time
	if s := strings.TrimSpace(q.Get("due_before")); s != "" {
		t, err := parseTimeParam(s)
		if err != nil {
			writeError(w, http.StatusBadRequest, "BAD_TIME", "due_before 日期格式不正确")
			return
		}
		dueBefore = &t
	}
	unscheduled := q.Get("unscheduled") == "1"

	rows, err := a.pool.Query(r.Context(),
		`SELECT `+taskCols+` FROM planner_tasks
		 WHERE user_id = $1
		   AND ($2::text IS NULL OR status = $2)
		   AND ($3::date IS NULL OR due_date <= $3)
		   AND (NOT $4::bool OR schedule_event_id IS NULL)
		 ORDER BY sort_order ASC, created_at DESC`,
		userID(r), status, dueBefore, unscheduled)
	if err != nil {
		writeDBError(w, err)
		return
	}
	defer rows.Close()

	tasks := []taskDTO{}
	for rows.Next() {
		t, err := scanTask(rows)
		if err != nil {
			writeDBError(w, err)
			return
		}
		tasks = append(tasks, t)
	}
	writeJSON(w, http.StatusOK, map[string]any{"tasks": tasks})
}

type taskInput struct {
	GoalID           *string `json:"goal_id"`
	MilestoneID      *string `json:"milestone_id"`
	Title            *string `json:"title"`
	Description      *string `json:"description"`
	EstimatedMinutes *int    `json:"estimated_minutes"`
	Difficulty       *int    `json:"difficulty"`
	DueDate          *string `json:"due_date"`
	IsCompleted      *bool   `json:"is_completed"`
	Status           *string `json:"status"`
	CompletionNote   *string `json:"completion_note"`
	Source           *string `json:"source"`
	SortOrder        *int    `json:"sort_order"`
	ScheduleEventID  *string `json:"schedule_event_id"`
}

// ownGoalRef 校验 goal_id/milestone_id/schedule_event_id 归属当前用户，防跨用户挂靠。
func (a *app) ownRef(r *http.Request, table, id string) (bool, error) {
	var ok bool
	// table 为代码内常量，无注入面
	err := a.pool.QueryRow(r.Context(),
		`SELECT EXISTS(SELECT 1 FROM `+table+` WHERE id = $1 AND user_id = $2)`,
		id, userID(r)).Scan(&ok)
	return ok, err
}

func (a *app) checkTaskRefs(w http.ResponseWriter, r *http.Request,
	goalID, milestoneID, eventID *string) bool {
	type ref struct {
		table string
		id    *string
		name  string
	}
	for _, rf := range []ref{
		{"goals", goalID, "goal_id"},
		{"goal_milestones", milestoneID, "milestone_id"},
		{"schedule_events", eventID, "schedule_event_id"},
	} {
		if rf.id == nil || *rf.id == "" {
			continue
		}
		if !isValidUUID(*rf.id) {
			writeError(w, http.StatusBadRequest, "BAD_REF", rf.name+" 不合法")
			return false
		}
		ok, err := a.ownRef(r, rf.table, *rf.id)
		if err != nil {
			writeDBError(w, err)
			return false
		}
		if !ok {
			writeError(w, http.StatusBadRequest, "BAD_REF", rf.name+" 不存在或不属于当前用户")
			return false
		}
	}
	return true
}

// POST /api/planner/tasks
func (a *app) handleCreateTask(w http.ResponseWriter, r *http.Request) {
	var req taskInput
	if !decodeJSON(w, r, &req) {
		return
	}
	if req.Title == nil || strings.TrimSpace(*req.Title) == "" {
		writeError(w, http.StatusBadRequest, "EMPTY_TITLE", "标题不能为空")
		return
	}
	if !a.checkTaskRefs(w, r, req.GoalID, req.MilestoneID, req.ScheduleEventID) {
		return
	}
	var due *time.Time
	if req.DueDate != nil && *req.DueDate != "" {
		t, err := parseTimeParam(*req.DueDate)
		if err != nil {
			writeError(w, http.StatusBadRequest, "BAD_TIME", "due_date 日期格式不正确")
			return
		}
		due = &t
	}
	norm := func(p *string) *string {
		if p == nil || *p == "" {
			return nil
		}
		return p
	}
	desc, note := "", ""
	if req.Description != nil {
		desc = *req.Description
	}
	if req.CompletionNote != nil {
		note = *req.CompletionNote
	}
	difficulty, sortOrder := 2, 0
	if req.Difficulty != nil {
		difficulty = *req.Difficulty
	}
	if req.SortOrder != nil {
		sortOrder = *req.SortOrder
	}
	source := "manual"
	if req.Source != nil && strings.TrimSpace(*req.Source) != "" {
		source = strings.TrimSpace(*req.Source)
	}

	t, err := scanTask(a.pool.QueryRow(r.Context(),
		`INSERT INTO planner_tasks
		   (user_id, goal_id, milestone_id, title, description, estimated_minutes,
		    difficulty, due_date, completion_note, source, sort_order, schedule_event_id)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
		 RETURNING `+taskCols,
		userID(r), norm(req.GoalID), norm(req.MilestoneID),
		strings.TrimSpace(*req.Title), desc, req.EstimatedMinutes,
		difficulty, due, note, source, sortOrder, norm(req.ScheduleEventID)))
	if err != nil {
		writeDBError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, t)
}

// PATCH /api/planner/tasks/{id}
func (a *app) handleUpdateTask(w http.ResponseWriter, r *http.Request) {
	id, ok := pathUUID(w, r, "id")
	if !ok {
		return
	}
	var req taskInput
	if !decodeJSON(w, r, &req) {
		return
	}
	if !a.checkTaskRefs(w, r, req.GoalID, req.MilestoneID, req.ScheduleEventID) {
		return
	}

	var b updateBuilder
	nilable := func(col string, p *string) {
		if *p == "" {
			b.add(col, nil)
		} else {
			b.add(col, *p)
		}
	}
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
	if req.GoalID != nil {
		nilable("goal_id", req.GoalID)
	}
	if req.MilestoneID != nil {
		nilable("milestone_id", req.MilestoneID)
	}
	if req.ScheduleEventID != nil {
		nilable("schedule_event_id", req.ScheduleEventID)
	}
	if req.EstimatedMinutes != nil {
		b.add("estimated_minutes", *req.EstimatedMinutes)
	}
	if req.Difficulty != nil {
		b.add("difficulty", *req.Difficulty)
	}
	if req.DueDate != nil {
		if *req.DueDate == "" {
			b.add("due_date", nil)
		} else {
			t, err := parseTimeParam(*req.DueDate)
			if err != nil {
				writeError(w, http.StatusBadRequest, "BAD_TIME", "due_date 日期格式不正确")
				return
			}
			b.add("due_date", t)
		}
	}
	if req.IsCompleted != nil {
		b.add("is_completed", *req.IsCompleted)
		if *req.IsCompleted {
			b.addExpr("completed_at = now()")
			if req.Status == nil {
				b.add("status", "done")
			}
		} else {
			b.addExpr("completed_at = NULL")
			if req.Status == nil {
				b.add("status", "pending")
			}
		}
	}
	if req.Status != nil {
		b.add("status", *req.Status)
	}
	if req.CompletionNote != nil {
		b.add("completion_note", *req.CompletionNote)
	}
	if req.Source != nil {
		b.add("source", *req.Source)
	}
	if req.SortOrder != nil {
		b.add("sort_order", *req.SortOrder)
	}
	if b.empty() {
		writeError(w, http.StatusBadRequest, "EMPTY_PATCH", "没有可更新的字段")
		return
	}

	args := append(b.args, id, userID(r))
	t, err := scanTask(a.pool.QueryRow(r.Context(),
		`UPDATE planner_tasks SET `+strings.Join(b.sets, ", ")+
			` WHERE id = $`+itoa(len(b.args)+1)+` AND user_id = $`+itoa(len(b.args)+2)+
			` RETURNING `+taskCols, args...))
	if err != nil {
		writeDBError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, t)
}

// DELETE /api/planner/tasks/{id}
func (a *app) handleDeleteTask(w http.ResponseWriter, r *http.Request) {
	id, ok := pathUUID(w, r, "id")
	if !ok {
		return
	}
	tag, err := a.pool.Exec(r.Context(),
		`DELETE FROM planner_tasks WHERE id = $1 AND user_id = $2`, id, userID(r))
	if err != nil {
		writeDBError(w, err)
		return
	}
	if tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "NOT_FOUND", "任务不存在")
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"deleted": true})
}
