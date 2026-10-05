-- Up Migration
-- News and release notes, written by admins. A post without published_at is a draft.
CREATE TABLE news_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  summary text NOT NULL CHECK (char_length(summary) <= 300),
  -- Markdown.
  body text NOT NULL CHECK (char_length(body) <= 50000),
  published_at timestamptz,
  author_id uuid REFERENCES users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX news_posts_published_idx ON news_posts (published_at DESC)
  WHERE published_at IS NOT NULL;

-- Down Migration
DROP TABLE news_posts;
