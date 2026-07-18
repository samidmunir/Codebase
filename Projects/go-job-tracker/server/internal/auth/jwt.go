package auth

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/samidmunir/go-job-tracker/server/internal/config"
	"go.mongodb.org/mongo-driver/v2/bson"
)

type TokenType string

const (
	AccessTokenType  TokenType = "access"
	RefreshTokenType TokenType = "refresh"
)

type Claims struct {
	Email        string    `json:"email,omitempty"`
	TokenType    TokenType `json:"tokenType"`
	TokenVersion int       `json:"tokenVersion"`

	jwt.RegisteredClaims
}

type TokenPair struct {
	AccessToken      string
	RefreshToken     string
	RefreshJTI       string
	AccessExpiresAt  time.Time
	RefreshExpiresAt time.Time
}

type JWTManager struct {
	issuer        string
	audience      string
	accessSecret  []byte
	refreshSecret []byte
	accessTTL     time.Duration
	refreshTTL    time.Duration
}

func NewJWTManager(cfg config.AuthConfig) *JWTManager {
	return &JWTManager{
		issuer:        cfg.Issuer,
		audience:      cfg.Audience,
		accessSecret:  []byte(cfg.AccessSecret),
		refreshSecret: []byte(cfg.RefreshSecret),
		accessTTL:     cfg.AccessTTL,
		refreshTTL:    cfg.RefreshTTL,
	}
}

func (m *JWTManager) GenerateTokenPair(
	userID bson.ObjectID,
	email string,
	tokenVersion int,
) (*TokenPair, error) {
	now := time.Now().UTC()
	accessExpiration := now.Add(m.accessTTL)
	refreshExpiration := now.Add(m.refreshTTL)

	accessJTI := bson.NewObjectID().Hex()
	refreshJTI := bson.NewObjectID().Hex()

	accessToken, err := m.signToken(
		userID,
		email,
		tokenVersion,
		AccessTokenType,
		accessJTI,
		now,
		accessExpiration,
		m.accessSecret,
	)
	if err != nil {
		return nil, err
	}

	refreshToken, err := m.signToken(
		userID,
		"",
		tokenVersion,
		RefreshTokenType,
		refreshJTI,
		now,
		refreshExpiration,
		m.refreshSecret,
	)
	if err != nil {
		return nil, err
	}

	return &TokenPair{
		AccessToken:      accessToken,
		RefreshToken:     refreshToken,
		RefreshJTI:       refreshJTI,
		AccessExpiresAt:  accessExpiration,
		RefreshExpiresAt: refreshExpiration,
	}, nil
}

func (m *JWTManager) ParseAccessToken(
	tokenString string,
) (*Claims, error) {
	return m.parseToken(
		tokenString,
		AccessTokenType,
		m.accessSecret,
	)
}

func (m *JWTManager) ParseRefreshToken(
	tokenString string,
) (*Claims, error) {
	return m.parseToken(
		tokenString,
		RefreshTokenType,
		m.refreshSecret,
	)
}

func (m *JWTManager) signToken(
	userID bson.ObjectID,
	email string,
	tokenVersion int,
	tokenType TokenType,
	jti string,
	issuedAt time.Time,
	expiresAt time.Time,
	secret []byte,
) (string, error) {
	claims := Claims{
		Email:        email,
		TokenType:    tokenType,
		TokenVersion: tokenVersion,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    m.issuer,
			Subject:   userID.Hex(),
			Audience:  jwt.ClaimStrings{m.audience},
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			IssuedAt:  jwt.NewNumericDate(issuedAt),
			NotBefore: jwt.NewNumericDate(issuedAt),
			ID:        jti,
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	signedToken, err := token.SignedString(secret)
	if err != nil {
		return "", fmt.Errorf("sign JWT: %w", err)
	}

	return signedToken, nil
}

func (m *JWTManager) parseToken(
	tokenString string,
	expectedType TokenType,
	secret []byte,
) (*Claims, error) {
	claims := &Claims{}

	token, err := jwt.ParseWithClaims(
		tokenString,
		claims,
		func(token *jwt.Token) (any, error) {
			if token.Method != jwt.SigningMethodHS256 {
				return nil, errors.New("unexpected signing method")
			}

			return secret, nil
		},
		jwt.WithIssuer(m.issuer),
		jwt.WithAudience(m.audience),
		jwt.WithExpirationRequired(),
		jwt.WithValidMethods([]string{
			jwt.SigningMethodHS256.Alg(),
		}),
	)
	if err != nil {
		return nil, fmt.Errorf("parse JWT: %w", err)
	}

	if !token.Valid {
		return nil, errors.New("invalid JWT")
	}

	if claims.TokenType != expectedType {
		return nil, errors.New("unexpected JWT type")
	}

	return claims, nil
}

func HashToken(token string) string {
	hash := sha256.Sum256([]byte(token))
	return hex.EncodeToString(hash[:])
}
