package middleware

import (
	"log/slog"

	"github.com/gin-gonic/gin"
)

func Recovery() gin.HandlerFunc {
	return gin.CustomRecovery(func(ctx *gin.Context, recovered interface{}) {
		slog.Error(
			"panic recovered",
			"error",
			recovered,
			"path",
			ctx.Request.URL.Path,
		)
	})
}
