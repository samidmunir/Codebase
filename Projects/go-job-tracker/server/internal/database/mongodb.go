package database

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

const connectionTimeout = 10 * time.Second;

type MongoDB struct {
	Client *mongo.Client;
	Database *mongo.Database;
}

func Connect(parentContext context.Context, uri string, databaseName string) (*MongoDB, error) {
	ctx, cancel := context.WithTimeout(parentContext, connectionTimeout);
	defer cancel();

	client, err := mongo.Connect(options.Client().ApplyURI(uri));
	if err != nil {
		return nil, fmt.Errorf("connect to MongoDB %w", err);
	}

	if err := client.Ping(ctx, nil); err != nil {
		_ = client.Disconnect(context.Background());
		
		return nil, fmt.Errorf("ping MongoDB: %w", err);
	}

	slog.Info("MongoDB connection established", "database", databaseName);

	return &MongoDB{
		Client: client,
		Database: client.Database(databaseName),
	}, nil;
}

func (m *MongoDB) Disconnect(ctx context.Context) error {
	if m == nil || m.Client == nil {
		return nil;
	}

	if err := m.Client.Disconnect(ctx); err != nil {
		return fmt.Errorf("disconnect from MongoDB: %w", err);
	}

	slog.Info("MongoDB connection closed");

	return nil;
}