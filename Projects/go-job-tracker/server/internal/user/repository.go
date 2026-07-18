package user

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

var (
	ErrNotFound   = errors.New("user not found")
	ErrEmailInUse = errors.New("email is already in use")
)

type Repository struct {
	collection *mongo.Collection
}

func NewRepository(database *mongo.Database) *Repository {
	return &Repository{
		collection: database.Collection("users"),
	}
}

func (r *Repository) EnsureIndexes(ctx context.Context) error {
	_, err := r.collection.Indexes().CreateOne(
		ctx,
		mongo.IndexModel{
			Keys: bson.D{
				{Key: "email", Value: 1},
			},
			Options: options.Index().SetUnique(true).SetName("users_email_unique"),
		},
	)
	if err != nil {
		return fmt.Errorf("create user indexes: %w", err)
	}

	return nil
}

func (r *Repository) Create(ctx context.Context, user *User) error {
	user.Email = normalizeEmail(user.Email)

	result, err := r.collection.InsertOne(ctx, user)
	if mongo.IsDuplicateKeyError(err) {
		return ErrEmailInUse
	}
	if err != nil {
		return fmt.Errorf("insert user: %w", err)
	}

	id, ok := result.InsertedID.(bson.ObjectID)
	if !ok {
		return errors.New("unexpected inserted user ID type")
	}

	user.ID = id

	return nil
}

func (r *Repository) FindByEmail(ctx context.Context, email string) (*User, error) {
	var result User

	err := r.collection.FindOne(
		ctx,
		bson.M{"email": normalizeEmail(email)},
	).Decode(&result)

	if errors.Is(err, mongo.ErrNoDocuments) {
		return nil, ErrNotFound
	}

	if err != nil {
		return nil, fmt.Errorf("find user by email: %w", err)
	}

	return &result, nil
}

func (r *Repository) FindByID(ctx context.Context, id bson.ObjectID) (*User, error) {
	var result User

	err := r.collection.FindOne(
		ctx,
		bson.M{"_id": id},
	).Decode(&result)

	if errors.Is(err, mongo.ErrNoDocuments) {
		return nil, ErrNotFound
	}

	if err != nil {
		return nil, fmt.Errorf("find user by ID: %w", err)
	}

	return &result, nil
}

func (r *Repository) UpdateLastLogin(ctx context.Context, id bson.ObjectID, at time.Time) error {
	result, err := r.collection.UpdateOne(
		ctx,
		bson.M{"_id": id},
		bson.M{
			"$set": bson.M{
				"lastLoginAt": at,
				"updatedAt":   at,
			},
		},
	)
	if err != nil {
		return fmt.Errorf("update last login: %w", err)
	}

	if result.MatchedCount == 0 {
		return ErrNotFound
	}

	return nil
}

func normalizeEmail(value string) string {
	return strings.ToLower(strings.TrimSpace(value))
}
