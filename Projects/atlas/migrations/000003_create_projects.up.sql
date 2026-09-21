CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    name VARCHAR(150) NOT NULL,
    description TEXT,

    status VARCHAR(20) NOT NULL DEFAULT 'planning',
    priority VARCHAR(20) NOT NULL DEFAULT 'medium',

    start_date DATE,
    target_date DATE,

    completed_at TIMESTAMPTZ,
    archived_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT projects_name_not_blank
        CHECK (LENGTH(BTRIM(name)) > 0),

    CONSTRAINT projects_description_length
        CHECK (
            description IS NULL
            OR LENGTH(description) <= 5000
        ),

    CONSTRAINT projects_status_valid
        CHECK (
            status IN (
                'planning',
                'active',
                'on_hold',
                'completed'
            )
        ),

    CONSTRAINT projects_priority_valid
        CHECK (
            priority IN (
                'low',
                'medium',
                'high',
                'urgent'
            )
        ),

    CONSTRAINT projects_dates_valid
        CHECK (
            start_date IS NULL
            OR target_date IS NULL
            OR target_date >= start_date
        )
);

CREATE INDEX idx_projects_user_id
    ON projects(user_id);

CREATE INDEX idx_projects_user_archived
    ON projects(user_id, archived_at);

CREATE INDEX idx_projects_user_status
    ON projects(user_id, status);

CREATE INDEX idx_projects_user_priority
    ON projects(user_id, priority);

CREATE INDEX idx_projects_user_updated_at
    ON projects(user_id, updated_at DESC);