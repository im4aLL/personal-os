import { getDb } from "#lib/db"
import { syncTodos } from "#lib/sync"
import { tursoExecute } from "#lib/turso"
import { getAppMode } from "#lib/config"
import type { Todo, CreateTodoInput, UpdateTodoInput } from "#lib/types/todo"
import { randomUUID } from "#lib/uuid"

function backgroundSync() {
  if (getAppMode() !== "cloud") return
  // silent: true — don't dispatch sync-complete, UI state is already correct
  syncTodos({ silent: true }).catch(err => console.warn("Background sync failed:", err))
}

interface TodoRow extends Omit<Todo, "archived"> {
  archived: number
}

function toTodo(row: TodoRow): Todo {
  return { ...row, archived: row.archived === 1 }
}

export async function getTodos(): Promise<Todo[]> {
  const db = await getDb()
  const rows = await db.select<TodoRow[]>(
    "SELECT * FROM todos WHERE archived = 0 ORDER BY position ASC, created_at ASC"
  )
  return rows.map(toTodo)
}

export async function getTodosByStatus(status: Todo["status"]): Promise<Todo[]> {
  const db = await getDb()
  const rows = await db.select<TodoRow[]>(
    "SELECT * FROM todos WHERE status = $1 AND archived = 0 ORDER BY position ASC, created_at ASC",
    [status]
  )
  return rows.map(toTodo)
}

export async function searchTodos(query: string): Promise<Todo[]> {
  const db = await getDb()
  const like = `%${query}%`
  const rows = await db.select<TodoRow[]>(
    "SELECT * FROM todos WHERE (title LIKE $1 OR description LIKE $2) AND archived = 0 ORDER BY position ASC, created_at ASC",
    [like, like]
  )
  return rows.map(toTodo)
}

export async function getArchivedTodos(): Promise<Todo[]> {
  const db = await getDb()
  const rows = await db.select<TodoRow[]>(
    "SELECT * FROM todos WHERE archived = 1 ORDER BY updated_at DESC"
  )
  return rows.map(toTodo)
}

export async function createTodo(input: CreateTodoInput): Promise<Todo> {
  const db  = await getDb()
  const id  = randomUUID()
  const now = new Date().toISOString()

  const todo: Todo = {
    id,
    title:       input.title,
    description: input.description ?? null,
    status:      input.status ?? "todo",
    priority:    input.priority ?? null,
    due_date:    input.due_date ?? null,
    position:    input.position ?? 0,
    archived:    false,
    created_at:  now,
    updated_at:  now,
  }

  await db.execute(
    `INSERT INTO todos (id, title, description, status, priority, due_date, position, archived, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [todo.id, todo.title, todo.description, todo.status, todo.priority,
     todo.due_date, todo.position, todo.archived ? 1 : 0, todo.created_at, todo.updated_at]
  )

  backgroundSync()
  return todo
}

export async function updateTodo(id: string, input: UpdateTodoInput): Promise<void> {
  const db         = await getDb()
  const updated_at = new Date().toISOString()
  const fields     = Object.keys(input) as (keyof UpdateTodoInput)[]
  const setClauses = fields.map((f, i) => `${f} = $${i + 1}`).join(", ")
  const values     = fields.map((f) => input[f] ?? null)

  await db.execute(
    `UPDATE todos SET ${setClauses}, updated_at = $${fields.length + 1} WHERE id = $${fields.length + 2}`,
    [...values, updated_at, id]
  )

  backgroundSync()
}

export async function deleteTodo(id: string): Promise<void> {
  await deleteTodos([id])
}

export async function deleteTodos(ids: string[]): Promise<void> {
  if (!ids.length) return
  const db = await getDb()
  for (const id of ids) {
    await db.execute("DELETE FROM todos WHERE id = $1", [id])
  }
  // In cloud mode, delete from Turso immediately — otherwise the next
  // background sync would see the todos still in the remote and pull them back.
  if (getAppMode() === "cloud") {
    for (const id of ids) {
      await tursoExecute("DELETE FROM todos WHERE id = ?", [id])
    }
  }
  backgroundSync()
}

export async function archiveTodos(ids: string[]): Promise<void> {
  if (!ids.length) return
  const db         = await getDb()
  const updated_at = new Date().toISOString()
  for (const id of ids) {
    await db.execute(
      "UPDATE todos SET archived = 1, updated_at = $1 WHERE id = $2",
      [updated_at, id]
    )
  }
  backgroundSync()
}

export async function restoreTodos(ids: string[]): Promise<void> {
  if (!ids.length) return
  const db         = await getDb()
  const updated_at = new Date().toISOString()
  for (const id of ids) {
    await db.execute(
      "UPDATE todos SET archived = 0, updated_at = $1 WHERE id = $2",
      [updated_at, id]
    )
  }
  backgroundSync()
}

export async function updateTodoPositions(
  updates: { id: string; position: number }[]
): Promise<void> {
  const db         = await getDb()
  const updated_at = new Date().toISOString()
  for (const { id, position } of updates) {
    await db.execute(
      "UPDATE todos SET position = $1, updated_at = $2 WHERE id = $3",
      [position, updated_at, id]
    )
  }
  backgroundSync()
}
