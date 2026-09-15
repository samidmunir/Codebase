package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/joho/godotenv"
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

	srv := server.New(":"+cfg.Port, db, cfg.FrontendURL)

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
