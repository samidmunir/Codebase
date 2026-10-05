-- Up Migration
-- The beta: invite codes, a waitlist, and feedback from testers.

-- A code someone types (or follows a link with) to create an account while
-- registration is invite-only.
CREATE TABLE invite_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code citext NOT NULL UNIQUE CHECK (code ~ '^[A-Za-z0-9-]{6,40}$'),
  -- Who it's for, or where it was shared.
  note text NOT NULL DEFAULT '' CHECK (char_length(note) <= 200),
  max_uses int NOT NULL DEFAULT 1 CHECK (max_uses BETWEEN 1 AND 10000),
  uses int NOT NULL DEFAULT 0 CHECK (uses >= 0),
  expires_at timestamptz,
  revoked_at timestamptz,
  created_by uuid REFERENCES users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- The code an account was created with.
ALTER TABLE users ADD COLUMN invite_code_id uuid REFERENCES invite_codes (id) ON DELETE SET NULL;

-- People asking to join the beta.
CREATE TABLE waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email citext NOT NULL UNIQUE,
  note text NOT NULL DEFAULT '' CHECK (char_length(note) <= 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  -- When an admin sent them an invite, and the code it made.
  invited_at timestamptz,
  invite_code_id uuid REFERENCES invite_codes (id) ON DELETE SET NULL
);

-- What testers tell us.
CREATE TABLE feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users (id) ON DELETE SET NULL,
  kind text NOT NULL CHECK (kind IN ('bug', 'idea', 'other')),
  message text NOT NULL CHECK (char_length(message) BETWEEN 1 AND 4000),
  -- Where they were, and on what.
  page text NOT NULL DEFAULT '' CHECK (char_length(page) <= 300),
  device text NOT NULL DEFAULT '' CHECK (char_length(device) <= 100),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'done')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX feedback_status_idx ON feedback (status, created_at DESC);

-- Registration and beta settings gain new keys.
ALTER TABLE site_settings DROP CONSTRAINT site_settings_key_check;
ALTER TABLE site_settings ADD CONSTRAINT site_settings_key_check
  CHECK (key IN ('registration', 'banner', 'community', 'beta'));

-- Down Migration
ALTER TABLE site_settings DROP CONSTRAINT site_settings_key_check;
DELETE FROM site_settings WHERE key = 'beta';
ALTER TABLE site_settings ADD CONSTRAINT site_settings_key_check
  CHECK (key IN ('registration', 'banner', 'community'));
DROP TABLE feedback;
DROP TABLE waitlist;
ALTER TABLE users DROP COLUMN invite_code_id;
DROP TABLE invite_codes;
