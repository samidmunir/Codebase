package auth

import (
	"golang.org/x/crypto/bcrypt"
)

const bcryptCost = 12;

func HashPassword(password string) (string, error) {
	hashedPassword, err := bcrypt.GenerateFromPassword(
		[]byte(password),
		bcryptCost,
	);
	if err != nil {
		return "", err;
	}

	return string(hashedPassword), nil;
}

func VerifyPassword(password string, passwordHash string) bool {
	err := bcrypt.CompareHashAndPassword(
		[]byte(passwordHash),
		[]byte(password),
	);

	return err == nil;
}