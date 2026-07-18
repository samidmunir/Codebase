package auth

import (
	"context"
	"errors"
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

var ErrSessionNotFound = errors.New("session not found")

type Repository struct {
	collection *mongo.Collection
}

func NewRepository(database *mongo.Database) *Repository {
	return &Repository{
		collection: database.Collection("auth_sessions"),
	}
}

func (r *Repository) EnsureIndexes(ctx context.Context) error {
	_, err := r.collection.Indexes().CreateMany(
		ctx,
		[]mongo.IndexModel{
			{
				Keys: bson.D{
					{Key: "jti", Value: 1},
				},
				Options: options.Index().
					SetUnique(true).
					SetName("auth_sessions_jti_unique"),
			},
			{
				Keys: bson.D{
					{Key: "expiresAt", Value: 1},
				},
				Options: options.Index().
					SetExpireAfterSeconds(0).
					SetName("auth_sessions_expiry_ttl"),
			},
			{
				Keys: bson.D{
					{Key: "userId", Value: 1},
					{Key: "revokedAt", Value: 1},
				},
				Options: options.Index().
					SetName("auth_sessions_user_active"),
			},
		},
	)
	if err != nil {
		return fmt.Errorf("create auth session indexes: %w", err)
	}

	return nil
}

func (r *Repository) Create(
	ctx context.Context,
	session *Session,
) error {
	result, err := r.collection.InsertOne(ctx, session)
	if err != nil {
		return fmt.Errorf("insert auth session: %w", err)
	}

	id, ok := result.InsertedID.(bson.ObjectID)
	if !ok {
		return errors.New("unexpected inserted session ID type")
	}

	session.ID = id

	return nil
}

func (r *Repository) FindActiveByJTI(
	ctx context.Context,
	jti string,
) (*Session, error) {
	var result Session

	err := r.collection.FindOne(
		ctx,
		bson.M{
			"jti":       jti,
			"revokedAt": bson.M{"$exists": false},
			"expiresAt": bson.M{"$gt": time.Now().UTC()},
		},
	).Decode(&result)

	if errors.Is(err, mongo.ErrNoDocuments) {
		return nil, ErrSessionNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("find active session: %w", err)
	}

	return &result, nil
}

func (r *Repository) Revoke(
	ctx context.Context,
	jti string,
) error {
	now := time.Now().UTC()

	result, err := r.collection.UpdateOne(
		ctx,
		bson.M{
			"jti":       jti,
			"revokedAt": bson.M{"$exists": false},
		},
		bson.M{
			"$set": bson.M{
				"revokedAt": now,
			},
		},
	)
	if err != nil {
		return fmt.Errorf("revoke auth session: %w", err)
	}

	if result.MatchedCount == 0 {
		return ErrSessionNotFound
	}

	return nil
}

func (r *Repository) RevokeAllForUser(
	ctx context.Context,
	userID bson.ObjectID,
) error {
	now := time.Now().UTC()

	_, err := r.collection.UpdateMany(
		ctx,
		bson.M{
			"userId":    userID,
			"revokedAt": bson.M{"$exists": false},
		},
		bson.M{
			"$set": bson.M{
				"revokedAt": now,
			},
		},
	)
	if err != nil {
		return fmt.Errorf("revoke user sessions: %w", err)
	}

	return nil
}
