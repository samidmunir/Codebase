-- Up Migration

-- Official RP scoring, set by admins: each change is a new version. With none, the
-- defaults apply. Sessions played under a version just replaced still count.
CREATE TABLE scoring_versions (
  id serial PRIMARY KEY,
  "values" jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES users (id) ON DELETE SET NULL
);

-- Whether a result counts for the records and the career (official scoring, the
-- standard rules, a difficulty preset, no traffic changes during it), and why not.
-- Null: not checked yet (results from before this; the server checks them).
ALTER TABLE session_results
  ADD COLUMN ranked boolean,
  ADD COLUMN unranked_reason text;

-- Down Migration

ALTER TABLE session_results DROP COLUMN unranked_reason, DROP COLUMN ranked;
DROP TABLE scoring_versions;
