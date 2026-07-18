package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/samidmunir/go-job-tracker/server/internal/config"
	"github.com/samidmunir/go-job-tracker/server/internal/database"
	"github.com/samidmunir/go-job-tracker/server/internal/platform/httpserver"
)

func run() error {
	cfg, err := config.Load();
	if err != nil {
		return err;
	}

	rootContext := context.Background();

	mongoDB, err := database.Connect(
		rootContext,
		cfg.MongoDB.URI,
		cfg.MongoDB.Database,
	);
	if err != nil {
		return err;
	}

	router := httpserver.NewRouter(cfg, mongoDB);

	server := &http.Server{
		Addr: ":" + cfg.Server.Port,
		Handler: router,
		ReadTimeout: cfg.Server.ReadTimeout,
		WriteTimeout: cfg.Server.WriteTimeout,
		IdleTimeout: cfg.Server.IdleTimeout,
	};

	serverErrorChannel := make(chan error, 1);

	go func() {
		slog.Info(
			"HTTP server started",
			"port",
			cfg.Server.Port,
			"environment",
			cfg.App.Environment,
		);

		serverErrorChannel <- server.ListenAndServe();
	}();

	shutdownSignalChannel := make(chan os.Signal, 1);

	signal.Notify(
		shutdownSignalChannel,
		os.Interrupt,
		syscall.SIGTERM,
		syscall.SIGINT,
	);

	select {
	case signal := <-shutdownSignalChannel:
		slog.Info(
			"shutdown signal received",
			"signal",
			signal.String(),
		);

	case serverErr := <-serverErrorChannel:
		if !errors.Is(serverErr, http.ErrServerClosed) {
			return serverErr;
		}
	}

	shutdownContext, cancel := context.WithTimeout(
		context.Background(),
		cfg.Server.ShutdownTimeout,
	);
	defer cancel();

	if err := server.Shutdown(shutdownContext); err != nil {
		return err;
	}

	databaseShutdownContext, databaseCancel := context.WithTimeout(
		context.Background(),
		5 * time.Second,
	);
	defer databaseCancel();

	if err := mongoDB.Disconnect(databaseShutdownContext); err != nil {
		return err;
	}

	slog.Info("server shut down successfully");

	return nil;
}