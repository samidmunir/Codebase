package response

import "github.com/gin-gonic/gin"

type APIResponse struct {
	Success bool `json:"success"`;
	Message string `json:"message"`;
	Data interface{} `json:"data,omitempty"`;
	Error *APIError `json:"error,omitempty"`;
	Meta interface{} `json:"meta,omitempty"`;
}

type APIError struct {
	Code string `json:"code"`;
	Details interface{} `json:"details,omitempty"`;
}

func JSON(ctx *gin.Context, statusCode int, message string, data interface{}) {
	ctx.JSON(statusCode, APIResponse{
		Success: true,
		Message: message,
		Data: data,
	})
}