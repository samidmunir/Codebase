package health

import (
	"time"

	"github.com/samidmunir/go-job-tracker/server/internal/database"
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