package tasks

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"

	"github.com/samidmunir/Codebase/projects/atlas/server/internal/auth"
)

type fakeTaskService struct {
	createFn func(
		context.Context,
		string,
		CreateInput,
	) (*Task, error)

	getByIDFn func(
		context.Context,
		string,
		string,
	) (*Task, error)

	listFn func(
		context.Context,
		string,
		ListFilter,
	) ([]Task, error)

	updateFn func(
		context.Context,
		string,
		string,
		UpdateInput,
	) (*Task, error)

	deleteFn func(
		context.Context,
		string,
		string,
	) error
}

func (f *fakeTaskService) Create(
	ctx context.Context,
	userID string,
	input CreateInput,
) (*Task, error) {
	if f.createFn != nil {
		return f.createFn(ctx, userID, input)
	}

	return nil, nil
}

func (f *fakeTaskService) GetByID(
	ctx context.Context,
	userID string,
	taskID string,
) (*Task, error) {
	if f.getByIDFn != nil {
		return f.getByIDFn(ctx, userID, taskID)
	}

	return nil, nil
}

func (f *fakeTaskService) List(
	ctx context.Context,
	userID string,
	filter ListFilter,
) ([]Task, error) {
	if f.listFn != nil {
		return f.listFn(
			ctx,
			userID,
			filter,
		)
	}

	return []Task{}, nil
}

func (f *fakeTaskService) Update(
	ctx context.Context,
	userID string,
	taskID string,
	input UpdateInput,
) (*Task, error) {
	if f.updateFn != nil {
		return f.updateFn(
			ctx,
			userID,
			taskID,
			input,
		)
	}

	return nil, nil
}

func (f *fakeTaskService) Delete(
	ctx context.Context,
	userID string,
	taskID string,
) error {
	if f.deleteFn != nil {
		return f.deleteFn(
			ctx,
			userID,
			taskID,
		)
	}

	return nil
}

func authenticatedRequest(
	method string,
	target string,
	body []byte,
	userID uuid.UUID,
) *http.Request {
	req := httptest.NewRequest(
		method,
		target,
		bytes.NewReader(body),
	)

	ctx := auth.WithUserID(
		req.Context(),
		userID,
	)

	return req.WithContext(ctx)
}

func TestHandlerCreate(t *testing.T) {
	userID := uuid.New()

	service := &fakeTaskService{
		createFn: func(
			ctx context.Context,
			gotUserID string,
			input CreateInput,
		) (*Task, error) {
			require.Equal(
				t,
				userID.String(),
				gotUserID,
			)

			require.Equal(
				t,
				"Build Tasks API",
				input.Title,
			)

			require.NotNil(
				t,
				input.DueDate,
			)

			require.Equal(
				t,
				"2026-09-30",
				input.DueDate.Format("2006-01-02"),
			)

			return &Task{
				ID:       "task-1",
				UserID:   gotUserID,
				Title:    input.Title,
				Status:   StatusTodo,
				Priority: PriorityMedium,
				DueDate:  input.DueDate,
			}, nil
		},
	}

	handler := NewHandler(service)

	body := []byte(`{
		"title": "Build Tasks API",
		"dueDate": "2026-09-30"
	}`)

	req := authenticatedRequest(
		http.MethodPost,
		"/api/v1/tasks",
		body,
		userID,
	)

	recorder := httptest.NewRecorder()

	handler.Create(recorder, req)

	require.Equal(
		t,
		http.StatusCreated,
		recorder.Code,
	)

	var response struct {
		Task Task `json:"task"`
	}

	require.NoError(
		t,
		json.NewDecoder(recorder.Body).Decode(&response),
	)

	require.Equal(
		t,
		"task-1",
		response.Task.ID,
	)
}

func TestHandlerCreateRejectsInvalidDueDate(
	t *testing.T,
) {
	service := &fakeTaskService{
		createFn: func(
			context.Context,
			string,
			CreateInput,
		) (*Task, error) {
			t.Fatal(
				"service should not be called",
			)

			return nil, nil
		},
	}

	handler := NewHandler(service)

	req := authenticatedRequest(
		http.MethodPost,
		"/api/v1/tasks",
		[]byte(`{
		"title": "Bad date",
		"dueDate": "09/30/2026"
	}`),
		uuid.New(),
	)

	recorder :=
		httptest.NewRecorder()

	handler.Create(
		recorder,
		req,
	)

	require.Equal(
		t,
		http.StatusBadRequest,
		recorder.Code,
	)
}

