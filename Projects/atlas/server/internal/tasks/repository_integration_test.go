//go:build integration

package tasks

import (
	"context"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"
)

func setupTestDB(
	t *testing.T,
) *pgxpool.Pool {
	t.Helper()

	databaseURL :=
		os.Getenv("TEST_DATABASE_URL")

	require.NotEmpty(
		t,
		databaseURL,
		"TEST_DATABASE_URL must be set",
	)

	require.Contains(
		t,
		strings.ToLower(databaseURL),
		"atlas_test",
		"integration tests must use atlas_test",
	)

	pool, err :=
		pgxpool.New(
			context.Background(),
			databaseURL,
		)

	require.NoError(t, err)

	err = pool.Ping(
		context.Background(),
	)
	require.NoError(t, err)

	t.Cleanup(func() {
		pool.Close()
	})

	return pool
}

func resetTestDB(
	t *testing.T,
	db *pgxpool.Pool,
) {
	t.Helper()

	_, err := db.Exec(
		context.Background(),
		`
		TRUNCATE TABLE
			tasks,
			projects,
			sessions,
			users
		CASCADE
		`,
	)

	require.NoError(t, err)
}

func createTestUser(
	t *testing.T,
	db *pgxpool.Pool,
	email string,
) string {
	t.Helper()

	var userID string

	err := db.QueryRow(
		context.Background(),
		`
		INSERT INTO users (
			email,
			password_hash,
			first_name,
			last_name
		)
		VALUES (
			$1,
			'test-password-hash',
			'Test',
			'User'
		)
		RETURNING id
		`,
		email,
	).Scan(&userID)

	require.NoError(t, err)

	return userID
}

func createTestProject(
	t *testing.T,
	db *pgxpool.Pool,
	userID string,
	name string,
) string {
	t.Helper()

	var projectID string

	err := db.QueryRow(
		context.Background(),
		`
		INSERT INTO projects (
			user_id,
			name
		)
		VALUES ($1, $2)
		RETURNING id
		`,
		userID,
		name,
	).Scan(&projectID)

	require.NoError(t, err)

	return projectID
}

func TestRepositoryCreateAndGetByID(
	t *testing.T,
) {
	db := setupTestDB(t)
	resetTestDB(t, db)

	ctx := context.Background()

	userID := createTestUser(
		t,
		db,
		"tasks-create@example.com",
	)

	repository :=
		NewRepository(db)

	description :=
		"Build the Tasks repository"

	dueDate := time.Date(
		2026,
		time.September,
		30,
		0,
		0,
		0,
		0,
		time.UTC,
	)

	task := &Task{
		UserID:      userID,
		Title:       "Implement Tasks repository",
		Description: &description,
		Status:      StatusTodo,
		Priority:    PriorityHigh,
		DueDate:     &dueDate,
	}

	err := repository.Create(
		ctx,
		task,
	)

	require.NoError(t, err)
	require.NotEmpty(t, task.ID)
	require.False(
		t,
		task.CreatedAt.IsZero(),
	)
	require.False(
		t,
		task.UpdatedAt.IsZero(),
	)

	found, err :=
		repository.GetByID(
			ctx,
			userID,
			task.ID,
		)

	require.NoError(t, err)

	require.Equal(
		t,
		task.ID,
		found.ID,
	)

	require.Equal(
		t,
		userID,
		found.UserID,
	)

	require.Equal(
		t,
		"Implement Tasks repository",
		found.Title,
	)

	require.Equal(
		t,
		StatusTodo,
		found.Status,
	)

	require.Equal(
		t,
		PriorityHigh,
		found.Priority,
	)

	require.NotNil(
		t,
		found.Description,
	)

	require.Equal(
		t,
		description,
		*found.Description,
	)

	require.NotNil(
		t,
		found.DueDate,
	)

	require.Equal(
		t,
		"2026-09-30",
		found.DueDate.Format(
			"2006-01-02",
		),
	)
}

