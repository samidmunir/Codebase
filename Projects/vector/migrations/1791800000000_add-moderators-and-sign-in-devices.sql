-- Up Migration
-- Moderators: staff who look after the community, without access to accounts.
ALTER TABLE users DROP CONSTRAINT users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('player', 'moderator', 'admin'));
DROP INDEX users_role_idx;
CREATE INDEX users_role_idx ON users (role) WHERE role <> 'player';

-- A sign-in is a family of refresh-token rows (each refresh adds one): the family
-- is the device, and its first row's id names it.
ALTER TABLE auth_sessions ADD COLUMN family_id uuid;
UPDATE auth_sessions SET family_id = id;
ALTER TABLE auth_sessions ALTER COLUMN family_id SET NOT NULL;
CREATE INDEX auth_sessions_family_idx ON auth_sessions (family_id);

-- The device a sign-in is on, kept only while it's the live row of a sign-in that
-- hasn't ended (cleared when the row is replaced, revoked or expires).
ALTER TABLE auth_sessions ADD COLUMN user_agent text, ADD COLUMN ip inet;
CREATE INDEX auth_sessions_device_idx ON auth_sessions (expires_at)
  WHERE ip IS NOT NULL OR user_agent IS NOT NULL;

-- Which account an audit entry is about, for each user's history. Earlier
-- entries are matched by the email they name.
ALTER TABLE admin_audit_log ADD COLUMN target_user_id uuid REFERENCES users (id) ON DELETE SET NULL;
UPDATE admin_audit_log a SET target_user_id = u.id
  FROM users u WHERE a.action LIKE 'user.%' AND lower(a.target) = lower(u.email::text);
CREATE INDEX admin_audit_log_target_user_idx ON admin_audit_log (target_user_id, created_at DESC);

-- Down Migration
DROP INDEX admin_audit_log_target_user_idx;
ALTER TABLE admin_audit_log DROP COLUMN target_user_id;
DROP INDEX auth_sessions_device_idx;
ALTER TABLE auth_sessions DROP COLUMN ip, DROP COLUMN user_agent;
DROP INDEX auth_sessions_family_idx;
ALTER TABLE auth_sessions DROP COLUMN family_id;
UPDATE users SET role = 'player' WHERE role = 'moderator';
DROP INDEX users_role_idx;
CREATE INDEX users_role_idx ON users (role) WHERE role = 'admin';
ALTER TABLE users DROP CONSTRAINT users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('player', 'admin'));
