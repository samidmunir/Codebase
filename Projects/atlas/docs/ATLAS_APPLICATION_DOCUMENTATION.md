# Atlas --- Complete Application Documentation

**Application:** Atlas\
**Purpose:** Personal Life Command Center / Personal Operating System\
**Current state:** Milestones #1--#4 complete\
**Updated:** September 25, 2026

---

## 1. Product Overview

Atlas is a full-stack personal productivity platform intended to become
a centralized personal operating system. Its long-term scope includes
Projects, Tasks, Goals, Habits, Calendar, Analytics, and eventually
AI-assisted workflows.

Development follows an incremental milestone process: define the domain,
design persistence and API contracts, implement backend layers, test
them, integrate the frontend, polish the UX, run regression, and only
then move to the next domain.

At the end of Milestone #4, Atlas provides secure authentication,
user-owned Projects, user-owned Tasks, optional Task-to-Project
relationships, search/filter/sort capabilities, lifecycle workflows,
responsive interfaces, and backend unit/integration coverage.

## 2. Technology Stack

### Frontend

- React
- TypeScript
- Vite
- React Router
- Feature-oriented CSS
- REST/JSON API integration

### Backend

- Go
- Standard `net/http`
- `pgx` for PostgreSQL
- JWT access tokens
- bcrypt password hashing
- Opaque rotating refresh tokens
- `golang-migrate`

### Database

- PostgreSQL 17
- UUID primary keys
- Versioned SQL migrations
- Dedicated `atlas_test` integration-test database

## 3. Repository Architecture

```text
atlas/
├── client/
│   └── src/
│       ├── api/
│       ├── components/
│       ├── features/
│       │   ├── auth/
│       │   ├── projects/
│       │   └── tasks/
│       ├── layouts/
│       └── ...
├── server/
│   ├── cmd/
│   └── internal/
│       ├── auth/
│       ├── users/
│       ├── projects/
│       └── tasks/
├── migrations/
├── docs/
├── scripts/
└── Makefile
```

Go module:

```text
github.com/samidmunir/Codebase/projects/atlas/server
```

Atlas lives inside a larger Git repository rather than maintaining a
nested `.git`.

## 4. Git Workflow

Primary branches used during development:

```text
main
└── atlas/develop
    └── atlas/feature/tasks
```

Feature work is developed separately, validated, and merged into
`atlas/develop` after regression.

## 5. Milestone Status

Milestone Scope Status

---

#1 Foundation Complete
#2 Authentication Complete
#3 Projects Complete
#4 Tasks Complete

---

# Milestone #1 --- Foundation

## 6. Backend Foundation

System endpoints:

```http
GET /api/v1/health
GET /api/v1/ready
```

`/health` verifies that the API process is alive. `/ready` additionally
supports readiness verification such as PostgreSQL availability.

Foundation work includes:

- Environment-based configuration
- PostgreSQL connection pooling
- Database readiness checks
- Credential-aware CORS
- Configured frontend origin
- Graceful server shutdown
- REST/JSON API conventions

Architecture:

```text
React Client
     │
     │ HTTP / JSON
     ▼
Go REST API
     │
     │ pgx
     ▼
PostgreSQL
```

## 7. Frontend Foundation

The frontend was scaffolded with React + TypeScript + Vite and includes:

- React Router
- API base configuration
- Backend connectivity
- API status UI
- Shared authenticated application layout
- Nested feature routes

---

# Milestone #2 --- Authentication

## 8. Authentication API

```http
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
GET  /api/v1/auth/me
```

## 9. Users

Core users schema:

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    timezone VARCHAR(100) NOT NULL DEFAULT 'UTC',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
```

Passwords are persisted only as bcrypt hashes.

## 10. Sessions

Core sessions schema:

```sql
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash TEXT NOT NULL UNIQUE,
    user_agent TEXT,
    ip_address INET,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
