package tasks

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/samidmunir/Codebase/projects/atlas/server/internal/projects"
	"github.com/stretchr/testify/require"
)

type fakeTaskRepository struct {
	tasks       map[string]*Task
	createErr   error
	getErr      error
	listErr     error
	updateErr   error
	deleteErr   error
	updateCalls int
	listFilter  ListFilter
}

func newFakeTaskRepository() *fakeTaskRepository {
	return &fakeTaskRepository{
		tasks: make(map[string]*Task),
	}
}

func (r *fakeTaskRepository) Create(
	ctx context.Context,
	task *Task,
) error {
	if r.createErr != nil {
		return r.createErr
	}

	if task.ID == "" {
		task.ID = "task-1"
	}

	if task.CreatedAt.IsZero() {
		task.CreatedAt = time.Now().UTC()
	}

	task.UpdatedAt = task.CreatedAt

	r.tasks[task.ID] = cloneTask(task)

	return nil
}

func (r *fakeTaskRepository) GetByID(
	ctx context.Context,
	userID string,
	taskID string,
) (*Task, error) {
	if r.getErr != nil {
		return nil, r.getErr
	}

	task, ok := r.tasks[taskID]
	if !ok || task.UserID != userID {
		return nil, ErrTaskNotFound
	}

	return cloneTask(task), nil
}

func (r *fakeTaskRepository) List(
	ctx context.Context,
	userID string,
	filter ListFilter,
) ([]Task, error) {
	r.listFilter = filter

	if r.listErr != nil {
		return nil, r.listErr
	}

	result := make([]Task, 0)

	for _, task := range r.tasks {
		if task.UserID == userID {
			result = append(
				result,
				*cloneTask(task),
			)
		}
	}

	return result, nil
}

func (r *fakeTaskRepository) Update(
	ctx context.Context,
	task *Task,
) error {
	r.updateCalls++

	if r.updateErr != nil {
		return r.updateErr
	}

	existing, ok := r.tasks[task.ID]
	if !ok || existing.UserID != task.UserID {
		return ErrTaskNotFound
	}

	task.UpdatedAt = time.Now().UTC()

	r.tasks[task.ID] = cloneTask(task)

	return nil
}

func (r *fakeTaskRepository) Delete(
	ctx context.Context,
	userID string,
	taskID string,
) error {
	if r.deleteErr != nil {
		return r.deleteErr
	}

	task, ok := r.tasks[taskID]
	if !ok || task.UserID != userID {
		return ErrTaskNotFound
	}

	delete(r.tasks, taskID)

	return nil
}

func cloneTask(task *Task) *Task {
	copy := *task

	if task.ProjectID != nil {
		value := *task.ProjectID
		copy.ProjectID = &value
	}

	if task.Description != nil {
		value := *task.Description
		copy.Description = &value
	}

	if task.DueDate != nil {
		value := *task.DueDate
		copy.DueDate = &value
	}

	if task.CompletedAt != nil {
		value := *task.CompletedAt
		copy.CompletedAt = &value
	}

	return &copy
}

type fakeProjectRepository struct {
	projects map[string]*projects.Project
	err      error
}

func newFakeProjectRepository() *fakeProjectRepository {
	return &fakeProjectRepository{
		projects: make(map[string]*projects.Project),
	}
}

func (r *fakeProjectRepository) GetByID(
	ctx context.Context,
	userID string,
	projectID string,
) (*projects.Project, error) {
	if r.err != nil {
		return nil, r.err
	}

	project, ok := r.projects[projectID]

	if !ok || project.UserID != userID {
		return nil, projects.ErrProjectNotFound
	}

	return project, nil
}

func TestServiceCreateUsesDefaults(
	t *testing.T,
) {
	taskRepo := newFakeTaskRepository()
	projectRepo := newFakeProjectRepository()

	service := NewService(
		taskRepo,
		projectRepo,
	)

	task, err := service.Create(
		context.Background(),
		"user-1",
		CreateInput{
			Title: "Build Tasks service",
		},
	)

	require.NoError(t, err)

	require.Equal(
		t,
		"Build Tasks service",
		task.Title,
	)

	require.Equal(
		t,
		StatusTodo,
		task.Status,
	)

	require.Equal(
		t,
		PriorityMedium,
		task.Priority,
	)

	require.Nil(t, task.ProjectID)
	require.Nil(t, task.CompletedAt)
}

func TestServiceCreateNormalizesText(
	t *testing.T,
) {
	taskRepo := newFakeTaskRepository()
	projectRepo := newFakeProjectRepository()

	service := NewService(
		taskRepo,
		projectRepo,
	)

	description :=
		"   Implement business rules   "

	task, err := service.Create(
		context.Background(),
		"user-1",
		CreateInput{
			Title:       "   Tasks service   ",
			Description: &description,
		},
	)

	require.NoError(t, err)

	require.Equal(
		t,
		"Tasks service",
		task.Title,
	)

	require.NotNil(t, task.Description)

	require.Equal(
		t,
		"Implement business rules",
		*task.Description,
	)
}

