package middleware

import (
	"crypto/rand"
	"encoding/hex"

	"github.com/gin-gonic/gin"
)

const RequestIDKey = "request_id";

func RequestID() gin.HandlerFunc {
	return func(ctx *gin.Context) {
		requestID := ctx.GetHeader("X-Request-ID");
		if requestID == "" {
			requestID = generateRequestID();
		}

		ctx.Set(RequestIDKey, requestID);
		ctx.Header("X-Request-ID", requestID);

		ctx.Next();
	}
}

func generateRequestID() string {
	bytes := make([]byte, 16);

	if _, err := rand.Read(bytes); err != nil {
		return "request-id-unavailable";
	}

	return hex.EncodeToString(bytes);
}