func TestRepositoryCreateWithProject(
	t *testing.T,
) {
	db := setupTestDB(t)
	resetTestDB(t, db)

	ctx := context.Background()

	userID := createTestUser(
		t,
		db,
		"tasks-project@example.com",
	)

	projectID := createTestProject(
		t,
		db,
		userID,
		"Atlas",
	)

	repository :=
		NewRepository(db)

	task := &Task{
		UserID:    userID,
		ProjectID: &projectID,
		Title:     "Build Tasks domain",
		Status:    StatusInProgress,
		Priority:  PriorityHigh,
	}

	err := repository.Create(
		ctx,
		task,
	)

	require.NoError(t, err)

	found, err :=
		repository.GetByID(
			ctx,
			userID,
			task.ID,
		)

	require.NoError(t, err)

	require.NotNil(
		t,
		found.ProjectID,
	)

	require.Equal(
		t,
		projectID,
		*found.ProjectID,
	)
}

func TestRepositoryCreateStandaloneTask(
	t *testing.T,
) {
	db := setupTestDB(t)
	resetTestDB(t, db)

	ctx := context.Background()

	userID := createTestUser(
		t,
		db,
		"standalone@example.com",
	)

	repository :=
		NewRepository(db)

	task := &Task{
		UserID:   userID,
		Title:    "Buy groceries",
		Status:   StatusTodo,
		Priority: PriorityMedium,
	}

	err := repository.Create(
		ctx,
		task,
	)

	require.NoError(t, err)

	found, err :=
		repository.GetByID(
			ctx,
			userID,
			task.ID,
		)

	require.NoError(t, err)

	require.Nil(
		t,
		found.ProjectID,
	)
}

func TestRepositoryList(
	t *testing.T,
) {
	db := setupTestDB(t)
	resetTestDB(t, db)

	ctx := context.Background()

	userID := createTestUser(
		t,
		db,
		"tasks-list@example.com",
	)

	otherUserID := createTestUser(
		t,
		db,
		"tasks-list-other@example.com",
	)

	repository :=
		NewRepository(db)

	first := &Task{
		UserID:   userID,
		Title:    "First task",
		Status:   StatusTodo,
		Priority: PriorityMedium,
	}

	second := &Task{
		UserID:   userID,
		Title:    "Second task",
		Status:   StatusInProgress,
		Priority: PriorityHigh,
	}

	other := &Task{
		UserID:   otherUserID,
		Title:    "Other user's task",
		Status:   StatusTodo,
		Priority: PriorityLow,
	}

	require.NoError(
		t,
		repository.Create(ctx, first),
	)

	require.NoError(
		t,
		repository.Create(ctx, second),
	)

	require.NoError(
		t,
		repository.Create(ctx, other),
	)

	found, err :=
		repository.List(
			ctx,
			userID,
			ListFilter{},
		)

	require.NoError(t, err)
	require.Len(t, found, 2)

	for _, task := range found {
		require.Equal(
			t,
			userID,
			task.UserID,
		)
	}
}

