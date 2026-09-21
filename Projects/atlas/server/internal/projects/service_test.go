package projects

import (
	"context"
	"errors"
	"testing"
	"time"
)

type fakeProjectRepository struct {
	createFn  func(context.Context, *Project) error
	getByIDFn func(context.Context, string, string) (*Project, error)
	listFn    func(
		context.Context,
		string,
		ListFilter,
	) ([]Project, error)
	updateFn  func(context.Context, *Project) error
	archiveFn func(context.Context, string, string) error
	restoreFn func(context.Context, string, string) error
}

func (f *fakeProjectRepository) Create(
	ctx context.Context,
	project *Project,
) error {
	if f.createFn != nil {
		return f.createFn(ctx, project)
	}

	return nil
}

func (f *fakeProjectRepository) GetByID(
	ctx context.Context,
	userID string,
	projectID string,
) (*Project, error) {
	if f.getByIDFn != nil {
		return f.getByIDFn(ctx, userID, projectID)
	}

	return nil, nil
}

func (f *fakeProjectRepository) List(
	ctx context.Context,
	userID string,
	filter ListFilter,
) ([]Project, error) {
	if f.listFn != nil {
		return f.listFn(
			ctx,
			userID,
			filter,
		)
	}

	return []Project{}, nil
}

func (f *fakeProjectRepository) Update(
	ctx context.Context,
	project *Project,
) error {
	if f.updateFn != nil {
		return f.updateFn(ctx, project)
	}

	return nil
}

func (f *fakeProjectRepository) Archive(
	ctx context.Context,
	userID string,
	projectID string,
) error {
	if f.archiveFn != nil {
		return f.archiveFn(ctx, userID, projectID)
	}

	return nil
}

func (f *fakeProjectRepository) Restore(
	ctx context.Context,
	userID string,
	projectID string,
) error {
	if f.restoreFn != nil {
		return f.restoreFn(ctx, userID, projectID)
	}

	return nil
}

func TestServiceCreateUsesDefaults(t *testing.T) {
	var captured *Project

	repo := &fakeProjectRepository{
		createFn: func(
			ctx context.Context,
			project *Project,
		) error {
			captured = project
			return nil
		},
	}

	service := NewService(repo)

	project, err := service.Create(
		context.Background(),
		"user-123",
		CreateProjectInput{
			Name: "Build Atlas",
		},
	)

	if err != nil {
		t.Fatalf("Create() error = %v", err)
	}

	if project.Status != StatusPlanning {
		t.Fatalf(
			"expected status %q, got %q",
			StatusPlanning,
			project.Status,
		)
	}

	if project.Priority != PriorityMedium {
		t.Fatalf(
			"expected priority %q, got %q",
			PriorityMedium,
			project.Priority,
		)
	}

	if captured == nil {
		t.Fatal("expected repository Create() to be called")
	}

	if captured.UserID != "user-123" {
		t.Fatalf(
			"expected user ID %q, got %q",
			"user-123",
			captured.UserID,
		)
	}
}

func TestServiceCreateTrimsName(t *testing.T) {
	repo := &fakeProjectRepository{}

	service := NewService(repo)

	project, err := service.Create(
		context.Background(),
		"user-123",
		CreateProjectInput{
			Name: "   Build Atlas   ",
		},
	)

	if err != nil {
		t.Fatalf("Create() error = %v", err)
	}

	if project.Name != "Build Atlas" {
		t.Fatalf(
			"expected trimmed name %q, got %q",
			"Build Atlas",
			project.Name,
		)
	}
}

