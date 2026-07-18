package httpserver

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/samidmunir/go-job-tracker/server/internal/config"
	"github.com/samidmunir/go-job-tracker/server/internal/database"
	"github.com/samidmunir/go-job-tracker/server/internal/health"
	"github.com/samidmunir/go-job-tracker/server/internal/middleware"
	"github.com/samidmunir/go-job-tracker/server/internal/shared/response"
)

func NewRouter(cfg *config.Config, mongoDB *database.MongoDB) *gin.Engine {
	if cfg.App.Environment == "production" {
		gin.SetMode(gin.ReleaseMode);
	}

	router := gin.New();

	router.Use(
		middleware.RequestID(),
		middleware.CORS(cfg.ClientURL),
		gin.Logger(),
		middleware.Recovery(),
	);

	router.GET("/", func(ctx *gin.Context) {
		response.JSON(
			ctx,
			http.StatusOK,
			"Welcome to the GJT API",
			gin.H{
				"version": "v1",
				"health": cfg.App.APIPrefix + "/health",
			},
		);
	});

	api := router.Group(cfg.App.APIPrefix);

	healthHandler := health.NewHandler(
		mongoDB,
		cfg.App.Name,
		cfg.App.Environment,
	);

	health.RegisterRoutes(api, healthHandler);

	router.NoRoute(func(ctx *gin.Context) {
		response.Error(
			ctx,
			http.StatusNotFound,
			"ROUTE_NOT_FOUND",
			"The requested API route does not exist.",
			gin.H{
				"method": ctx.Request.Method,
				"path": ctx.Request.URL.Path,
			},
		);
	})

	router.NoMethod(func(ctx *gin.Context) {
		response.Error(
			ctx,
			http.StatusMethodNotAllowed,
			"METHOD_NOT_ALLOWED",
			"The requested HTTP method is not supported.",
			gin.H{
				"method": ctx.Request.Method,
				"path": ctx.Request.URL.Path,
			},
		);
	});

	return router;
}