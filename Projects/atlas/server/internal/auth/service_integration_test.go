//go:build integration

package auth

import (
	"context"
	"errors"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/samidmunir/Codebase/projects/atlas/server/internal/users"
)

type integrationTestEnv struct {
	db       *pgxpool.Pool
	service  *Service
	users    *users.Repository
	sessions *SessionRepository
}

func setupIntegrationTest(
	t *testing.T,
) *integrationTestEnv {
	t.Helper()

	databaseURL := os.Getenv("TEST_DATABASE_URL")

	if databaseURL == "" {
		t.Fatal("TEST_DATABASE_URL must be set")
	}

	if !strings.Contains(databaseURL, "atlas_test") {
		t.Fatal(
			"refusing to run integration tests against a non-test database",
		)
	}

	if databaseURL == "" {
		t.Fatal(
			"TEST_DATABASE_URL must be set for integration tests",
		)
	}

	ctx := context.Background()

	db, err := pgxpool.New(
		ctx,
		databaseURL,
	)
	if err != nil {
		t.Fatalf(
			"failed to create test database pool: %v",
			err,
		)
	}

	if err := db.Ping(ctx); err != nil {
		db.Close()

		t.Fatalf(
			"failed to connect to test database: %v",
			err,
		)
	}

	userRepository := users.NewRepository(db)
	sessionRepository := NewSessionRepository(db)

	tokenManager := NewTokenManager(
		"atlas-integration-test-secret",
		15*time.Minute,
	)

	service := NewService(
		userRepository,
		sessionRepository,
		tokenManager,
		30*24*time.Hour,
	)

	env := &integrationTestEnv{
		db:       db,
		service:  service,
		users:    userRepository,
		sessions: sessionRepository,
	}

	t.Cleanup(func() {
		cleanupTestDatabase(t, db)
		db.Close()
	})

	return env
}

func cleanupTestDatabase(
	t *testing.T,
	db *pgxpool.Pool,
) {
	t.Helper()

	ctx := context.Background()

	_, err := db.Exec(
		ctx,
		`
		TRUNCATE TABLE sessions, users
		RESTART IDENTITY
		CASCADE
		`,
	)

	if err != nil {
		t.Errorf(
			"failed to clean test database: %v",
			err,
		)
	}
}

func TestIntegrationRegister(t *testing.T) {
	env := setupIntegrationTest(t)

	ctx := context.Background()

	response, err := env.service.Register(
		ctx,
		RegisterRequest{
			Email:     "integration@example.com",
			Password:  "AtlasTest123!",
			FirstName: "Integration",
			LastName:  "User",
			Timezone:  "America/New_York",
		},
	)

	if err != nil {
		t.Fatalf(
			"Register() returned error: %v",
			err,
		)
	}

	if response.Email != "integration@example.com" {
		t.Errorf(
			"expected integration@example.com, got %s",
			response.Email,
		)
	}

	user, err := env.users.FindByEmail(
		ctx,
		"integration@example.com",
	)

	if err != nil {
		t.Fatalf(
			"failed to find registered user: %v",
			err,
		)
	}

	if user.PasswordHash == "AtlasTest123!" {
		t.Fatal("plaintext password was stored in database")
	}

	if err := CheckPassword(
		"AtlasTest123!",
		user.PasswordHash,
	); err != nil {
		t.Fatal(
			"stored password hash does not verify",
		)
	}
}

func registerIntegrationUser(
	t *testing.T,
	env *integrationTestEnv,
) {
	t.Helper()

	_, err := env.service.Register(
		context.Background(),
		RegisterRequest{
			Email:     "sami.integration@example.com",
			Password:  "AtlasTest123!",
			FirstName: "Sami",
			LastName:  "Integration",
			Timezone:  "America/New_York",
		},
	)

	if err != nil {
		t.Fatalf(
			"failed to register integration user: %v",
			err,
		)
	}
}

