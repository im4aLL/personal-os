import { getDb } from "#lib/db"
import { syncTodos } from "#lib/sync"
import { tursoExecute } from "#lib/turso"
import { getAppMode } from "#lib/config"
import { randomUUID } from "#lib/uuid"
import type {
  Project, ProjectPhase, WorkItem, WorkItemWithPhase,
  CreateProjectInput, UpdateProjectInput,
  CreatePhaseInput, UpdatePhaseInput,
  CreateWorkItemInput, UpdateWorkItemInput,
} from "#lib/types/project"

function backgroundSync() {
  if (getAppMode() !== "cloud") return
  syncTodos({ silent: true }).catch(err => console.warn("Projects background sync failed:", err))
}

// ── Raw DB row helpers ────────────────────────────────────────────────────────

interface WorkItemRow extends Omit<WorkItem, "is_separator"> {
  is_separator: number
}

function toWorkItem(row: WorkItemRow): WorkItem {
  return { ...row, is_separator: row.is_separator === 1 }
}

// ── Projects ──────────────────────────────────────────────────────────────────

export async function getProjects(): Promise<Project[]> {
  const db = await getDb()
  return db.select<Project[]>("SELECT * FROM projects ORDER BY created_at ASC")
}

export async function createProject(input: CreateProjectInput): Promise<Project> {
  const db  = await getDb()
  const id  = randomUUID()
  const now = new Date().toISOString()
  const project: Project = { id, ...input, created_at: now, updated_at: now }

  await db.execute(
    "INSERT INTO projects (id,name,start_date,week_count,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6)",
    [id, input.name, input.start_date, input.week_count, now, now]
  )
  if (getAppMode() === "cloud") {
    await tursoExecute(
      "INSERT OR IGNORE INTO projects (id,name,start_date,week_count,created_at,updated_at) VALUES (?,?,?,?,?,?)",
      [id, input.name, input.start_date, input.week_count, now, now]
    )
  }
  backgroundSync()
  return project
}

export async function updateProject(id: string, input: UpdateProjectInput): Promise<void> {
  const db         = await getDb()
  const updated_at = new Date().toISOString()
  const fields     = Object.keys(input) as (keyof UpdateProjectInput)[]
  const setClauses = fields.map((f, i) => `${f} = $${i + 1}`).join(", ")
  const values     = fields.map(f => input[f] ?? null)

  await db.execute(
    `UPDATE projects SET ${setClauses}, updated_at = $${fields.length + 1} WHERE id = $${fields.length + 2}`,
    [...values, updated_at, id]
  )
  if (getAppMode() === "cloud") {
    const setClouds = fields.map(f => `${f} = ?`).join(", ")
    await tursoExecute(`UPDATE projects SET ${setClouds}, updated_at = ? WHERE id = ?`, [...values, updated_at, id])
  }
  backgroundSync()
}

export async function deleteProject(id: string): Promise<void> {
  const db = await getDb()
  await db.execute("DELETE FROM projects WHERE id = $1", [id])
  if (getAppMode() === "cloud") {
    await tursoExecute("DELETE FROM projects WHERE id = ?", [id])
  }
  backgroundSync()
}

// ── Phases ────────────────────────────────────────────────────────────────────

export async function getPhasesForProject(projectId: string): Promise<ProjectPhase[]> {
  const db = await getDb()
  return db.select<ProjectPhase[]>(
    "SELECT * FROM project_phases WHERE project_id = $1 ORDER BY position ASC",
    [projectId]
  )
}

export async function createPhase(projectId: string, input: CreatePhaseInput, position: number): Promise<ProjectPhase> {
  const db  = await getDb()
  const id  = randomUUID()
  const now = new Date().toISOString()
  const phase: ProjectPhase = { id, project_id: projectId, ...input, position, created_at: now }

  await db.execute(
    "INSERT INTO project_phases (id,project_id,name,color,position,created_at) VALUES ($1,$2,$3,$4,$5,$6)",
    [id, projectId, input.name, input.color, position, now]
  )
  if (getAppMode() === "cloud") {
    await tursoExecute(
      "INSERT OR IGNORE INTO project_phases (id,project_id,name,color,position,created_at) VALUES (?,?,?,?,?,?)",
      [id, projectId, input.name, input.color, position, now]
    )
  }
  backgroundSync()
  return phase
}

