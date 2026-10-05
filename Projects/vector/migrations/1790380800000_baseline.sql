-- Up Migration
-- Case-insensitive text, used for account emails in the accounts milestone.
CREATE EXTENSION IF NOT EXISTS citext;

-- Down Migration
DROP EXTENSION IF EXISTS citext;
