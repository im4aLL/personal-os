import { getDb } from "#lib/db"
import { syncTodos } from "#lib/sync"
import { tursoExecute } from "#lib/turso"
import { getAppMode } from "#lib/config"
import { randomUUID } from "#lib/uuid"
import type { Note, NoteTag, NoteWithTags, UpdateNoteInput } from "#lib/types/note"

function backgroundSync() {
  if (getAppMode() !== "cloud") return
  syncTodos({ silent: true }).catch(err => console.warn("Notes background sync failed:", err))
}

// ── Queries ──────────────────────────────────────────────────────────────────

export async function getNotes(): Promise<Note[]> {
  const db = await getDb()
  return db.select<Note[]>(
    "SELECT * FROM notes ORDER BY updated_at DESC"
  )
}

export async function searchNotes(query: string): Promise<Note[]> {
  const db   = await getDb()
  const like = `%${query}%`
  return db.select<Note[]>(
    "SELECT * FROM notes WHERE title LIKE $1 OR content LIKE $2 ORDER BY updated_at DESC",
    [like, like]
  )
}

export async function getNoteById(id: string): Promise<NoteWithTags | null> {
  const db    = await getDb()
  const rows  = await db.select<Note[]>("SELECT * FROM notes WHERE id = $1", [id])
  if (!rows.length) return null
  const tags  = await getTagsForNote(id)
  return { ...rows[0], tags }
}

// ── Mutations ────────────────────────────────────────────────────────────────

export async function createNote(): Promise<Note> {
  const db  = await getDb()
  const id  = randomUUID()
  const now = new Date().toISOString()

  const note: Note = { id, title: null, content: "", created_at: now, updated_at: now }

  await db.execute(
    "INSERT INTO notes (id, title, content, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)",
    [note.id, note.title, note.content, note.created_at, note.updated_at]
  )

  backgroundSync()
  return note
}

export async function updateNote(id: string, input: UpdateNoteInput): Promise<void> {
  const db         = await getDb()
  const updated_at = new Date().toISOString()
  const fields     = Object.keys(input) as (keyof UpdateNoteInput)[]
  const setClauses = fields.map((f, i) => `${f} = $${i + 1}`).join(", ")
  const values     = fields.map(f => (input[f] === undefined ? null : (input[f] ?? null)))

  await db.execute(
    `UPDATE notes SET ${setClauses}, updated_at = $${fields.length + 1} WHERE id = $${fields.length + 2}`,
    [...values, updated_at, id]
  )

  backgroundSync()
}

export async function deleteNote(id: string): Promise<void> {
  const db = await getDb()
  await db.execute("DELETE FROM notes WHERE id = $1", [id])
  if (getAppMode() === "cloud") {
    await tursoExecute("DELETE FROM notes WHERE id = ?", [id])
    await tursoExecute("DELETE FROM note_tags WHERE note_id = ?", [id])
  }
  backgroundSync()
}

// ── Tags ─────────────────────────────────────────────────────────────────────

export async function getTagsForNote(noteId: string): Promise<string[]> {
  const db   = await getDb()
  const rows = await db.select<NoteTag[]>(
    "SELECT * FROM note_tags WHERE note_id = $1 ORDER BY created_at ASC",
    [noteId]
  )
  return rows.map(r => r.name)
}

export async function setTagsForNote(noteId: string, tags: string[]): Promise<void> {
  const db  = await getDb()
  const now = new Date().toISOString()

  // Generate IDs once so local and remote rows share the same UUID.
  // If IDs differed, sync would treat them as separate rows and re-insert duplicates.
  const rows = tags.map(name => ({ id: randomUUID(), name }))

  // Replace all tags atomically
  await db.execute("DELETE FROM note_tags WHERE note_id = $1", [noteId])
  for (const { id, name } of rows) {
    await db.execute(
      "INSERT INTO note_tags (id, note_id, name, created_at) VALUES ($1, $2, $3, $4)",
      [id, noteId, name, now]
    )
  }

  if (getAppMode() === "cloud") {
    await tursoExecute("DELETE FROM note_tags WHERE note_id = ?", [noteId])
    for (const { id, name } of rows) {
      await tursoExecute(
        "INSERT OR IGNORE INTO note_tags (id, note_id, name, created_at) VALUES (?,?,?,?)",
        [id, noteId, name, now]
      )
    }
  }
}
