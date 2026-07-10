import { useEffect, useState } from "react"
import { Search, Plus } from "lucide-react"
import { useDebounce } from "use-debounce"
import { Button } from "#components/ui/button"
import { Input } from "#components/ui/input"
import { Skeleton } from "#components/ui/skeleton"
import { NoteListItem } from "./note-list-item"
import { useNotesStore } from "#store/notes"
import { noteDisplayTitle } from "#lib/types/note"
import { cn } from "#lib/utils"

function relativeDate(iso: string): string {
  const now   = Date.now()
  const then  = new Date(iso).getTime()
  const diff  = now - then
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  if (mins  < 1)  return "Just now"
  if (mins  < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1)
  const d = new Date(iso)
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday"
  const sameYear = d.getFullYear() === new Date().getFullYear()
  return d.toLocaleDateString(undefined, sameYear
    ? { month: "short", day: "numeric" }
    : { month: "short", day: "numeric", year: "numeric" })
}

export function NoteList() {
  const notes      = useNotesStore(s => s.notes)
  const selectedId = useNotesStore(s => s.selectedId)
  const loading    = useNotesStore(s => s.loading)
  const { loadNotes, selectNote, createNote, searchNotes } = useNotesStore.getState()

  const [search]           = useState("")
  const [debouncedSearch]  = useDebounce(search, 300)

  useEffect(() => { loadNotes() }, [loadNotes])

  useEffect(() => {
    if (debouncedSearch.trim()) {
      searchNotes(debouncedSearch.trim())
    } else if (debouncedSearch === "") {
      loadNotes()
    }
  }, [debouncedSearch, loadNotes, searchNotes])

  return (
    <div className={cn("flex flex-col shrink-0 border-r w-[280px]")}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <span className="text-sm font-semibold">Notes</span>
        <Button variant="ghost" size="icon-sm" onClick={createNote}>
          <Plus className="size-4" />
        </Button>
      </div>

      {/* Search — rendered but wired up via controlled input */}
      <div className="px-3 py-2 border-b">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            className="pl-8 h-8 text-sm"
            placeholder="Search notes…"
            defaultValue={search}
            onChange={e => useNotesStore.getState().searchNotes(e.target.value.trim())}
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {loading ? (
          <div className="space-y-1 p-1">
            {[1, 2, 3].map(i => (
              <div key={i} className="space-y-1 px-2 py-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            ))}
          </div>
        ) : notes.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center pt-6">
            {debouncedSearch ? "No notes match your search" : "No notes yet"}
          </p>
        ) : (
          notes.map(note => (
            <NoteListItem
              key={note.id}
              title={noteDisplayTitle(note)}
              date={relativeDate(note.updated_at)}
              selected={selectedId === note.id}
              onClick={() => selectNote(note.id)}
            />
          ))
        )}
      </div>
    </div>
  )
}
