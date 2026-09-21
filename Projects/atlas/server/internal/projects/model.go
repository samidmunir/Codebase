package projects

import "time"

type Status string

const (
	StatusPlanning  Status = "planning"
	StatusActive    Status = "active"
	StatusOnHold    Status = "on_hold"
	StatusCompleted Status = "completed"
)

type Priority string

const (
	PriorityLow    Priority = "low"
	PriorityMedium Priority = "medium"
	PriorityHigh   Priority = "high"
	PriorityUrgent Priority = "urgent"
)

type Project struct {
	ID          string     `json:"id"`
	UserID      string     `json:"-"`
	Name        string     `json:"name"`
	Description *string    `json:"description"`
	Status      Status     `json:"status"`
	Priority    Priority   `json:"priority"`
	StartDate   *time.Time `json:"startDate"`
	TargetDate  *time.Time `json:"targetDate"`
	CompletedAt *time.Time `json:"completedAt"`
	ArchivedAt  *time.Time `json:"archivedAt"`
	CreatedAt   time.Time  `json:"createdAt"`
	UpdatedAt   time.Time  `json:"updatedAt"`
}

type ListFilter struct {
	Status   *Status
	Priority *Priority
	Archived bool
	Search   string
	Sort     SortField
	Order    SortOrder
}

type SortField string

const (
	SortUpdatedAt  SortField = "updatedAt"
	SortCreatedAt  SortField = "createdAt"
	SortName       SortField = "name"
	SortStartDate  SortField = "startDate"
	SortTargetDate SortField = "targetDate"
)

type SortOrder string

const (
	SortAscending  SortOrder = "asc"
	SortDescending SortOrder = "desc"
)