func TestIntegrationLoginCreatesSession(t *testing.T) {
	env := setupIntegrationTest(t)

	registerIntegrationUser(t, env)

	response, refreshToken, err := env.service.Login(
		context.Background(),
		LoginRequest{
			Email:    "sami.integration@example.com",
			Password: "AtlasTest123!",
		},
		SessionMetadata{},
	)

	if err != nil {
		t.Fatalf(
			"Login() returned error: %v",
			err,
		)
	}

	if response.AccessToken == "" {
		t.Fatal("expected access token")
	}

	if refreshToken == "" {
		t.Fatal("expected refresh token")
	}

	hash := HashRefreshToken(refreshToken)

	session, err := env.sessions.FindByTokenHash(
		context.Background(),
		hash,
	)

	if err != nil {
		t.Fatalf(
			"expected session in database: %v",
			err,
		)
	}

	if session.RevokedAt != nil {
		t.Fatal(
			"newly created session should not be revoked",
		)
	}
}

func TestIntegrationRefreshRotatesToken(t *testing.T) {
	env := setupIntegrationTest(t)

	registerIntegrationUser(t, env)

	_, oldRefreshToken, err := env.service.Login(
		context.Background(),
		LoginRequest{
			Email:    "sami.integration@example.com",
			Password: "AtlasTest123!",
		},
		SessionMetadata{},
	)

	if err != nil {
		t.Fatalf("Login() returned error: %v", err)
	}

	oldHash := HashRefreshToken(
		oldRefreshToken,
	)

	response, newRefreshToken, err :=
		env.service.Refresh(
			context.Background(),
			oldRefreshToken,
		)

	if err != nil {
		t.Fatalf(
			"Refresh() returned error: %v",
			err,
		)
	}

	if response.AccessToken == "" {
		t.Fatal(
			"expected refreshed access token",
		)
	}

	if newRefreshToken == "" {
		t.Fatal(
			"expected rotated refresh token",
		)
	}

	if newRefreshToken == oldRefreshToken {
		t.Fatal(
			"refresh token was not rotated",
		)
	}

	newHash := HashRefreshToken(
		newRefreshToken,
	)

	if newHash == oldHash {
		t.Fatal(
			"refresh token hash did not change",
		)
	}

	_, err = env.sessions.FindByTokenHash(
		context.Background(),
		newHash,
	)

	if err != nil {
		t.Fatalf(
			"rotated session not found: %v",
			err,
		)
	}
}

func TestIntegrationLogoutRevokesSession(t *testing.T) {
	env := setupIntegrationTest(t)

	registerIntegrationUser(t, env)

	_, refreshToken, err := env.service.Login(
		context.Background(),
		LoginRequest{
			Email:    "sami.integration@example.com",
			Password: "AtlasTest123!",
		},
		SessionMetadata{},
	)

	if err != nil {
		t.Fatalf(
			"Login() returned error: %v",
			err,
		)
	}

	if err := env.service.Logout(
		context.Background(),
		refreshToken,
	); err != nil {
		t.Fatalf(
			"Logout() returned error: %v",
			err,
		)
	}

	hash := HashRefreshToken(refreshToken)

	session, err := env.sessions.FindByTokenHash(
		context.Background(),
		hash,
	)

	if err != nil {
		t.Fatalf(
			"failed to retrieve revoked session: %v",
			err,
		)
	}

	if session.RevokedAt == nil {
		t.Fatal(
			"expected session to be revoked",
		)
	}

	_, _, err = env.service.Refresh(
		context.Background(),
		refreshToken,
	)

	if !errors.Is(err, ErrInvalidSession) {
		t.Fatalf(
			"expected revoked refresh token to be rejected, got %v",
			err,
		)
	}
}

func TestIntegrationDuplicateRegistrationRejected(t *testing.T) {
	env := setupIntegrationTest(t)

	req := RegisterRequest{
		Email:     "duplicate@example.com",
		Password:  "AtlasTest123!",
		FirstName: "Duplicate",
		LastName:  "User",
		Timezone:  "UTC",
	}

	_, err := env.service.Register(
		context.Background(),
		req,
	)

	if err != nil {
		t.Fatalf(
			"first registration failed: %v",
			err,
		)
	}

	_, err = env.service.Register(
		context.Background(),
		req,
	)

	if !errors.Is(err, ErrEmailInUse) {
		t.Fatalf(
			"expected ErrEmailInUse, got %v",
			err,
		)
	}
}
