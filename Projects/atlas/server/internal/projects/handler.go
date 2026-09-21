package projects

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/samidmunir/Codebase/projects/atlas/server/internal/auth"
)

type ProjectService interface {
	Create(
		ctx context.Context,
		userID string,
		input CreateProjectInput,
	) (*Project, error)

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
		userID string,
		projectID string,
		input UpdateProjectInput,
	) (*Project, error)

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

type Handler struct {
	service ProjectService
}

func NewHandler(service ProjectService) *Handler {
	return &Handler{
		service: service,
	}
}

type createProjectRequest struct {
	Name        string     `json:"name"`
	Description *string    `json:"description"`
	Status      *Status    `json:"status"`
	Priority    *Priority  `json:"priority"`
	StartDate   *time.Time `json:"startDate"`
	TargetDate  *time.Time `json:"targetDate"`
}

func writeJSON(
	w http.ResponseWriter,
	status int,
	data any,
) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)

	if data != nil {
		_ = json.NewEncoder(w).Encode(data)
	}
}

func writeError(
	w http.ResponseWriter,
	status int,
	message string,
) {
	writeJSON(w, status, map[string]string{
		"error": message,
	})
}

func handleServiceError(
	w http.ResponseWriter,
	err error,
) {
	switch {
	case errors.Is(err, ErrProjectNotFound):
		writeError(
			w,
			http.StatusNotFound,
			ErrProjectNotFound.Error(),
		)

	case errors.Is(err, ErrProjectNameRequired),
		errors.Is(err, ErrProjectNameTooLong),
		errors.Is(err, ErrProjectDescriptionTooLong),
		errors.Is(err, ErrInvalidProjectStatus),
		errors.Is(err, ErrInvalidProjectPriority),
		errors.Is(err, ErrInvalidProjectDates):

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

func (h *Handler) Create(
	w http.ResponseWriter,
	r *http.Request,
) {
	userID, ok := auth.UserIDFromContext(r.Context())

	if !ok || userID == uuid.Nil {
		writeError(
			w,
			http.StatusUnauthorized,
			"unauthorized",
		)
		return
	}

	var request createProjectRequest

	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()

	if err := decoder.Decode(&request); err != nil {
		writeError(
			w,
			http.StatusBadRequest,
			"invalid request body",
		)
		return
	}

	project, err := h.service.Create(
		r.Context(),
		userID.String(),
		CreateProjectInput{
			Name:        request.Name,
			Description: request.Description,
			Status:      request.Status,
			Priority:    request.Priority,
			StartDate:   request.StartDate,
			TargetDate:  request.TargetDate,
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
			"project": project,
		},
	)
}

func (h *Handler) List(
	w http.ResponseWriter,
	r *http.Request,
) {
	userID, ok := auth.UserIDFromContext(r.Context())

	if !ok || userID == uuid.Nil {
		writeError(
			w,
			http.StatusUnauthorized,
			"unauthorized",
		)
		return
	}

	projects, err := h.service.List(
		r.Context(),
		userID.String(),
	)

	if err != nil {
		handleServiceError(w, err)
		return
	}

	writeJSON(
		w,
		http.StatusOK,
		map[string]any{
			"projects": projects,
		},
	)
}

func (h *Handler) GetByID(
	w http.ResponseWriter,
	r *http.Request,
) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok || userID == uuid.Nil {
		writeError(
			w,
			http.StatusUnauthorized,
			"unauthorized",
		)
		return
	}

	projectID := r.PathValue("id")

	if projectID == "" {
		writeError(
			w,
			http.StatusBadRequest,
			"project id is required",
		)
		return
	}

	project, err := h.service.GetByID(
		r.Context(),
		userID.String(),
		projectID,
	)

	if err != nil {
		handleServiceError(w, err)
		return
	}

	writeJSON(
		w,
		http.StatusOK,
		map[string]any{
			"project": project,
		},
	)
}

type updateProjectRequest struct {
	Name     *string   `json:"name"`
	Status   *Status   `json:"status"`
	Priority *Priority `json:"priority"`

	Description json.RawMessage `json:"description"`
	StartDate   json.RawMessage `json:"startDate"`
	TargetDate  json.RawMessage `json:"targetDate"`
}

func parseNullableString(
	raw json.RawMessage,
) (value *string, clear bool, err error) {
	if raw == nil {
		return nil, false, nil
	}

	if string(raw) == "null" {
		return nil, true, nil
	}

	var parsed string

	if err := json.Unmarshal(raw, &parsed); err != nil {
		return nil, false, err
	}

	return &parsed, false, nil
}

func parseNullableTime(
	raw json.RawMessage,
) (value *time.Time, clear bool, err error) {
	if raw == nil {
		return nil, false, nil
	}

	if string(raw) == "null" {
		return nil, true, nil
	}

	var parsed time.Time

	if err := json.Unmarshal(raw, &parsed); err != nil {
		return nil, false, err
	}

	return &parsed, false, nil
}

func (h *Handler) Update(
	w http.ResponseWriter,
	r *http.Request,
) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok || userID == uuid.Nil {
		writeError(
			w,
			http.StatusUnauthorized,
			"unauthorized",
		)
		return
	}

	projectID := r.PathValue("id")
	if projectID == "" {
		writeError(
			w,
			http.StatusBadRequest,
			"project id is required",
		)
		return
	}

	var request updateProjectRequest

	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()

	if err := decoder.Decode(&request); err != nil {
		writeError(
			w,
			http.StatusBadRequest,
			"invalid request body",
		)
		return
	}

	description, clearDescription, err :=
		parseNullableString(request.Description)
	if err != nil {
		writeError(
			w,
			http.StatusBadRequest,
			"invalid description",
		)
		return
	}

	startDate, clearStartDate, err :=
		parseNullableTime(request.StartDate)
	if err != nil {
		writeError(
			w,
			http.StatusBadRequest,
			"invalid startDate",
		)
		return
	}

	targetDate, clearTargetDate, err :=
		parseNullableTime(request.TargetDate)
	if err != nil {
		writeError(
			w,
			http.StatusBadRequest,
			"invalid targetDate",
		)
		return
	}

	project, err := h.service.Update(
		r.Context(),
		userID.String(),
		projectID,
		UpdateProjectInput{
			Name:             request.Name,
			Description:      description,
			ClearDescription: clearDescription,
			Status:           request.Status,
			Priority:         request.Priority,
			StartDate:        startDate,
			ClearStartDate:   clearStartDate,
			TargetDate:       targetDate,
			ClearTargetDate:  clearTargetDate,
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
			"project": project,
		},
	)
}

