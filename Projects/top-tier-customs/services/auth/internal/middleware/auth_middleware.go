package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/samidmunir/top-tier-customs/services/auth/internal/config"
	"github.com/samidmunir/top-tier-customs/services/auth/internal/utils"
)

func Authorize() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization");
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"ok": false,
				"source": "<api.auth.middleware>: Authorize()",
				"message": "Missing Authorization header.",
			});
			c.Abort();
			return;
		}

		parts := strings.SplitN(authHeader, " ", 2);
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"ok": false,
				"source": "<api.auth.middleware>: Authorize()",
				"message": "Invalid Authorization header format.",
			});
			c.Abort();
			return;
		}

		env := config.LoadEnv();

		claims, err := utils.VerifyToken(parts[1], env.JWTAccessSecret);
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"ok": false,
				"source": "<api.auth.middleware>: Authorize()",
				"message": "Invalid or expired access token.",
			});
			c.Abort();
			return;
		}

		c.Set("userId", claims.Sub);
		c.Set("email", claims.Email);
		c.Set("role", claims.Role);

		c.Next();
	}
}