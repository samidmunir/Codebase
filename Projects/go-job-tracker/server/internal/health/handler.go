package health

import (
	"net/http"
	"runtime"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/samidmunir/go-job-tracker/server/internal/database"
	"github.com/samidmunir/go-job-tracker/server/internal/shared/response"
)

type Handler struct {
	mongoDB *database.MongoDB;
	startedAt time.Time;
	appName string;
	env string;
}

func NewHandler(mongoDB *database.MongoDB, appName string, environment string) *Handler {
	return &Handler{
		mongoDB: mongoDB,
		startedAt: time.Now().UTC(),
		appName: appName,
		env: environment,
	};
}

func (h *Handler) Check(ctx *gin.Context) {
	response.JSON(
		ctx,
		http.StatusOK,
		"API is healthy",
		gin.H{
			"service": h.appName,
			"environment": h.env,
			"status": "healthy",
			"timestamp": time.Now().UTC(),
			"uptime": time.Since(h.startedAt).String(),
			"goVersion": runtime.Version(),
		},
	);
}