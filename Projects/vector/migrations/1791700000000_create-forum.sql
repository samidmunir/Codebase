-- Up Migration
-- The community forum: categories, threads, posts, and what pilots do with them.

CREATE TABLE forum_categories (
  id text PRIMARY KEY CHECK (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text NOT NULL,
  description text NOT NULL,
  position int NOT NULL,
  -- Only admins start threads here (anyone can reply).
  admin_only boolean NOT NULL DEFAULT false
);

INSERT INTO forum_categories (id, name, description, position, admin_only) VALUES
  ('announcements', 'Announcements', 'News and changes from the Vector team.', 1, true),
  ('general', 'General', 'Anything about Vector and controlling.', 2, false),
  ('airspaces', 'Airspaces', 'New York, Chicago, Dallas–Fort Worth, and the ones you want next.', 3, false),
  ('techniques', 'Techniques', 'Sequencing, vectoring, flows and how you handle the rush.', 4, false),
  ('bug-reports', 'Bug reports', 'Something wrong? Tell us what happened and how to see it again.', 5, false),
  ('feature-requests', 'Feature requests', 'What Vector should do next.', 6, false);

CREATE TABLE forum_threads (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  category_id text NOT NULL REFERENCES forum_categories (id),
  -- Null once the author deletes their account ("deleted pilot").
  author_id uuid REFERENCES users (id) ON DELETE SET NULL,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  -- A session overview shown as a card.
  result_id uuid REFERENCES session_results (id) ON DELETE SET NULL,
  pinned boolean NOT NULL DEFAULT false,
  locked boolean NOT NULL DEFAULT false,
  view_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_post_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX forum_threads_category_idx ON forum_threads (category_id, pinned DESC, last_post_at DESC);
CREATE INDEX forum_threads_last_post_idx ON forum_threads (last_post_at DESC);

-- The first post of a thread is its opening post.
CREATE TABLE forum_posts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  thread_id bigint NOT NULL REFERENCES forum_threads (id) ON DELETE CASCADE,
  author_id uuid REFERENCES users (id) ON DELETE SET NULL,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 20000),
  created_at timestamptz NOT NULL DEFAULT now(),
  edited_at timestamptz,
  hidden_at timestamptz,
  hidden_by uuid REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX forum_posts_thread_idx ON forum_posts (thread_id, id);
CREATE INDEX forum_posts_author_idx ON forum_posts (author_id, created_at DESC);

CREATE TABLE forum_reactions (
  post_id bigint NOT NULL REFERENCES forum_posts (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE forum_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id bigint NOT NULL REFERENCES forum_posts (id) ON DELETE CASCADE,
  reporter_id uuid REFERENCES users (id) ON DELETE SET NULL,
  reason text NOT NULL CHECK (char_length(reason) BETWEEN 1 AND 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES users (id) ON DELETE SET NULL,
  resolution text CHECK (resolution IN ('dismissed', 'hidden', 'deleted'))
);

CREATE UNIQUE INDEX forum_reports_open_idx ON forum_reports (post_id, reporter_id)
  WHERE resolved_at IS NULL;

CREATE TABLE forum_follows (
  thread_id bigint NOT NULL REFERENCES forum_threads (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (thread_id, user_id)
);

CREATE INDEX forum_follows_user_idx ON forum_follows (user_id);

-- When each pilot last read each thread, for "new since your last visit".
CREATE TABLE forum_reads (
  thread_id bigint NOT NULL REFERENCES forum_threads (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (thread_id, user_id)
);

-- Suspended from posting until then ('infinity' for good).
ALTER TABLE users ADD COLUMN posting_suspended_until timestamptz;

-- Down Migration
ALTER TABLE users DROP COLUMN posting_suspended_until;
DROP TABLE forum_reads;
DROP TABLE forum_follows;
DROP TABLE forum_reports;
DROP TABLE forum_reactions;
DROP TABLE forum_posts;
DROP TABLE forum_threads;
DROP TABLE forum_categories;
