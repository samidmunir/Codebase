package auth

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

type TokenManager struct {
	secret         []byte
	accessTokenTTL time.Duration
}

type AccessTokenClaims struct {
	UserID uuid.UUID `json:"userId"`
	Email  string    `json:"email"`

	jwt.RegisteredClaims
}

func NewTokenManager(
	secret string,
	accessTokenTTL time.Duration,
) *TokenManager {
	return &TokenManager{
		secret:         []byte(secret),
		accessTokenTTL: accessTokenTTL,
	}
}

func (tm *TokenManager) GenerateAccessToken(
	userID uuid.UUID,
	email string,
) (string, error) {
	now := time.Now()

	claims := AccessTokenClaims{
		UserID: userID,
		Email:  email,

		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID.String(),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(tm.accessTokenTTL)),
			Issuer:    "atlas-api",
		},
	}

	token := jwt.NewWithClaims(
		jwt.SigningMethodHS256,
		claims,
	)

	signedToken, err := token.SignedString(tm.secret)
	if err != nil {
		return "", fmt.Errorf("sign access token: %w", err)
	}

	return signedToken, nil
}

func (tm *TokenManager) AccessTokenTTL() time.Duration {
	return tm.accessTokenTTL
}
