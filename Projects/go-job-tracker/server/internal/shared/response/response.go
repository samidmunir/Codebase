package response

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type APIResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
	Error   *APIError   `json:"error,omitempty"`
	Meta    interface{} `json:"meta,omitempty"`
}

type APIError struct {
	Code    string      `json:"code"`
	Details interface{} `json:"details,omitempty"`
}

func JSON(ctx *gin.Context, statusCode int, message string, data interface{}) {
	ctx.JSON(statusCode, APIResponse{
		Success: true,
		Message: message,
		Data:    data,
	})
}

func Error(ctx *gin.Context, statusCode int, code string, message string, details interface{}) {
	ctx.JSON(statusCode, APIResponse{
		Success: false,
		Message: message,
		Error: &APIError{
			Code:    code,
			Details: details,
		},
	})
}

func InternalServerError(ctx *gin.Context) {
	Error(
		ctx,
		http.StatusInternalServerError,
		"INTERNAL_SERVER_ERROR",
		"An unexpected server error has occurred.",
		nil,
	)
}
