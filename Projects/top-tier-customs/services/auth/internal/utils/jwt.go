package utils

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type TokenPayload struct {
	Sub string `json:"sub"`
	Email string `json:"email"`
	Role string `json:"role"`
	TokenVersion int `json:"tokenVersion"`
	jwt.RegisteredClaims
}

func GenerateAccessToken(userId string, email string, role string, tokenVersion int, secret string) (string, error) {
	return generateToken(userId, email, role, tokenVersion, secret, 15 * time.Minute);
}

func GenerateRefreshToken(userId string, email string, role string, tokenVersion int, secret string) (string, error) {
	return generateToken(userId, email, role, tokenVersion, secret, 7 * 24 * time.Hour);
}

func generateToken(userId string, email string, role string, tokenVersion int, secret string, ttl time.Duration) (string, error) {
	claims := TokenPayload{
		Sub: userId,
		Email: email,
		Role: role,
		TokenVersion: tokenVersion,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(ttl)),
			IssuedAt: jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims);

	return token.SignedString([]byte(secret));
}

func VerifyToken(tokenString, secret string) (*TokenPayload, error) {
	token, err := jwt.ParseWithClaims(tokenString, &TokenPayload{}, func(token *jwt.Token) (interface{}, error) {
		return []byte(secret), nil;
	});

	if err != nil {
		return nil, err;
	}

	claims, ok := token.Claims.(*TokenPayload);
	if !ok || !token.Valid {
		return nil, errors.New("Invalid token.");
	}

	return  claims, nil;
}