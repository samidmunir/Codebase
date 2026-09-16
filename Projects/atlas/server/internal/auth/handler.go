package auth

import (
	"encoding/json"
	"errors"
	"net/http"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{
		service: service,
	}
}

func (h *Handler) Register(
	w http.ResponseWriter,
	r *http.Request,
) {
	var req RegisterRequest

	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()

	if err := decoder.Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"error": "invalid request body",
		})
		return
	}

	user, err := h.service.Register(r.Context(), req)

	if err != nil {
		switch {
		case errors.Is(err, ErrInvalidInput):
			writeJSON(w, http.StatusBadRequest, map[string]any{
				"error": "invalid registration data",
			})

		case errors.Is(err, ErrEmailInUse):
			writeJSON(w, http.StatusConflict, map[string]any{
				"error": "email already in use",
			})

		default:
			writeJSON(w, http.StatusInternalServerError, map[string]any{
				"error": "internal server error",
			})
		}

		return
	}

	writeJSON(w, http.StatusCreated, RegisterResponse{
		Message: "user registered successfully",
		User:    *user,
	})
}

func writeJSON(
	w http.ResponseWriter,
	status int,
	data any,
) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)

	_ = json.NewEncoder(w).Encode(data)
}

func (h *Handler) Login(
	w http.ResponseWriter,
	r *http.Request,
) {
	var req LoginRequest

	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()

	if err := decoder.Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"error": "invalid request body",
		})
		return
	}

	response, err := h.service.Login(
		r.Context(),
		req,
	)

	if err != nil {
		switch {
		case errors.Is(err, ErrInvalidInput):
			writeJSON(w, http.StatusBadRequest, map[string]any{
				"error": "email and password are required",
			})

		case errors.Is(err, ErrInvalidCredentials):
			writeJSON(w, http.StatusUnauthorized, map[string]any{
				"error": "invalid email or password",
			})

		case errors.Is(err, ErrAccountDisabled):
			writeJSON(w, http.StatusForbidden, map[string]any{
				"error": "account is disabled",
			})

		default:
			writeJSON(w, http.StatusInternalServerError, map[string]any{
				"error": "internal server error",
			})
		}

		return
	}

	writeJSON(w, http.StatusOK, response)
}

func (h *Handler) Me(
	w http.ResponseWriter,
	r *http.Request,
) {
	userID, ok := UserIDFromContext(r.Context())

	if !ok {
		writeJSON(
			w,
			http.StatusUnauthorized,
			map[string]any{
				"error": "authentication required",
			},
		)
		return
	}

	user, err := h.service.Me(
		r.Context(),
		userID,
	)

	if err != nil {
		switch {
		case errors.Is(err, ErrInvalidCredentials):
			writeJSON(
				w,
				http.StatusUnauthorized,
				map[string]any{
					"error": "user no longer exists",
				},
			)

		case errors.Is(err, ErrAccountDisabled):
			writeJSON(
				w,
				http.StatusForbidden,
				map[string]any{
					"error": "account is disabled",
				},
			)

		default:
			writeJSON(
				w,
				http.StatusInternalServerError,
				map[string]any{
					"error": "internal server error",
				},
			)
		}

		return
	}

	writeJSON(
		w,
		http.StatusOK,
		MeResponse{
			User: *user,
		},
	)
}
