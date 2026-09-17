package auth

import (
	"encoding/json"
	"errors"
	"net"
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

	userAgent := r.UserAgent()

	var userAgentPtr *string

	if userAgent != "" {
		userAgentPtr = &userAgent
	}

	ipAddress := clientIP(r)

	metadata := SessionMetadata{
		UserAgent: userAgentPtr,
		IPAddress: ipAddress,
	}

	response, refreshToken, err := h.service.Login(
		r.Context(),
		req,
		metadata,
	)

	h.setRefreshCookie(
		w,
		refreshToken,
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

func (h *Handler) setRefreshCookie(
	w http.ResponseWriter,
	token string,
) {
	http.SetCookie(w, &http.Cookie{
		Name:     "atlas_refresh_token",
		Value:    token,
		Path:     "/api/v1/auth",
		HttpOnly: true,
		Secure:   false,
		SameSite: http.SameSiteLaxMode,
		MaxAge: int(
			h.service.refreshTokenTTL.Seconds(),
		),
	})
}

func clientIP(r *http.Request) *string {
	host, _, err := net.SplitHostPort(r.RemoteAddr)

	if err != nil || host == "" {
		return nil
	}

	return &host
}

func (h *Handler) Refresh(
	w http.ResponseWriter,
	r *http.Request,
) {
	cookie, err := r.Cookie(
		"atlas_refresh_token",
	)

	if err != nil {
		writeJSON(
			w,
			http.StatusUnauthorized,
			map[string]any{
				"error": "refresh token required",
			},
		)
		return
	}

	response, newRefreshToken, err :=
		h.service.Refresh(
			r.Context(),
			cookie.Value,
		)

	if err != nil {
		switch {
		case errors.Is(err, ErrInvalidSession):
			writeJSON(
				w,
				http.StatusUnauthorized,
				map[string]any{
					"error": "invalid or expired session",
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

	h.setRefreshCookie(
		w,
		newRefreshToken,
	)

	writeJSON(
		w,
		http.StatusOK,
		response,
	)
}

func (h *Handler) clearRefreshCookie(
	w http.ResponseWriter,
) {
	http.SetCookie(w, &http.Cookie{
		Name:     "atlas_refresh_token",
		Value:    "",
		Path:     "/api/v1/auth",
		HttpOnly: true,
		Secure:   false,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   -1,
	})
}

func (h *Handler) Logout(
	w http.ResponseWriter,
	r *http.Request,
) {
	var refreshToken string

	cookie, err := r.Cookie(
		"atlas_refresh_token",
	)

	if err == nil {
		refreshToken = cookie.Value
	}

	if err := h.service.Logout(
		r.Context(),
		refreshToken,
	); err != nil {
		writeJSON(
			w,
			http.StatusInternalServerError,
			map[string]any{
				"error": "internal server error",
			},
		)
		return
	}

	h.clearRefreshCookie(w)

	writeJSON(
		w,
		http.StatusOK,
		map[string]any{
			"message": "logout successful",
		},
	)
}