```

Multiple sessions per user are supported conceptually.

## 11. Token Model

### Access token

- JWT
- Short-lived, approximately 15 minutes
- Kept in frontend memory
- Not persisted in localStorage
- Sent as a Bearer token

```http
Authorization: Bearer <access-token>
```

### Refresh token

- Opaque token
- Approximately 30-day lifetime
- Stored in an HttpOnly cookie
- Never exposed to React
- Only its hash is persisted
- Rotated during refresh
- Revocable through the session record

```text
Raw Refresh Token
       │
       ├── HttpOnly cookie → browser
       └── hash → PostgreSQL
```

## 12. Refresh Rotation

```text
Refresh request
      │
      ▼
Validate token/session
      │
      ▼
Invalidate/replace old refresh credential
      │
      ▼
New access token + new refresh token
```

Replay of an already-rotated credential is rejected. Logout revokes the
relevant session.

## 13. Auth Backend Structure

```text
server/internal/auth/
├── context.go
├── errors.go
├── handler.go
├── middleware.go
├── middleware_test.go
├── models.go
├── password.go
├── password_test.go
├── repository.go
├── service.go
├── service_integration_test.go
├── token.go
└── token_test.go

server/internal/users/
├── model.go
└── repository.go
```

Layering:

```text
Handler → Service → Repository → PostgreSQL
```

Authentication middleware validates the access token and stores the
authenticated user ID in request context.

## 14. Auth Frontend

The client includes:

- `AuthContext`
- `AuthProvider`
- `useAuth`
- Login
- Registration
- Protected/public routing
- Session restoration
- In-memory access token management
- Single-flight refresh management
- Authenticated API client
- 401 → refresh → retry behavior

The low-level `apiRequest()` remains separate from
`authenticatedApiRequest()` so refresh itself does not depend
recursively on the authenticated client.

Conceptual flow:

```text
Request
  │
  ▼
Access token?
 ├── yes ─────────────┐
 └── no → refresh() ──┤
                      ▼
               Attach Bearer token
                      │
                      ▼
                  Send request
                      │
                 401 received?
                  │       │
                 no      yes
                  │       └→ refresh → retry once
                  ▼
                result
```

---

# Milestone #3 --- Projects

## 15. Project Purpose

A Project represents a meaningful body of work or outcome, rather than
an individual action. Tasks can optionally belong to Projects.

## 16. Project Model

```text
Project
├── id UUID
├── userId UUID
├── name string
├── description nullable string
├── status planning | active | on_hold | completed
├── priority low | medium | high | urgent
├── startDate nullable date
├── targetDate nullable date
├── completedAt nullable timestamp
├── archivedAt nullable timestamp
├── createdAt timestamp
└── updatedAt timestamp
```

Defaults:

```text
status   = planning
priority = medium
```

Rules include:

- Name is required and trimmed.
- Name maximum: 150 characters.
- Description maximum: 5000 characters.
- Start/target dates are optional.
- `targetDate >= startDate`.
- Calendar dates use PostgreSQL `DATE`.
- Event timestamps use `TIMESTAMPTZ`.

## 17. Project Lifecycle

When status becomes `completed`:

```text
completedAt = now
```

When a completed Project is reopened:

```text
completedAt = null
```

Archival is separate from status. Atlas therefore preserves lifecycle
meaning while allowing old Projects to leave the normal active
workspace.

Projects use explicit archive/restore actions rather than making DELETE
secretly mean archive.

## 18. Project Ownership

Every Project belongs to one authenticated user.

Ownership is derived from JWT/request context, never from a
client-supplied `userId`.

Repository access is scoped conceptually as:

```sql
WHERE id = $projectID
  AND user_id = $authenticatedUserID
