-- Migration 0001: Initial schema for OsuYuzu Skins
-- Tables: admin, sessions, skins, tags, skin_tags

CREATE TABLE IF NOT EXISTS admin (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  totp_secret TEXT,
  totp_enabled INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  admin_id INTEGER NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (admin_id) REFERENCES admin(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#34d399',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS skins (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  image_key TEXT,
  skin_file_key TEXT,
  skin_file_name TEXT,
  skin_file_size INTEGER DEFAULT 0,
  download_url TEXT,
  forum_link TEXT,
  order_position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS skin_tags (
  skin_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  PRIMARY KEY (skin_id, tag_id),
  FOREIGN KEY (skin_id) REFERENCES skins(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Index for ordering skins efficiently
CREATE INDEX IF NOT EXISTS idx_skins_order ON skins(order_position);

-- Index for session lookups & cleanup
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- Insert default tags
INSERT OR IGNORE INTO tags (id, name, color) VALUES
  ('tag-stream', 'Stream', '#ef4444'),
  ('tag-aim', 'Aim', '#3b82f6'),
  ('tag-hd', 'HD', '#8b5cf6'),
  ('tag-dt', 'DT', '#f59e0b'),
  ('tag-hr', 'HR', '#ec4899'),
  ('tag-nm', 'NM', '#10b981'),
  ('tag-tech', 'Tech', '#06b6d4'),
  ('tag-aesthetic', 'Aesthetic', '#f472b6');
