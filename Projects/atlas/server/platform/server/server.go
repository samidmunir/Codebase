package server

import (
	"context"
	"errors"
	"log"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/samidmunir/Codebase/projects/atlas/server/internal/auth"
	"github.com/samidmunir/Codebase/projects/atlas/server/internal/health"
	"github.com/samidmunir/Codebase/projects/atlas/server/internal/projects"
	"github.com/samidmunir/Codebase/projects/atlas/server/internal/tasks"
)

type Server struct {
	httpServer *http.Server
}

func New(
	addr string,
	db *pgxpool.Pool,
	frontendURL string,
	authHandler *auth.Handler,
	projectHandler *projects.Handler,
	taskHandler *tasks.Handler,
) *Server {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /api/v1/health", health.Handler)
	mux.HandleFunc("GET /api/v1/ready", health.ReadinessHandler(db))

	mux.HandleFunc(
		"POST /api/v1/auth/register",
		authHandler.Register,
	)

	mux.HandleFunc(
		"POST /api/v1/auth/login",
		authHandler.Login,
	)

	mux.Handle(
		"GET /api/v1/auth/me",
		authHandler.Authenticate(
			http.HandlerFunc(authHandler.Me),
		),
	)

	mux.HandleFunc(
		"POST /api/v1/auth/refresh",
		authHandler.Refresh,
	)

	mux.HandleFunc(
		"POST /api/v1/auth/logout",
		authHandler.Logout,
	)

	mux.Handle(
		"POST /api/v1/projects",
		authHandler.Authenticate(
			http.HandlerFunc(projectHandler.Create),
		),
	)

	mux.Handle(
		"GET /api/v1/projects",
		authHandler.Authenticate(
			http.HandlerFunc(projectHandler.List),
		),
	)

	mux.Handle(
		"GET /api/v1/projects/{id}",
		authHandler.Authenticate(
			http.HandlerFunc(projectHandler.GetByID),
		),
	)

	mux.Handle(
		"PATCH /api/v1/projects/{id}",
		authHandler.Authenticate(
			http.HandlerFunc(projectHandler.Update),
		),
	)

	mux.Handle(
		"POST /api/v1/projects/{id}/archive",
		authHandler.Authenticate(
			http.HandlerFunc(projectHandler.Archive),
		),
	)

	mux.Handle(
		"POST /api/v1/projects/{id}/restore",
		authHandler.Authenticate(
			http.HandlerFunc(projectHandler.Restore),
		),
	)

	// Tasks routes

	mux.Handle(
		"POST /api/v1/tasks",
		authHandler.Authenticate(
			http.HandlerFunc(taskHandler.Create),
		),
	)

	mux.Handle(
		"GET /api/v1/tasks",
		authHandler.Authenticate(
			http.HandlerFunc(taskHandler.List),
		),
	)

	mux.Handle(
		"GET /api/v1/tasks/{id}",
		authHandler.Authenticate(
			http.HandlerFunc(taskHandler.GetByID),
		),
	)

	mux.Handle(
		"PATCH /api/v1/tasks/{id}",
		authHandler.Authenticate(
			http.HandlerFunc(taskHandler.Update),
		),
	)

	mux.Handle(
		"DELETE /api/v1/tasks/{id}",
		authHandler.Authenticate(
			http.HandlerFunc(taskHandler.Delete),
		),
	)

	httpServer := &http.Server{
		Addr:              addr,
		Handler:           corsMiddleware(mux, frontendURL),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      10 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	return &Server{
		httpServer: httpServer,
	}
}

func (s *Server) Start() error {
	log.Printf("Atlas API listening on %s", s.httpServer.Addr)

	err := s.httpServer.ListenAndServe()

	if err != nil && !errors.Is(err, http.ErrServerClosed) {
		return err
	}

	return nil
}

func (s *Server) Shutdown(ctx context.Context) error {
	log.Println("Shutting down Atlas HTTP server...")

	return s.httpServer.Shutdown(ctx)
}