func (h *Handler) Archive(
	w http.ResponseWriter,
	r *http.Request,
) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok || userID == uuid.Nil {
		writeError(
			w,
			http.StatusUnauthorized,
			"unauthorized",
		)
		return
	}

	projectID := r.PathValue("id")

	if projectID == "" {
		writeError(
			w,
			http.StatusBadRequest,
			"project id is required",
		)
		return
	}

	if err := h.service.Archive(
		r.Context(),
		userID.String(),
		projectID,
	); err != nil {
		handleServiceError(w, err)
		return
	}

	writeJSON(
		w,
		http.StatusOK,
		map[string]string{
			"message": "project archived successfully",
		},
	)
}

func (h *Handler) Restore(
	w http.ResponseWriter,
	r *http.Request,
) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok || userID == uuid.Nil {
		writeError(
			w,
			http.StatusUnauthorized,
			"unauthorized",
		)
		return
	}

	projectID := r.PathValue("id")

	if projectID == "" {
		writeError(
			w,
			http.StatusBadRequest,
			"project id is required",
		)
		return
	}

	if err := h.service.Restore(
		r.Context(),
		userID.String(),
		projectID,
	); err != nil {
		handleServiceError(w, err)
		return
	}

	writeJSON(
		w,
		http.StatusOK,
		map[string]string{
			"message": "project restored successfully",
		},
	)
}
