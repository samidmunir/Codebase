-- Up Migration
-- User preferences (display, audio, controls), resolved against the shared settings schema on read.
CREATE TABLE user_settings (
  user_id uuid PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  settings_version integer NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Down Migration
DROP TABLE user_settings;
