package config

import (
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	App       AppConfig
	Server    ServerConfig
	MongoDB   MongoDBConfig
	Auth AuthConfig;
	Cookie CookieConfig;
	ClientURL string
}

type AppConfig struct {
	Environment string
	Name        string
	APIPrefix   string
}

type ServerConfig struct {
	Port            string
	ReadTimeout     time.Duration
	WriteTimeout    time.Duration
	IdleTimeout     time.Duration
	ShutdownTimeout time.Duration
}

type MongoDBConfig struct {
	URI      string
	Database string
}

type AuthConfig struct {
	Issuer string;
	Audience string;
	AccessSecret string;
	RefreshSecret string;
	AccessTTL time.Duration;
	RefreshTTL time.Duration;
}

type CookieConfig struct {
	RefreshName string;
	Domain string;
	Secure bool;
	SameSite string;
}

func Load() (*Config, error) {
	_ = godotenv.Load()

	readTimeout, err := readDuration("SERVER_READ_TIMEOUT", 10 * time.Second)
	if err != nil {
		return nil, err
	}

	writeTimeout, err := readDuration("SERVER_WRITE_TIMEOUT", 15 * time.Second)
	if err != nil {
		return nil, err
	}

	idleTimeout, err := readDuration("SERVER_IDLE_TIMEOUT", 60*time.Second)
	if err != nil {
		return nil, err
	}

	shutdownTimeout, err := readDuration("SERVER_SHUTDOWN_TIMEOUT", 10*time.Second)
	if err != nil {
		return nil, err
	}

	accessTTL, err := readDuration("JWT_ACCESS_TTL", 15 * time.Minute);
	if err != nil {
		return nil, err;
	}

	refreshTTL, err := readDuration("JWT_REFRESH_TTL", 7 * 24 * time.Hour);
	if err != nil {
		return nil, err;
	}

	cookieSecure, err := readBool("REFRESH_COOKIE_SECURE", false);
	if err != nil {
		return nil, err;
	}

	cfg := &Config{
		App: AppConfig{
			Environment: getEnv("APP_ENV", "development"),
			Name:        getEnv("APP_NAME", "Job Application Tracker API"),
			APIPrefix:   getEnv("API_PREFIX", "/api/v1"),
		},
		Server: ServerConfig{
			Port:            getEnv("PORT", "8080"),
			ReadTimeout:     readTimeout,
			WriteTimeout:    writeTimeout,
			IdleTimeout:     idleTimeout,
			ShutdownTimeout: shutdownTimeout,
		},
		MongoDB: MongoDBConfig{
			URI:      os.Getenv("MONGODB_URI"),
			Database: getEnv("MONGODB_DATABASE", "job_application_tracker"),
		},
		Auth: AuthConfig{
			Issuer: getEnv("JWT_ISSUER", "go_job_tracker-api"),
			Audience: getEnv("JWT_AUDIENCE", "go_job_tracker-client"),
			AccessSecret: os.Getenv("JWT_ACCESS_SECRET"),
			RefreshSecret: os.Getenv("JWT_REFRESH_SECRET"),
			AccessTTL: accessTTL,
			RefreshTTL: refreshTTL,
		},
		Cookie: CookieConfig{
			RefreshName: getEnv("REFRESH_COOKIE_NAME", "gjt_refresh"),
			Domain: os.Getenv("REFRESH_COOKIE_DOMAIN"),
			Secure: cookieSecure,
			SameSite: strings.ToLower(getEnv("REFRESH_COOKIE_SAME_SITE", "lax")),
		},
		ClientURL: getEnv("CLIENT_URL", "http://localhost:5173"),
	}

	if err := cfg.Validate(); err != nil {
		return nil, err
	}

	return cfg, nil
}

func (c *Config) Validate() error {
	switch {
	case c.MongoDB.URI == "":
		return errors.New("MONGODB_URI is required");
	case c.MongoDB.Database == "":
		return errors.New("MONGODB_DATABSE is required");
	case c.Server.Port == "":
		return errors.New("PORT is required");
	}

	return nil
}

func getEnv(key string, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}

	return value
}

func readDuration(key string, fallback time.Duration) (time.Duration, error) {
	value := os.Getenv(key)
	if value == "" {
		return fallback, nil
	}

	duration, err := time.ParseDuration(value)
	if err != nil {
		return 0, fmt.Errorf(
			"Invalid duration for environment variable %s: %w",
			key,
			err,
		)
	}

	return duration, nil
}

func readBool(key string, fallback bool) (bool, error) {
	value := strings.TrimSpace(os.Getenv(key));
	if value == "" {
		return fallback, nil;
	}

	result, err := strconv.ParseBool(value);
	if err != nil {
		return false, fmt.Errorf("invalid boolean for %s: %w", key, err);
	}

	return result, nil;
}