package config

import (
	"fmt"
	"os"
	"strconv"
)

type Config struct {
	Port        string
	DatabaseURL string
	Environment string
	FrontendURL string

	JWTSecret          string
	AccessTokenMinutes int
	RefreshTokenDays   int
}

func Load() (*Config, error) {
	accessTokenMinutes, err := getEnvInt("ACCESS_TOKEN_MINUTES", 15)
	if err != nil {
		return nil, err
	}

	refreshTokenDays, err := getEnvInt("REFRESH_TOKEN_DAYS", 30)
	if err != nil {
		return nil, err
	}

	cfg := &Config{
		Port:        getEnv("PORT", "8080"),
		DatabaseURL: os.Getenv("DATABASE_URL"),
		Environment: getEnv("APP_ENV", "development"),
		FrontendURL: getEnv("FRONTEND_URL", "http://localhost:5173"),

		JWTSecret:          os.Getenv("JWT_SECRET"),
		AccessTokenMinutes: accessTokenMinutes,
		RefreshTokenDays:   refreshTokenDays,
	}

	if cfg.DatabaseURL == "" {
		return nil, fmt.Errorf("DATABASE_URL is required")
	}

	if cfg.JWTSecret == "" {
		return nil, fmt.Errorf("JWT_SECRET is required")
	}

	return cfg, nil
}

func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}

	return fallback
}

func getEnvInt(key string, fallback int) (int, error) {
	value := os.Getenv(key)

	if value == "" {
		return fallback, nil
	}

	parsed, err := strconv.Atoi(value)
	if err != nil {
		return 0, fmt.Errorf("%s must be an integer", key)
	}

	return parsed, nil
}
