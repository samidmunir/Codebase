-- Up Migration
-- RP (reputation points) earned in each saved session, for the career total.
ALTER TABLE saved_sessions ADD COLUMN rp integer NOT NULL DEFAULT 0;

-- Down Migration
ALTER TABLE saved_sessions DROP COLUMN rp;
