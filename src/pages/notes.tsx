import { FileText } from "lucide-react"
import { NoteList } from "#components/notes/note-list"
import { NoteEditor } from "#components/notes/note-editor"
import { useNotesStore } from "#store/notes"

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
      <FileText className="size-10 opacity-20" />
      <div className="text-center space-y-1">
        <p className="text-sm font-medium">No note selected</p>
        <p className="text-xs opacity-70">Pick a note from the list or create a new one</p>
      </div>
    </div>
  )
}

export default function NotesPage() {
  const selectedId = useNotesStore(s => s.selectedId)

  return (
    <div className="flex h-full gap-0 -m-6">
      <NoteList />
      <div className="flex-1 min-w-0">
        {selectedId ? <NoteEditor noteId={selectedId} /> : <EmptyState />}
      </div>
    </div>
  )
}