func TestServiceCreateValidation(t *testing.T) {
	longName := string(make([]rune, 151))
	longDescription := string(make([]rune, 5001))

	invalidStatus := Status("invalid")
	invalidPriority := Priority("invalid")

	startDate := time.Date(
		2026, time.September, 21,
		0, 0, 0, 0,
		time.UTC,
	)

	targetDateBeforeStart := time.Date(
		2026, time.September, 20,
		0, 0, 0, 0,
		time.UTC,
	)

	tests := []struct {
		name    string
		input   CreateProjectInput
		wantErr error
	}{
		{
			name: "empty name",
			input: CreateProjectInput{
				Name: "",
			},
			wantErr: ErrProjectNameRequired,
		},
		{
			name: "whitespace name",
			input: CreateProjectInput{
				Name: "     ",
			},
			wantErr: ErrProjectNameRequired,
		},
		{
			name: "name too long",
			input: CreateProjectInput{
				Name: longName,
			},
			wantErr: ErrProjectNameTooLong,
		},
		{
			name: "description too long",
			input: CreateProjectInput{
				Name:        "Atlas",
				Description: &longDescription,
			},
			wantErr: ErrProjectDescriptionTooLong,
		},
		{
			name: "invalid status",
			input: CreateProjectInput{
				Name:   "Atlas",
				Status: &invalidStatus,
			},
			wantErr: ErrInvalidProjectStatus,
		},
		{
			name: "invalid priority",
			input: CreateProjectInput{
				Name:     "Atlas",
				Priority: &invalidPriority,
			},
			wantErr: ErrInvalidProjectPriority,
		},
		{
			name: "target before start",
			input: CreateProjectInput{
				Name:       "Atlas",
				StartDate:  &startDate,
				TargetDate: &targetDateBeforeStart,
			},
			wantErr: ErrInvalidProjectDates,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			service := NewService(
				&fakeProjectRepository{},
			)

			_, err := service.Create(
				context.Background(),
				"user-123",
				tt.input,
			)

			if !errors.Is(err, tt.wantErr) {
				t.Fatalf(
					"expected error %v, got %v",
					tt.wantErr,
					err,
				)
			}
		})
	}
}

func TestServiceCreateCompletedProjectSetsCompletedAt(
	t *testing.T,
) {
	status := StatusCompleted

	service := NewService(
		&fakeProjectRepository{},
	)

	before := time.Now().UTC()

	project, err := service.Create(
		context.Background(),
		"user-123",
		CreateProjectInput{
			Name:   "Finished Project",
			Status: &status,
		},
	)

	after := time.Now().UTC()

	if err != nil {
		t.Fatalf("Create() error = %v", err)
	}

	if project.CompletedAt == nil {
		t.Fatal(
			"expected CompletedAt to be populated",
		)
	}

	if project.CompletedAt.Before(before) ||
		project.CompletedAt.After(after) {
		t.Fatal(
			"CompletedAt was outside expected time range",
		)
	}
}

func TestServiceUpdate(t *testing.T) {
	existing := &Project{
		ID:       "project-123",
		UserID:   "user-123",
		Name:     "Old Name",
		Status:   StatusPlanning,
		Priority: PriorityMedium,
	}

	repo := &fakeProjectRepository{
		getByIDFn: func(
			ctx context.Context,
			userID string,
			projectID string,
		) (*Project, error) {
			return existing, nil
		},
	}

	service := NewService(repo)

	name := "  Build Atlas  "
	priority := PriorityHigh

	project, err := service.Update(
		context.Background(),
		"user-123",
		"project-123",
		UpdateProjectInput{
			Name:     &name,
			Priority: &priority,
		},
	)

	if err != nil {
		t.Fatalf("Update() error = %v", err)
	}

	if project.Name != "Build Atlas" {
		t.Fatalf(
			"expected name %q, got %q",
			"Build Atlas",
			project.Name,
		)
	}

	if project.Priority != PriorityHigh {
		t.Fatalf(
			"expected priority %q, got %q",
			PriorityHigh,
			project.Priority,
		)
	}
}

func TestServiceUpdateSetsCompletedAt(t *testing.T) {
	existing := &Project{
		ID:       "project-123",
		UserID:   "user-123",
		Name:     "Atlas",
		Status:   StatusActive,
		Priority: PriorityHigh,
	}

	repo := &fakeProjectRepository{
		getByIDFn: func(
			ctx context.Context,
			userID string,
			projectID string,
		) (*Project, error) {
			return existing, nil
		},
	}

	service := NewService(repo)

	status := StatusCompleted

	before := time.Now().UTC()

	project, err := service.Update(
		context.Background(),
		"user-123",
		"project-123",
		UpdateProjectInput{
			Status: &status,
		},
	)

	after := time.Now().UTC()

	if err != nil {
		t.Fatalf("Update() error = %v", err)
	}

	if project.CompletedAt == nil {
		t.Fatal(
			"expected CompletedAt to be populated",
		)
	}

	if project.CompletedAt.Before(before) ||
		project.CompletedAt.After(after) {
		t.Fatal(
			"CompletedAt was outside expected time range",
		)
	}
}

