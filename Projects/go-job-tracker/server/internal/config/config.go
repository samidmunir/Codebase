package config

import (
	"errors"
	"fmt"
	"os"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	App AppConfig;
	Server ServerConfig;
	MongoDB MongoDBConfig;
	ClientURL string;
}

type AppConfig struct {
	Environment string;
	Name string;
	APIPrefix string;
}

type ServerConfig struct {
	Port string;
	ReadTimeout time.Duration;
	WriteTimeout time.Duration;
	IdleTimeout time.Duration;
	ShutdownTimeout time.Duration;
}

type MongoDBConfig struct {
	URI string;
	Database string;
}

func Load() (*Config, error) {
	_ = godotenv.Load();


	readTimeout, err := readDuration("SERVER_READ_TIMEOUT", 10 * time.Second);
	if err != nil {
		return nil, err;
	}

	writeTimeout, err := readDuration("SERVER_WRITE_TIMEOUT", 15 * time.Second);
	if err != nil {
		return nil, err;
	}

	idleTimeout, err := readDuration("SERVER_IDLE_TIMEOUT", 60 * time.Second);
	if err != nil {
		return nil, err;
	}

	shutdownTimeout, err := readDuration("SERVER_SHUTDOWN_TIMEOUT", 10 * time.Second);
	if err != nil {
		return nil, err;
	}

	cfg := &Config{
		App: AppConfig{
			Environment: getEnv("APP_ENV", "development"),
			Name: getEnv("APP_NAME", "Job Application Tracker API"),
			APIPrefix: getEnv("API_PREFIX", "/api/v1"),
		},
		Server: ServerConfig{
			Port: getEnv("PORT", "8080"),
			ReadTimeout: readTimeout,
			WriteTimeout: writeTimeout,
			IdleTimeout: idleTimeout,
			ShutdownTimeout: shutdownTimeout,
		},
		MongoDB: MongoDBConfig{
			URI: os.Getenv("MONGODB_URI"),
			Database: getEnv("MONGODB_DATABASE", "job_application_tracker"),
		},
		ClientURL: getEnv("CLIENT_URL", "http://localhost:5173"),
	}

	if err := cfg.Validate(); err != nil {
		return nil, err;
	}

	return cfg, nil;
}

func (c *Config) Validate() error {
	if c.MongoDB.URI == "" {
		return errors.New("MongoDB URI is required.");
	}

	if c.MongoDB.Database == "" {
		return errors.New("MongoDB database is required.");
	}

	if c.Server.Port == "" {
		return errors.New("Port is required.");
	}

	return nil;
}

func getEnv(key string, fallback string) string {
	value := os.Getenv(key);
	if value == "" {
		return fallback;
	}

	return value;
}

func readDuration(key string, fallback time.Duration) (time.Duration, error) {
	value := os.Getenv(key);
	if value == "" {
		return fallback, nil;
	}

	duration, err := time.ParseDuration(value);
	if err != nil {
		return 0, fmt.Errorf(
			"Invalid duration for environment variable %s: %w",
			key,
			err,
		)
	}

	return duration, nil;
}