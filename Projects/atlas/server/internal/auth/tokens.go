package auth

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"

	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
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

func (tm *TokenManager) ValidateAccessToken(
	tokenString string,
) (*AccessTokenClaims, error) {
	token, err := jwt.ParseWithClaims(
		tokenString,
		&AccessTokenClaims{},
		func(token *jwt.Token) (any, error) {
			if token.Method != jwt.SigningMethodHS256 {
				return nil, fmt.Errorf(
					"unexpected signing method: %s",
					token.Method.Alg(),
				)
			}

			return tm.secret, nil
		},
		jwt.WithIssuer("atlas-api"),
		jwt.WithExpirationRequired(),
	)

	if err != nil {
		return nil, fmt.Errorf("parse access token: %w", err)
	}

	claims, ok := token.Claims.(*AccessTokenClaims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("invalid access token")
	}

	return claims, nil
}

func GenerateRefreshToken() (string, error) {
	bytes := make([]byte, 32)

	if _, err := rand.Read(bytes); err != nil {
		return "", fmt.Errorf(
			"generate refresh token: %w",
			err,
		)
	}

	return base64.RawURLEncoding.EncodeToString(bytes), nil
}

func HashRefreshToken(token string) string {
	hash := sha256.Sum256([]byte(token))

	return hex.EncodeToString(hash[:])
}
