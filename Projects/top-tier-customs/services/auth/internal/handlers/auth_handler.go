package handlers

import "github.com/gin-gonic/gin"

func Health(c *gin.Context) {
	c.JSON(200, gin.H {
		"message": "/api/v0/auth is live on http://localhost:8081/api/v0/auth",
		"ok": true,
		"source": "<api.v0.auth>: Health()",
	})
}