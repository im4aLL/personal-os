CREATE TABLE IF NOT EXISTS todos (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'todo',
  priority    TEXT DEFAULT 'medium',
  due_date    TEXT,
  position    INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),

  CONSTRAINT chk_status   CHECK (status   IN ('todo', 'in_progress', 'completed')),
  CONSTRAINT chk_priority CHECK (priority IN ('low', 'medium', 'high'))
);

CREATE INDEX IF NOT EXISTS idx_todos_status   ON todos (status);
CREATE INDEX IF NOT EXISTS idx_todos_due_date ON todos (due_date);
