//go:build integration

package projects

import (
	"context"
	"os"
	"strings"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
)

func setupTestDB(t *testing.T) *pgxpool.Pool {
	t.Helper()

	databaseURL := os.Getenv("TEST_DATABASE_URL")

	if databaseURL == "" {
		t.Fatal("TEST_DATABASE_URL is not set")
	}

	if !strings.Contains(databaseURL, "atlas_test") {
		t.Fatal("refusing to run integration tests against a non-test database")
	}

	pool, err := pgxpool.New(context.Background(), databaseURL)
	if err != nil {
		t.Fatalf("create test database pool: %v", err)
	}

	if err := pool.Ping(context.Background()); err != nil {
		pool.Close()
		t.Fatalf("ping test database: %v", err)
	}

	t.Cleanup(func() {
		pool.Close()
	})

	return pool
}

func createTestUser(
	t *testing.T,
	ctx context.Context,
	db *pgxpool.Pool,
	email string,
) string {
	t.Helper()

	var userID string

	err := db.QueryRow(
		ctx,
		`
			INSERT INTO users (
				email,
				password_hash,
				first_name,
				last_name,
				timezone
			)
			VALUES ($1, $2, $3, $4, $5)
			RETURNING id
		`,
		email,
		"repository-test-password-hash",
		"Project",
		"Tester",
		"UTC",
	).Scan(&userID)

	if err != nil {
		t.Fatalf("create test user: %v", err)
	}

	return userID
}

func cleanupTestData(
	t *testing.T,
	ctx context.Context,
	db *pgxpool.Pool,
) {
	t.Helper()

	_, err := db.Exec(
		ctx,
		`TRUNCATE TABLE projects, sessions, users CASCADE`,
	)
	if err != nil {
		t.Fatalf("clean test database: %v", err)
	}
}

func TestRepositoryCreate(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()

	cleanupTestData(t, ctx, db)

	repo := NewRepository(db)

	userID := createTestUser(
		t,
		ctx,
		db,
		"project-create@example.com",
	)

	description := "Build the Atlas personal operating system."

	project := &Project{
		UserID:      userID,
		Name:        "Build Atlas",
		Description: &description,
		Status:      StatusActive,
		Priority:    PriorityHigh,
	}

	err := repo.Create(ctx, project)
	if err != nil {
		t.Fatalf("Create() error = %v", err)
	}

	if project.ID == "" {
		t.Fatal("expected project ID to be populated")
	}

	if project.CreatedAt.IsZero() {
		t.Fatal("expected CreatedAt to be populated")
	}

	if project.UpdatedAt.IsZero() {
		t.Fatal("expected UpdatedAt to be populated")
	}
}

func TestRepositoryGetByID(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()

	cleanupTestData(t, ctx, db)

	repo := NewRepository(db)

	userID := createTestUser(
		t,
		ctx,
		db,
		"project-get@example.com",
	)

	project := &Project{
		UserID:   userID,
		Name:     "Atlas",
		Status:   StatusPlanning,
		Priority: PriorityMedium,
	}

	if err := repo.Create(ctx, project); err != nil {
		t.Fatalf("Create() error = %v", err)
	}

	found, err := repo.GetByID(ctx, userID, project.ID)
	if err != nil {
		t.Fatalf("GetByID() error = %v", err)
	}

	if found.ID != project.ID {
		t.Fatalf(
			"expected project ID %q, got %q",
			project.ID,
			found.ID,
		)
	}

	if found.Name != "Atlas" {
		t.Fatalf(
			"expected project name %q, got %q",
			"Atlas",
			found.Name,
		)
	}
}

func TestRepositoryGetByIDRejectsOtherUser(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()

	cleanupTestData(t, ctx, db)

	repo := NewRepository(db)

	ownerID := createTestUser(
		t,
		ctx,
		db,
		"owner@example.com",
	)

	otherUserID := createTestUser(
		t,
		ctx,
		db,
		"other@example.com",
	)

	project := &Project{
		UserID:   ownerID,
		Name:     "Private Project",
		Status:   StatusActive,
		Priority: PriorityHigh,
	}

	if err := repo.Create(ctx, project); err != nil {
		t.Fatalf("Create() error = %v", err)
	}

	_, err := repo.GetByID(
		ctx,
		otherUserID,
		project.ID,
	)

	if err != ErrProjectNotFound {
		t.Fatalf(
			"expected ErrProjectNotFound, got %v",
			err,
		)
	}
}

