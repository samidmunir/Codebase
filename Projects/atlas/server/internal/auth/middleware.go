package auth

import (
	"net/http"
	"strings"
)

func (h *Handler) Authenticate(
	next http.Handler,
) http.Handler {
	return http.HandlerFunc(
		func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")

			if authHeader == "" {
				writeJSON(
					w,
					http.StatusUnauthorized,
					map[string]any{
						"error": "authorization required",
					},
				)
				return
			}

			parts := strings.Fields(authHeader)

			if len(parts) != 2 ||
				!strings.EqualFold(parts[0], "Bearer") {
				writeJSON(
					w,
					http.StatusUnauthorized,
					map[string]any{
						"error": "invalid authorization header",
					},
				)
				return
			}

			claims, err := h.service.tokens.ValidateAccessToken(
				parts[1],
			)

			if err != nil {
				writeJSON(
					w,
					http.StatusUnauthorized,
					map[string]any{
						"error": "invalid or expired access token",
					},
				)
				return
			}

			ctx := WithUserID(
				r.Context(),
				claims.UserID,
			)

			next.ServeHTTP(
				w,
				r.WithContext(ctx),
			)
		},
	)
}
