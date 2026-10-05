-- Up Migration
-- Site-wide switches admins flip: registration, a banner, the community's posting.
-- Each key's value is JSON; a missing key means its default (see site-settings.ts).
CREATE TABLE site_settings (
  key text PRIMARY KEY CHECK (key IN ('registration', 'banner', 'community')),
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES users (id) ON DELETE SET NULL
);

-- Down Migration
DROP TABLE site_settings;
