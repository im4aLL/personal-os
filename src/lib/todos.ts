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

export async function getTodos(): Promise<Todo[]> {
  const db = await getDb()
  return db.select<Todo[]>(
    "SELECT * FROM todos ORDER BY position ASC, created_at ASC"
  )
}

export async function getTodosByStatus(status: Todo["status"]): Promise<Todo[]> {
  const db = await getDb()
  return db.select<Todo[]>(
    "SELECT * FROM todos WHERE status = $1 ORDER BY position ASC, created_at ASC",
    [status]
  )
}

export async function searchTodos(query: string): Promise<Todo[]> {
  const db = await getDb()
  const like = `%${query}%`
  return db.select<Todo[]>(
    "SELECT * FROM todos WHERE title LIKE $1 OR description LIKE $2 ORDER BY position ASC, created_at ASC",
    [like, like]
  )
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
    created_at:  now,
    updated_at:  now,
  }

  await db.execute(
    `INSERT INTO todos (id, title, description, status, priority, due_date, position, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [todo.id, todo.title, todo.description, todo.status, todo.priority,
     todo.due_date, todo.position, todo.created_at, todo.updated_at]
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
  const db = await getDb()
  await db.execute("DELETE FROM todos WHERE id = $1", [id])
  // In cloud mode, delete from Turso immediately — otherwise the next
  // background sync would see the todo still in the remote and pull it back.
  if (getAppMode() === "cloud") {
    await tursoExecute("DELETE FROM todos WHERE id = ?", [id])
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
