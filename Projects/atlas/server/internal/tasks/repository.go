package tasks

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(
	db *pgxpool.Pool,
) *Repository {
	return &Repository{
		db: db,
	}
}

func (r *Repository) Create(
	ctx context.Context,
	task *Task,
) error {
	const query = `
		INSERT INTO tasks (
			user_id,
			project_id,
			title,
			description,
			status,
			priority,
			due_date,
			completed_at
		)
		VALUES (
			$1,
			$2,
			$3,
			$4,
			$5,
			$6,
			$7,
			$8
		)
		RETURNING
			id,
			created_at,
			updated_at
	`

	return r.db.QueryRow(
		ctx,
		query,
		task.UserID,
		task.ProjectID,
		task.Title,
		task.Description,
		task.Status,
		task.Priority,
		task.DueDate,
		task.CompletedAt,
	).Scan(
		&task.ID,
		&task.CreatedAt,
		&task.UpdatedAt,
	)
}

func (r *Repository) GetByID(
	ctx context.Context,
	userID string,
	taskID string,
) (*Task, error) {
	const query = `
		SELECT
			id,
			user_id,
			project_id,
			title,
			description,
			status,
			priority,
			due_date,
			completed_at,
			created_at,
			updated_at
		FROM tasks
		WHERE id = $1
		  AND user_id = $2
	`

	var task Task

	err := r.db.QueryRow(
		ctx,
		query,
		taskID,
		userID,
	).Scan(
		&task.ID,
		&task.UserID,
		&task.ProjectID,
		&task.Title,
		&task.Description,
		&task.Status,
		&task.Priority,
		&task.DueDate,
		&task.CompletedAt,
		&task.CreatedAt,
		&task.UpdatedAt,
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrTaskNotFound
	}

	if err != nil {
		return nil, err
	}

	return &task, nil
}

func (r *Repository) List(
	ctx context.Context,
	userID string,
	filter ListFilter,
) ([]Task, error) {
	query := `
		SELECT
			id,
			user_id,
			project_id,
			title,
			description,
			status,
			priority,
			due_date,
			completed_at,
			created_at,
			updated_at
		FROM tasks
		WHERE user_id = $1
	`

	args := []any{userID}
	argPosition := 2

	if filter.Status != nil {
		query += fmt.Sprintf(
			" AND status = $%d",
			argPosition,
		)

		args = append(
			args,
			*filter.Status,
		)

		argPosition++
	}

	if filter.Priority != nil {
		query += fmt.Sprintf(
			" AND priority = $%d",
			argPosition,
		)

		args = append(
			args,
			*filter.Priority,
		)

		argPosition++
	}

	if filter.ProjectID != nil {
		query += fmt.Sprintf(
			" AND project_id = $%d",
			argPosition,
		)

		args = append(
			args,
			*filter.ProjectID,
		)

		argPosition++
	}

	if filter.Search != "" {
		query += fmt.Sprintf(
			` AND (
				title ILIKE $%d
				OR COALESCE(description, '') ILIKE $%d
			)`,
			argPosition,
			argPosition,
		)

		args = append(
			args,
			"%"+filter.Search+"%",
		)

		argPosition++
	}

	if filter.Due != nil {
		switch *filter.Due {
		case DueOverdue:
			query += `
				AND due_date < CURRENT_DATE
				AND status <> 'completed'
			`

		case DueToday:
			query += `
				AND due_date = CURRENT_DATE
			`

		case DueUpcoming:
			query += `
				AND due_date > CURRENT_DATE
				AND status <> 'completed'
			`

		case DueNone:
			query += `
				AND due_date IS NULL
			`
		}
	}

	sortColumn := "updated_at"

	switch filter.Sort {
	case SortCreatedAt:
		sortColumn = "created_at"

	case SortTitle:
		sortColumn = "title"

	case SortDueDate:
		sortColumn = "due_date"

	case SortPriority:
		sortColumn = `
			CASE priority
				WHEN 'urgent' THEN 4
				WHEN 'high' THEN 3
				WHEN 'medium' THEN 2
				WHEN 'low' THEN 1
			END
		`
	}

	sortOrder := "DESC"

	if filter.Order == SortAscending {
		sortOrder = "ASC"
	}

	query += fmt.Sprintf(
		" ORDER BY %s %s",
		sortColumn,
		sortOrder,
	)

	rows, err := r.db.Query(
		ctx,
		query,
		args...,
	)
	if err != nil {
		return nil, err
	}

	defer rows.Close()

	tasks := make([]Task, 0)

	for rows.Next() {
		var task Task

		if err := rows.Scan(
			&task.ID,
			&task.UserID,
			&task.ProjectID,
			&task.Title,
			&task.Description,
			&task.Status,
			&task.Priority,
			&task.DueDate,
			&task.CompletedAt,
			&task.CreatedAt,
			&task.UpdatedAt,
		); err != nil {
			return nil, err
		}

		tasks = append(tasks, task)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return tasks, nil
}

func (r *Repository) Update(
	ctx context.Context,
	task *Task,
) error {
	const query = `
		UPDATE tasks
		SET
			project_id = $1,
			title = $2,
			description = $3,
			status = $4,
			priority = $5,
			due_date = $6,
			completed_at = $7,
			updated_at = NOW()
		WHERE id = $8
		  AND user_id = $9
		RETURNING updated_at
	`

	err := r.db.QueryRow(
		ctx,
		query,
		task.ProjectID,
		task.Title,
		task.Description,
		task.Status,
		task.Priority,
		task.DueDate,
		task.CompletedAt,
		task.ID,
		task.UserID,
	).Scan(
		&task.UpdatedAt,
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return ErrTaskNotFound
	}

	return err
}

func (r *Repository) Delete(
	ctx context.Context,
	userID string,
	taskID string,
) error {
	const query = `
		DELETE FROM tasks
		WHERE id = $1
		  AND user_id = $2
	`

	result, err := r.db.Exec(
		ctx,
		query,
		taskID,
		userID,
	)
	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return ErrTaskNotFound
	}

	return nil
}