func TestRepositoryList(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()

	cleanupTestData(t, ctx, db)

	repo := NewRepository(db)

	userA := createTestUser(
		t,
		ctx,
		db,
		"user-a@example.com",
	)

	userB := createTestUser(
		t,
		ctx,
		db,
		"user-b@example.com",
	)

	projectA := &Project{
		UserID:   userA,
		Name:     "Project A",
		Status:   StatusActive,
		Priority: PriorityHigh,
	}

	projectB := &Project{
		UserID:   userB,
		Name:     "Project B",
		Status:   StatusActive,
		Priority: PriorityMedium,
	}

	if err := repo.Create(ctx, projectA); err != nil {
		t.Fatalf("create Project A: %v", err)
	}

	if err := repo.Create(ctx, projectB); err != nil {
		t.Fatalf("create Project B: %v", err)
	}

	results, err := repo.List(
		ctx,
		userA,
		ListFilter{},
	)
	if err != nil {
		t.Fatalf("List() error = %v", err)
	}

	if len(results) != 1 {
		t.Fatalf(
			"expected 1 project, got %d",
			len(results),
		)
	}

	if results[0].ID != projectA.ID {
		t.Fatalf(
			"expected project %q, got %q",
			projectA.ID,
			results[0].ID,
		)
	}
}

func TestRepositoryUpdate(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()

	cleanupTestData(t, ctx, db)

	repo := NewRepository(db)

	userID := createTestUser(
		t,
		ctx,
		db,
		"project-update@example.com",
	)

	project := &Project{
		UserID:   userID,
		Name:     "Atlas v1",
		Status:   StatusPlanning,
		Priority: PriorityMedium,
	}

	if err := repo.Create(ctx, project); err != nil {
		t.Fatalf("Create() error = %v", err)
	}

	project.Name = "Atlas"
	project.Status = StatusActive
	project.Priority = PriorityHigh

	if err := repo.Update(ctx, project); err != nil {
		t.Fatalf("Update() error = %v", err)
	}

	found, err := repo.GetByID(ctx, userID, project.ID)
	if err != nil {
		t.Fatalf("GetByID() error = %v", err)
	}

	if found.Name != "Atlas" {
		t.Fatalf(
			"expected updated name %q, got %q",
			"Atlas",
			found.Name,
		)
	}

	if found.Status != StatusActive {
		t.Fatalf(
			"expected status %q, got %q",
			StatusActive,
			found.Status,
		)
	}

	if found.Priority != PriorityHigh {
		t.Fatalf(
			"expected priority %q, got %q",
			PriorityHigh,
			found.Priority,
		)
	}
}

func TestRepositoryArchive(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()

	cleanupTestData(t, ctx, db)

	repo := NewRepository(db)

	userID := createTestUser(
		t,
		ctx,
		db,
		"project-archive@example.com",
	)

	project := &Project{
		UserID:   userID,
		Name:     "Archived Project",
		Status:   StatusCompleted,
		Priority: PriorityLow,
	}

	if err := repo.Create(ctx, project); err != nil {
		t.Fatalf("Create() error = %v", err)
	}

	if err := repo.Archive(
		ctx,
		userID,
		project.ID,
	); err != nil {
		t.Fatalf("Archive() error = %v", err)
	}

	found, err := repo.GetByID(ctx, userID, project.ID)
	if err != nil {
		t.Fatalf("GetByID() error = %v", err)
	}

	if found.ArchivedAt == nil {
		t.Fatal("expected ArchivedAt to be populated")
	}

	results, err := repo.List(
		ctx,
		userID,
		ListFilter{},
	)
	if err != nil {
		t.Fatalf("List() error = %v", err)
	}

	if len(results) != 0 {
		t.Fatalf(
			"expected archived project to be excluded, got %d projects",
			len(results),
		)
	}
}

