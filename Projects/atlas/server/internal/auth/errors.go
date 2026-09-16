package auth

import "errors"

var (
	ErrInvalidInput       = errors.New("invalid input")
	ErrEmailInUse         = errors.New("email already in use")
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrAccountDisabled    = errors.New("account disabled")
)
