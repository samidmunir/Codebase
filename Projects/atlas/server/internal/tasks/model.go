package tasks

import "time"

type Status string

const (
	StatusTodo       Status = "todo"
	StatusInProgress Status = "in_progress"
	StatusCompleted  Status = "completed"
)

type Priority string

const (
	PriorityLow    Priority = "low"
	PriorityMedium Priority = "medium"
	PriorityHigh   Priority = "high"
	PriorityUrgent Priority = "urgent"
)

type Task struct {
	ID        string  `json:"id"`
	UserID    string  `json:"-"`
	ProjectID *string `json:"projectId"`

	Title       string  `json:"title"`
	Description *string `json:"description"`

	Status   Status   `json:"status"`
	Priority Priority `json:"priority"`

	DueDate     *time.Time `json:"dueDate"`
	CompletedAt *time.Time `json:"completedAt"`

	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type DueFilter string

const (
	DueOverdue  DueFilter = "overdue"
	DueToday    DueFilter = "today"
	DueUpcoming DueFilter = "upcoming"
	DueNone     DueFilter = "none"
)

type SortField string

const (
	SortUpdatedAt SortField = "updatedAt"
	SortCreatedAt SortField = "createdAt"
	SortTitle     SortField = "title"
	SortDueDate   SortField = "dueDate"
	SortPriority  SortField = "priority"
)

type SortOrder string

const (
	SortAscending  SortOrder = "asc"
	SortDescending SortOrder = "desc"
)

type ListFilter struct {
	Status    *Status
	Priority  *Priority
	ProjectID *string
	Search    string
	Due       *DueFilter
	Sort      SortField
	Order     SortOrder
}