func TestRepositoryListWithFilters(
	t *testing.T,
) {
	db := setupTestDB(t)
	resetTestDB(t, db)

	ctx := context.Background()

	userID := createTestUser(
		t,
		db,
		"tasks-filters@example.com",
	)

	otherUserID := createTestUser(
		t,
		db,
		"tasks-filters-other@example.com",
	)

	projectAID := createTestProject(
		t,
		db,
		userID,
		"Atlas",
	)

	projectBID := createTestProject(
		t,
		db,
		userID,
		"Production",
	)

	repository :=
		NewRepository(db)

	/*
		Use PostgreSQL CURRENT_DATE as the source
		of truth for our date-filter tests.

		This keeps DueToday / DueOverdue / DueUpcoming
		aligned with the same database clock used by
		the repository SQL.
	*/
	var today time.Time

	err := db.QueryRow(
		ctx,
		`SELECT CURRENT_DATE`,
	).Scan(&today)

	require.NoError(t, err)

	yesterday :=
		today.AddDate(0, 0, -1)

	tomorrow :=
		today.AddDate(0, 0, 1)

	descriptionA :=
		"Implement the Atlas backend"

	descriptionB :=
		"Document backend API behavior"

	descriptionC :=
		"Critical production repair"

	descriptionD :=
		"Completed personal work"

	taskA := &Task{
		UserID:      userID,
		ProjectID:   &projectAID,
		Title:       "Build Atlas API",
		Description: &descriptionA,
		Status:      StatusTodo,
		Priority:    PriorityHigh,
		DueDate:     &tomorrow,
	}

	taskB := &Task{
		UserID:      userID,
		ProjectID:   &projectAID,
		Title:       "Write documentation",
		Description: &descriptionB,
		Status:      StatusInProgress,
		Priority:    PriorityMedium,
		DueDate:     &today,
	}

	taskC := &Task{
		UserID:      userID,
		ProjectID:   &projectBID,
		Title:       "Fix urgent production issue",
		Description: &descriptionC,
		Status:      StatusTodo,
		Priority:    PriorityUrgent,
		DueDate:     &yesterday,
	}

	completedAt :=
		time.Now().UTC()

	taskD := &Task{
		UserID:      userID,
		Title:       "Personal standalone task",
		Description: &descriptionD,
		Status:      StatusCompleted,
		Priority:    PriorityLow,
		CompletedAt: &completedAt,
	}

	/*
		This task belongs to another user and must
		never appear in any results for userID.
	*/
	otherTask := &Task{
		UserID:   otherUserID,
		Title:    "Other user's Atlas task",
		Status:   StatusTodo,
		Priority: PriorityUrgent,
		DueDate:  &yesterday,
	}

	for _, task := range []*Task{
		taskA,
		taskB,
		taskC,
		taskD,
		otherTask,
	} {
		require.NoError(
			t,
			repository.Create(
				ctx,
				task,
			),
		)
	}

	t.Run(
		"filters by status",
		func(t *testing.T) {
			status := StatusTodo

			found, err :=
				repository.List(
					ctx,
					userID,
					ListFilter{
						Status: &status,
					},
				)

			require.NoError(t, err)
			require.Len(t, found, 2)

			for _, task := range found {
				require.Equal(
					t,
					StatusTodo,
					task.Status,
				)

				require.Equal(
					t,
					userID,
					task.UserID,
				)
			}
		},
	)

	t.Run(
		"filters by priority",
		func(t *testing.T) {
			priority :=
				PriorityUrgent

			found, err :=
				repository.List(
					ctx,
					userID,
					ListFilter{
						Priority: &priority,
					},
				)

			require.NoError(t, err)
			require.Len(t, found, 1)

			require.Equal(
				t,
				"Fix urgent production issue",
				found[0].Title,
			)
		},
	)

	t.Run(
		"filters by project",
		func(t *testing.T) {
			projectID := projectAID

			found, err :=
				repository.List(
					ctx,
					userID,
					ListFilter{
						ProjectID: &projectID,
					},
				)

			require.NoError(t, err)
			require.Len(t, found, 2)

			for _, task := range found {
				require.NotNil(
					t,
					task.ProjectID,
				)

				require.Equal(
					t,
					projectID,
					*task.ProjectID,
				)
			}
		},
	)

	t.Run(
		"searches title case insensitively",
		func(t *testing.T) {
			found, err :=
				repository.List(
					ctx,
					userID,
					ListFilter{
						Search: "atlas",
					},
				)

			require.NoError(t, err)
			require.Len(t, found, 1)

			require.Equal(
				t,
				"Build Atlas API",
				found[0].Title,
			)
		},
	)

	t.Run(
		"searches description case insensitively",
		func(t *testing.T) {
			found, err :=
				repository.List(
					ctx,
					userID,
					ListFilter{
						Search: "backend api",
					},
				)

			require.NoError(t, err)
			require.Len(t, found, 1)

			require.Equal(
				t,
				"Write documentation",
				found[0].Title,
			)
		},
	)

	t.Run(
		"filters overdue tasks",
		func(t *testing.T) {
			due := DueOverdue

			found, err :=
				repository.List(
					ctx,
					userID,
					ListFilter{
						Due: &due,
					},
				)

			require.NoError(t, err)
			require.Len(t, found, 1)

			require.Equal(
				t,
				"Fix urgent production issue",
				found[0].Title,
			)

			require.NotEqual(
				t,
				StatusCompleted,
				found[0].Status,
			)

			require.NotNil(
				t,
				found[0].DueDate,
			)
		},
	)

	t.Run(
		"filters tasks due today",
		func(t *testing.T) {
			due := DueToday

			found, err :=
				repository.List(
					ctx,
					userID,
					ListFilter{
						Due: &due,
					},
				)

			require.NoError(t, err)
			require.Len(t, found, 1)

			require.Equal(
				t,
				"Write documentation",
				found[0].Title,
			)
		},
	)

	t.Run(
		"filters upcoming tasks",
		func(t *testing.T) {
			due := DueUpcoming

			found, err :=
				repository.List(
					ctx,
					userID,
					ListFilter{
						Due: &due,
					},
				)

			require.NoError(t, err)
			require.Len(t, found, 1)

			require.Equal(
				t,
				"Build Atlas API",
				found[0].Title,
			)
		},
	)

	t.Run(
		"filters tasks without due date",
		func(t *testing.T) {
			due := DueNone

			found, err :=
				repository.List(
					ctx,
					userID,
					ListFilter{
						Due: &due,
					},
				)

			require.NoError(t, err)
			require.Len(t, found, 1)

			require.Equal(
				t,
				"Personal standalone task",
				found[0].Title,
			)

			require.Nil(
				t,
				found[0].DueDate,
			)
		},
	)

	t.Run(
		"combines filters",
		func(t *testing.T) {
			status := StatusTodo
			priority := PriorityHigh
			projectID := projectAID

			found, err :=
				repository.List(
					ctx,
					userID,
					ListFilter{
						Status:    &status,
						Priority:  &priority,
						ProjectID: &projectID,
						Search:    "atlas",
					},
				)

			require.NoError(t, err)
			require.Len(t, found, 1)

			require.Equal(
				t,
				"Build Atlas API",
				found[0].Title,
			)
		},
	)

	t.Run(
		"sorts by title ascending",
		func(t *testing.T) {
			found, err :=
				repository.List(
					ctx,
					userID,
					ListFilter{
						Sort:  SortTitle,
						Order: SortAscending,
					},
				)

			require.NoError(t, err)
			require.Len(t, found, 4)

			require.Equal(
				t,
				"Build Atlas API",
				found[0].Title,
			)

			require.Equal(
				t,
				"Fix urgent production issue",
				found[1].Title,
			)

			require.Equal(
				t,
				"Personal standalone task",
				found[2].Title,
			)

			require.Equal(
				t,
				"Write documentation",
				found[3].Title,
			)
		},
	)

	t.Run(
		"sorts by priority descending",
		func(t *testing.T) {
			found, err :=
				repository.List(
					ctx,
					userID,
					ListFilter{
						Sort:  SortPriority,
						Order: SortDescending,
					},
				)

			require.NoError(t, err)
			require.Len(t, found, 4)

			require.Equal(
				t,
				PriorityUrgent,
				found[0].Priority,
			)

			require.Equal(
				t,
				PriorityHigh,
				found[1].Priority,
			)

			require.Equal(
				t,
				PriorityMedium,
				found[2].Priority,
			)

			require.Equal(
				t,
				PriorityLow,
				found[3].Priority,
			)
		},
	)

	t.Run(
		"sorts by due date ascending",
		func(t *testing.T) {
			found, err :=
				repository.List(
					ctx,
					userID,
					ListFilter{
						Sort:  SortDueDate,
						Order: SortAscending,
					},
				)

			require.NoError(t, err)
			require.Len(t, found, 4)

			/*
				For this assertion to remain correct,
				Repository.List should use NULLS LAST
				when sorting due_date ascending.
			*/
			require.Equal(
				t,
				"Fix urgent production issue",
				found[0].Title,
			)

			require.Equal(
				t,
				"Write documentation",
				found[1].Title,
			)

			require.Equal(
				t,
				"Build Atlas API",
				found[2].Title,
			)

			require.Equal(
				t,
				"Personal standalone task",
				found[3].Title,
			)
		},
	)
}

