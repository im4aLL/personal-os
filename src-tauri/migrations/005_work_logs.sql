CREATE TABLE IF NOT EXISTS work_logs (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT,
  start_date  TEXT NOT NULL,   -- YYYY-MM-DD
  end_date    TEXT NOT NULL,   -- YYYY-MM-DD
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS work_log_tags (
  id           TEXT PRIMARY KEY,
  work_log_id  TEXT NOT NULL REFERENCES work_logs(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  created_at   TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_work_logs_start_date        ON work_logs (start_date DESC);
CREATE INDEX IF NOT EXISTS idx_work_log_tags_work_log_id   ON work_log_tags (work_log_id);
CREATE INDEX IF NOT EXISTS idx_work_log_tags_name          ON work_log_tags (name);
