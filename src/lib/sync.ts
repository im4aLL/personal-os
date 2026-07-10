import { getDb } from "#lib/db"
import { tursoExecute, tursoSelect } from "#lib/turso"
import { REMOTE_SCHEMAS } from "#lib/schema"
import type { Todo } from "#lib/types/todo"

async function ensureRemoteSchema() {
  for (const sql of REMOTE_SCHEMAS) {
    await tursoExecute(sql)
  }
}

export async function syncTodos(): Promise<void> {
  await ensureRemoteSchema()

  const db = await getDb()
  const [remoteTodos, localTodos] = await Promise.all([
    tursoSelect<Todo>("SELECT * FROM todos"),
    db.select<Todo[]>("SELECT * FROM todos"),
  ])

  const remoteMap = new Map(remoteTodos.map(t => [t.id, t]))
  const localMap  = new Map(localTodos.map(t => [t.id, t]))

  // Pull: remote → local
  for (const remote of remoteTodos) {
    const local = localMap.get(remote.id)
    if (!local) {
      await db.execute(
        `INSERT OR IGNORE INTO todos
           (id,title,description,status,priority,due_date,position,created_at,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [remote.id, remote.title, remote.description, remote.status,
         remote.priority, remote.due_date, remote.position, remote.created_at, remote.updated_at]
      )
    } else if (remote.updated_at > local.updated_at) {
      await db.execute(
        `UPDATE todos SET title=$1,description=$2,status=$3,priority=$4,
         due_date=$5,position=$6,updated_at=$7 WHERE id=$8`,
        [remote.title, remote.description, remote.status, remote.priority,
         remote.due_date, remote.position, remote.updated_at, remote.id]
      )
    }
  }

  // Push: local → remote
  for (const local of localTodos) {
    const remote = remoteMap.get(local.id)
    if (!remote) {
      await tursoExecute(
        `INSERT OR IGNORE INTO todos
           (id,title,description,status,priority,due_date,position,created_at,updated_at)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [local.id, local.title, local.description, local.status,
         local.priority, local.due_date, local.position, local.created_at, local.updated_at]
      )
    } else if (local.updated_at > remote.updated_at) {
      await tursoExecute(
        `UPDATE todos SET title=?,description=?,status=?,priority=?,
         due_date=?,position=?,updated_at=? WHERE id=?`,
        [local.title, local.description, local.status, local.priority,
         local.due_date, local.position, local.updated_at, local.id]
      )
    }
  }

  window.dispatchEvent(new CustomEvent("personal-os:sync-complete"))
}
