package auth

import (
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
)

type Session struct {
	ID bson.ObjectID `bson:"_id,omitempty"`;

	UserID bson.ObjectID `bson:"userId"`;
	JTI string `bson:"jti"`;
	TokenHash string `bson:"tokenHash"`;
	TokenVersion int `bson:"tokenVersion"`;

	UserAgent string `bson:"userAgent,omitempty"`;
	IPAddress string `bson:"ipAddress,omitempty"`;

	ExpiresAt time.Time `bson:"expiresAt"`;
	RevokedAt *time.Time `bson:"revokedAt,omitempty"`;
	CreatedAt time.Time `bson:"createdAt"`;
}