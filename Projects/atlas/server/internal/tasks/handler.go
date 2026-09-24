package tasks

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/samidmunir/Codebase/projects/atlas/server/internal/auth"
)

type TaskService interface {
	Create(
		ctx context.Context,
		userID string,
		input CreateInput,
	) (*Task, error)

	GetByID(
		ctx context.Context,
		userID string,
		taskID string,
	) (*Task, error)

	List(
		ctx context.Context,
		userID string,
		filter ListFilter,
	) ([]Task, error)

	Update(
		ctx context.Context,
		userID string,
		taskID string,
		input UpdateInput,
	) (*Task, error)

	Delete(
		ctx context.Context,
		userID string,
		taskID string,
	) error
}

type Handler struct {
	service TaskService
}

func NewHandler(service TaskService) *Handler {
	return &Handler{
		service: service,
	}
}

type createTaskRequest struct {
	ProjectID   *string   `json:"projectId"`
	Title       string    `json:"title"`
	Description *string   `json:"description"`
	Status      *Status   `json:"status"`
	Priority    *Priority `json:"priority"`
	DueDate     *string   `json:"dueDate"`
}

type updateTaskRequest struct {
	ProjectID   json.RawMessage `json:"projectId"`
	Title       *string         `json:"title"`
	Description json.RawMessage `json:"description"`
	Status      *Status         `json:"status"`
	Priority    *Priority       `json:"priority"`
	DueDate     json.RawMessage `json:"dueDate"`
}

func parseOptionalDate(
	value *string,
) (*time.Time, error) {
	if value == nil {
		return nil, nil
	}

	date := strings.TrimSpace(*value)

	if date == "" {
		return nil, errors.New("invalid date")
	}

	parsed, err := time.Parse(
		"2006-01-02",
		date,
	)
	if err != nil {
		return nil, errors.New("invalid date")
	}

	return &parsed, nil
}

func parseNullableDate(
	raw json.RawMessage,
) (NullableTime, error) {
	if raw == nil {
		return NullableTime{
			Set: false,
		}, nil
	}

	if string(raw) == "null" {
		return NullableTime{
			Set:   true,
			Value: nil,
		}, nil
	}

	var value string

	if err := json.Unmarshal(
		raw,
		&value,
	); err != nil {
		return NullableTime{}, err
	}

	parsed, err := time.Parse(
		"2006-01-02",
		value,
	)
	if err != nil {
		return NullableTime{}, err
	}

	return NullableTime{
		Set:   true,
		Value: &parsed,
	}, nil
}

func parseNullableString(
	raw json.RawMessage,
) (NullableString, error) {
	if raw == nil {
		return NullableString{
			Set: false,
		}, nil
	}

	if string(raw) == "null" {
		return NullableString{
			Set:   true,
			Value: nil,
		}, nil
	}

	var value string

	if err := json.Unmarshal(
		raw,
		&value,
	); err != nil {
		return NullableString{}, err
	}

	return NullableString{
		Set:   true,
		Value: &value,
	}, nil
}

func writeJSON(
	w http.ResponseWriter,
	status int,
	data any,
) {
	w.Header().Set(
		"Content-Type",
		"application/json",
	)

	w.WriteHeader(status)

	_ = json.NewEncoder(w).Encode(data)
}

func writeError(
	w http.ResponseWriter,
	status int,
	message string,
) {
	writeJSON(
		w,
		status,
		map[string]string{
			"error": message,
		},
	)
}
func decodeJSON(
	r *http.Request,
	dst any,
) error {
	decoder := json.NewDecoder(r.Body)

	decoder.DisallowUnknownFields()

	return decoder.Decode(dst)
}

func (h *Handler) Create(
	w http.ResponseWriter,
	r *http.Request,
) {
	userID, ok := auth.UserIDFromContext(
		r.Context(),
	)

	if !ok {
		writeError(
			w,
			http.StatusUnauthorized,
			"unauthorized",
		)
		return
	}

	var request createTaskRequest

	if err := decodeJSON(
		r,
		&request,
	); err != nil {
		writeError(
			w,
			http.StatusBadRequest,
			"invalid request body",
		)
		return
	}

	dueDate, err :=
		parseOptionalDate(
			request.DueDate,
		)

	if err != nil {
		writeError(
			w,
			http.StatusBadRequest,
			"invalid dueDate",
		)
		return
	}

	task, err := h.service.Create(
		r.Context(),
		userID.String(),
		CreateInput{
			ProjectID:   request.ProjectID,
			Title:       request.Title,
			Description: request.Description,
			Status:      request.Status,
			Priority:    request.Priority,
			DueDate:     dueDate,
		},
	)

	if err != nil {
		handleServiceError(w, err)
		return
	}

	writeJSON(
		w,
		http.StatusCreated,
		map[string]any{
			"task": task,
		},
	)
}

