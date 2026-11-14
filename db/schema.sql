CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  stats JSONB NOT NULL DEFAULT '{"matches":0,"wins":0,"losses":0,"pointsFor":0,"pointsAgainst":0,"xp":0}'::jsonb,
  slime JSONB NOT NULL DEFAULT '{"color":"#00ff00","hat":"none","hatAnim":"none","hatDrawing":[],"trail":"none"}'::jsonb,
  achievements JSONB NOT NULL DEFAULT '[]'::jsonb,
  recent_matches JSONB NOT NULL DEFAULT '[]'::jsonb,
  coins INTEGER NOT NULL DEFAULT 1,
  inventory JSONB NOT NULL DEFAULT '[]'::jsonb,
  saved_hat_drawings JSONB NOT NULL DEFAULT '[]'::jsonb,
  ranked JSONB NOT NULL DEFAULT '{"season":1,"rating":1000,"peakRating":1000,"placementsLeft":5,"wins":0,"losses":0}'::jsonb
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions (expires_at);

CREATE TABLE IF NOT EXISTS social_edges (
  from_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (from_id, to_id)
);
CREATE INDEX IF NOT EXISTS social_edges_to_idx ON social_edges (to_id);

CREATE TABLE IF NOT EXISTS direct_messages (
  id TEXT PRIMARY KEY,
  from_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS direct_messages_pair_idx ON direct_messages (from_id, to_id, created_at DESC);
CREATE INDEX IF NOT EXISTS direct_messages_unread_idx ON direct_messages (to_id) WHERE read_at IS NULL;
