-- Up Migration
-- Saved simulator sessions: a full sim-core snapshot plus summary columns for listing.
CREATE TABLE saved_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name text NOT NULL,
  airspace_id text NOT NULL,
  snapshot jsonb NOT NULL,
  snapshot_version integer NOT NULL,
  sim_time_sec double precision NOT NULL,
  aircraft_count integer NOT NULL,
  difficulty text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX saved_sessions_user_updated_idx ON saved_sessions (user_id, updated_at DESC);

-- Down Migration
DROP TABLE saved_sessions;