```

Cross-user access returns not-found behavior.

## 19. Project API

```http
POST /api/v1/projects
GET  /api/v1/projects
GET  /api/v1/projects/{id}
PATCH /api/v1/projects/{id}
POST /api/v1/projects/{id}/archive
POST /api/v1/projects/{id}/restore
```

Project listing supports:

- status
- priority
- archived
- search
- sort
- order

Default behavior excludes archived Projects and sorts by
`updated_at DESC`.

## 20. Project Backend

```text
server/internal/projects/
├── errors.go
├── handler.go
├── handler_test.go
├── model.go
├── repository.go
├── repository_integration_test.go
├── service.go
└── service_test.go
```

## 21. Project Frontend

Implemented functionality includes:

- Projects page
- Project cards
- Search
- Filters
- Sorting
- Loading/error/empty states
- Create Project modal
- Project Detail page
- Edit Project modal
- Archive
- Restore
- Responsive styling

Browser date inputs use `YYYY-MM-DD`; HTTP DTO handling explicitly
parses date strings instead of depending on Go's default `time.Time`
JSON format.

---

# Milestone #4 --- Tasks

## 22. Task Purpose

A Task represents an actionable item. It may be standalone or optionally
associated with a Project.

```text
Standalone Task

or

Task → Project
```

## 23. Task Model

```text
Task
├── id UUID
├── userId UUID
├── projectId nullable UUID
├── title string
├── description nullable string
├── status todo | in_progress | completed
├── priority low | medium | high | urgent
├── dueDate nullable date
├── completedAt nullable timestamp
├── createdAt timestamp
└── updatedAt timestamp
```

Defaults:

```text
status   = todo
priority = medium
```

## 24. Task Lifecycle

Normal lifecycle:

```text
To Do → In Progress → Completed
```

UI actions:

```text
To Do:
- Start
- Complete

In Progress:
- Move to To Do
- Complete

Completed:
- Reopen
```

Completion behavior:

```text
completed → completedAt = now
reopened  → completedAt = null
```

The backend response is authoritative after lifecycle updates.

## 25. Task-to-Project Relationship

A Task may reference zero or one Project.

Before assignment, Atlas verifies that the Project belongs to the
authenticated user.

```text
User selects Project
        │
        ▼
Does authenticated user own it?
     │             │
    yes            no
     │             │
     ▼             ▼
  assign          reject
```

Clearing `projectId` converts a linked Task back to a standalone Task.

## 26. Task API

```http
POST   /api/v1/tasks
GET    /api/v1/tasks
GET    /api/v1/tasks/{id}
PATCH  /api/v1/tasks/{id}
DELETE /api/v1/tasks/{id}
```

Deleting a Task does not delete its Project.

## 27. PATCH Semantics

Task PATCH distinguishes:

- omitted field → leave unchanged
- explicit `null` → clear nullable field
- value → update field

Example:

```json
{
  "description": null,
  "projectId": null,
  "dueDate": null
}
```

This explicitly clears all three values.

## 28. Task Listing Contract

`GET /api/v1/tasks` supports:

### Status

```text
todo
in_progress
completed
```

### Priority

```text
low
medium
high
urgent
```

### Project

Filter by `projectId`.

### Search

Searches title and description.

### Due filter

```text
overdue
today
upcoming
none
```

### Sorting

```text
updatedAt
createdAt
title
dueDate
priority
```

Direction:

```text
asc
desc
```

Default:

```text
updatedAt desc
```

Repository sorting uses safe server-side mappings rather than accepting
arbitrary SQL column names.

## 29. Task Backend

```text
server/internal/tasks/
├── errors.go
├── handler.go
├── handler_test.go
├── model.go
├── repository.go
├── repository_integration_test.go
├── service.go
└── service_test.go
```

Responsibilities:

```text
Handler
- HTTP/JSON
- query/path parameters
- date parsing
- auth context
- response codes
- unknown-field rejection

Service
- validation
- defaults
- normalization
- lifecycle rules
- Project ownership validation
- filter validation

