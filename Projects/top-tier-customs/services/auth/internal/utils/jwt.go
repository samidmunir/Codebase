package utils

import (
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type TokenPayload struct {
	Sub string `json:"sub"`;
	Email string `json:"email"`;
	Role string `json:"role"`;
	jwt.RegisteredClaims;
}

func GenerateAccessToken(userId string, email string, role string, secret string) (string, error) {
	claims := TokenPayload {
		Sub: userId,
		Email: email,
		Role: role,
		RegisteredClaims: jwt.RegisteredClaims {
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(15 * time.Minute)),
			IssuedAt: jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims);

	return token.SignedString([]byte(secret));
}

func GenerateRefreshToken(userId string, email string, role string, secret string) (string, error) {
	claims := TokenPayload {
		Sub: userId,
		Email: email,
		Role: role,
		RegisteredClaims: jwt.RegisteredClaims {
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(7 * 24 * time.Hour)),
			IssuedAt: jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims);

	return token.SignedString([]byte(secret));
}