package server

import (
	"log"
	"net/http"

	"github.com/samidmunir/Codebase/projects/atlas/server/internal/health"
)

type Server struct {
	httpServer *http.Server
}

func New(addr string) *Server {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /api/v1/health", health.Handler)

	return &Server {
		httpServer: &http.Server {
			Addr: addr,
			Handler: mux,
		},
	}
}

func (s *Server) Start() error {
	log.Printf("Atlas API listening on %s", s.httpServer.Addr)

	return s.httpServer.ListenAndServe()
}