func TestServiceCreateValidation(
	t *testing.T,
) {
	invalidStatus :=
		Status("banana")

	invalidPriority :=
		Priority("critical")

	longTitle :=
		strings.Repeat("a", 201)

	longDescription :=
		strings.Repeat("a", 5001)

	tests := []struct {
		name     string
		input    CreateInput
		expected error
	}{
		{
			name: "blank title",
			input: CreateInput{
				Title: "   ",
			},
			expected: ErrInvalidTitle,
		},
		{
			name: "title too long",
			input: CreateInput{
				Title: longTitle,
			},
			expected: ErrInvalidTitle,
		},
		{
			name: "description too long",
			input: CreateInput{
				Title:       "Valid",
				Description: &longDescription,
			},
			expected: ErrInvalidDescription,
		},
		{
			name: "invalid status",
			input: CreateInput{
				Title:  "Valid",
				Status: &invalidStatus,
			},
			expected: ErrInvalidStatus,
		},
		{
			name: "invalid priority",
			input: CreateInput{
				Title:    "Valid",
				Priority: &invalidPriority,
			},
			expected: ErrInvalidPriority,
		},
	}

	for _, tt := range tests {
		t.Run(
			tt.name,
			func(t *testing.T) {
				service := NewService(
					newFakeTaskRepository(),
					newFakeProjectRepository(),
				)

				_, err := service.Create(
					context.Background(),
					"user-1",
					tt.input,
				)

				require.ErrorIs(
					t,
					err,
					tt.expected,
				)
			},
		)
	}
}

func TestServiceCreateCompletedTaskSetsCompletedAt(
	t *testing.T,
) {
	status := StatusCompleted

	service := NewService(
		newFakeTaskRepository(),
		newFakeProjectRepository(),
	)

	task, err := service.Create(
		context.Background(),
		"user-1",
		CreateInput{
			Title:  "Already finished",
			Status: &status,
		},
	)

	require.NoError(t, err)
	require.NotNil(t, task.CompletedAt)
}

func TestServiceCreateWithOwnedProject(
	t *testing.T,
) {
	taskRepo := newFakeTaskRepository()
	projectRepo := newFakeProjectRepository()

	projectRepo.projects["project-1"] =
		&projects.Project{
			ID:     "project-1",
			UserID: "user-1",
			Name:   "Atlas",
		}

	service := NewService(
		taskRepo,
		projectRepo,
	)

	projectID := "project-1"

	task, err := service.Create(
		context.Background(),
		"user-1",
		CreateInput{
			Title:     "Build Tasks",
			ProjectID: &projectID,
		},
	)

	require.NoError(t, err)
	require.NotNil(t, task.ProjectID)

	require.Equal(
		t,
		"project-1",
		*task.ProjectID,
	)
}

func TestServiceCreateRejectsUnownedProject(
	t *testing.T,
) {
	projectRepo := newFakeProjectRepository()

	projectRepo.projects["project-1"] =
		&projects.Project{
			ID:     "project-1",
			UserID: "user-2",
			Name:   "Private project",
		}

	service := NewService(
		newFakeTaskRepository(),
		projectRepo,
	)

	projectID := "project-1"

	_, err := service.Create(
		context.Background(),
		"user-1",
		CreateInput{
			Title:     "Unauthorized task",
			ProjectID: &projectID,
		},
	)

	require.ErrorIs(
		t,
		err,
		ErrInvalidProject,
	)
}

func existingTask() *Task {
	description := "Existing description"
	projectID := "project-1"

	dueDate := time.Date(
		2026,
		time.September,
		30,
		0,
		0,
		0,
		0,
		time.UTC,
	)

	return &Task{
		ID:          "task-1",
		UserID:      "user-1",
		ProjectID:   &projectID,
		Title:       "Existing task",
		Description: &description,
		Status:      StatusTodo,
		Priority:    PriorityMedium,
		DueDate:     &dueDate,
	}
}

func TestServiceUpdateClearsDescription(
	t *testing.T,
) {
	taskRepo := newFakeTaskRepository()
	taskRepo.tasks["task-1"] =
		existingTask()

	service := NewService(
		taskRepo,
		newFakeProjectRepository(),
	)

	task, err := service.Update(
		context.Background(),
		"user-1",
		"task-1",
		UpdateInput{
			Description: NullableString{
				Set:   true,
				Value: nil,
			},
		},
	)

	require.NoError(t, err)
	require.Nil(t, task.Description)
}

