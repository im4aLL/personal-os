CREATE TABLE IF NOT EXISTS projects (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  start_date  TEXT NOT NULL,
  week_count  INTEGER NOT NULL DEFAULT 12,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS project_phases (
  id         TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  color      TEXT NOT NULL,
  position   INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS work_items (
  id           TEXT PRIMARY KEY,
  project_id   TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  phase_id     TEXT REFERENCES project_phases(id),
  title        TEXT NOT NULL DEFAULT '',
  person       TEXT,
  comment      TEXT,
  status       TEXT NOT NULL DEFAULT 'pending',
  start_week   INTEGER NOT NULL DEFAULT 1,
  end_week     INTEGER NOT NULL DEFAULT 1,
  position     INTEGER NOT NULL DEFAULT 0,
  is_separator INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL,
  CONSTRAINT chk_status CHECK (status IN ('pending','in_progress','done'))
);

CREATE INDEX IF NOT EXISTS idx_project_phases_project ON project_phases (project_id, position);
CREATE INDEX IF NOT EXISTS idx_work_items_project     ON work_items (project_id, position);