func TestServiceUpdateReopensCompletedProject(
	t *testing.T,
) {
	completedAt := time.Now().UTC().Add(-time.Hour)

	existing := &Project{
		ID:          "project-123",
		UserID:      "user-123",
		Name:        "Atlas",
		Status:      StatusCompleted,
		Priority:    PriorityHigh,
		CompletedAt: &completedAt,
	}

	repo := &fakeProjectRepository{
		getByIDFn: func(
			ctx context.Context,
			userID string,
			projectID string,
		) (*Project, error) {
			return existing, nil
		},
	}

	service := NewService(repo)

	status := StatusActive

	project, err := service.Update(
		context.Background(),
		"user-123",
		"project-123",
		UpdateProjectInput{
			Status: &status,
		},
	)

	if err != nil {
		t.Fatalf("Update() error = %v", err)
	}

	if project.CompletedAt != nil {
		t.Fatal(
			"expected CompletedAt to be cleared",
		)
	}

	if project.Status != StatusActive {
		t.Fatalf(
			"expected status %q, got %q",
			StatusActive,
			project.Status,
		)
	}
}

func TestServiceUpdateProjectNotFound(t *testing.T) {
	repo := &fakeProjectRepository{
		getByIDFn: func(
			ctx context.Context,
			userID string,
			projectID string,
		) (*Project, error) {
			return nil, ErrProjectNotFound
		},
	}

	service := NewService(repo)

	name := "Updated"

	_, err := service.Update(
		context.Background(),
		"user-123",
		"missing-project",
		UpdateProjectInput{
			Name: &name,
		},
	)

	if !errors.Is(err, ErrProjectNotFound) {
		t.Fatalf(
			"expected ErrProjectNotFound, got %v",
			err,
		)
	}
}

func TestServiceUpdateClearsTargetDate(t *testing.T) {
	targetDate := time.Date(
		2026, time.December, 31,
		0, 0, 0, 0,
		time.UTC,
	)

	existing := &Project{
		ID:         "project-123",
		UserID:     "user-123",
		Name:       "Atlas",
		Status:     StatusActive,
		Priority:   PriorityHigh,
		TargetDate: &targetDate,
	}

	repo := &fakeProjectRepository{
		getByIDFn: func(
			ctx context.Context,
			userID string,
			projectID string,
		) (*Project, error) {
			return existing, nil
		},
	}

	service := NewService(repo)

	project, err := service.Update(
		context.Background(),
		"user-123",
		"project-123",
		UpdateProjectInput{
			ClearTargetDate: true,
		},
	)

	if err != nil {
		t.Fatalf("Update() error = %v", err)
	}

	if project.TargetDate != nil {
		t.Fatal(
			"expected TargetDate to be cleared",
		)
	}
}

func TestServiceUpdateClearsStartDate(t *testing.T) {
	startDate := time.Date(
		2026, time.September, 21,
		0, 0, 0, 0,
		time.UTC,
	)

	existing := &Project{
		ID:        "project-123",
		UserID:    "user-123",
		Name:      "Atlas",
		Status:    StatusActive,
		Priority:  PriorityHigh,
		StartDate: &startDate,
	}

	repo := &fakeProjectRepository{
		getByIDFn: func(
			ctx context.Context,
			userID string,
			projectID string,
		) (*Project, error) {
			return existing, nil
		},
	}

	service := NewService(repo)

	project, err := service.Update(
		context.Background(),
		"user-123",
		"project-123",
		UpdateProjectInput{
			ClearStartDate: true,
		},
	)

	if err != nil {
		t.Fatalf("Update() error = %v", err)
	}

	if project.StartDate != nil {
		t.Fatal(
			"expected StartDate to be cleared",
		)
	}
}

func TestServiceUpdateClearsDescription(t *testing.T) {
	description := "Atlas project"

	existing := &Project{
		ID:          "project-123",
		UserID:      "user-123",
		Name:        "Atlas",
		Description: &description,
		Status:      StatusActive,
		Priority:    PriorityHigh,
	}

	repo := &fakeProjectRepository{
		getByIDFn: func(
			ctx context.Context,
			userID string,
			projectID string,
		) (*Project, error) {
			return existing, nil
		},
	}

	service := NewService(repo)

	project, err := service.Update(
		context.Background(),
		"user-123",
		"project-123",
		UpdateProjectInput{
			ClearDescription: true,
		},
	)

	if err != nil {
		t.Fatalf("Update() error = %v", err)
	}

	if project.Description != nil {
		t.Fatal(
			"expected Description to be cleared",
		)
	}
}

