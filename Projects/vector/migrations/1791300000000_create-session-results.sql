-- Up Migration
-- Career history: one row per session a pilot played, kept whether or not the
-- session stays saved. Saved sessions are only resumable snapshots.
CREATE TABLE session_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  -- The session's own id (from its replay), so a resumed session updates its result.
  session_key text NOT NULL,
  airspace_id text NOT NULL,
  difficulty text,
  sim_time_sec double precision NOT NULL,
  final_tick integer NOT NULL,
  rp double precision NOT NULL,
  stats jsonb NOT NULL,
  -- What the debrief shows (sim-core's SessionReport).
  report jsonb NOT NULL,
  -- How it started and every input, for verifying it by replaying (null for
  -- sessions from before replays).
  replay jsonb,
  engine_version text,
  verification text NOT NULL DEFAULT 'pending'
    CHECK (verification IN ('pending', 'verified', 'mismatch', 'unverifiable')),
  -- An admin can hide a result from profiles and records.
  hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, session_key)
);

CREATE INDEX session_results_user_created_idx ON session_results (user_id, created_at DESC);
CREATE INDEX session_results_airspace_rp_idx ON session_results (airspace_id, rp DESC);

-- Profiles are public unless the pilot makes theirs private.
ALTER TABLE users ADD COLUMN profile_public boolean NOT NULL DEFAULT true;

-- Down Migration
ALTER TABLE users DROP COLUMN profile_public;
DROP TABLE session_results;
