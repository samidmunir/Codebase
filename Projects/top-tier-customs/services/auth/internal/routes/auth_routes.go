package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/samidmunir/top-tier-customs/services/auth/internal/handlers"
)

func RegisterAuthRoutes(router *gin.Engine) {
	router.GET("/health", handlers.Health);
	router.POST("/signup", handlers.Signup);
	router.POST("/login", handlers.Login);
	router.POST("/logout", handlers.Logout);
	router.GET("/me", handlers.Me);
	router.POST("/refresh", handlers.Refresh);
}