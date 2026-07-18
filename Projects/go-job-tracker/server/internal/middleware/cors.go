package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func CORS(clientURL string) gin.HandlerFunc {
	return func(ctx *gin.Context) {
		ctx.Header("Access-Control-Allow-Origin", clientURL)
		ctx.Header(
			"Access-Control-Allow-Methods",
			"GET, POST, PUT, PATCH, DELETE, OPTIONS",
		)
		ctx.Header(
			"Access-Control-Allow-Headers",
			"Origin, Content-Type, Accept, Authorization, X-Request-ID",
		)
		ctx.Header("Access-Control-Expose-Headers", "X-Request-ID")
		ctx.Header("Access-Control-Allow-Credentials", "true")

		if ctx.Request.Method == http.MethodOptions {
			ctx.AbortWithStatus(http.StatusNoContent)
			return
		}

		ctx.Next()
	}
}
