package health

import (
	"context"
	"net/http"
	"runtime"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/samidmunir/go-job-tracker/server/internal/database"
	"github.com/samidmunir/go-job-tracker/server/internal/shared/response"
)

type Handler struct {
	mongoDB   *database.MongoDB
	startedAt time.Time
	appName   string
	env       string
}

func NewHandler(mongoDB *database.MongoDB, appName string, environment string) *Handler {
	return &Handler{
		mongoDB:   mongoDB,
		startedAt: time.Now().UTC(),
		appName:   appName,
		env:       environment,
	}
}

func (h *Handler) Check(ctx *gin.Context) {
	response.JSON(
		ctx,
		http.StatusOK,
		"API is healthy",
		gin.H{
			"service":     h.appName,
			"environment": h.env,
			"status":      "healthy",
			"timestamp":   time.Now().UTC(),
			"uptime":      time.Since(h.startedAt).String(),
			"goVersion":   runtime.Version(),
		},
	)
}

func (h *Handler) DatabaseCheck(ctx *gin.Context) {
	pingContext, cancel := context.WithTimeout(
		ctx.Request.Context(),
		3*time.Second,
	)
	defer cancel()

	if err := h.mongoDB.Ping(pingContext); err != nil {
		response.Error(
			ctx,
			http.StatusServiceUnavailable,
			"DATABASE_UNAVAILABLE",
			"MongoDB is unavailable.",
			nil,
		)
	}

	response.JSON(
		ctx,
		http.StatusOK,
		"MongoDB is healthy",
		gin.H{
			"status":    "healthy",
			"database":  h.mongoDB.Database.Name(),
			"timestamp": time.Now().UTC(),
		},
	)
}
