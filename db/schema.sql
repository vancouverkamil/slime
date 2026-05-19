CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  stats JSONB NOT NULL DEFAULT '{"matches":0,"wins":0,"losses":0,"pointsFor":0,"pointsAgainst":0}'::jsonb,
  slime JSONB NOT NULL DEFAULT '{"color":"#00ff00","hat":"none","hatAnim":"none","hatDrawing":[]}'::jsonb,
  achievements JSONB NOT NULL DEFAULT '[]'::jsonb,
  recent_matches JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions (expires_at);
