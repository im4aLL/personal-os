import { getDb } from "#lib/db"
import { tursoExecute, tursoSelect } from "#lib/turso"
import { applyRemoteSchema } from "#lib/schema"
import type { Todo } from "#lib/types/todo"
import type { Note, NoteTag } from "#lib/types/note"
import type { Link, LinkTag } from "#lib/types/link"
import type { WorkLog, WorkLogTag } from "#lib/types/work-log"
import type { Project, ProjectPhase, WorkItem } from "#lib/types/project"
import { useTodosStore } from "#store/todos"
import { useNotesStore } from "#store/notes"
import { useLinksStore } from "#store/links"
import { useWorkLogsStore } from "#store/work-logs"
import { useProjectsStore } from "#store/projects"

async function ensureRemoteSchema() {
  await applyRemoteSchema(tursoExecute)
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

export async function syncTodos(options: { silent?: boolean } = {}): Promise<void> {
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

  await syncNotes()
  await syncLinks()
  await syncWorkLogs()
  await syncProjects()

  if (!options.silent) {
    useTodosStore.getState().refreshTodos()
    useNotesStore.getState().refreshNotes()
    useLinksStore.getState().refreshLinks()
    useWorkLogsStore.getState().refreshWorkLogs()
    useProjectsStore.getState().refreshProjects()
  }
}

async function syncNotes(): Promise<void> {
  const db = await getDb()

  const [remoteNotes, localNotes] = await Promise.all([
    tursoSelect<Note>("SELECT * FROM notes"),
    db.select<Note[]>("SELECT * FROM notes"),
  ])

  const remoteMap = new Map(remoteNotes.map(n => [n.id, n]))
  const localMap  = new Map(localNotes.map(n => [n.id, n]))

  // Pull: remote → local
  for (const remote of remoteNotes) {
    const local = localMap.get(remote.id)
    if (!local) {
      await db.execute(
        `INSERT OR IGNORE INTO notes (id,title,content,created_at,updated_at)
         VALUES ($1,$2,$3,$4,$5)`,
        [remote.id, remote.title, remote.content, remote.created_at, remote.updated_at]
      )
    } else if (remote.updated_at > local.updated_at) {
      await db.execute(
        "UPDATE notes SET title=$1,content=$2,updated_at=$3 WHERE id=$4",
        [remote.title, remote.content, remote.updated_at, remote.id]
      )
    }
  }

  // Push: local → remote
  for (const local of localNotes) {
    const remote = remoteMap.get(local.id)
    if (!remote) {
      await tursoExecute(
        `INSERT OR IGNORE INTO notes (id,title,content,created_at,updated_at)
         VALUES (?,?,?,?,?)`,
        [local.id, local.title, local.content, local.created_at, local.updated_at]
      )
    } else if (local.updated_at > remote.updated_at) {
      await tursoExecute(
        "UPDATE notes SET title=?,content=?,updated_at=? WHERE id=?",
        [local.title, local.content, local.updated_at, local.id]
      )
    }
  }

  // Sync note_tags (INSERT OR IGNORE both ways — no updated_at, no tombstones)
  const [remoteTags, localTags] = await Promise.all([
    tursoSelect<NoteTag>("SELECT * FROM note_tags"),
    db.select<NoteTag[]>("SELECT * FROM note_tags"),
  ])

  const remoteTagIds = new Set(remoteTags.map(t => t.id))
  const localTagIds  = new Set(localTags.map(t => t.id))

  // Pull tags that exist remotely but not locally (only for notes we have)
  for (const tag of remoteTags) {
    if (!localTagIds.has(tag.id) && localMap.has(tag.note_id)) {
      await db.execute(
        "INSERT OR IGNORE INTO note_tags (id,note_id,name,created_at) VALUES ($1,$2,$3,$4)",
        [tag.id, tag.note_id, tag.name, tag.created_at]
      )
    }
  }

  // Push tags that exist locally but not remotely (only for notes we pushed)
  for (const tag of localTags) {
    if (!remoteTagIds.has(tag.id) && remoteMap.has(tag.note_id)) {
      await tursoExecute(
        "INSERT OR IGNORE INTO note_tags (id,note_id,name,created_at) VALUES (?,?,?,?)",
        [tag.id, tag.note_id, tag.name, tag.created_at]
      )
    }
  }
}

async function syncLinks(): Promise<void> {
  const db = await getDb()

  const [remoteLinks, localLinks] = await Promise.all([
    tursoSelect<Link>("SELECT * FROM links"),
    db.select<Link[]>("SELECT * FROM links"),
  ])

  const remoteMap = new Map(remoteLinks.map(l => [l.id, l]))
  const localMap  = new Map(localLinks.map(l => [l.id, l]))

  // Pull: remote → local
  for (const remote of remoteLinks) {
    const local = localMap.get(remote.id)
    if (!local) {
      await db.execute(
        `INSERT OR IGNORE INTO links (id,url,title,favicon_url,created_at,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [remote.id, remote.url, remote.title, remote.favicon_url, remote.created_at, remote.updated_at]
      )
    } else if (remote.updated_at > local.updated_at) {
      await db.execute(
        "UPDATE links SET title=$1,favicon_url=$2,updated_at=$3 WHERE id=$4",
        [remote.title, remote.favicon_url, remote.updated_at, remote.id]
      )
    }
  }

  // Push: local → remote
  for (const local of localLinks) {
    const remote = remoteMap.get(local.id)
    if (!remote) {
      await tursoExecute(
        `INSERT OR IGNORE INTO links (id,url,title,favicon_url,created_at,updated_at)
         VALUES (?,?,?,?,?,?)`,
        [local.id, local.url, local.title, local.favicon_url, local.created_at, local.updated_at]
      )
    } else if (local.updated_at > remote.updated_at) {
      await tursoExecute(
        "UPDATE links SET title=?,favicon_url=?,updated_at=? WHERE id=?",
        [local.title, local.favicon_url, local.updated_at, local.id]
      )
    }
  }

  // Sync link_tags (INSERT OR IGNORE both ways)
  const [remoteTags, localTags] = await Promise.all([
    tursoSelect<LinkTag>("SELECT * FROM link_tags"),
    db.select<LinkTag[]>("SELECT * FROM link_tags"),
  ])

  const remoteTagIds = new Set(remoteTags.map(t => t.id))
  const localTagIds  = new Set(localTags.map(t => t.id))

  for (const tag of remoteTags) {
    if (!localTagIds.has(tag.id) && localMap.has(tag.link_id)) {
      await db.execute(
        "INSERT OR IGNORE INTO link_tags (id,link_id,name,created_at) VALUES ($1,$2,$3,$4)",
        [tag.id, tag.link_id, tag.name, tag.created_at]
      )
    }
  }

  for (const tag of localTags) {
    if (!remoteTagIds.has(tag.id) && remoteMap.has(tag.link_id)) {
      await tursoExecute(
        "INSERT OR IGNORE INTO link_tags (id,link_id,name,created_at) VALUES (?,?,?,?)",
        [tag.id, tag.link_id, tag.name, tag.created_at]
      )
    }
  }
}

async function syncWorkLogs(): Promise<void> {
  const db = await getDb()

  const [remoteLogs, localLogs] = await Promise.all([
    tursoSelect<WorkLog>("SELECT * FROM work_logs"),
    db.select<WorkLog[]>("SELECT * FROM work_logs"),
  ])

  const remoteMap = new Map(remoteLogs.map(l => [l.id, l]))
  const localMap  = new Map(localLogs.map(l => [l.id, l]))

  for (const remote of remoteLogs) {
    const local = localMap.get(remote.id)
    if (!local) {
      await db.execute(
        `INSERT OR IGNORE INTO work_logs (id,title,description,start_date,end_date,created_at,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [remote.id, remote.title, remote.description, remote.start_date, remote.end_date, remote.created_at, remote.updated_at]
      )
    } else if (remote.updated_at > local.updated_at) {
      await db.execute(
        `UPDATE work_logs SET title=$1,description=$2,start_date=$3,end_date=$4,updated_at=$5 WHERE id=$6`,
        [remote.title, remote.description, remote.start_date, remote.end_date, remote.updated_at, remote.id]
      )
    }
  }

  for (const local of localLogs) {
    const remote = remoteMap.get(local.id)
    if (!remote) {
      await tursoExecute(
        `INSERT OR IGNORE INTO work_logs (id,title,description,start_date,end_date,created_at,updated_at)
         VALUES (?,?,?,?,?,?,?)`,
        [local.id, local.title, local.description, local.start_date, local.end_date, local.created_at, local.updated_at]
      )
    } else if (local.updated_at > remote.updated_at) {
      await tursoExecute(
        `UPDATE work_logs SET title=?,description=?,start_date=?,end_date=?,updated_at=? WHERE id=?`,
        [local.title, local.description, local.start_date, local.end_date, local.updated_at, local.id]
      )
    }
  }

  const [remoteTags, localTags] = await Promise.all([
    tursoSelect<WorkLogTag>("SELECT * FROM work_log_tags"),
    db.select<WorkLogTag[]>("SELECT * FROM work_log_tags"),
  ])

  const remoteTagIds = new Set(remoteTags.map(t => t.id))
  const localTagIds  = new Set(localTags.map(t => t.id))

  for (const tag of remoteTags) {
    if (!localTagIds.has(tag.id) && localMap.has(tag.work_log_id)) {
      await db.execute(
        "INSERT OR IGNORE INTO work_log_tags (id,work_log_id,name,created_at) VALUES ($1,$2,$3,$4)",
        [tag.id, tag.work_log_id, tag.name, tag.created_at]
      )
    }
  }

  for (const tag of localTags) {
    if (!remoteTagIds.has(tag.id) && remoteMap.has(tag.work_log_id)) {
      await tursoExecute(
        "INSERT OR IGNORE INTO work_log_tags (id,work_log_id,name,created_at) VALUES (?,?,?,?)",
        [tag.id, tag.work_log_id, tag.name, tag.created_at]
      )
    }
  }
}

async function syncProjects(): Promise<void> {
  const db = await getDb()

  // ── projects ───────────────────────────────────────────────────────────────
  const [remoteProjects, localProjects] = await Promise.all([
    tursoSelect<Project>("SELECT * FROM projects"),
    db.select<Project[]>("SELECT * FROM projects"),
  ])
  const remoteProjectMap = new Map(remoteProjects.map(p => [p.id, p]))
  const localProjectMap  = new Map(localProjects.map(p => [p.id, p]))

  for (const r of remoteProjects) {
    const l = localProjectMap.get(r.id)
    if (!l) {
      await db.execute(
        "INSERT OR IGNORE INTO projects (id,name,start_date,week_count,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6)",
        [r.id, r.name, r.start_date, r.week_count, r.created_at, r.updated_at]
      )
    } else if (r.updated_at > l.updated_at) {
      await db.execute(
        "UPDATE projects SET name=$1,start_date=$2,week_count=$3,updated_at=$4 WHERE id=$5",
        [r.name, r.start_date, r.week_count, r.updated_at, r.id]
      )
    }
  }
  for (const l of localProjects) {
    const r = remoteProjectMap.get(l.id)
    if (!r) {
      await tursoExecute(
        "INSERT OR IGNORE INTO projects (id,name,start_date,week_count,created_at,updated_at) VALUES (?,?,?,?,?,?)",
        [l.id, l.name, l.start_date, l.week_count, l.created_at, l.updated_at]
      )
    } else if (l.updated_at > r.updated_at) {
      await tursoExecute(
        "UPDATE projects SET name=?,start_date=?,week_count=?,updated_at=? WHERE id=?",
        [l.name, l.start_date, l.week_count, l.updated_at, l.id]
      )
    }
  }

  // ── project_phases (INSERT OR IGNORE — no updated_at) ────────────────────
  const [remotePhases, localPhases] = await Promise.all([
    tursoSelect<ProjectPhase>("SELECT * FROM project_phases"),
    db.select<ProjectPhase[]>("SELECT * FROM project_phases"),
  ])
  const remotePhaseIds = new Set(remotePhases.map(p => p.id))
  const localPhaseIds  = new Set(localPhases.map(p => p.id))

  for (const p of remotePhases) {
    if (!localPhaseIds.has(p.id) && localProjectMap.has(p.project_id)) {
      await db.execute(
        "INSERT OR IGNORE INTO project_phases (id,project_id,name,color,position,created_at) VALUES ($1,$2,$3,$4,$5,$6)",
        [p.id, p.project_id, p.name, p.color, p.position, p.created_at]
      )
    }
  }
  for (const p of localPhases) {
    if (!remotePhaseIds.has(p.id) && remoteProjectMap.has(p.project_id)) {
      await tursoExecute(
        "INSERT OR IGNORE INTO project_phases (id,project_id,name,color,position,created_at) VALUES (?,?,?,?,?,?)",
        [p.id, p.project_id, p.name, p.color, p.position, p.created_at]
      )
    }
  }

  // ── work_items ─────────────────────────────────────────────────────────────
  const [remoteItems, localItems] = await Promise.all([
    tursoSelect<WorkItem>("SELECT * FROM work_items"),
    db.select<WorkItem[]>("SELECT * FROM work_items"),
  ])
  const remoteItemMap = new Map(remoteItems.map(i => [i.id, i]))
  const localItemMap  = new Map(localItems.map(i => [i.id, i]))

  for (const r of remoteItems) {
    const l = localItemMap.get(r.id)
    if (!l && localProjectMap.has(r.project_id)) {
      await db.execute(
        `INSERT OR IGNORE INTO work_items (id,project_id,phase_id,title,person,comment,jira_ticket,status,start_week,end_week,position,is_separator,created_at,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [r.id, r.project_id, r.phase_id, r.title, r.person, r.comment, r.jira_ticket,
         r.status, r.start_week, r.end_week, r.position, r.is_separator, r.created_at, r.updated_at]
      )
    } else if (l && r.updated_at > l.updated_at) {
      await db.execute(
        `UPDATE work_items SET phase_id=$1,title=$2,person=$3,comment=$4,jira_ticket=$5,status=$6,start_week=$7,end_week=$8,position=$9,updated_at=$10 WHERE id=$11`,
        [r.phase_id, r.title, r.person, r.comment, r.jira_ticket, r.status, r.start_week, r.end_week, r.position, r.updated_at, r.id]
      )
    }
  }
  for (const l of localItems) {
    const r = remoteItemMap.get(l.id)
    if (!r && remoteProjectMap.has(l.project_id)) {
      await tursoExecute(
        `INSERT OR IGNORE INTO work_items (id,project_id,phase_id,title,person,comment,jira_ticket,status,start_week,end_week,position,is_separator,created_at,updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [l.id, l.project_id, l.phase_id, l.title, l.person, l.comment, l.jira_ticket,
         l.status, l.start_week, l.end_week, l.position, l.is_separator, l.created_at, l.updated_at]
      )
    } else if (r && l.updated_at > r.updated_at) {
      await tursoExecute(
        `UPDATE work_items SET phase_id=?,title=?,person=?,comment=?,jira_ticket=?,status=?,start_week=?,end_week=?,position=?,updated_at=? WHERE id=?`,
        [l.phase_id, l.title, l.person, l.comment, l.jira_ticket, l.status, l.start_week, l.end_week, l.position, l.updated_at, l.id]
      )
    }
  }
}
