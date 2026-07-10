# Notes Feature Plan

## Overview

A simple markdown note-taking feature. Notes live in the main content area with a
two-panel layout: list on the left, editor/preview on the right. Auto-saves as you type.
Tags for organisation. Full-text search across title and content.

---

## Decisions Log

| Question | Decision |
|----------|----------|
| Organisation | Tags — multiple per note |
| Editor style | Preview toggle — Edit mode / Read mode, switch with a button |
| List layout | Simple list (title + date) in left panel of main area |
| Saving | Auto-save with 1 second debounce, no publish/draft concept |
| Search | Title + content (SQLite LIKE) |
| Delete | Permanent — no trash |

---

## Database Schema

### Migration: `003_notes.sql`

```sql
CREATE TABLE IF NOT EXISTS notes (
  id         TEXT PRIMARY KEY,
  title      TEXT,                          -- nullable; UI shows datetime if empty
  content    TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS note_tags (
  id         TEXT PRIMARY KEY,
  note_id    TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notes_updated_at   ON notes (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_note_tags_note_id  ON note_tags (note_id);
CREATE INDEX IF NOT EXISTS idx_note_tags_name     ON note_tags (name);
```

**notes** — one row per note.  
**note_tags** — one row per tag per note. `ON DELETE CASCADE` removes tags when the
note is deleted.

---

## Remote Schema (Turso sync)

Add both tables + indexes to `REMOTE_SCHEMAS` in `src/lib/schema.ts`.
Add a `syncNotes()` function in `src/lib/sync.ts` that bidirectionally syncs
`notes` and `note_tags` tables (same last-write-wins pattern as todos).

---

## Data Access Layer

**File:** `src/lib/notes.ts`

```ts
getNotes()                        // all notes, ordered by updated_at DESC
searchNotes(query: string)        // LIKE on title + content
getNoteById(id: string)           // single note with tags
createNote()                      // blank note, returns Note
updateNote(id, input)             // title, content — triggers background sync
deleteNote(id)                    // permanent, removes tags via cascade
getTagsForNote(id)                // string[]
setTagsForNote(id, tags)          // replaces all tags for a note
```

**Types** (`src/lib/types/note.ts`):
```ts
interface Note {
  id:         string
  title:      string | null   // null = show formatted created_at as display title
  content:    string
  created_at: string
  updated_at: string
  tags?:      string[]        // populated when fetching single note
}

type CreateNoteInput = Record<string, never>   // always blank on create
type UpdateNoteInput = Partial<Pick<Note, 'title' | 'content'>>
```

**Display title helper:**
```ts
function noteDisplayTitle(note: Note): string {
  if (note.title?.trim()) return note.title
  const d = new Date(note.created_at)
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}
```

---

## Libraries

| Library | Purpose | Install |
|---------|---------|---------|
| `react-markdown` | Render markdown in preview mode | `npm install react-markdown` |
| `remark-gfm` | GitHub Flavored Markdown (tables, strikethrough, etc.) | `npm install remark-gfm` |
| `use-debounce` | Debounce auto-save (1 second) | `npm install use-debounce` |

No WYSIWYG editor — keep the editing surface a plain `<textarea>` styled cleanly.
This avoids large dependencies and keeps markdown transparent to the user.

---

## UI Layout

```
NotesPage
├── Left panel (280px, fixed)    src/components/notes/note-list.tsx
│   ├── Search bar
│   ├── New note button
│   └── NoteListItem × n         src/components/notes/note-list-item.tsx
│       ├── Title (or datetime fallback)
│       └── Date
└── Right panel (flex-1)
    ├── (empty state if no note selected)
    └── NoteEditor               src/components/notes/note-editor.tsx
        ├── Header
        │   ├── Title input
        │   ├── TagInput          src/components/notes/note-tag-input.tsx
        │   ├── Edit / Preview toggle button
        │   └── Delete button
        ├── Edit mode: <textarea> (markdown raw)
        └── Preview mode: <ReactMarkdown> (rendered)
```

---

## Component Details

### `note-list.tsx`
- Fetches all notes on mount
- Listens for `personal-os:sync-complete` → silent refresh
- Handles search input (debounced, calls `searchNotes()`)
- "New note" button → `createNote()` → selects the new note immediately
- Highlights selected note

### `note-editor.tsx`
- Receives selected `note` as prop
- Local state: `title`, `content`, `mode: 'edit' | 'preview'`
- Auto-save: `useDebounce(content, 1000)` + `useDebounce(title, 1000)` → calls `updateNote`
- Shows "Saving…" / "Saved" indicator near the toggle button
- Tag input below the title

### `note-tag-input.tsx`
- Displays existing tags as removable `<Badge>` chips
- Input field: type tag name, press `Enter` or `,` to add
- On add/remove: calls `setTagsForNote()` + background sync

### `note-list-item.tsx`
- Shows display title + relative date (`"2 hours ago"` / `"Jul 9"`)
- Selected state styling

---

## Page Layout (notes.tsx)

```tsx
export default function NotesPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  return (
    <div className="flex h-full gap-0 -m-6">   {/* cancel page padding */}
      <NoteList selectedId={selectedId} onSelect={setSelectedId} />
      <div className="flex-1 border-l">
        {selectedId
          ? <NoteEditor noteId={selectedId} />
          : <EmptyState />}
      </div>
    </div>
  )
}
```

---

## Auto-save Behaviour

1. User types in textarea or title input
2. `useDebounce` waits 1 second of inactivity
3. `updateNote(id, { title, content })` called → writes to SQLite
4. Background sync pushes to Turso (`{ silent: true }`)
5. "Saved" indicator shown for 2 seconds

If the user switches notes before debounce fires → flush save immediately
(`useEffect` cleanup or `onBlur`).

---

## Sync

- `syncNotes()` added to `sync.ts`, called inside `syncTodos()` (rename to `syncAll()` eventually)
- `note_tags` sync: pull all remote tags for notes that exist locally, push all local tags

---

## Implementation Order

1. Migration SQL (`003_notes.sql`)
2. Rust: register migration in `lib.rs`
3. Schema: add to `REMOTE_SCHEMAS`
4. Types: `src/lib/types/note.ts`
5. DAL: `src/lib/notes.ts`
6. Sync: `syncNotes()` in `sync.ts`
7. Install libraries
8. Components (in order): `note-list-item` → `note-list` → `note-tag-input` → `note-editor`
9. Page: `notes.tsx`
10. Wire up router (already exists at `/notes`)

---

## Out of Scope (for now)

- Image embeds in markdown
- Note export (PDF / plain text)
- Pinned / archived notes
- Note sharing
- Folders / nested categories