func handleServiceError(
	w http.ResponseWriter,
	err error,
) {
	switch {
	case errors.Is(
		err,
		ErrTaskNotFound,
	):
		writeError(
			w,
			http.StatusNotFound,
			"task not found",
		)

	case errors.Is(err, ErrInvalidTitle),
		errors.Is(err, ErrInvalidDescription),
		errors.Is(err, ErrInvalidStatus),
		errors.Is(err, ErrInvalidPriority),
		errors.Is(err, ErrInvalidProject),
		errors.Is(err, ErrInvalidDueFilter),
		errors.Is(err, ErrInvalidSort),
		errors.Is(err, ErrInvalidOrder):

		writeError(
			w,
			http.StatusBadRequest,
			err.Error(),
		)

	default:
		writeError(
			w,
			http.StatusInternalServerError,
			"internal server error",
		)
	}
}

func (h *Handler) GetByID(
	w http.ResponseWriter,
	r *http.Request,
) {
	userID, ok := auth.UserIDFromContext(
		r.Context(),
	)

	if !ok {
		writeError(
			w,
			http.StatusUnauthorized,
			"unauthorized",
		)
		return
	}

	taskID := r.PathValue("id")

	task, err := h.service.GetByID(
		r.Context(),
		userID.String(),
		taskID,
	)

	if err != nil {
		handleServiceError(w, err)
		return
	}

	writeJSON(
		w,
		http.StatusOK,
		map[string]any{
			"task": task,
		},
	)
}

func (h *Handler) List(
	w http.ResponseWriter,
	r *http.Request,
) {
	userUUID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		writeError(
			w,
			http.StatusUnauthorized,
			"unauthorized",
		)
		return
	}

	userID := userUUID.String()

	query := r.URL.Query()

	filter := ListFilter{
		Search: query.Get("search"),
		Sort:   SortField(query.Get("sort")),
		Order:  SortOrder(query.Get("order")),
	}

	if value := query.Get("status"); value != "" {
		status := Status(value)
		filter.Status = &status
	}

	if value := query.Get("priority"); value != "" {
		priority := Priority(value)
		filter.Priority = &priority
	}

	if value := query.Get("projectId"); value != "" {
		projectID := value
		filter.ProjectID = &projectID
	}

	if value := query.Get("due"); value != "" {
		due := DueFilter(value)
		filter.Due = &due
	}

	tasks, err := h.service.List(
		r.Context(),
		userID,
		filter,
	)
	if err != nil {
		handleServiceError(w, err)
		return
	}

	writeJSON(
		w,
		http.StatusOK,
		map[string]any{
			"tasks": tasks,
		},
	)
}

func (h *Handler) Update(
	w http.ResponseWriter,
	r *http.Request,
) {
	userID, ok := auth.UserIDFromContext(
		r.Context(),
	)

	if !ok {
		writeError(
			w,
			http.StatusUnauthorized,
			"unauthorized",
		)
		return
	}

	taskID := r.PathValue("id")

	var request updateTaskRequest

	if err := decodeJSON(
		r,
		&request,
	); err != nil {
		writeError(
			w,
			http.StatusBadRequest,
			"invalid request body",
		)
		return
	}

	projectID, err :=
		parseNullableString(
			request.ProjectID,
		)

	if err != nil {
		writeError(
			w,
			http.StatusBadRequest,
			"invalid projectId",
		)
		return
	}

	description, err :=
		parseNullableString(
			request.Description,
		)

	if err != nil {
		writeError(
			w,
			http.StatusBadRequest,
			"invalid description",
		)
		return
	}

	dueDate, err :=
		parseNullableDate(
			request.DueDate,
		)

	if err != nil {
		writeError(
			w,
			http.StatusBadRequest,
			"invalid dueDate",
		)
		return
	}

	task, err := h.service.Update(
		r.Context(),
		userID.String(),
		taskID,
		UpdateInput{
			ProjectID:   projectID,
			Title:       request.Title,
			Description: description,
			Status:      request.Status,
			Priority:    request.Priority,
			DueDate:     dueDate,
		},
	)

	if err != nil {
		handleServiceError(w, err)
		return
	}

	writeJSON(
		w,
		http.StatusOK,
		map[string]any{
			"task": task,
		},
	)
}

func (h *Handler) Delete(
	w http.ResponseWriter,
	r *http.Request,
) {
	userID, ok := auth.UserIDFromContext(
		r.Context(),
	)

	if !ok {
		writeError(
			w,
			http.StatusUnauthorized,
			"unauthorized",
		)
		return
	}

	taskID := r.PathValue("id")

	err := h.service.Delete(
		r.Context(),
		userID.String(),
		taskID,
	)

	if err != nil {
		handleServiceError(w, err)
		return
	}

	w.WriteHeader(
		http.StatusNoContent,
	)
}
