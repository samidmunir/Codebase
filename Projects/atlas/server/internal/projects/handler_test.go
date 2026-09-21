package projects

import (
	"bytes"
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"
	"github.com/samidmunir/Codebase/projects/atlas/server/internal/auth"
)

type fakeProjectService struct {
	createFn func(
		context.Context,
		string,
		CreateProjectInput,
	) (*Project, error)

	getByIDFn func(
		context.Context,
		string,
		string,
	) (*Project, error)

	listFn func(
		context.Context,
		string,
		ListFilter,
	) ([]Project, error)

	updateFn func(
		context.Context,
		string,
		string,
		UpdateProjectInput,
	) (*Project, error)

	archiveFn func(
		context.Context,
		string,
		string,
	) error

	restoreFn func(
		context.Context,
		string,
		string,
	) error
}

func (f *fakeProjectService) Create(
	ctx context.Context,
	userID string,
	input CreateProjectInput,
) (*Project, error) {
	if f.createFn != nil {
		return f.createFn(ctx, userID, input)
	}

	return nil, nil
}

func (f *fakeProjectService) GetByID(
	ctx context.Context,
	userID string,
	projectID string,
) (*Project, error) {
	if f.getByIDFn != nil {
		return f.getByIDFn(ctx, userID, projectID)
	}

	return nil, nil
}

func (f *fakeProjectService) List(
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

func (f *fakeProjectService) Update(
	ctx context.Context,
	userID string,
	projectID string,
	input UpdateProjectInput,
) (*Project, error) {
	if f.updateFn != nil {
		return f.updateFn(ctx, userID, projectID, input)
	}

	return nil, nil
}

func (f *fakeProjectService) Archive(
	ctx context.Context,
	userID string,
	projectID string,
) error {
	if f.archiveFn != nil {
		return f.archiveFn(ctx, userID, projectID)
	}

	return nil
}

func (f *fakeProjectService) Restore(
	ctx context.Context,
	userID string,
	projectID string,
) error {
	if f.restoreFn != nil {
		return f.restoreFn(ctx, userID, projectID)
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

	service := &fakeProjectService{
		createFn: func(
			ctx context.Context,
			gotUserID string,
			input CreateProjectInput,
		) (*Project, error) {
			if gotUserID != userID.String() {
				t.Fatalf(
					"expected user ID %q, got %q",
					userID.String(),
					gotUserID,
				)
			}

			if input.Name != "Build Atlas" {
				t.Fatalf(
					"expected name %q, got %q",
					"Build Atlas",
					input.Name,
				)
			}

			return &Project{
				ID:       uuid.New().String(),
				UserID:   gotUserID,
				Name:     input.Name,
				Status:   StatusPlanning,
				Priority: PriorityMedium,
			}, nil
		},
	}

	handler := NewHandler(service)

	body := []byte(`{
		"name": "Build Atlas"
	}`)

	req := authenticatedRequest(
		http.MethodPost,
		"/api/v1/projects",
		body,
		userID,
	)

	recorder := httptest.NewRecorder()

	handler.Create(recorder, req)

	if recorder.Code != http.StatusCreated {
		t.Fatalf(
			"expected status %d, got %d",
			http.StatusCreated,
			recorder.Code,
		)
	}
}

func TestHandlerCreateRejectsInvalidJSON(t *testing.T) {
	handler := NewHandler(
		&fakeProjectService{},
	)

	req := authenticatedRequest(
		http.MethodPost,
		"/api/v1/projects",
		[]byte(`{"name":`),
		uuid.New(),
	)

	recorder := httptest.NewRecorder()

	handler.Create(recorder, req)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf(
			"expected status %d, got %d",
			http.StatusBadRequest,
			recorder.Code,
		)
	}
}

func TestHandlerCreateRejectsUnknownFields(t *testing.T) {
	handler := NewHandler(
		&fakeProjectService{},
	)

	body := []byte(`{
		"name": "Atlas",
		"unknownField": "value"
	}`)

	req := authenticatedRequest(
		http.MethodPost,
		"/api/v1/projects",
		body,
		uuid.New(),
	)

	recorder := httptest.NewRecorder()

	handler.Create(recorder, req)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf(
			"expected status %d, got %d",
			http.StatusBadRequest,
			recorder.Code,
		)
	}
}

func TestHandlerCreateMapsValidationError(
	t *testing.T,
) {
	service := &fakeProjectService{
		createFn: func(
			ctx context.Context,
			userID string,
			input CreateProjectInput,
		) (*Project, error) {
			return nil, ErrProjectNameRequired
		},
	}

	handler := NewHandler(service)

	req := authenticatedRequest(
		http.MethodPost,
		"/api/v1/projects",
		[]byte(`{"name":"   "}`),
		uuid.New(),
	)

	recorder := httptest.NewRecorder()

	handler.Create(recorder, req)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf(
			"expected status %d, got %d",
			http.StatusBadRequest,
			recorder.Code,
		)
	}
}

