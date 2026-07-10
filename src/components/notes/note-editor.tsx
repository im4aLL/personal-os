import { useState } from "react"
import { Eye, Pencil, Trash2, Check } from "lucide-react"
import { Button } from "#components/ui/button"
import { Separator } from "#components/ui/separator"
import { Textarea } from "#components/ui/textarea"
import { NoteTagInput } from "./note-tag-input"
import { cn } from "#lib/utils"

const MOCK_CONTENT = `## Project Brainstorm

Some initial thoughts on the new feature set for Q3.

### Ideas

- **Sync indicator** in the header showing last synced time
- Tag filtering in the notes list
- Keyboard shortcuts for common actions

### Open questions

1. Should tags be global or per-note only?
2. Do we need folder support before launch?

> Keep it simple — ship the core and iterate.
`

type Mode = "edit" | "preview"

interface NoteEditorProps {
  noteId: string
}

export function NoteEditor({ noteId: _noteId }: NoteEditorProps) {
  const [mode, setMode] = useState<Mode>("edit")

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b shrink-0">
        <div className="flex items-center gap-2">
          <Button
            variant={mode === "edit" ? "secondary" : "ghost"}
            size="xs"
            onClick={() => setMode("edit")}
          >
            <Pencil className="size-3" />
            Edit
          </Button>
          <Button
            variant={mode === "preview" ? "secondary" : "ghost"}
            size="xs"
            onClick={() => setMode("preview")}
          >
            <Eye className="size-3" />
            Preview
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {/* Saved indicator */}
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Check className="size-3" />
            Saved
          </span>

          <Separator orientation="vertical" className="h-4" />

          <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-destructive">
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      {/* Title + Tags */}
      <div className="px-5 pt-4 pb-2 shrink-0 space-y-2">
        <input
          className={cn(
            "w-full bg-transparent text-xl font-semibold outline-none",
            "placeholder:text-muted-foreground/40"
          )}
          placeholder="Untitled"
          defaultValue="Project brainstorm"
          readOnly
        />
        <NoteTagInput />
      </div>

      <Separator />

      {/* Body */}
      <div className="flex-1 overflow-hidden">
        {mode === "edit" ? (
          <Textarea
            className={cn(
              "h-full w-full resize-none rounded-none border-none shadow-none",
              "px-5 py-4 text-sm font-mono leading-relaxed",
              "focus-visible:ring-0"
            )}
            defaultValue={MOCK_CONTENT}
            readOnly
          />
        ) : (
          <div
            className={cn(
              "h-full overflow-y-auto px-5 py-4",
              "prose prose-sm dark:prose-invert max-w-none",
            )}
          >
            {/* Static preview — real render will use react-markdown */}
            <h2>Project Brainstorm</h2>
            <p>Some initial thoughts on the new feature set for Q3.</p>
            <h3>Ideas</h3>
            <ul>
              <li><strong>Sync indicator</strong> in the header showing last synced time</li>
              <li>Tag filtering in the notes list</li>
              <li>Keyboard shortcuts for common actions</li>
            </ul>
            <h3>Open questions</h3>
            <ol>
              <li>Should tags be global or per-note only?</li>
              <li>Do we need folder support before launch?</li>
            </ol>
            <blockquote>Keep it simple — ship the core and iterate.</blockquote>
          </div>
        )}
      </div>
    </div>
  )
}
