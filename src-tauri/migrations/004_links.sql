CREATE TABLE IF NOT EXISTS links (
  id          TEXT PRIMARY KEY,
  url         TEXT NOT NULL,
  title       TEXT NOT NULL,
  favicon_url TEXT,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  CONSTRAINT uq_links_url UNIQUE (url)
);

CREATE TABLE IF NOT EXISTS link_tags (
  id         TEXT PRIMARY KEY,
  link_id    TEXT NOT NULL REFERENCES links(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_links_created_at  ON links (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_link_tags_link_id ON link_tags (link_id);
CREATE INDEX IF NOT EXISTS idx_link_tags_name    ON link_tags (name);
