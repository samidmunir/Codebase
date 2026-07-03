package db

import (
	"context"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var MongoClient *mongo.Client;
var UsersCollection *mongo.Collection;

func ConnectMongo(uri string) {
	if uri == "" {
		log.Fatal("MONGO_URI is required!");
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10 * time.Second);
	defer cancel();

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(uri));
	if err != nil {
		log.Fatal("Failed to connect to MongoDB:", err);
	}

	if err := client.Ping(ctx, nil); err != nil {
		log.Fatal("Failed to ping MongoDB:", err);
	}

	MongoClient = client;
	UsersCollection = client.Database("top-tier-customs").Collection("users");

	log.Println("MongoDB connected successfully.");
}