func TestRepositoryUpdate(
	t *testing.T,
) {
	db := setupTestDB(t)
	resetTestDB(t, db)

	ctx := context.Background()

	userID := createTestUser(
		t,
		db,
		"tasks-update@example.com",
	)

	repository :=
		NewRepository(db)

	task := &Task{
		UserID:   userID,
		Title:    "Original task",
		Status:   StatusTodo,
		Priority: PriorityLow,
	}

	require.NoError(
		t,
		repository.Create(ctx, task),
	)

	description := "Updated description"

	task.Title = "Updated task"
	task.Description = &description
	task.Status = StatusCompleted
	task.Priority = PriorityUrgent

	completedAt := time.Now().UTC()
	task.CompletedAt = &completedAt

	err := repository.Update(
		ctx,
		task,
	)

	require.NoError(t, err)

	found, err :=
		repository.GetByID(
			ctx,
			userID,
			task.ID,
		)

	require.NoError(t, err)

	require.Equal(
		t,
		"Updated task",
		found.Title,
	)

	require.Equal(
		t,
		StatusCompleted,
		found.Status,
	)

	require.Equal(
		t,
		PriorityUrgent,
		found.Priority,
	)

	require.NotNil(
		t,
		found.CompletedAt,
	)
}

func TestRepositoryDelete(
	t *testing.T,
) {
	db := setupTestDB(t)
	resetTestDB(t, db)

	ctx := context.Background()

	userID := createTestUser(
		t,
		db,
		"tasks-delete@example.com",
	)

	repository :=
		NewRepository(db)

	task := &Task{
		UserID:   userID,
		Title:    "Delete me",
		Status:   StatusTodo,
		Priority: PriorityMedium,
	}

	require.NoError(
		t,
		repository.Create(ctx, task),
	)

	err := repository.Delete(
		ctx,
		userID,
		task.ID,
	)

	require.NoError(t, err)

	_, err = repository.GetByID(
		ctx,
		userID,
		task.ID,
	)

	require.ErrorIs(
		t,
		err,
		ErrTaskNotFound,
	)
}