func TestHandlerUpdateMapsNullToClearFields(
	t *testing.T,
) {
	userID := uuid.New()
	projectID := uuid.New().String()

	service := &fakeProjectService{
		updateFn: func(
			ctx context.Context,
			gotUserID string,
			gotProjectID string,
			input UpdateProjectInput,
		) (*Project, error) {
			if gotUserID != userID.String() {
				t.Fatalf(
					"unexpected user ID: %s",
					gotUserID,
				)
			}

			if gotProjectID != projectID {
				t.Fatalf(
					"unexpected project ID: %s",
					gotProjectID,
				)
			}

			if !input.ClearDescription {
				t.Fatal(
					"expected ClearDescription to be true",
				)
			}

			if !input.ClearTargetDate {
				t.Fatal(
					"expected ClearTargetDate to be true",
				)
			}

			if input.ClearStartDate {
				t.Fatal(
					"expected ClearStartDate to be false",
				)
			}

			return &Project{
				ID:       projectID,
				UserID:   gotUserID,
				Name:     "Atlas",
				Status:   StatusActive,
				Priority: PriorityHigh,
			}, nil
		},
	}

	handler := NewHandler(service)

	body := []byte(`{
		"description": null,
		"targetDate": null
	}`)

	req := authenticatedRequest(
		http.MethodPatch,
		"/api/v1/projects/"+projectID,
		body,
		userID,
	)

	req.SetPathValue("id", projectID)

	recorder := httptest.NewRecorder()

	handler.Update(recorder, req)

	if recorder.Code != http.StatusOK {
		t.Fatalf(
			"expected status %d, got %d",
			http.StatusOK,
			recorder.Code,
		)
	}
}

func TestHandlerGetByIDMapsNotFound(t *testing.T) {
	projectID := uuid.New().String()

	service := &fakeProjectService{
		getByIDFn: func(
			ctx context.Context,
			userID string,
			projectID string,
		) (*Project, error) {
			return nil, ErrProjectNotFound
		},
	}

	handler := NewHandler(service)

	req := authenticatedRequest(
		http.MethodGet,
		"/api/v1/projects/"+projectID,
		nil,
		uuid.New(),
	)

	req.SetPathValue("id", projectID)

	recorder := httptest.NewRecorder()

	handler.GetByID(recorder, req)

	if recorder.Code != http.StatusNotFound {
		t.Fatalf(
			"expected status %d, got %d",
			http.StatusNotFound,
			recorder.Code,
		)
	}
}

func TestHandlerListParsesFilters(t *testing.T) {
	userID := uuid.New()

	status := StatusActive
	priority := PriorityHigh

	service := &fakeProjectService{
		listFn: func(
			ctx context.Context,
			gotUserID string,
			filter ListFilter,
		) ([]Project, error) {
			if gotUserID != userID.String() {
				t.Fatalf(
					"expected user ID %q, got %q",
					userID.String(),
					gotUserID,
				)
			}

			if filter.Status == nil ||
				*filter.Status != status {
				t.Fatalf(
					"expected status %q",
					status,
				)
			}

			if filter.Priority == nil ||
				*filter.Priority != priority {
				t.Fatalf(
					"expected priority %q",
					priority,
				)
			}

			if !filter.Archived {
				t.Fatal(
					"expected archived to be true",
				)
			}

			if filter.Search != "atlas" {
				t.Fatalf(
					"expected search %q, got %q",
					"atlas",
					filter.Search,
				)
			}

			if filter.Sort != SortName {
				t.Fatalf(
					"expected sort %q, got %q",
					SortName,
					filter.Sort,
				)
			}

			if filter.Order != SortAscending {
				t.Fatalf(
					"expected order %q, got %q",
					SortAscending,
					filter.Order,
				)
			}

			return []Project{}, nil
		},
	}

	handler := NewHandler(service)

	req := authenticatedRequest(
		http.MethodGet,
		"/api/v1/projects?status=active&priority=high&archived=true&search=atlas&sort=name&order=asc",
		nil,
		userID,
	)

	recorder := httptest.NewRecorder()

	handler.List(recorder, req)

	if recorder.Code != http.StatusOK {
		t.Fatalf(
			"expected status %d, got %d",
			http.StatusOK,
			recorder.Code,
		)
	}
}

func TestHandlerListRejectsInvalidArchivedValue(
	t *testing.T,
) {
	handler := NewHandler(
		&fakeProjectService{},
	)

	req := authenticatedRequest(
		http.MethodGet,
		"/api/v1/projects?archived=banana",
		nil,
		uuid.New(),
	)

	recorder := httptest.NewRecorder()

	handler.List(recorder, req)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf(
			"expected status %d, got %d",
			http.StatusBadRequest,
			recorder.Code,
		)
	}
}
