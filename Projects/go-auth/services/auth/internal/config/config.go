package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Port string
	AppEnv string
}

func Load() Config {
	if err:= godotenv.Load(); err != nil {
		log.Println("No .env file found, using system environment variables")
	}

	return Config {
		Port: getEnv("PORT", "8081"),
		AppEnv: getEnv("APP_ENV", "development"),
	}
}

func getEnv(key string, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}

	return value
}