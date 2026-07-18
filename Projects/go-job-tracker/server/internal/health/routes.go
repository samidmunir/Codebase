package health

import "github.com/gin-gonic/gin"

func RegisterRoutes(router *gin.RouterGroup, handler *Handler) {
	healthRoutes := router.Group("/health");

	healthRoutes.GET("", handler.Check);
	healthRoutes.GET("/database", handler.DatabaseCheck);
}