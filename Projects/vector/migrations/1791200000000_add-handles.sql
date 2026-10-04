-- Up Migration
-- Public handles: how a pilot appears on profiles, records and the forum (never their email).
ALTER TABLE users
  ADD COLUMN handle citext,
  -- When the handle last changed (handles can change once every 30 days).
  ADD COLUMN handle_changed_at timestamptz,
  -- True for a handle made up for an account that existed before handles; the pilot
  -- is asked to choose their own.
  ADD COLUMN handle_generated boolean NOT NULL DEFAULT false;

-- Existing accounts get a handle from their display name, made unique with a number.
WITH base AS (
  SELECT id,
    coalesce(nullif(left(regexp_replace(display_name, '[^A-Za-z0-9_]+', '_', 'g'), 14), ''), 'pilot')
      AS stem,
    row_number() OVER (ORDER BY created_at, id) AS n
  FROM users
)
UPDATE users u SET
  handle = CASE WHEN char_length(base.stem) < 3 THEN 'pilot' ELSE base.stem END || '_' || base.n,
  handle_generated = true
FROM base WHERE base.id = u.id;

ALTER TABLE users
  ALTER COLUMN handle SET NOT NULL,
  ADD CONSTRAINT users_handle_key UNIQUE (handle),
  ADD CONSTRAINT users_handle_format CHECK (handle ~ '^[A-Za-z0-9_]{3,20}$');

-- A handle someone has just given up stays theirs alone for a while, so nobody can
-- take it over straight away.
CREATE TABLE released_handles (
  handle citext PRIMARY KEY,
  user_id uuid REFERENCES users (id) ON DELETE CASCADE,
  reserved_until timestamptz NOT NULL
);

-- Down Migration
DROP TABLE released_handles;
ALTER TABLE users
  DROP CONSTRAINT users_handle_format,
  DROP CONSTRAINT users_handle_key,
  DROP COLUMN handle_generated,
  DROP COLUMN handle_changed_at,
  DROP COLUMN handle;
