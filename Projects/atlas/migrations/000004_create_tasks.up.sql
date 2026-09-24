CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    project_id UUID
        REFERENCES projects(id)
        ON DELETE CASCADE,

    title VARCHAR(200) NOT NULL,
    description TEXT,

    status VARCHAR(20) NOT NULL DEFAULT 'todo',
    priority VARCHAR(20) NOT NULL DEFAULT 'medium',

    due_date DATE,

    completed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT tasks_title_not_blank
        CHECK (LENGTH(BTRIM(title)) > 0),

    CONSTRAINT tasks_description_length
        CHECK (
            description IS NULL
            OR LENGTH(description) <= 5000
        ),

    CONSTRAINT tasks_status_valid
        CHECK (
            status IN (
                'todo',
                'in_progress',
                'completed'
            )
        ),

    CONSTRAINT tasks_priority_valid
        CHECK (
            priority IN (
                'low',
                'medium',
                'high',
                'urgent'
            )
        )
);

CREATE INDEX idx_tasks_user_id
    ON tasks(user_id);

CREATE INDEX idx_tasks_user_status
    ON tasks(user_id, status);

CREATE INDEX idx_tasks_user_priority
    ON tasks(user_id, priority);

CREATE INDEX idx_tasks_user_project
    ON tasks(user_id, project_id);

CREATE INDEX idx_tasks_user_due_date
    ON tasks(user_id, due_date);

CREATE INDEX idx_tasks_user_updated_at
    ON tasks(user_id, updated_at DESC);