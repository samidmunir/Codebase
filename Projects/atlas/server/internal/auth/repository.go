package auth

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrSessionNotFound = errors.New("session not found")

type Session struct {
	ID               uuid.UUID
	UserID           uuid.UUID
	RefreshTokenHash string
	UserAgent        *string
	IPAddress        *string
	ExpiresAt        time.Time
	CreatedAt        time.Time
	UpdatedAt        time.Time
	RevokedAt        *time.Time
}

type SessionRepository struct {
	db *pgxpool.Pool
}

func NewSessionRepository(
	db *pgxpool.Pool,
) *SessionRepository {
	return &SessionRepository{
		db: db,
	}
}

func (r *SessionRepository) Create(
	ctx context.Context,
	session *Session,
) (*Session, error) {
	query := `
		INSERT INTO sessions (
			user_id,
			refresh_token_hash,
			user_agent,
			ip_address,
			expires_at
		)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING
			id,
			user_id,
			refresh_token_hash,
			user_agent,
			ip_address::text,
			expires_at,
			created_at,
			updated_at,
			revoked_at
	`

	created := &Session{}

	err := r.db.QueryRow(
		ctx,
		query,
		session.UserID,
		session.RefreshTokenHash,
		session.UserAgent,
		session.IPAddress,
		session.ExpiresAt,
	).Scan(
		&created.ID,
		&created.UserID,
		&created.RefreshTokenHash,
		&created.UserAgent,
		&created.IPAddress,
		&created.ExpiresAt,
		&created.CreatedAt,
		&created.UpdatedAt,
		&created.RevokedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("create session: %w", err)
	}

	return created, nil
}

func (r *SessionRepository) FindByTokenHash(
	ctx context.Context,
	tokenHash string,
) (*Session, error) {
	query := `
		SELECT
			id,
			user_id,
			refresh_token_hash,
			user_agent,
			ip_address::text,
			expires_at,
			created_at,
			updated_at,
			revoked_at
		FROM sessions
		WHERE refresh_token_hash = $1
	`

	session := &Session{}

	err := r.db.QueryRow(
		ctx,
		query,
		tokenHash,
	).Scan(
		&session.ID,
		&session.UserID,
		&session.RefreshTokenHash,
		&session.UserAgent,
		&session.IPAddress,
		&session.ExpiresAt,
		&session.CreatedAt,
		&session.UpdatedAt,
		&session.RevokedAt,
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrSessionNotFound
	}

	if err != nil {
		return nil, fmt.Errorf(
			"find session by token hash: %w",
			err,
		)
	}

	return session, nil
}

func (r *SessionRepository) RotateToken(
	ctx context.Context,
	sessionID uuid.UUID,
	oldTokenHash string,
	newTokenHash string,
	newExpiresAt time.Time,
) error {
	query := `
		UPDATE sessions
SET
    refresh_token_hash = $1,
    expires_at = $2,
    updated_at = NOW()
WHERE id = $3
  AND refresh_token_hash = $4
  AND revoked_at IS NULL
	`

	result, err := r.db.Exec(
		ctx,
		query,
		newTokenHash,
		newExpiresAt,
		sessionID,
		oldTokenHash,
	)

	if err != nil {
		return fmt.Errorf("rotate session token: %w", err)
	}

	if result.RowsAffected() == 0 {
		return ErrSessionNotFound
	}

	return nil
}

func (r *SessionRepository) Revoke(
	ctx context.Context,
	sessionID uuid.UUID,
) error {
	query := `
		UPDATE sessions
		SET
			revoked_at = NOW(),
			updated_at = NOW()
		WHERE id = $1
		  AND revoked_at IS NULL
	`

	_, err := r.db.Exec(
		ctx,
		query,
		sessionID,
	)

	if err != nil {
		return fmt.Errorf("revoke session: %w", err)
	}

	return nil
}