func TestServiceUpdateRejectsInvalidFinalDates(
	t *testing.T,
) {
	startDate := time.Date(
		2026, time.October, 10,
		0, 0, 0, 0,
		time.UTC,
	)

	existingTargetDate := time.Date(
		2026, time.December, 10,
		0, 0, 0, 0,
		time.UTC,
	)

	invalidTargetDate := time.Date(
		2026, time.September, 10,
		0, 0, 0, 0,
		time.UTC,
	)

	existing := &Project{
		ID:         "project-123",
		UserID:     "user-123",
		Name:       "Atlas",
		Status:     StatusActive,
		Priority:   PriorityHigh,
		StartDate:  &startDate,
		TargetDate: &existingTargetDate,
	}

	repo := &fakeProjectRepository{
		getByIDFn: func(
			ctx context.Context,
			userID string,
			projectID string,
		) (*Project, error) {
			return existing, nil
		},
	}

	service := NewService(repo)

	_, err := service.Update(
		context.Background(),
		"user-123",
		"project-123",
		UpdateProjectInput{
			TargetDate: &invalidTargetDate,
		},
	)

	if !errors.Is(err, ErrInvalidProjectDates) {
		t.Fatalf(
			"expected ErrInvalidProjectDates, got %v",
			err,
		)
	}
}

func TestServiceUpdateDoesNotPersistInvalidProject(
	t *testing.T,
) {
	updateCalled := false

	existing := &Project{
		ID:       "project-123",
		UserID:   "user-123",
		Name:     "Atlas",
		Status:   StatusActive,
		Priority: PriorityHigh,
	}

	repo := &fakeProjectRepository{
		getByIDFn: func(
			ctx context.Context,
			userID string,
			projectID string,
		) (*Project, error) {
			return existing, nil
		},

		updateFn: func(
			ctx context.Context,
			project *Project,
		) error {
			updateCalled = true
			return nil
		},
	}

	service := NewService(repo)

	invalidName := "     "

	_, err := service.Update(
		context.Background(),
		"user-123",
		"project-123",
		UpdateProjectInput{
			Name: &invalidName,
		},
	)

	if !errors.Is(err, ErrProjectNameRequired) {
		t.Fatalf(
			"expected ErrProjectNameRequired, got %v",
			err,
		)
	}

	if updateCalled {
		t.Fatal(
			"repository Update() should not be called for invalid input",
		)
	}
}

func TestServiceListUsesDefaults(t *testing.T) {
	repo := &fakeProjectRepository{
		listFn: func(
			ctx context.Context,
			userID string,
			filter ListFilter,
		) ([]Project, error) {
			if filter.Sort != SortUpdatedAt {
				t.Fatalf(
					"expected sort %q, got %q",
					SortUpdatedAt,
					filter.Sort,
				)
			}

			if filter.Order != SortDescending {
				t.Fatalf(
					"expected order %q, got %q",
					SortDescending,
					filter.Order,
				)
			}

			return []Project{}, nil
		},
	}

	service := NewService(repo)

	_, err := service.List(
		context.Background(),
		"user-123",
		ListFilter{},
	)

	if err != nil {
		t.Fatalf("List() error = %v", err)
	}
}

func TestServiceListValidation(t *testing.T) {
	invalidStatus := Status("invalid")
	invalidPriority := Priority("invalid")

	tests := []struct {
		name    string
		filter  ListFilter
		wantErr error
	}{
		{
			name: "invalid status",
			filter: ListFilter{
				Status: &invalidStatus,
			},
			wantErr: ErrInvalidProjectStatus,
		},
		{
			name: "invalid priority",
			filter: ListFilter{
				Priority: &invalidPriority,
			},
			wantErr: ErrInvalidProjectPriority,
		},
		{
			name: "invalid sort",
			filter: ListFilter{
				Sort: SortField("banana"),
			},
			wantErr: ErrInvalidProjectSort,
		},
		{
			name: "invalid order",
			filter: ListFilter{
				Order: SortOrder("sideways"),
			},
			wantErr: ErrInvalidSortOrder,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			service := NewService(
				&fakeProjectRepository{},
			)

			_, err := service.List(
				context.Background(),
				"user-123",
				tt.filter,
			)

			if !errors.Is(err, tt.wantErr) {
				t.Fatalf(
					"expected error %v, got %v",
					tt.wantErr,
					err,
				)
			}
		})
	}
}

func TestServiceListTrimsSearch(t *testing.T) {
	repo := &fakeProjectRepository{
		listFn: func(
			ctx context.Context,
			userID string,
			filter ListFilter,
		) ([]Project, error) {
			if filter.Search != "atlas" {
				t.Fatalf(
					"expected search %q, got %q",
					"atlas",
					filter.Search,
				)
			}

			return []Project{}, nil
		},
	}

	service := NewService(repo)

	_, err := service.List(
		context.Background(),
		"user-123",
		ListFilter{
			Search: "   atlas   ",
		},
	)

	if err != nil {
		t.Fatalf("List() error = %v", err)
	}
}