func TestHandlerCreateRejectsUnknownFields(
	t *testing.T,
) {
	service := &fakeTaskService{}

	handler := NewHandler(service)

	req := authenticatedRequest(
		http.MethodPost,
		"/api/v1/tasks",
		[]byte(`{
		"title": "Bad date",
		"dueDate": "09/30/2026"
	}`),
		uuid.New(),
	)

	recorder :=
		httptest.NewRecorder()

	handler.Create(
		recorder,
		req,
	)

	require.Equal(
		t,
		http.StatusBadRequest,
		recorder.Code,
	)
}

func TestHandlerCreateMapsValidationError(
	t *testing.T,
) {
	service := &fakeTaskService{
		createFn: func(
			context.Context,
			string,
			CreateInput,
		) (*Task, error) {
			return nil, ErrInvalidTitle
		},
	}

	handler := NewHandler(service)

	req := authenticatedRequest(
		http.MethodPost,
		"/api/v1/tasks",
		[]byte(`{
		"title": "Bad date",
		"dueDate": "09/30/2026"
	}`),
		uuid.New(),
	)

	recorder :=
		httptest.NewRecorder()

	handler.Create(
		recorder,
		req,
	)

	require.Equal(
		t,
		http.StatusBadRequest,
		recorder.Code,
	)
}

func TestHandlerUpdateMapsNullToClearFields(
	t *testing.T,
) {
	userID := uuid.New()

	service := &fakeTaskService{
		updateFn: func(
			ctx context.Context,
			gotUserID string,
			taskID string,
			input UpdateInput,
		) (*Task, error) {
			require.Equal(
				t,
				userID.String(),
				gotUserID,
			)

			require.Equal(
				t,
				"task-1",
				taskID,
			)

			require.True(
				t,
				input.ProjectID.Set,
			)
			require.Nil(
				t,
				input.ProjectID.Value,
			)

			require.True(
				t,
				input.Description.Set,
			)
			require.Nil(
				t,
				input.Description.Value,
			)

			require.True(
				t,
				input.DueDate.Set,
			)
			require.Nil(
				t,
				input.DueDate.Value,
			)

			return &Task{
				ID:       taskID,
				UserID:   gotUserID,
				Title:    "Task",
				Status:   StatusTodo,
				Priority: PriorityMedium,
			}, nil
		},
	}

	handler := NewHandler(service)

	body := []byte(`{
		"projectId": null,
		"description": null,
		"dueDate": null
	}`)

	req := authenticatedRequest(
		http.MethodPatch,
		"/api/v1/tasks/task-1",
		body,
		userID,
	)

	req.SetPathValue(
		"id",
		"task-1",
	)

	recorder := httptest.NewRecorder()

	handler.Update(
		recorder,
		req,
	)

	require.Equal(
		t,
		http.StatusOK,
		recorder.Code,
	)
}

func TestHandlerGetByIDMapsNotFound(
	t *testing.T,
) {
	service := &fakeTaskService{
		getByIDFn: func(
			context.Context,
			string,
			string,
		) (*Task, error) {
			return nil, ErrTaskNotFound
		},
	}

	handler := NewHandler(service)

	req := authenticatedRequest(
		http.MethodPost,
		"/api/v1/tasks",
		[]byte(`{
		"title": "Bad date",
		"dueDate": "09/30/2026"
	}`),
		uuid.New(),
	)

	req.SetPathValue(
		"id",
		"missing",
	)

	recorder :=
		httptest.NewRecorder()

	handler.GetByID(
		recorder,
		req,
	)

	require.Equal(
		t,
		http.StatusNotFound,
		recorder.Code,
	)
}

func TestHandlerList(
	t *testing.T,
) {
	userID := uuid.New()

	service := &fakeTaskService{
		listFn: func(
			ctx context.Context,
			gotUserID string,
			filter ListFilter,
		) ([]Task, error) {
			require.Equal(
				t,
				userID.String(),
				gotUserID,
			)

			return []Task{
				{
					ID:       "task-1",
					UserID:   gotUserID,
					Title:    "First task",
					Status:   StatusTodo,
					Priority: PriorityMedium,
				},
				{
					ID:       "task-2",
					UserID:   gotUserID,
					Title:    "Second task",
					Status:   StatusInProgress,
					Priority: PriorityHigh,
				},
			}, nil
		},
	}

	handler := NewHandler(service)

	req := authenticatedRequest(
		http.MethodGet,
		"/api/v1/tasks",
		nil,
		userID,
	)

	recorder := httptest.NewRecorder()

	handler.List(
		recorder,
		req,
	)

	require.Equal(
		t,
		http.StatusOK,
		recorder.Code,
	)

	var response struct {
		Tasks []Task `json:"tasks"`
	}

	require.NoError(
		t,
		json.NewDecoder(
			recorder.Body,
		).Decode(&response),
	)

	require.Len(
		t,
		response.Tasks,
		2,
	)
}

