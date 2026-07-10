import { Search, Plus } from "lucide-react"
import { Button } from "#components/ui/button"
import { Input } from "#components/ui/input"
import { NoteListItem } from "./note-list-item"
import { cn } from "#lib/utils"

const MOCK_NOTES = [
  { id: "1", title: "Project brainstorm", date: "2 hours ago" },
  { id: "2", title: "Meeting notes — Jul 9", date: "Yesterday" },
  { id: "3", title: "Ideas for Q3", date: "Jul 7" },
  { id: "4", title: "", date: "Jul 5" },   // untitled → datetime fallback
  { id: "5", title: "Book recommendations", date: "Jul 2" },
  { id: "6", title: "Recipes to try", date: "Jun 28" },
]

function displayTitle(note: { id: string; title: string; date: string }) {
  return note.title.trim() || "Jul 5, 2025, 3:12 PM"
}

interface NoteListProps {
  selectedId: string | null
  onSelect: (id: string) => void
}

export function NoteList({ selectedId, onSelect }: NoteListProps) {
  return (
    <div
      className={cn(
        "flex flex-col shrink-0 border-r",
        "w-[280px]"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <span className="text-sm font-semibold">Notes</span>
        <Button variant="ghost" size="icon-sm">
          <Plus className="size-4" />
        </Button>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            className="pl-8 h-8 text-sm"
            placeholder="Search notes…"
            readOnly
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {MOCK_NOTES.map((note) => (
          <NoteListItem
            key={note.id}
            title={displayTitle(note)}
            date={note.date}
            selected={selectedId === note.id}
            onClick={() => onSelect(note.id)}
          />
        ))}
      </div>
    </div>
  )
}
