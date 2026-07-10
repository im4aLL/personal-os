import { getDb } from "#lib/db"
import { tursoExecute, tursoSelect } from "#lib/turso"
import { REMOTE_SCHEMAS } from "#lib/schema"
import type { Todo } from "#lib/types/todo"

async function ensureRemoteSchema() {
  for (const sql of REMOTE_SCHEMAS) {
    await tursoExecute(sql)
  }
}

type SettingRow = { key: string; value: string; updated_at: string }

async function syncAppSettings() {
  const db = await getDb()
  const [remote, local] = await Promise.all([
    tursoSelect<SettingRow>("SELECT * FROM app_settings"),
    db.select<SettingRow[]>("SELECT * FROM app_settings"),
  ])

  const remoteMap = new Map(remote.map(r => [r.key, r]))
  const localMap  = new Map(local.map(r => [r.key, r]))

  for (const r of remote) {
    const l = localMap.get(r.key)
    if (!l) {
      await db.execute(
        "INSERT OR IGNORE INTO app_settings (key,value,updated_at) VALUES ($1,$2,$3)",
        [r.key, r.value, r.updated_at]
      )
    } else if (r.updated_at > l.updated_at) {
      await db.execute(
        "UPDATE app_settings SET value=$1,updated_at=$2 WHERE key=$3",
        [r.value, r.updated_at, r.key]
      )
    }
  }

  for (const l of local) {
    const r = remoteMap.get(l.key)
    if (!r) {
      await tursoExecute(
        "INSERT OR IGNORE INTO app_settings (key,value,updated_at) VALUES (?,?,?)",
        [l.key, l.value, l.updated_at]
      )
    } else if (l.updated_at > r.updated_at) {
      await tursoExecute(
        "UPDATE app_settings SET value=?,updated_at=? WHERE key=?",
        [l.value, l.updated_at, l.key]
      )
    }
  }
}

export async function syncTodos(): Promise<void> {
  await ensureRemoteSchema()
  await syncAppSettings()

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
