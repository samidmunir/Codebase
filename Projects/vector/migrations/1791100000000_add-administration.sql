-- Up Migration
-- Roles: every account is a player; admins can also manage users and airspaces.
-- Admins are made with `npm run admin:grant -- <email>`, never by a migration.
ALTER TABLE users
  ADD COLUMN role text NOT NULL DEFAULT 'player' CHECK (role IN ('player', 'admin')),
  -- A disabled account can't sign in, and its sign-ins are revoked.
  ADD COLUMN disabled_at timestamptz;

CREATE INDEX users_role_idx ON users (role) WHERE role = 'admin';

-- Whether each airspace is open to players. The server adds a row for every
-- airspace it knows at startup (enabled), so a new airspace needs no migration.
CREATE TABLE airspaces (
  id text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES users (id) ON DELETE SET NULL
);

-- Every administrative change: who, what, to whom, and when. Actor and target
-- are kept as text too, so entries still read correctly after a user is deleted.
CREATE TABLE admin_audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id uuid REFERENCES users (id) ON DELETE SET NULL,
  actor text NOT NULL,
  action text NOT NULL,
  target text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX admin_audit_log_created_idx ON admin_audit_log (created_at DESC);

-- Down Migration
DROP TABLE admin_audit_log;
DROP TABLE airspaces;
DROP INDEX users_role_idx;
ALTER TABLE users DROP COLUMN disabled_at, DROP COLUMN role;
