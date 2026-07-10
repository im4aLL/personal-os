export interface Note {
  id:         string
  title:      string | null   // null = show formatted created_at as display title
  content:    string
  created_at: string          // ISO datetime string
  updated_at: string          // ISO datetime string
}

export interface NoteTag {
  id:         string
  note_id:    string
  name:       string
  created_at: string
}

export interface NoteWithTags extends Note {
  tags: string[]
}

export type UpdateNoteInput = Partial<Pick<Note, "title" | "content">>

export function noteDisplayTitle(note: Pick<Note, "title" | "created_at">): string {
  if (note.title?.trim()) return note.title
  const d = new Date(note.created_at)
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
}
