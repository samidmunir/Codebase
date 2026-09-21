package projects

import (
	"context"
	"strings"
	"time"
	"unicode/utf8"
)

type ProjectRepository interface {
	Create(ctx context.Context, project *Project) error

	GetByID(
		ctx context.Context,
		userID string,
		projectID string,
	) (*Project, error)

	List(
		ctx context.Context,
		userID string,
	) ([]Project, error)

	Update(
		ctx context.Context,
		project *Project,
	) error

	Archive(
		ctx context.Context,
		userID string,
		projectID string,
	) error

	Restore(
		ctx context.Context,
		userID string,
		projectID string,
	) error
}

type Service struct {
	repository ProjectRepository
}

func NewService(repository ProjectRepository) *Service {
	return &Service{
		repository: repository,
	}
}

type CreateProjectInput struct {
	Name        string
	Description *string
	Status      *Status
	Priority    *Priority
	StartDate   *time.Time
	TargetDate  *time.Time
}

type UpdateProjectInput struct {
	Name     *string
	Status   *Status
	Priority *Priority

	Description      *string
	ClearDescription bool

	StartDate      *time.Time
	ClearStartDate bool

	TargetDate      *time.Time
	ClearTargetDate bool
}

func validateName(name string) error {
	name = strings.TrimSpace(name)

	if name == "" {
		return ErrProjectNameRequired
	}

	if utf8.RuneCountInString(name) > 150 {
		return ErrProjectNameTooLong
	}

	return nil
}

func validateDescription(description *string) error {
	if description == nil {
		return nil
	}

	if utf8.RuneCountInString(*description) > 5000 {
		return ErrProjectDescriptionTooLong
	}

	return nil
}

func isValidStatus(status Status) bool {
	switch status {
	case StatusPlanning,
		StatusActive,
		StatusOnHold,
		StatusCompleted:
		return true

	default:
		return false
	}
}

func isValidPriority(priority Priority) bool {
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

func validateDates(
	startDate *time.Time,
	targetDate *time.Time,
) error {
	if startDate == nil || targetDate == nil {
		return nil
	}

	if targetDate.Before(*startDate) {
		return ErrInvalidProjectDates
	}

	return nil
}

func (s *Service) Create(
	ctx context.Context,
	userID string,
	input CreateProjectInput,
) (*Project, error) {
	name := strings.TrimSpace(input.Name)

	if err := validateName(name); err != nil {
		return nil, err
	}

	if err := validateDescription(input.Description); err != nil {
		return nil, err
	}

	if err := validateDates(
		input.StartDate,
		input.TargetDate,
	); err != nil {
		return nil, err
	}

	status := StatusPlanning

	if input.Status != nil {
		status = *input.Status
	}

	if !isValidStatus(status) {
		return nil, ErrInvalidProjectStatus
	}

	priority := PriorityMedium

	if input.Priority != nil {
		priority = *input.Priority
	}

	if !isValidPriority(priority) {
		return nil, ErrInvalidProjectPriority
	}

	var description *string

	if input.Description != nil {
		trimmed := strings.TrimSpace(
			*input.Description,
		)

		description = &trimmed
	}

	project := &Project{
		UserID:      userID,
		Name:        name,
		Description: description,
		Status:      status,
		Priority:    priority,
		StartDate:   input.StartDate,
		TargetDate:  input.TargetDate,
	}

	if status == StatusCompleted {
		now := time.Now().UTC()
		project.CompletedAt = &now
	}

	if err := s.repository.Create(ctx, project); err != nil {
		return nil, err
	}

	return project, nil
}

func (s *Service) GetByID(
	ctx context.Context,
	userID string,
	projectID string,
) (*Project, error) {
	return s.repository.GetByID(
		ctx,
		userID,
		projectID,
	)
}

func (s *Service) List(
	ctx context.Context,
	userID string,
) ([]Project, error) {
	return s.repository.List(ctx, userID)
}

func (s *Service) Archive(
	ctx context.Context,
	userID string,
	projectID string,
) error {
	return s.repository.Archive(
		ctx,
		userID,
		projectID,
	)
}

func (s *Service) Restore(
	ctx context.Context,
	userID string,
	projectID string,
) error {
	return s.repository.Restore(
		ctx,
		userID,
		projectID,
	)
}

func (s *Service) Update(
	ctx context.Context,
	userID string,
	projectID string,
	input UpdateProjectInput,
) (*Project, error) {
	project, err := s.repository.GetByID(
		ctx,
		userID,
		projectID,
	)
	if err != nil {
		return nil, err
	}

	if input.Name != nil {
		name := strings.TrimSpace(*input.Name)

		if err := validateName(name); err != nil {
			return nil, err
		}

		project.Name = name
	}

	if input.ClearDescription {
		project.Description = nil
	} else if input.Description != nil {
		if err := validateDescription(
			input.Description,
		); err != nil {
			return nil, err
		}

		description := strings.TrimSpace(
			*input.Description,
		)

		project.Description = &description
	}

	if input.Status != nil {
		if !isValidStatus(*input.Status) {
			return nil, ErrInvalidProjectStatus
		}

		previousStatus := project.Status
		project.Status = *input.Status

		switch {
		case previousStatus != StatusCompleted &&
			project.Status == StatusCompleted:

			now := time.Now().UTC()
			project.CompletedAt = &now

		case previousStatus == StatusCompleted &&
			project.Status != StatusCompleted:

			project.CompletedAt = nil
		}
	}

	if input.Priority != nil {
		if !isValidPriority(*input.Priority) {
			return nil, ErrInvalidProjectPriority
		}

		project.Priority = *input.Priority
	}

	if input.ClearStartDate {
		project.StartDate = nil
	} else if input.StartDate != nil {
		project.StartDate = input.StartDate
	}

	if input.ClearTargetDate {
		project.TargetDate = nil
	} else if input.TargetDate != nil {
		project.TargetDate = input.TargetDate
	}

	if err := validateDates(
		project.StartDate,
		project.TargetDate,
	); err != nil {
		return nil, err
	}

	if err := s.repository.Update(
		ctx,
		project,
	); err != nil {
		return nil, err
	}

	return project, nil
}
