package config

import "time"

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