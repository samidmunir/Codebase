package auth

import (
	"context"
	"errors"
	"strings"

	"github.com/samidmunir/Codebase/projects/atlas/server/internal/users"
)

type Service struct {
	users *users.Repository
}

func NewService(users *users.Repository) *Service {
	return &Service{
		users: users,
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