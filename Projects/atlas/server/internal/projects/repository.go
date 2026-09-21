package projects

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{
		db: db,
	}
}

func (r *Repository) Create(
	ctx context.Context,
	project *Project,
) error {
	const query = `
		INSERT INTO projects (
			user_id,
			name,
			description,
			status,
			priority,
			start_date,
			target_date
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING
			id,
			completed_at,
			archived_at,
			created_at,
			updated_at
	`

	err := r.db.QueryRow(
		ctx,
		query,
		project.UserID,
		project.Name,
		project.Description,
		project.Status,
		project.Priority,
		project.StartDate,
		project.TargetDate,
	).Scan(
		&project.ID,
		&project.CompletedAt,
		&project.ArchivedAt,
		&project.CreatedAt,
		&project.UpdatedAt,
	)

	if err != nil {
		return fmt.Errorf("create project: %w", err)
	}

	return nil
}

func (r *Repository) GetByID(
	ctx context.Context,
	userID string,
	projectID string,
) (*Project, error) {
	const query = `
		SELECT
			id,
			user_id,
			name,
			description,
			status,
			priority,
			start_date,
			target_date,
			completed_at,
			archived_at,
			created_at,
			updated_at
		FROM projects
		WHERE id = $1
		  AND user_id = $2
	`

	var project Project

	err := r.db.QueryRow(
		ctx,
		query,
		projectID,
		userID,
	).Scan(
		&project.ID,
		&project.UserID,
		&project.Name,
		&project.Description,
		&project.Status,
		&project.Priority,
		&project.StartDate,
		&project.TargetDate,
		&project.CompletedAt,
		&project.ArchivedAt,
		&project.CreatedAt,
		&project.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrProjectNotFound
		}

		return nil, fmt.Errorf("get project by id: %w", err)
	}

	return &project, nil
}

func (r *Repository) List(
	ctx context.Context,
	userID string,
) ([]Project, error) {
	const query = `
		SELECT
			id,
			user_id,
			name,
			description,
			status,
			priority,
			start_date,
			target_date,
			completed_at,
			archived_at,
			created_at,
			updated_at
		FROM projects
		WHERE user_id = $1
		  AND archived_at IS NULL
		ORDER BY updated_at DESC
	`

	rows, err := r.db.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("list projects: %w", err)
	}
	defer rows.Close()

	projects := make([]Project, 0)

	for rows.Next() {
		var project Project

		if err := rows.Scan(
			&project.ID,
			&project.UserID,
			&project.Name,
			&project.Description,
			&project.Status,
			&project.Priority,
			&project.StartDate,
			&project.TargetDate,
			&project.CompletedAt,
			&project.ArchivedAt,
			&project.CreatedAt,
			&project.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan project: %w", err)
		}

		projects = append(projects, project)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate projects: %w", err)
	}

	return projects, nil
}

func (r *Repository) Update(
	ctx context.Context,
	project *Project,
) error {
	const query = `
		UPDATE projects
		SET
			name = $1,
			description = $2,
			status = $3,
			priority = $4,
			start_date = $5,
			target_date = $6,
			completed_at = $7,
			updated_at = NOW()
		WHERE id = $8
		  AND user_id = $9
		RETURNING updated_at
	`

	err := r.db.QueryRow(
		ctx,
		query,
		project.Name,
		project.Description,
		project.Status,
		project.Priority,
		project.StartDate,
		project.TargetDate,
		project.CompletedAt,
		project.ID,
		project.UserID,
	).Scan(
		&project.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrProjectNotFound
		}

		return fmt.Errorf("update project: %w", err)
	}

	return nil
}

func (r *Repository) Archive(
	ctx context.Context,
	userID string,
	projectID string,
) error {
	const query = `
		UPDATE projects
		SET
			archived_at = NOW(),
			updated_at = NOW()
		WHERE id = $1
		  AND user_id = $2
		  AND archived_at IS NULL
		RETURNING archived_at
	`

	var archivedAt time.Time

	err := r.db.QueryRow(
		ctx,
		query,
		projectID,
		userID,
	).Scan(&archivedAt)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrProjectNotFound
		}

		return fmt.Errorf("archive project: %w", err)
	}

	return nil
}

func (r *Repository) Restore(
	ctx context.Context,
	userID string,
	projectID string,
) error {
	const query = `
		UPDATE projects
		SET
			archived_at = NULL,
			updated_at = NOW()
		WHERE id = $1
		  AND user_id = $2
		  AND archived_at IS NOT NULL
		RETURNING updated_at
	`

	var updatedAt time.Time

	err := r.db.QueryRow(
		ctx,
		query,
		projectID,
		userID,
	).Scan(&updatedAt)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrProjectNotFound
		}

		return fmt.Errorf("restore project: %w", err)
	}

	return nil
}