Repository
- persistence
- ownership scoping
- dynamic list queries
- filtering/search/sorting
- CRUD behavior
```

## 30. Task Frontend

Task feature code is organized under:

```text
src/features/tasks/
```

Major components/workflows include:

```text
TasksPage
TasksHeader
TaskSummary
TaskToolbar
TaskCard
CreateTaskModal
TaskDetailPage
EditTaskModal
DeleteTaskModal
```

The Tasks page provides:

- Summary metrics
- Cards
- Search
- Status filter
- Priority filter
- Due filter
- Sorting
- Sort direction
- Loading state
- Error state
- Empty state
- Background refresh presentation
- Linked Project names

Search is debounced by approximately 300 ms.

## 31. Create Task

Create supports:

- title
- description
- optional Project
- status
- priority
- due date

The Project selector loads the user's non-archived Projects. Standalone
Tasks are fully supported.

## 32. Task Detail

Route:

```text
/tasks/:taskId
```

The page presents Task content, status, priority, Project information,
due/completion data, metadata, lifecycle controls, editing, and
deletion.

Failure to resolve a linked Project is nonfatal to the Task page.

## 33. Edit Task

Editing supports all mutable Task fields.

The frontend sends a minimal PATCH payload containing only changed
properties. Clearing description, Project, or due date sends `null`.

If nothing changed, the modal can close without sending an unnecessary
PATCH request.

## 34. Delete Task

Deletion uses a confirmation modal with:

- Cancel
- Close button
- Escape
- Backdrop dismissal
- Destructive confirmation
- Loading state
- Error state

Successful deletion returns:

```http
204 No Content
```

The frontend then navigates back to `/tasks`.

## 35. Project Names on Task Cards

Task records store `projectId`, not duplicated Project names.

The Tasks page loads the user's Projects and builds a mapping:

```text
projectId → projectName
```

Cards can therefore display meaningful Project names without making one
Project request for every Task, avoiding an N+1 request pattern.

---

# Shared Application Architecture

## 36. Domain Relationships

```text
User
├── has many Projects
└── has many Tasks

Project
└── has many Tasks

Task
└── belongs to zero or one Project
```

Ownership remains anchored to the authenticated User.

## 37. Application Layout

Authenticated pages share the Atlas application shell:

```text
┌──────────────┬──────────────────────────────────────┐
│              │                                      │
│   Sidebar    │             Main Content             │
│              │                                      │
│ Dashboard    │             <Outlet />               │
│ Projects     │                                      │
│ Tasks        │                                      │
│ ...          │                                      │
└──────────────┴──────────────────────────────────────┘
```

The shared layout uses shrink-safe grid/flex behavior such as
`minmax(0, 1fr)` and `min-width: 0`.

## 38. Responsive UI Principles

Projects and Tasks have been hardened for responsive use with:

- `min-width: 0`
- shrink-safe CSS grids
- wrapping toolbar controls
- responsive headers
- mobile form layouts
- stacked detail actions
- scrollable modals on short viewports
- long-content wrapping
- keyboard focus states
- reduced-motion handling
- border-box sizing

Recommended global sizing foundation:

```css
*,
*::before,
*::after {
  box-sizing: border-box;
}
```

The application fixes overflow at its source rather than masking it
globally with `overflow-x: hidden`.

## 39. Current REST API

```text
System
GET    /api/v1/health
GET    /api/v1/ready

Authentication
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
GET    /api/v1/auth/me

Projects
POST   /api/v1/projects
GET    /api/v1/projects
GET    /api/v1/projects/{id}
PATCH  /api/v1/projects/{id}
POST   /api/v1/projects/{id}/archive
POST   /api/v1/projects/{id}/restore

