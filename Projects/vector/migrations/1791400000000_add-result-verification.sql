-- Up Migration
ALTER TABLE session_results
  -- SHA-256 of the session's final state (sim-core's stateFingerprint), as uploaded.
  -- Verification replays the session and compares.
  ADD COLUMN state_fingerprint text,
  ADD COLUMN verified_at timestamptz,
  -- Why a result isn't verified (for admins), e.g. 'replay differs'.
  ADD COLUMN verification_note text;

-- The verifier's queue: pending results, oldest update first.
CREATE INDEX session_results_pending_idx ON session_results (updated_at)
  WHERE verification = 'pending';
-- Leaderboards read verified, visible results.
CREATE INDEX session_results_records_idx ON session_results (created_at)
  WHERE verification = 'verified' AND NOT hidden;

-- A pilot can keep their results off the leaderboards.
ALTER TABLE users ADD COLUMN show_on_records boolean NOT NULL DEFAULT true;

-- Down Migration
ALTER TABLE users DROP COLUMN show_on_records;
DROP INDEX session_results_records_idx;
DROP INDEX session_results_pending_idx;
ALTER TABLE session_results
  DROP COLUMN verification_note,
  DROP COLUMN verified_at,
  DROP COLUMN state_fingerprint;