func TestRepositoryRestore(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()

	cleanupTestData(t, ctx, db)

	repo := NewRepository(db)

	userID := createTestUser(
		t,
		ctx,
		db,
		"project-restore@example.com",
	)

	project := &Project{
		UserID:   userID,
		Name:     "Restorable Project",
		Status:   StatusOnHold,
		Priority: PriorityMedium,
	}

	if err := repo.Create(ctx, project); err != nil {
		t.Fatalf("Create() error = %v", err)
	}

	if err := repo.Archive(
		ctx,
		userID,
		project.ID,
	); err != nil {
		t.Fatalf("Archive() error = %v", err)
	}

	if err := repo.Restore(
		ctx,
		userID,
		project.ID,
	); err != nil {
		t.Fatalf("Restore() error = %v", err)
	}

	found, err := repo.GetByID(ctx, userID, project.ID)
	if err != nil {
		t.Fatalf("GetByID() error = %v", err)
	}

	if found.ArchivedAt != nil {
		t.Fatal("expected ArchivedAt to be nil after restore")
	}

	results, err := repo.List(
		ctx,
		userID,
		ListFilter{},
	)
	if err != nil {
		t.Fatalf("List() error = %v", err)
	}

	if len(results) != 1 {
		t.Fatalf(
			"expected restored project in List(), got %d",
			len(results),
		)
	}
}

func TestRepositoryArchiveRejectsOtherUser(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()

	cleanupTestData(t, ctx, db)

	repo := NewRepository(db)

	ownerID := createTestUser(
		t,
		ctx,
		db,
		"archive-owner@example.com",
	)

	otherUserID := createTestUser(
		t,
		ctx,
		db,
		"archive-other@example.com",
	)

	project := &Project{
		UserID:   ownerID,
		Name:     "Owner Project",
		Status:   StatusActive,
		Priority: PriorityHigh,
	}

	if err := repo.Create(ctx, project); err != nil {
		t.Fatalf("Create() error = %v", err)
	}

	err := repo.Archive(
		ctx,
		otherUserID,
		project.ID,
	)

	if err != ErrProjectNotFound {
		t.Fatalf(
			"expected ErrProjectNotFound, got %v",
			err,
		)
	}

	found, err := repo.GetByID(
		ctx,
		ownerID,
		project.ID,
	)
	if err != nil {
		t.Fatalf("GetByID() error = %v", err)
	}

	if found.ArchivedAt != nil {
		t.Fatal("project was archived by another user")
	}
}

func TestRepositoryListWithFilters(t *testing.T) {
	db := setupTestDB(t)
	ctx := context.Background()

	cleanupTestData(t, ctx, db)

	repository := NewRepository(db)

	userID := createTestUser(
		t,
		ctx,
		db,
		"project-list-filters@example.com",
	)

	active := StatusActive
	high := PriorityHigh

	projects := []*Project{
		{
			UserID:   userID,
			Name:     "Atlas Backend",
			Status:   StatusActive,
			Priority: PriorityHigh,
		},
		{
			UserID:   userID,
			Name:     "Atlas UI",
			Status:   StatusPlanning,
			Priority: PriorityHigh,
		},
		{
			UserID:   userID,
			Name:     "Other Project",
			Status:   StatusActive,
			Priority: PriorityLow,
		},
	}

	for _, project := range projects {
		if err := repository.Create(
			ctx,
			project,
		); err != nil {
			t.Fatalf(
				"Create() error = %v",
				err,
			)
		}
	}

	result, err := repository.List(
		ctx,
		userID,
		ListFilter{
			Status:   &active,
			Priority: &high,
			Search:   "atlas",
			Sort:     SortName,
			Order:    SortAscending,
		},
	)

	if err != nil {
		t.Fatalf(
			"List() error = %v",
			err,
		)
	}

	if len(result) != 1 {
		t.Fatalf(
			"expected 1 project, got %d",
			len(result),
		)
	}

	if result[0].Name != "Atlas Backend" {
		t.Fatalf(
			"expected Atlas Backend, got %q",
			result[0].Name,
		)
	}
}
