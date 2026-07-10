import { getDb } from "#lib/db"
import { syncTodos } from "#lib/sync"
import { tursoExecute } from "#lib/turso"
import { getAppMode } from "#lib/config"
import { randomUUID } from "#lib/uuid"
import type {
  WorkLog, WorkLogTag, WorkLogWithTags,
  CreateWorkLogInput, UpdateWorkLogInput, WorkLogFilter,
} from "#lib/types/work-log"

function backgroundSync() {
  if (getAppMode() !== "cloud") return
  syncTodos({ silent: true }).catch(err => console.warn("Work log background sync failed:", err))
}

// ── Queries ──────────────────────────────────────────────────────────────────

export async function getWorkLogs(filter?: WorkLogFilter): Promise<WorkLogWithTags[]> {
  const db = await getDb()

  let sql    = "SELECT * FROM work_logs"
  const args: unknown[] = []
  const clauses: string[] = []

  if (filter?.query?.trim()) {
    clauses.push(`title LIKE $${args.length + 1}`)
    args.push(`%${filter.query.trim()}%`)
  }
  if (filter?.dateFrom) {
    clauses.push(`end_date >= $${args.length + 1}`)
    args.push(filter.dateFrom)
  }
  if (filter?.dateTo) {
    clauses.push(`start_date <= $${args.length + 1}`)
    args.push(filter.dateTo)
  }

  if (clauses.length) sql += " WHERE " + clauses.join(" AND ")
  sql += " ORDER BY start_date DESC, created_at DESC"

  const logs = await db.select<WorkLog[]>(sql, args)
  const tags = await db.select<WorkLogTag[]>("SELECT * FROM work_log_tags ORDER BY created_at ASC")

  const tagMap = new Map<string, string[]>()
  for (const tag of tags) {
    const list = tagMap.get(tag.work_log_id) ?? []
    list.push(tag.name)
    tagMap.set(tag.work_log_id, list)
  }

  return logs.map(l => ({ ...l, tags: tagMap.get(l.id) ?? [] }))
}

export async function getAllUsedTags(): Promise<string[]> {
  const db   = await getDb()
  const rows = await db.select<{ name: string }[]>(
    "SELECT DISTINCT name FROM work_log_tags ORDER BY name ASC"
  )
  return rows.map(r => r.name)
}

// ── Mutations ────────────────────────────────────────────────────────────────

export async function createWorkLog(input: CreateWorkLogInput): Promise<WorkLogWithTags> {
  const db  = await getDb()
  const id  = randomUUID()
  const now = new Date().toISOString()

  const log: WorkLog = {
    id,
    title:       input.title,
    description: input.description,
    start_date:  input.start_date,
    end_date:    input.end_date,
    created_at:  now,
    updated_at:  now,
  }

  await db.execute(
    `INSERT INTO work_logs (id,title,description,start_date,end_date,created_at,updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [log.id, log.title, log.description, log.start_date, log.end_date, log.created_at, log.updated_at]
  )

  const tagRows = input.tags.map(name => ({ id: randomUUID(), name }))
  for (const { id: tagId, name } of tagRows) {
    await db.execute(
      "INSERT INTO work_log_tags (id,work_log_id,name,created_at) VALUES ($1,$2,$3,$4)",
      [tagId, log.id, name, now]
    )
  }

  if (getAppMode() === "cloud") {
    await tursoExecute(
      `INSERT OR IGNORE INTO work_logs (id,title,description,start_date,end_date,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?)`,
      [log.id, log.title, log.description, log.start_date, log.end_date, log.created_at, log.updated_at]
    )
    for (const { id: tagId, name } of tagRows) {
      await tursoExecute(
        "INSERT OR IGNORE INTO work_log_tags (id,work_log_id,name,created_at) VALUES (?,?,?,?)",
        [tagId, log.id, name, now]
      )
    }
  }

  backgroundSync()
  return { ...log, tags: input.tags }
}

export async function updateWorkLog(id: string, input: UpdateWorkLogInput): Promise<void> {
  const db         = await getDb()
  const updated_at = new Date().toISOString()
  const fields     = Object.keys(input) as (keyof UpdateWorkLogInput)[]
  const setClauses = fields.map((f, i) => `${f} = $${i + 1}`).join(", ")
  const values     = fields.map(f => input[f] ?? null)

  await db.execute(
    `UPDATE work_logs SET ${setClauses}, updated_at = $${fields.length + 1} WHERE id = $${fields.length + 2}`,
    [...values, updated_at, id]
  )

  if (getAppMode() === "cloud") {
    const setClouds = fields.map((f) => `${f} = ?`).join(", ")
    await tursoExecute(
      `UPDATE work_logs SET ${setClouds}, updated_at = ? WHERE id = ?`,
      [...values, updated_at, id]
    )
  }

  backgroundSync()
}

export async function deleteWorkLog(id: string): Promise<void> {
  const db = await getDb()
  await db.execute("DELETE FROM work_logs WHERE id = $1", [id])

  if (getAppMode() === "cloud") {
    await tursoExecute("DELETE FROM work_logs WHERE id = ?", [id])
    await tursoExecute("DELETE FROM work_log_tags WHERE work_log_id = ?", [id])
  }

  backgroundSync()
}

export async function setTagsForWorkLog(workLogId: string, tags: string[]): Promise<void> {
  const db  = await getDb()
  const now = new Date().toISOString()
  const rows = tags.map(name => ({ id: randomUUID(), name }))

  await db.execute("DELETE FROM work_log_tags WHERE work_log_id = $1", [workLogId])
  for (const { id, name } of rows) {
    await db.execute(
      "INSERT INTO work_log_tags (id,work_log_id,name,created_at) VALUES ($1,$2,$3,$4)",
      [id, workLogId, name, now]
    )
  }

  if (getAppMode() === "cloud") {
    await tursoExecute("DELETE FROM work_log_tags WHERE work_log_id = ?", [workLogId])
    for (const { id, name } of rows) {
      await tursoExecute(
        "INSERT OR IGNORE INTO work_log_tags (id,work_log_id,name,created_at) VALUES (?,?,?,?)",
        [id, workLogId, name, now]
      )
    }
  }
}
