package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Env struct {
	Port string;
	ClientOrigin string;
	MongoURI string;
	JWTAccessSecret string;
	JWTAccessTTL string;
	JWTRefreshSecret string;
	JWTRefreshTTL string;
	GatewaySecret string;
}

func LoadEnv() Env {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system environment variables.");
	}

	return Env {
		Port: getEnv("PORT", "8081"),
		ClientOrigin: getEnv("CLIENT_ORIGIN", "http://localhost:5173"),
		MongoURI: getEnv("MONGO_URI", ""),
		JWTAccessSecret: getEnv("JWT_ACCESS_SECRET", ""),
		JWTAccessTTL: getEnv("JWT_ACCESS_TTL", "15m"),
		JWTRefreshSecret: getEnv("JWT_REFRESH_SECRET", ""),
		JWTRefreshTTL: getEnv("JWT_REFRESH_TTL", "7d"),
		GatewaySecret: getEnv("GATEWAY_SHARED_SECRET", ""),
	}
}

func getEnv(key string, fallback string) string {
	value := os.Getenv(key);
	if value == "" {
		return fallback;
	}

	return value;
}