Tasks
POST   /api/v1/tasks
GET    /api/v1/tasks
GET    /api/v1/tasks/{id}
PATCH  /api/v1/tasks/{id}
DELETE /api/v1/tasks/{id}
```

---

# Security

## 40. Security Model

Atlas currently establishes the following security conventions:

- bcrypt password hashing
- no plaintext password persistence
- short-lived access JWTs
- access tokens kept in memory
- opaque refresh tokens
- HttpOnly refresh cookie
- refresh-token hashing at rest
- refresh rotation
- session revocation
- authenticated request context
- owner-scoped repositories
- Project ownership validation during Task assignment
- not-found behavior for cross-user private resources

The client never determines resource ownership by supplying a trusted
`userId`.

---

# Testing and Quality

## 41. Backend Tests

Standard unit test command:

```bash
go test ./...
```

Static analysis:

```bash
go vet ./...
```

Integration tests:

```bash
go test -p 1 -tags=integration ./...
```

Integration tests use a dedicated `atlas_test` database and a safety
guard requiring the configured database URL to identify the test
database before destructive setup is allowed.

`-p 1` is currently important because packages share destructive
test-database setup and must not run those integration suites
concurrently.

## 42. Frontend Validation

```bash
npm run lint
npm run build
```

Manual regression currently covers:

- register/login/logout
- session restoration
- protected routing
- Projects create/edit/detail
- Project archive/restore
- Project filters/search/sort
- Tasks create/edit/detail
- standalone and Project-linked Tasks
- Task filters/search/sort
- due filters
- Task lifecycle
- `completedAt`
- nullable-field clearing
- Task deletion
- Project-name rendering
- responsive layouts
- horizontal-overflow regression
- Dashboard regression

## 43. React Implementation Conventions

React Strict Mode remains enabled.

Important conventions established during development:

- Hooks execute before conditional returns.
- Avoid synchronous state-reset effects where event-driven reset is
  cleaner.
- Async effects use cancellation guards.
- Backend responses become authoritative persisted state.
- Single-flight refresh prevents common duplicate refresh races.
- Feature state and API logic remain close to their domain.

---

# Database Migrations

## 44. Migration Commands

The Makefile includes commands conceptually equivalent to:

```make
migrate-up:
    migrate -path $(MIGRATIONS_PATH) -database "$(DATABASE_URL)" up

migrate-down:
    migrate -path $(MIGRATIONS_PATH) -database "$(DATABASE_URL)" down 1

migrate-version:
    migrate -path $(MIGRATIONS_PATH) -database "$(DATABASE_URL)" version
```

Migrations are the authoritative record of schema evolution.

---

# Design Conventions

## 45. Backend Conventions

```text
Handler → Service → Repository → PostgreSQL
```

- Handlers own HTTP concerns.
- Services own business rules.
- Repositories own persistence.
- Authenticated identity comes from request context.
- Repositories scope private resources by owner.
- DTO parsing remains near the HTTP boundary.
- Integration behavior is tested against PostgreSQL.

## 46. Frontend Conventions

- Feature-oriented directories.
- TypeScript domain types.
- Feature-specific API modules.
- Shared authenticated API infrastructure.
- Explicit loading/error/empty states.
- Backend-driven filtering where appropriate.
- Avoid N+1 requests.
- Responsive layouts shrink instead of hiding overflow.
- Accessible focus treatment.
- Strict Mode compatibility.

## 47. API Conventions

- REST/JSON
- camelCase client JSON
- explicit nullable semantics
- validated query parameters
- safe sorting mappings
- predictable status codes
- owner-aware not-found behavior

---

# Deferred and Future Work

## 48. Deliberately Deferred Project/Task Features

The current implementation intentionally does not yet include:

- Tags
- Project colors
- Project icons
- Collaborators
- Attachments
- Detailed audit/history timelines
- Project progress percentages
- Project Task-count aggregation
- Permanent Project deletion workflow

These were deferred to keep Milestones #3 and #4 focused and cohesive.

## 49. Future Technical Hardening

Non-blocking opportunities include:

### Concurrent 401 race hardening

A future authenticated client can compare the token used by a failed
request with the currently active token before initiating another
refresh.

### Auth state after terminal refresh failure

Automatic refresh failure can eventually be more tightly integrated with
clearing React authentication/user state.

### Integration-test isolation

The current sequential integration suite is safe. Future improvements
could use transactions, isolated schemas, or per-test databases to
permit greater parallelism.

---

# Development Workflow

## 50. Recommended Milestone Pattern

Future Atlas domains should follow the process that worked successfully
for Projects and Tasks:

```text
1. Define domain requirements
        ↓
2. Design schema/migration
        ↓
