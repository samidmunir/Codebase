package auth

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/samidmunir/go-job-tracker/server/internal/shared/response"
	"go.mongodb.org/mongo-driver/v2/bson"
)

const (
	CurrentUserIDKey = "current_user_id"
	CurrentClaimsKey = "current_auth_claims"
)

func RequireAuthentication(
	jwtManager *JWTManager,
) gin.HandlerFunc {
	return func(ctx *gin.Context) {
		authorizationHeader := strings.TrimSpace(
			ctx.GetHeader("Authorization"),
		)

		parts := strings.Fields(authorizationHeader)

		if len(parts) != 2 ||
			!strings.EqualFold(parts[0], "Bearer") {
			response.Error(
				ctx,
				http.StatusUnauthorized,
				"AUTHENTICATION_REQUIRED",
				"A valid bearer access token is required.",
				nil,
			)
			ctx.Abort()
			return
		}

		claims, err := jwtManager.ParseAccessToken(parts[1])
		if err != nil {
			response.Error(
				ctx,
				http.StatusUnauthorized,
				"INVALID_ACCESS_TOKEN",
				"The access token is invalid or expired.",
				nil,
			)
			ctx.Abort()
			return
		}

		userID, err := bson.ObjectIDFromHex(claims.Subject)
		if err != nil {
			response.Error(
				ctx,
				http.StatusUnauthorized,
				"INVALID_ACCESS_TOKEN",
				"The access token contains an invalid subject.",
				nil,
			)
			ctx.Abort()
			return
		}

		ctx.Set(CurrentUserIDKey, userID)
		ctx.Set(CurrentClaimsKey, claims)

		ctx.Next()
	}
}
