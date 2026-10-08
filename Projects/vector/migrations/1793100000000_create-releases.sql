-- Up Migration

-- Releases (versions of Vector) and their features, for the landing page and /roadmap.
CREATE TABLE releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL UNIQUE CHECK (version ~ '^\d{1,3}\.\d{1,3}(\.\d{1,3})?$'),
  name text NOT NULL DEFAULT '' CHECK (char_length(name) <= 60),
  summary text NOT NULL DEFAULT '' CHECK (char_length(summary) <= 400),
  status text NOT NULL CHECK (status IN ('released', 'next', 'planned')),
  released_on date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE release_features (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  release_id uuid NOT NULL REFERENCES releases (id) ON DELETE CASCADE,
  position int NOT NULL,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 80),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 300),
  status text NOT NULL CHECK (status IN ('planned', 'in_progress', 'shipped'))
);
CREATE INDEX release_features_release_idx ON release_features (release_id, position);

-- What's out (the beta, first released on 5 October 2026), and what's next.
WITH beta AS (
  INSERT INTO releases (version, name, summary, status, released_on) VALUES (
    '0.1', 'The beta',
    'The first public version: three real TRACONs, a career that counts, and the community.',
    'released', '2026-10-05')
  RETURNING id
)
INSERT INTO release_features (release_id, position, title, description, status)
SELECT beta.id, f.position, f.title, f.description, 'shipped' FROM beta, (VALUES
  (1, 'Three real TRACONs', 'New York, Chicago and Dallas–Fort Worth, built from FAA procedures, frequencies and minimum vectoring altitudes.'),
  (2, 'Live weather', 'Real METARs pick the runways in use, and the wind keeps changing during the session.'),
  (3, 'A career that counts', 'Every session is replayed on the server to verify its RP, for your career and the records.'),
  (4, 'The community', 'Threads and replies to swap techniques, ask questions and report bugs.'),
  (5, 'Sharing', 'Share a session or your career as a card made from your real numbers.')
) AS f(position, title, description);

WITH next AS (
  INSERT INTO releases (version, summary, status) VALUES (
    '0.2', 'Easier to start, and more reasons to come back.', 'next')
  RETURNING id
)
INSERT INTO release_features (release_id, position, title, description, status)
SELECT next.id, f.position, f.title, f.description, 'planned' FROM next, (VALUES
  (1, 'First shift', 'A guided first session that teaches the basics, from your first vector to your first landing.'),
  (2, 'Achievements', 'Milestones to work toward: your first landing, 100 landings, a session with no losses, every TRACON worked.'),
  (3, 'Weekly challenge', 'The same airspace, weather and traffic for every pilot, with its own leaderboard.')
) AS f(position, title, description);

-- Down Migration

DROP TABLE release_features;
DROP TABLE releases;
