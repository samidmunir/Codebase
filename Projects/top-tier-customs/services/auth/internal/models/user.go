package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type User struct {
	Id primitive.ObjectID `bson:"_id,omitempty" json:"_id"`;
	Email string `bson:"email" json:"email"`;
	PasswordHash string `bson:"passwordHash" json:"-"`;
	Role string `bson:"role" json:"role"`;
	Profile UserProfile `bson:"profile" json:"profile"`;
	SecOps SecurityOps `bson:"secOps" json:"secOps"`;
	Stripe StripeMapping `bson:"stripe" json:"stripe"`;
	CreatedAt time.Time `bson:"createdAt" json:"createdAt"`;
	UpdatedAt time.Time `bson:"updatedAt" json:"updatedAt"`;
}

type UserProfile struct {
	FirstName string `bson:"firstName" json:"firstName"`;
	LastName string `bson:"lastName" json:"lastName"`;
	Phone string `bson:"phone" json:"phone"`;
	City string `bson:"city" json:"city"`;
	Country string `bson:"country" json:"country"`;
}

type SecurityOps struct {
	TokenVersion int `bson:"tokenVersion" json:"tokenVersion"`;
	LastLoginAt *time.Time `bson:"lastLoginAt,omitempty" json:"lastLoginAt,omitempty"`
	FailedLogins int `bson:"failedLogins" json:"failedLogins"`;
	LastPasswordResetAt *time.Time `bson:"lastPasswordResetAt,omitempty" json:"lastPasswordResetAt,omitempty"`;
	FailedResets int `bson:"failedResets" json:"failedResets"`;
	LockedUntil *time.Time `bson:"lockedUntil,omitempty" json:"lockedUntil,omitempty"`;
}

type StripeMapping struct {
	CustomerId string `bson:"customerId,omitempty" json:"customerId,omitempty"`;
}