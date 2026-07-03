package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/samidmunir/top-tier-customs/services/auth/internal/handlers"
)

func RegisterAuthRoutes(router *gin.Engine) {
	router.GET("/health", handlers.Health);
}