func TestServiceUpdateClearsDueDate(
	t *testing.T,
) {
	taskRepo := newFakeTaskRepository()
	taskRepo.tasks["task-1"] =
		existingTask()

	service := NewService(
		taskRepo,
		newFakeProjectRepository(),
	)

	task, err := service.Update(
		context.Background(),
		"user-1",
		"task-1",
		UpdateInput{
			DueDate: NullableTime{
				Set:   true,
				Value: nil,
			},
		},
	)

	require.NoError(t, err)
	require.Nil(t, task.DueDate)
}

func TestServiceUpdateClearsProject(
	t *testing.T,
) {
	taskRepo := newFakeTaskRepository()
	taskRepo.tasks["task-1"] =
		existingTask()

	service := NewService(
		taskRepo,
		newFakeProjectRepository(),
	)

	task, err := service.Update(
		context.Background(),
		"user-1",
		"task-1",
		UpdateInput{
			ProjectID: NullableString{
				Set:   true,
				Value: nil,
			},
		},
	)

	require.NoError(t, err)
	require.Nil(t, task.ProjectID)
}

func TestServiceUpdateToCompletedSetsCompletedAt(
	t *testing.T,
) {
	taskRepo := newFakeTaskRepository()
	taskRepo.tasks["task-1"] =
		existingTask()

	service := NewService(
		taskRepo,
		newFakeProjectRepository(),
	)

	status := StatusCompleted

	task, err := service.Update(
		context.Background(),
		"user-1",
		"task-1",
		UpdateInput{
			Status: &status,
		},
	)

	require.NoError(t, err)

	require.Equal(
		t,
		StatusCompleted,
		task.Status,
	)

	require.NotNil(
		t,
		task.CompletedAt,
	)
}

func TestServiceReopenClearsCompletedAt(
	t *testing.T,
) {
	taskRepo := newFakeTaskRepository()

	task := existingTask()
	task.Status = StatusCompleted

	completedAt :=
		time.Now().
			Add(-time.Hour).
			UTC()

	task.CompletedAt = &completedAt

	taskRepo.tasks["task-1"] = task

	service := NewService(
		taskRepo,
		newFakeProjectRepository(),
	)

	status := StatusTodo

	updated, err := service.Update(
		context.Background(),
		"user-1",
		"task-1",
		UpdateInput{
			Status: &status,
		},
	)

	require.NoError(t, err)

	require.Equal(
		t,
		StatusTodo,
		updated.Status,
	)

	require.Nil(
		t,
		updated.CompletedAt,
	)
}

func TestServiceInvalidUpdateIsNotPersisted(
	t *testing.T,
) {
	taskRepo := newFakeTaskRepository()
	taskRepo.tasks["task-1"] =
		existingTask()

	service := NewService(
		taskRepo,
		newFakeProjectRepository(),
	)

	blankTitle := "   "

	_, err := service.Update(
		context.Background(),
		"user-1",
		"task-1",
		UpdateInput{
			Title: &blankTitle,
		},
	)

	require.ErrorIs(
		t,
		err,
		ErrInvalidTitle,
	)

	require.Equal(
		t,
		0,
		taskRepo.updateCalls,
	)

	stored :=
		taskRepo.tasks["task-1"]

	require.Equal(
		t,
		"Existing task",
		stored.Title,
	)
}

func TestServiceUpdateAssignsOwnedProject(
	t *testing.T,
) {
	taskRepo := newFakeTaskRepository()

	task := existingTask()
	task.ProjectID = nil

	taskRepo.tasks["task-1"] = task

	projectRepo :=
		newFakeProjectRepository()

	projectRepo.projects["project-2"] =
		&projects.Project{
			ID:     "project-2",
			UserID: "user-1",
			Name:   "Atlas Tasks",
		}

	service := NewService(
		taskRepo,
		projectRepo,
	)

	projectID := "project-2"

	updated, err := service.Update(
		context.Background(),
		"user-1",
		"task-1",
		UpdateInput{
			ProjectID: NullableString{
				Set:   true,
				Value: &projectID,
			},
		},
	)

	require.NoError(t, err)
	require.NotNil(t, updated.ProjectID)

	require.Equal(
		t,
		"project-2",
		*updated.ProjectID,
	)
}

func TestServiceListUsesDefaults(
	t *testing.T,
) {
	repository := &fakeTaskRepository{}

	service := NewService(
		repository,
		&fakeProjectRepository{},
	)

	_, err := service.List(
		context.Background(),
		"user-1",
		ListFilter{},
	)

	require.NoError(t, err)

	// We'll enhance fakeTaskRepository next
	// to capture the received ListFilter.
}

func TestServiceListTrimsSearch(
	t *testing.T,
) {
	repository := &fakeTaskRepository{}

	service := NewService(
		repository,
		&fakeProjectRepository{},
	)

	_, err := service.List(
		context.Background(),
		"user-1",
		ListFilter{
			Search: "   backend api   ",
		},
	)

	require.NoError(t, err)

	require.Equal(
		t,
		"backend api",
		repository.listFilter.Search,
	)
}
