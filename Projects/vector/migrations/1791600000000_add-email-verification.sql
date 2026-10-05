-- Up Migration
-- When the account's email was verified (null: not yet). Existing accounts start
-- unverified: nobody has proven they own their address.
ALTER TABLE users ADD COLUMN email_verified_at timestamptz;

-- Emailed links. As with refresh tokens, only the token's SHA-256 hash is stored.
CREATE TABLE email_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  purpose text NOT NULL CHECK (purpose IN ('verify', 'reset', 'change', 'revert')),
  token_hash text NOT NULL UNIQUE,
  -- change: the address the account moves to (the link is sent there).
  -- revert: the address it moved from (the link, sent there, moves it back).
  new_email citext CHECK ((purpose IN ('change', 'revert')) = (new_email IS NOT NULL)),
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX email_tokens_user_purpose_idx ON email_tokens (user_id, purpose);

-- Down Migration
DROP TABLE email_tokens;
ALTER TABLE users DROP COLUMN email_verified_at;
