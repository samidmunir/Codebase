package auth

import "errors"

var (
	ErrInvalidInput = errors.New("invalid input")
	ErrEmailInUse   = errors.New("email already in use")
)