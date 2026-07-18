package auth

import (
	"time"

	"github.com/samidmunir/go-job-tracker/server/internal/user"
)

type AuthResult struct {
	AccessToken string    `json:"accessToken"`
	TokenType   string    `json:"tokenType"`
	ExpiresAt   time.Time `json:"expiresAt"`
	User        user.User `json:"user"`
}
