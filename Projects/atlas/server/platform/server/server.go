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
)

type Server struct {
	httpServer *http.Server
}

func New(addr string, db *pgxpool.Pool, frontendURL string, authHandler *auth.Handler) *Server {
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
