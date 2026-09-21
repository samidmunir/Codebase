package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/joho/godotenv"
	"github.com/samidmunir/Codebase/projects/atlas/server/internal/auth"
	"github.com/samidmunir/Codebase/projects/atlas/server/internal/projects"
	"github.com/samidmunir/Codebase/projects/atlas/server/internal/users"
	"github.com/samidmunir/Codebase/projects/atlas/server/platform/config"
	"github.com/samidmunir/Codebase/projects/atlas/server/platform/database"
	"github.com/samidmunir/Codebase/projects/atlas/server/platform/server"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found; using system environment variables")
	}

	cfg, err := config.Load()
	if err != nil {
		log.Fatal(err)
	}

	ctx := context.Background()

	db, err := database.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	log.Println("Connected to PostgreSQL successfully")

	userRepository := users.NewRepository(db)

sessionRepository := auth.NewSessionRepository(db)

tokenManager := auth.NewTokenManager(
	cfg.JWTSecret,
	time.Duration(cfg.AccessTokenMinutes)*time.Minute,
)

authService := auth.NewService(
	userRepository,
	sessionRepository,
	tokenManager,
	time.Duration(cfg.RefreshTokenDays)*24*time.Hour,
)

authHandler := auth.NewHandler(authService)

// Projects dependencies
projectRepository := projects.NewRepository(db)
projectService := projects.NewService(projectRepository)
projectHandler := projects.NewHandler(projectService)

srv := server.New(
	":"+cfg.Port,
	db,
	cfg.FrontendURL,
	authHandler,
	projectHandler,
)

	serverErrors := make(chan error, 1)

	go func() {
		serverErrors <- srv.Start()
	}()

	shutdownSignal := make(chan os.Signal, 1)

	signal.Notify(
		shutdownSignal,
		os.Interrupt,
		syscall.SIGTERM,
	)

	select {
	case err := <-serverErrors:
		log.Fatalf("Server error: %v", err)

	case sig := <-shutdownSignal:
		log.Printf("Received shutdown signal: %s", sig)
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Printf("HTTP server shutdown error: %v", err)
	}

	log.Println("Atlas API stopped")
}
