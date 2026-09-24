package tasks

import (
	"context"
	"errors"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"

	"github.com/samidmunir/Codebase/projects/atlas/server/internal/projects"
)

type TaskRepository interface {
	Create(ctx context.Context, task *Task) error
	GetByID(ctx context.Context, userID, taskID string) (*Task, error)

	List(
		ctx context.Context,
		userID string,
		filter ListFilter,
	) ([]Task, error)

	Update(ctx context.Context, task *Task) error
	Delete(ctx context.Context, userID, taskID string) error
}

type ProjectRepository interface {
	GetByID(
		ctx context.Context,
		userID string,
		projectID string,
	) (*projects.Project, error)
}

type Service struct {
	tasks    TaskRepository
	projects ProjectRepository
}

func NewService(
	tasks TaskRepository,
	projects ProjectRepository,
) *Service {
	return &Service{
		tasks:    tasks,
		projects: projects,
	}
}

type CreateInput struct {
	ProjectID   *string
	Title       string
	Description *string
	Status      *Status
	Priority    *Priority
	DueDate     *time.Time
}

type NullableString struct {
	Set   bool
	Value *string
}

type NullableTime struct {
	Set   bool
	Value *time.Time
}

type UpdateInput struct {
	ProjectID   NullableString
	Title       *string
	Description NullableString
	Status      *Status
	Priority    *Priority
	DueDate     NullableTime
}

func validStatus(status Status) bool {
	switch status {
	case StatusTodo,
		StatusInProgress,
		StatusCompleted:
		return true
	default:
		return false
	}
}

func validPriority(priority Priority) bool {
	switch priority {
	case PriorityLow,
		PriorityMedium,
		PriorityHigh,
		PriorityUrgent:
		return true
	default:
		return false
	}
}

func normalizeTitle(title string) (string, error) {
	title = strings.TrimSpace(title)

	length := utf8.RuneCountInString(title)

	if length == 0 || length > 200 {
		return "", ErrInvalidTitle
	}

	return title, nil
}

func normalizeDescription(
	description *string,
) (*string, error) {
	if description == nil {
		return nil, nil
	}

	value := strings.TrimSpace(*description)

	if utf8.RuneCountInString(value) > 5000 {
		return nil, ErrInvalidDescription
	}

	return &value, nil
}

func (s *Service) validateProject(
	ctx context.Context,
	userID string,
	projectID *string,
) error {
	if projectID == nil {
		return nil
	}

	id := strings.TrimSpace(*projectID)

	if id == "" {
		return ErrInvalidProject
	}

	_, err := s.projects.GetByID(
		ctx,
		userID,
		id,
	)

	if errors.Is(
		err,
		projects.ErrProjectNotFound,
	) {
		return ErrInvalidProject
	}

	return err
}

func (s *Service) Create(
	ctx context.Context,
	userID string,
	input CreateInput,
) (*Task, error) {
	title, err :=
		normalizeTitle(input.Title)
	if err != nil {
		return nil, err
	}

	description, err :=
		normalizeDescription(
			input.Description,
		)
	if err != nil {
		return nil, err
	}

	status := StatusTodo

	if input.Status != nil {
		status = *input.Status
	}

	if !validStatus(status) {
		return nil, ErrInvalidStatus
	}

	priority := PriorityMedium

	if input.Priority != nil {
		priority = *input.Priority
	}

	if !validPriority(priority) {
		return nil, ErrInvalidPriority
	}

	var projectID *string

	if input.ProjectID != nil {
		value :=
			strings.TrimSpace(
				*input.ProjectID,
			)

		projectID = &value

		if err := s.validateProject(
			ctx,
			userID,
			projectID,
		); err != nil {
			return nil, err
		}
	}

	task := &Task{
		UserID:      userID,
		ProjectID:   projectID,
		Title:       title,
		Description: description,
		Status:      status,
		Priority:    priority,
		DueDate:     input.DueDate,
	}

	if status == StatusCompleted {
		now := time.Now().UTC()
		task.CompletedAt = &now
	}

	if err := s.tasks.Create(
		ctx,
		task,
	); err != nil {
		return nil, err
	}

	return task, nil
}

func (s *Service) GetByID(
	ctx context.Context,
	userID string,
	taskID string,
) (*Task, error) {
	return s.tasks.GetByID(
		ctx,
		userID,
		taskID,
	)
}

