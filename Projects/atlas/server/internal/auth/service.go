package auth

import (
	"context"
	"errors"
	"strings"

	"github.com/google/uuid"
	"github.com/samidmunir/Codebase/projects/atlas/server/internal/users"
)

type Service struct {
	users  *users.Repository
	tokens *TokenManager
}

func NewService(users *users.Repository, tokens *TokenManager) *Service {
	return &Service{
		users:  users,
		tokens: tokens,
	}
}

func (s *Service) Register(
	ctx context.Context,
	req RegisterRequest,
) (*UserResponse, error) {
	email := strings.ToLower(strings.TrimSpace(req.Email))
	firstName := strings.TrimSpace(req.FirstName)
	lastName := strings.TrimSpace(req.LastName)
	timezone := strings.TrimSpace(req.Timezone)

	if email == "" ||
		req.Password == "" ||
		firstName == "" ||
		lastName == "" {
		return nil, ErrInvalidInput
	}

	if len(req.Password) < 8 {
		return nil, ErrInvalidInput
	}

	if timezone == "" {
		timezone = "UTC"
	}

	existingUser, err := s.users.FindByEmail(ctx, email)

	if err == nil && existingUser != nil {
		return nil, ErrEmailInUse
	}

	if err != nil && !errors.Is(err, users.ErrUserNotFound) {
		return nil, err
	}

	passwordHash, err := HashPassword(req.Password)
	if err != nil {
		return nil, err
	}

	user := &users.User{
		Email:        email,
		PasswordHash: passwordHash,
		FirstName:    firstName,
		LastName:     lastName,
		Timezone:     timezone,
	}

	createdUser, err := s.users.Create(ctx, user)
	if err != nil {
		if errors.Is(err, users.ErrEmailExists) {
			return nil, ErrEmailInUse
		}

		return nil, err
	}

	return &UserResponse{
		ID:         createdUser.ID,
		Email:      createdUser.Email,
		FirstName:  createdUser.FirstName,
		LastName:   createdUser.LastName,
		Timezone:   createdUser.Timezone,
		IsVerified: createdUser.IsVerified,
		CreatedAt:  createdUser.CreatedAt,
	}, nil
}

func (s *Service) Login(
	ctx context.Context,
	req LoginRequest,
) (*LoginResponse, error) {
	email := strings.ToLower(strings.TrimSpace(req.Email))

	if email == "" || req.Password == "" {
		return nil, ErrInvalidInput
	}

	user, err := s.users.FindByEmail(ctx, email)

	if errors.Is(err, users.ErrUserNotFound) {
		return nil, ErrInvalidCredentials
	}

	if err != nil {
		return nil, err
	}

	if !user.IsActive {
		return nil, ErrAccountDisabled
	}

	if err := CheckPassword(
		req.Password,
		user.PasswordHash,
	); err != nil {
		return nil, ErrInvalidCredentials
	}

	accessToken, err := s.tokens.GenerateAccessToken(
		user.ID,
		user.Email,
	)
	if err != nil {
		return nil, err
	}

	return &LoginResponse{
		Message:     "login successful",
		AccessToken: accessToken,
		TokenType:   "Bearer",
		ExpiresIn:   int(s.tokens.AccessTokenTTL().Seconds()),
		User: UserResponse{
			ID:         user.ID,
			Email:      user.Email,
			FirstName:  user.FirstName,
			LastName:   user.LastName,
			Timezone:   user.Timezone,
			IsVerified: user.IsVerified,
			CreatedAt:  user.CreatedAt,
		},
	}, nil
}

func (s *Service) Me(
	ctx context.Context,
	userID uuid.UUID,
) (*UserResponse, error) {
	user, err := s.users.FindByID(ctx, userID)

	if errors.Is(err, users.ErrUserNotFound) {
		return nil, ErrInvalidCredentials
	}

	if err != nil {
		return nil, err
	}

	if !user.IsActive {
		return nil, ErrAccountDisabled
	}

	return &UserResponse{
		ID:         user.ID,
		Email:      user.Email,
		FirstName:  user.FirstName,
		LastName:   user.LastName,
		Timezone:   user.Timezone,
		IsVerified: user.IsVerified,
		CreatedAt:  user.CreatedAt,
	}, nil
}
