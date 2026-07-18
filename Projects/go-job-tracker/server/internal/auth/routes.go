package auth

import "github.com/gin-gonic/gin"

func RegisterRoutes(
	router *gin.RouterGroup,
	handler *Handler,
	jwtManager *JWTManager,
) {
	authRoutes := router.Group("/auth")

	authRoutes.POST("/register", handler.Register)
	authRoutes.POST("/login", handler.Login)
	authRoutes.POST("/refresh", handler.Refresh)
	authRoutes.POST("/logout", handler.Logout)

	protectedAuthRoutes := authRoutes.Group("")
	protectedAuthRoutes.Use(
		RequireAuthentication(jwtManager),
	)

	protectedAuthRoutes.GET("/me", handler.Me)
}
