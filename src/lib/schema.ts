// All remote Turso table definitions.
// Run these on setup so a new user's DB is ready immediately.
// Each statement uses IF NOT EXISTS so it's safe to run repeatedly.

export const REMOTE_SCHEMAS = [
  `CREATE TABLE IF NOT EXISTS todos (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
    description TEXT,
    status      TEXT NOT NULL DEFAULT 'todo',
    priority    TEXT,
    due_date    TEXT,
    position    INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL,
    CONSTRAINT chk_status   CHECK (status   IN ('todo','in_progress','completed')),
    CONSTRAINT chk_priority CHECK (priority IN ('low','medium','high'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_todos_status   ON todos (status)`,
  `CREATE INDEX IF NOT EXISTS idx_todos_due_date ON todos (due_date)`,
  `CREATE TABLE IF NOT EXISTS app_settings (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS notes (
    id         TEXT PRIMARY KEY,
    title      TEXT,
    content    TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_notes_updated_at  ON notes (updated_at DESC)`,
  `CREATE TABLE IF NOT EXISTS note_tags (
    id         TEXT PRIMARY KEY,
    note_id    TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_note_tags_note_id ON note_tags (note_id)`,
  `CREATE INDEX IF NOT EXISTS idx_note_tags_name    ON note_tags (name)`,
  `CREATE TABLE IF NOT EXISTS links (
    id          TEXT PRIMARY KEY,
    url         TEXT NOT NULL,
    title       TEXT NOT NULL,
    favicon_url TEXT,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL,
    CONSTRAINT uq_links_url UNIQUE (url)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_links_created_at  ON links (created_at DESC)`,
  `CREATE TABLE IF NOT EXISTS link_tags (
    id         TEXT PRIMARY KEY,
    link_id    TEXT NOT NULL REFERENCES links(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_link_tags_link_id ON link_tags (link_id)`,
  `CREATE INDEX IF NOT EXISTS idx_link_tags_name    ON link_tags (name)`,
  `CREATE TABLE IF NOT EXISTS work_logs (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
    description TEXT,
    start_date  TEXT NOT NULL,
    end_date    TEXT NOT NULL,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_work_logs_start_date ON work_logs (start_date DESC)`,
  `CREATE TABLE IF NOT EXISTS work_log_tags (
    id          TEXT PRIMARY KEY,
    work_log_id TEXT NOT NULL REFERENCES work_logs(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    created_at  TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_work_log_tags_work_log_id ON work_log_tags (work_log_id)`,
  `CREATE INDEX IF NOT EXISTS idx_work_log_tags_name        ON work_log_tags (name)`,
  `CREATE TABLE IF NOT EXISTS projects (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    start_date TEXT NOT NULL,
    week_count INTEGER NOT NULL DEFAULT 12,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS project_phases (
    id         TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    color      TEXT NOT NULL,
    position   INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_project_phases_project ON project_phases (project_id, position)`,
  `CREATE TABLE IF NOT EXISTS work_items (
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
    jira_ticket  TEXT,
    created_at   TEXT NOT NULL,
    updated_at   TEXT NOT NULL,
    CONSTRAINT chk_status CHECK (status IN ('pending','in_progress','done'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_work_items_project ON work_items (project_id, position)`,
  // Additive migration for existing remote tables — ensureRemoteSchema ignores
  // the "duplicate column" error when the column already exists.
  `ALTER TABLE work_items ADD COLUMN jira_ticket TEXT`,
]

// Applies every remote schema statement, tolerating "duplicate column" errors
// thrown by ALTER TABLE ADD COLUMN when the column already exists.
// Used by both the setup flow and background sync.
export async function applyRemoteSchema(
  exec: (sql: string) => Promise<void>
): Promise<void> {
  for (const sql of REMOTE_SCHEMAS) {
    try {
      await exec(sql)
    } catch (err) {
      const msg = (err instanceof Error ? err.message : String(err)).toLowerCase()
      if (!msg.includes("duplicate column")) throw err
    }
  }
}
