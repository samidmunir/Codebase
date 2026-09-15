package main

import (
	"context"
	"log"

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

	ctx:= context.Background()

	db, err := database.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	log.Println("Connected to PostgreSQL successfully")
	
	
	srv := server.New(":" + cfg.Port)

	if err := srv.Start(); err != nil {
		log.Fatal(err)
	}
}