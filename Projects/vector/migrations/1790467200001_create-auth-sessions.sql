-- Up Migration
-- One row per refresh token. The token itself is never stored, only its SHA-256 hash.
-- Each refresh marks the row rotated and creates a new one, so reuse of an old
-- (possibly stolen) token can be detected.
CREATE TABLE auth_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  refresh_token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  rotated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX auth_sessions_user_id_idx ON auth_sessions (user_id);

-- Down Migration
DROP TABLE auth_sessions;
