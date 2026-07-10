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
]