func (s *Service) List(
	ctx context.Context,
	userID string,
	filter ListFilter,
) ([]Task, error) {
	// Defaults
	if filter.Sort == "" {
		filter.Sort = SortUpdatedAt
	}

	if filter.Order == "" {
		filter.Order = SortDescending
	}

	// Validate status
	if filter.Status != nil &&
		!validStatus(*filter.Status) {
		return nil, ErrInvalidStatus
	}

	// Validate priority
	if filter.Priority != nil &&
		!validPriority(*filter.Priority) {
		return nil, ErrInvalidPriority
	}

	// Validate due filter
	if filter.Due != nil &&
		!validDueFilter(*filter.Due) {
		return nil, ErrInvalidDueFilter
	}

	// Validate sorting
	if !validSortField(filter.Sort) {
		return nil, ErrInvalidSort
	}

	if !validSortOrder(filter.Order) {
		return nil, ErrInvalidOrder
	}

	// Normalize search
	filter.Search =
		strings.TrimSpace(filter.Search)

	if filter.ProjectID != nil {
		projectID :=
			strings.TrimSpace(
				*filter.ProjectID,
			)

		if projectID == "" {
			return nil, ErrInvalidProject
		}

		if _, err := uuid.Parse(projectID); err != nil {
			return nil, ErrInvalidProject
		}

		filter.ProjectID = &projectID
	}

	return s.tasks.List(
		ctx,
		userID,
		filter,
	)
}

func (s *Service) Update(
	ctx context.Context,
	userID string,
	taskID string,
	input UpdateInput,
) (*Task, error) {
	task, err :=
		s.tasks.GetByID(
			ctx,
			userID,
			taskID,
		)

	if err != nil {
		return nil, err
	}

	if input.Title != nil {
		title, err :=
			normalizeTitle(
				*input.Title,
			)

		if err != nil {
			return nil, err
		}

		task.Title = title
	}

	if input.Description.Set {
		description, err :=
			normalizeDescription(
				input.Description.Value,
			)

		if err != nil {
			return nil, err
		}

		task.Description = description
	}

	if input.ProjectID.Set {
		if input.ProjectID.Value == nil {
			task.ProjectID = nil
		} else {
			projectID :=
				strings.TrimSpace(
					*input.ProjectID.Value,
				)

			if projectID == "" {
				return nil, ErrInvalidProject
			}

			if err := s.validateProject(
				ctx,
				userID,
				&projectID,
			); err != nil {
				return nil, err
			}

			task.ProjectID = &projectID
		}
	}

	if input.Priority != nil {
		if !validPriority(
			*input.Priority,
		) {
			return nil, ErrInvalidPriority
		}

		task.Priority =
			*input.Priority
	}

	if input.DueDate.Set {
		task.DueDate =
			input.DueDate.Value
	}

	if input.Status != nil {
		if !validStatus(
			*input.Status,
		) {
			return nil, ErrInvalidStatus
		}

		oldStatus := task.Status
		newStatus := *input.Status

		task.Status = newStatus

		if oldStatus != StatusCompleted &&
			newStatus == StatusCompleted {
			now := time.Now().UTC()
			task.CompletedAt = &now
		}

		if oldStatus == StatusCompleted &&
			newStatus != StatusCompleted {
			task.CompletedAt = nil
		}
	}

	if err := s.tasks.Update(
		ctx,
		task,
	); err != nil {
		return nil, err
	}

	return task, nil
}

func (s *Service) Delete(
	ctx context.Context,
	userID string,
	taskID string,
) error {
	return s.tasks.Delete(
		ctx,
		userID,
		taskID,
	)
}

func validDueFilter(
	due DueFilter,
) bool {
	switch due {
	case DueOverdue,
		DueToday,
		DueUpcoming,
		DueNone:
		return true
	default:
		return false
	}
}

func validSortField(
	sort SortField,
) bool {
	switch sort {
	case SortUpdatedAt,
		SortCreatedAt,
		SortTitle,
		SortDueDate,
		SortPriority:
		return true
	default:
		return false
	}
}

func validSortOrder(
	order SortOrder,
) bool {
	switch order {
	case SortAscending,
		SortDescending:
		return true
	default:
		return false
	}
}
