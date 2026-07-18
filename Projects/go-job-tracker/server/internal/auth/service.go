package auth

import (
	"context"
	"crypto/subtle"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/samidmunir/go-job-tracker/server/internal/user"
	"go.mongodb.org/mongo-driver/v2/bson"
)

var (
	ErrInvalidCredentials = errors.New("invalid email or password")
	ErrInvalidSession     = errors.New("invalid or expired session")
	ErrInvalidToken       = errors.New("invalid or expired token")
)

type ClientMetadata struct {
	UserAgent string
	IPAddress string
}

type Service struct {
	users    *user.Repository
	sessions *Repository
	jwt      *JWTManager
}

func NewService(
	users *user.Repository,
	sessions *Repository,
	jwtManager *JWTManager,
) *Service {
	return &Service{
		users:    users,
		sessions: sessions,
		jwt:      jwtManager,
	}
}

func (s *Service) Register(
	ctx context.Context,
	request RegisterRequest,
	metadata ClientMetadata,
) (*AuthResult, string, error) {
	if err := ValidatePassword(request.Password); err != nil {
		return nil, "", err
	}

	passwordHash, err := HashPassword(request.Password)
	if err != nil {
		return nil, "", fmt.Errorf("hash password: %w", err)
	}

	now := time.Now().UTC()

	newUser := &user.User{
		FirstName:    strings.TrimSpace(request.FirstName),
		LastName:     strings.TrimSpace(request.LastName),
		DisplayName: strings.TrimSpace(
			request.FirstName + " " + request.LastName,
		),
		Email:        strings.ToLower(strings.TrimSpace(request.Email)),
		PasswordHash: passwordHash,

		Preferences: user.Preferences{
			Theme:           "dark",
			Timezone:        "UTC",
			Locale:          "en-US",
			DefaultCurrency: "USD",
		},
		JobSearchProfile: user.JobSearchPreferences{
			WeeklyApplicationGoal: 10,
			TargetRoles:           []string{},
			PreferredLocations:    []string{},
			RemotePreference:      "flexible",
		},

		TokenVersion:  1,
		EmailVerified: false,
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	if err := s.users.Create(ctx, newUser); err != nil {
		return nil, "", err
	}

	return s.createAuthenticatedSession(
		ctx,
		newUser,
		metadata,
	)
}

func (s *Service) Login(
	ctx context.Context,
	request LoginRequest,
	metadata ClientMetadata,
) (*AuthResult, string, error) {
	foundUser, err := s.users.FindByEmail(ctx, request.Email)
	if err != nil {
		if errors.Is(err, user.ErrNotFound) {
			return nil, "", ErrInvalidCredentials
		}

		return nil, "", err
	}

	if !VerifyPassword(request.Password, foundUser.PasswordHash) {
		return nil, "", ErrInvalidCredentials
	}

	now := time.Now().UTC()
	foundUser.LastLoginAt = &now

	if err := s.users.UpdateLastLogin(
		ctx,
		foundUser.ID,
		now,
	); err != nil {
		return nil, "", err
	}

	return s.createAuthenticatedSession(
		ctx,
		foundUser,
		metadata,
	)
}

func (s *Service) Refresh(
	ctx context.Context,
	refreshToken string,
	metadata ClientMetadata,
) (*AuthResult, string, error) {
	claims, err := s.jwt.ParseRefreshToken(refreshToken)
	if err != nil {
		return nil, "", ErrInvalidToken
	}

	userID, err := bson.ObjectIDFromHex(claims.Subject)
	if err != nil {
		return nil, "", ErrInvalidToken
	}

	session, err := s.sessions.FindActiveByJTI(
		ctx,
		claims.ID,
	)
	if err != nil {
		return nil, "", ErrInvalidSession
	}

	providedHash := HashToken(refreshToken)

	if subtle.ConstantTimeCompare(
		[]byte(providedHash),
		[]byte(session.TokenHash),
	) != 1 {
		return nil, "", ErrInvalidSession
	}

	foundUser, err := s.users.FindByID(ctx, userID)
	if err != nil {
		return nil, "", ErrInvalidSession
	}

	if claims.TokenVersion != foundUser.TokenVersion ||
		session.TokenVersion != foundUser.TokenVersion {
		return nil, "", ErrInvalidSession
	}

	if err := s.sessions.Revoke(ctx, claims.ID); err != nil {
		return nil, "", err
	}

	return s.createAuthenticatedSession(
		ctx,
		foundUser,
		metadata,
	)
}

func (s *Service) Logout(
	ctx context.Context,
	refreshToken string,
) error {
	if strings.TrimSpace(refreshToken) == "" {
		return nil
	}

	claims, err := s.jwt.ParseRefreshToken(refreshToken)
	if err != nil {
		return nil
	}

	err = s.sessions.Revoke(ctx, claims.ID)
	if errors.Is(err, ErrSessionNotFound) {
		return nil
	}

	return err
}

func (s *Service) GetCurrentUser(
	ctx context.Context,
	userID bson.ObjectID,
) (*user.User, error) {
	return s.users.FindByID(ctx, userID)
}

func (s *Service) createAuthenticatedSession(
	ctx context.Context,
	authenticatedUser *user.User,
	metadata ClientMetadata,
) (*AuthResult, string, error) {
	tokenPair, err := s.jwt.GenerateTokenPair(
		authenticatedUser.ID,
		authenticatedUser.Email,
		authenticatedUser.TokenVersion,
	)
	if err != nil {
		return nil, "", err
	}

	session := &Session{
		UserID:       authenticatedUser.ID,
		JTI:          tokenPair.RefreshJTI,
		TokenHash:    HashToken(tokenPair.RefreshToken),
		TokenVersion: authenticatedUser.TokenVersion,
		UserAgent:    metadata.UserAgent,
		IPAddress:    metadata.IPAddress,
		ExpiresAt:    tokenPair.RefreshExpiresAt,
		CreatedAt:    time.Now().UTC(),
	}

	if err := s.sessions.Create(ctx, session); err != nil {
		return nil, "", err
	}

	result := &AuthResult{
		AccessToken: tokenPair.AccessToken,
		TokenType:   "Bearer",
		ExpiresAt:   tokenPair.AccessExpiresAt,
		User:        *authenticatedUser,
	}

	return result, tokenPair.RefreshToken, nil
}