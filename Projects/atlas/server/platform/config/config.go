package config

import (
	"fmt"
	"os"
)

type Config struct {
	Port string
	DatabaseURL string
	Environment string
}

func Load() (*Config, error) {
	cfg := &Config {
		Port: getEnv("PORT", "8080"),
		DatabaseURL: os.Getenv("DATABASE_URL"),
		Environment: getEnv("APP_ENV", "development"),
	}

	if cfg.DatabaseURL == "" {
		return nil, fmt.Errorf("DATABASE_URL is required")
	}

	return cfg, nil
}

func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}

	return fallback
}