func TestRepositoryCrossUserAccessReturnsNotFound(
	t *testing.T,
) {
	db := setupTestDB(t)
	resetTestDB(t, db)

	ctx := context.Background()

	ownerID := createTestUser(
		t,
		db,
		"task-owner@example.com",
	)

	otherUserID := createTestUser(
		t,
		db,
		"task-other@example.com",
	)

	repository :=
		NewRepository(db)

	task := &Task{
		UserID:   ownerID,
		Title:    "Private task",
		Status:   StatusTodo,
		Priority: PriorityMedium,
	}

	require.NoError(
		t,
		repository.Create(ctx, task),
	)

	_, err := repository.GetByID(
		ctx,
		otherUserID,
		task.ID,
	)

	require.ErrorIs(
		t,
		err,
		ErrTaskNotFound,
	)

	task.UserID = otherUserID
	task.Title = "Unauthorized update"

	err = repository.Update(
		ctx,
		task,
	)

	require.ErrorIs(
		t,
		err,
		ErrTaskNotFound,
	)

	err = repository.Delete(
		ctx,
		otherUserID,
		task.ID,
	)

	require.ErrorIs(
		t,
		err,
		ErrTaskNotFound,
	)

	// Confirm the owner's task still exists
	// and was never modified.
	found, err :=
		repository.GetByID(
			ctx,
			ownerID,
			task.ID,
		)

	require.NoError(t, err)

	require.Equal(
		t,
		"Private task",
		found.Title,
	)
}