package auth

import (
	"testing"
	"time"

	"github.com/google/uuid"
)

func TestGenerateAndValidateAccessToken(t *testing.T) {
	manager := NewTokenManager(
		"test-secret-key",
		15*time.Minute,
	)

	userID := uuid.New()
	email := "sami@example.com"

	token, err := manager.GenerateAccessToken(
		userID,
		email,
	)
	if err != nil {
		t.Fatalf("GenerateAccessToken() returned error: %v", err)
	}

	if token == "" {
		t.Fatal("GenerateAccessToken() returned empty token")
	}

	claims, err := manager.ValidateAccessToken(token)
	if err != nil {
		t.Fatalf("ValidateAccessToken() returned error: %v", err)
	}

	if claims.UserID != userID {
		t.Errorf(
			"expected user ID %s, got %s",
			userID,
			claims.UserID,
		)
	}

	if claims.Email != email {
		t.Errorf(
			"expected email %s, got %s",
			email,
			claims.Email,
		)
	}

	if claims.Subject != userID.String() {
		t.Errorf(
			"expected subject %s, got %s",
			userID,
			claims.Subject,
		)
	}

	if claims.Issuer != "atlas-api" {
		t.Errorf(
			"expected issuer atlas-api, got %s",
			claims.Issuer,
		)
	}
}

func TestValidateAccessTokenRejectsWrongSecret(t *testing.T) {
	signer := NewTokenManager(
		"secret-one",
		15*time.Minute,
	)

	validator := NewTokenManager(
		"secret-two",
		15*time.Minute,
	)

	token, err := signer.GenerateAccessToken(
		uuid.New(),
		"sami@example.com",
	)
	if err != nil {
		t.Fatalf("GenerateAccessToken() returned error: %v", err)
	}

	_, err = validator.ValidateAccessToken(token)

	if err == nil {
		t.Fatal("expected token signed with different secret to be rejected")
	}
}

func TestValidateAccessTokenRejectsTamperedToken(t *testing.T) {
	manager := NewTokenManager(
		"test-secret-key",
		15*time.Minute,
	)

	token, err := manager.GenerateAccessToken(
		uuid.New(),
		"sami@example.com",
	)
	if err != nil {
		t.Fatalf("GenerateAccessToken() returned error: %v", err)
	}

	if len(token) < 2 {
		t.Fatal("generated token unexpectedly short")
	}

	lastCharacter := token[len(token)-1]

	replacement := byte('A')
	if lastCharacter == replacement {
		replacement = 'B'
	}

	tampered := token[:len(token)-1] + string(replacement)

	_, err = manager.ValidateAccessToken(tampered)

	if err == nil {
		t.Fatal("expected tampered token to be rejected")
	}
}

func TestValidateAccessTokenRejectsExpiredToken(t *testing.T) {
	manager := NewTokenManager(
		"test-secret-key",
		-time.Minute,
	)

	token, err := manager.GenerateAccessToken(
		uuid.New(),
		"sami@example.com",
	)
	if err != nil {
		t.Fatalf("GenerateAccessToken() returned error: %v", err)
	}

	_, err = manager.ValidateAccessToken(token)

	if err == nil {
		t.Fatal("expected expired token to be rejected")
	}
}

func TestValidateAccessTokenRejectsMalformedToken(t *testing.T) {
	manager := NewTokenManager(
		"test-secret-key",
		15*time.Minute,
	)

	_, err := manager.ValidateAccessToken(
		"this-is-not-a-jwt",
	)

	if err == nil {
		t.Fatal("expected malformed token to be rejected")
	}
}

func TestGenerateRefreshToken(t *testing.T) {
	token, err := GenerateRefreshToken()
	if err != nil {
		t.Fatalf("GenerateRefreshToken() returned error: %v", err)
	}

	if token == "" {
		t.Fatal("GenerateRefreshToken() returned empty token")
	}
}

func TestGenerateRefreshTokenProducesUniqueTokens(t *testing.T) {
	const tokenCount = 100

	tokens := make(map[string]struct{})

	for i := 0; i < tokenCount; i++ {
		token, err := GenerateRefreshToken()
		if err != nil {
			t.Fatalf(
				"GenerateRefreshToken() returned error: %v",
				err,
			)
		}

		if _, exists := tokens[token]; exists {
			t.Fatal("duplicate refresh token generated")
		}

		tokens[token] = struct{}{}
	}
}

func TestHashRefreshToken(t *testing.T) {
	token := "example-refresh-token"

	hashOne := HashRefreshToken(token)
	hashTwo := HashRefreshToken(token)

	if hashOne == "" {
		t.Fatal("HashRefreshToken() returned empty hash")
	}

	if hashOne == token {
		t.Fatal("refresh token hash must not equal raw token")
	}

	if hashOne != hashTwo {
		t.Fatal("same refresh token should produce same hash")
	}
}

func TestHashRefreshTokenDifferentInputs(t *testing.T) {
	hashOne := HashRefreshToken("refresh-token-one")
	hashTwo := HashRefreshToken("refresh-token-two")

	if hashOne == hashTwo {
		t.Fatal("different refresh tokens produced identical hashes")
	}
}