3. Repository
        ↓
4. Service/business rules
        ↓
5. Handler/routes
        ↓
6. Unit + integration tests
        ↓
7. API regression
        ↓
8. Frontend types/API
        ↓
9. Pages/components
        ↓
10. CRUD/lifecycle workflows
        ↓
11. Responsive UX polish
        ↓
12. Full regression
        ↓
13. Commit + merge
```

## 51. Standard Final Checks

Backend, from `atlas/server`:

```bash
go test ./...
go vet ./...
go test -p 1 -tags=integration ./...
```

Frontend, from `atlas/client`:

```bash
npm run lint
npm run build
```

All applicable checks should be green before a feature milestone is
merged.

---

# Architecture Snapshot

## 52. Current System

```text
┌────────────────────────────────────────────────────────────┐
│                    React + TypeScript                      │
│                                                            │
│ Auth       Dashboard       Projects        Tasks           │
│  │                            │               │             │
│  └────────── authenticated API client ────────┘             │
└─────────────────────────────┬──────────────────────────────┘
                              │
                         REST / JSON
                              │
                              ▼
┌────────────────────────────────────────────────────────────┐
│                         Go API                             │
│                                                            │
│ Auth Middleware                                            │
│      │                                                     │
│      ├─ Auth Handler → Service → Repository                 │
│      ├─ Projects Handler → Service → Repository             │
│      └─ Tasks Handler → Service → Repository                │
└─────────────────────────────┬──────────────────────────────┘
                              │
                             pgx
                              │
                              ▼
┌────────────────────────────────────────────────────────────┐
│                       PostgreSQL                           │
│                                                            │
│ users       sessions       projects       tasks            │
└────────────────────────────────────────────────────────────┘
```

---

# Current Completion State

## 53. Completed Scope

### Milestone #1 --- Foundation

- Go API
- PostgreSQL connectivity
- health/readiness
- CORS
- environment configuration
- graceful shutdown
- React/Vite client
- routing/API connectivity

### Milestone #2 --- Authentication

- register/login/logout
- `/me`
- refresh
- bcrypt
- JWT access tokens
- opaque refresh tokens
- HttpOnly cookie
- refresh-token hashing
- rotation/revocation
- sessions
- auth middleware
- protected frontend routes
- session restoration
- authenticated API client
- auth tests

### Milestone #3 --- Projects

- Project schema/migration
- repository/service/handler
- ownership enforcement
- create/list/get/update
- search/filter/sort
- completion semantics
- archive/restore
- create/edit/detail UI
- responsive Projects UI
- unit/integration testing

### Milestone #4 --- Tasks

- Task schema/migration
- repository/service/handler
- ownership enforcement
- optional Project relationship
- Project ownership validation
- create/list/get/update/delete
- search/filter/sort
- due filters
- nullable PATCH semantics
- create/edit/detail UI
- lifecycle controls
- completion timestamps
- deletion workflow
- Project names on cards
- responsive Tasks UI
- full regression

## 54. Current Application State

Atlas has progressed from a scaffold into an authenticated productivity
platform with two connected core domains.

```text
User
 │
 ├─────────────┐
 ▼             ▼
Projects      Tasks
 │             ▲
 └─────────────┘
   optional link
```

**Milestone #1 --- COMPLETE**\
**Milestone #2 --- COMPLETE**\
**Milestone #3 --- COMPLETE**\
**Milestone #4 --- COMPLETE**

The application is now ready for the next major domain while preserving
the same incremental architecture and regression discipline.

---

## 55. Documentation Maintenance

This document should be updated after every future milestone. At
minimum, maintain:

- milestone status
- domain models
- database relationships
- API endpoints
- backend packages
- frontend features
- business rules
- security behavior
- tests
- known technical considerations
- deferred functionality
- architecture diagrams

This allows the document to serve both as current technical
documentation and as a record of Atlas's architectural evolution.

---

**Atlas --- Personal Life Command Center / Personal Operating System**\
**Current documented state: Milestones #1--#4 complete.**