func TestHandlerDelete(
	t *testing.T,
) {
	userID := uuid.New()

	service := &fakeTaskService{
		deleteFn: func(
			ctx context.Context,
			gotUserID string,
			taskID string,
		) error {
			require.Equal(
				t,
				userID.String(),
				gotUserID,
			)

			require.Equal(
				t,
				"task-1",
				taskID,
			)

			return nil
		},
	}

	handler := NewHandler(service)

	req := authenticatedRequest(
		http.MethodDelete,
		"/api/v1/tasks/task-1",
		nil,
		userID,
	)

	req.SetPathValue(
		"id",
		"task-1",
	)

	recorder := httptest.NewRecorder()

	handler.Delete(
		recorder,
		req,
	)

	require.Equal(
		t,
		http.StatusNoContent,
		recorder.Code,
	)

	require.Empty(
		t,
		recorder.Body.String(),
	)
}

func TestHandlerListParsesFilters(
	t *testing.T,
) {
	userID := uuid.New()
	projectID := uuid.New()

	service := &fakeTaskService{
		listFn: func(
			ctx context.Context,
			gotUserID string,
			filter ListFilter,
		) ([]Task, error) {
			require.Equal(
				t,
				userID.String(),
				gotUserID,
			)

			require.NotNil(t, filter.Status)
			require.Equal(
				t,
				StatusInProgress,
				*filter.Status,
			)

			require.NotNil(t, filter.Priority)
			require.Equal(
				t,
				PriorityHigh,
				*filter.Priority,
			)

			require.NotNil(t, filter.ProjectID)
			require.Equal(
				t,
				projectID.String(),
				*filter.ProjectID,
			)

			require.Equal(
				t,
				"backend api",
				filter.Search,
			)

			require.NotNil(t, filter.Due)
			require.Equal(
				t,
				DueUpcoming,
				*filter.Due,
			)

			require.Equal(
				t,
				SortDueDate,
				filter.Sort,
			)

			require.Equal(
				t,
				SortAscending,
				filter.Order,
			)

			return []Task{}, nil
		},
	}

	handler := NewHandler(service)

	target :=
		"/api/v1/tasks" +
			"?status=in_progress" +
			"&priority=high" +
			"&projectId=" + projectID.String() +
			"&search=backend%20api" +
			"&due=upcoming" +
			"&sort=dueDate" +
			"&order=asc"

	req := authenticatedRequest(
		http.MethodGet,
		target,
		nil,
		userID,
	)

	recorder := httptest.NewRecorder()

	handler.List(
		recorder,
		req,
	)

	require.Equal(
		t,
		http.StatusOK,
		recorder.Code,
	)
}

func TestHandlerListMapsValidationErrors(
	t *testing.T,
) {
	tests := []struct {
		name string
		err  error
	}{
		{
			name: "invalid status",
			err:  ErrInvalidStatus,
		},
		{
			name: "invalid priority",
			err:  ErrInvalidPriority,
		},
		{
			name: "invalid project",
			err:  ErrInvalidProject,
		},
		{
			name: "invalid due filter",
			err:  ErrInvalidDueFilter,
		},
		{
			name: "invalid sort",
			err:  ErrInvalidSort,
		},
		{
			name: "invalid order",
			err:  ErrInvalidOrder,
		},
	}

	for _, tt := range tests {
		t.Run(
			tt.name,
			func(t *testing.T) {
				service := &fakeTaskService{
					listFn: func(
						context.Context,
						string,
						ListFilter,
					) ([]Task, error) {
						return nil, tt.err
					},
				}

				handler :=
					NewHandler(service)

				req :=
					authenticatedRequest(
						http.MethodGet,
						"/api/v1/tasks",
						nil,
						uuid.New(),
					)

				recorder :=
					httptest.NewRecorder()

				handler.List(
					recorder,
					req,
				)

				require.Equal(
					t,
					http.StatusBadRequest,
					recorder.Code,
				)
			},
		)
	}
}