export async function updatePhase(id: string, input: UpdatePhaseInput): Promise<void> {
  const db     = await getDb()
  const fields = Object.keys(input) as (keyof UpdatePhaseInput)[]
  const setClauses = fields.map((f, i) => `${f} = $${i + 1}`).join(", ")
  const values     = fields.map(f => input[f] ?? null)

  await db.execute(`UPDATE project_phases SET ${setClauses} WHERE id = $${fields.length + 1}`, [...values, id])
  if (getAppMode() === "cloud") {
    const setClouds = fields.map(f => `${f} = ?`).join(", ")
    await tursoExecute(`UPDATE project_phases SET ${setClouds} WHERE id = ?`, [...values, id])
  }
  backgroundSync()
}

export async function deletePhase(id: string): Promise<void> {
  const db = await getDb()
  await db.execute("DELETE FROM project_phases WHERE id = $1", [id])
  if (getAppMode() === "cloud") {
    await tursoExecute("DELETE FROM project_phases WHERE id = ?", [id])
  }
  backgroundSync()
}

// ── Work items ────────────────────────────────────────────────────────────────

export async function getWorkItemsForProject(projectId: string): Promise<WorkItemWithPhase[]> {
  const db    = await getDb()
  const rows  = await db.select<WorkItemRow[]>(
    "SELECT * FROM work_items WHERE project_id = $1 ORDER BY position ASC",
    [projectId]
  )
  const phases = await getPhasesForProject(projectId)
  const phaseMap = new Map(phases.map(p => [p.id, p]))

  return rows.map(row => ({
    ...toWorkItem(row),
    phase: row.phase_id ? (phaseMap.get(row.phase_id) ?? null) : null,
  }))
}

export async function createWorkItem(projectId: string, input: CreateWorkItemInput): Promise<WorkItemWithPhase> {
  const db  = await getDb()
  const id  = randomUUID()
  const now = new Date().toISOString()

  const item: WorkItem = {
    id, project_id: projectId, ...input,
    created_at: now, updated_at: now,
  }

  await db.execute(
    `INSERT INTO work_items (id,project_id,phase_id,title,person,comment,jira_ticket,status,start_week,end_week,position,is_separator,created_at,updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
    [id, projectId, input.phase_id, input.title, input.person, input.comment, input.jira_ticket,
     input.status, input.start_week, input.end_week, input.position,
     input.is_separator ? 1 : 0, now, now]
  )
  if (getAppMode() === "cloud") {
    await tursoExecute(
      `INSERT OR IGNORE INTO work_items (id,project_id,phase_id,title,person,comment,jira_ticket,status,start_week,end_week,position,is_separator,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, projectId, input.phase_id, input.title, input.person, input.comment, input.jira_ticket,
       input.status, input.start_week, input.end_week, input.position,
       input.is_separator ? 1 : 0, now, now]
    )
  }
  backgroundSync()

  const phases = await getPhasesForProject(projectId)
  const phase  = input.phase_id ? (phases.find(p => p.id === input.phase_id) ?? null) : null
  return { ...item, phase }
}

export async function updateWorkItem(id: string, input: UpdateWorkItemInput): Promise<void> {
  const db         = await getDb()
  const updated_at = new Date().toISOString()
  const fields     = Object.keys(input) as (keyof UpdateWorkItemInput)[]
  const setClauses = fields.map((f, i) => `${f} = $${i + 1}`).join(", ")
  const values     = fields.map(f => input[f] ?? null)

  await db.execute(
    `UPDATE work_items SET ${setClauses}, updated_at = $${fields.length + 1} WHERE id = $${fields.length + 2}`,
    [...values, updated_at, id]
  )
  if (getAppMode() === "cloud") {
    const setClouds = fields.map(f => `${f} = ?`).join(", ")
    await tursoExecute(`UPDATE work_items SET ${setClouds}, updated_at = ? WHERE id = ?`, [...values, updated_at, id])
  }
  backgroundSync()
}

export async function deleteWorkItem(id: string): Promise<void> {
  const db = await getDb()
  await db.execute("DELETE FROM work_items WHERE id = $1", [id])
  if (getAppMode() === "cloud") await tursoExecute("DELETE FROM work_items WHERE id = ?", [id])
  backgroundSync()
}

export async function reorderWorkItems(_projectId: string, orderedIds: string[]): Promise<void> {
  const db         = await getDb()
  const updated_at = new Date().toISOString()
  for (let i = 0; i < orderedIds.length; i++) {
    await db.execute(
      "UPDATE work_items SET position = $1, updated_at = $2 WHERE id = $3",
      [i, updated_at, orderedIds[i]]
    )
  }
  backgroundSync()
}
