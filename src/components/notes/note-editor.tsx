import { useEffect, useRef, useState } from "react"
import { Eye, Pencil, Trash2, Check, Loader2, Minus, Plus } from "lucide-react"
import { useDebounce } from "use-debounce"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Button } from "#components/ui/button"
import { Separator } from "#components/ui/separator"
import { Textarea } from "#components/ui/textarea"
import { NoteTagInput } from "./note-tag-input"
import { getNoteById, updateNote, deleteNote } from "#lib/notes"
import { useNotesStore } from "#store/notes"
import type { NoteWithTags } from "#lib/types/note"
import { cn } from "#lib/utils"

type Mode       = "edit" | "preview"
type SaveStatus = "idle" | "saving" | "saved"

interface NoteEditorProps {
  noteId: string
}

const FONT_SIZE_KEY = "note-editor-font-size"
const FONT_SIZE_MIN = 11
const FONT_SIZE_MAX = 24
const FONT_SIZE_DEFAULT = 14

function loadFontSize(): number {
  const stored = Number(localStorage.getItem(FONT_SIZE_KEY))
  return stored >= FONT_SIZE_MIN && stored <= FONT_SIZE_MAX ? stored : FONT_SIZE_DEFAULT
}

export function NoteEditor({ noteId }: NoteEditorProps) {
  const { patchNoteInList, removeNote } = useNotesStore.getState()

  const titleInputRef  = useRef<HTMLInputElement>(null)
  const textareaRef    = useRef<HTMLTextAreaElement>(null)
  const previewRef     = useRef<HTMLDivElement>(null)
  const scrollRatioRef = useRef(0)

  const [title,      setTitle]      = useState("")
  const [content,    setContent]    = useState("")
  const [tags,       setTags]       = useState<string[]>([])
  const [mode,       setMode]       = useState<Mode>("edit")
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle")
  const [loaded,     setLoaded]     = useState(false)
  const [fontSize,   setFontSize]   = useState(loadFontSize)

  const [debouncedTitle]   = useDebounce(title,   1000)
  const [debouncedContent] = useDebounce(content, 1000)

  // Track last-saved values to avoid redundant writes
  const savedRef  = useRef({ title: "", content: "" })
  // Track latest values for flush-on-note-change
  const latestRef = useRef({ title: "", content: "" })
  const noteIdRef = useRef(noteId)

  useEffect(() => {
    const prevId = noteIdRef.current
    const prev   = latestRef.current
    const saved  = savedRef.current

    if (prevId && (prev.title !== saved.title || prev.content !== saved.content)) {
      updateNote(prevId, {
        title:   prev.title.trim() || null,
        content: prev.content,
      }).catch(console.error)
    }

    noteIdRef.current = noteId
    setLoaded(false)
    setSaveStatus("idle")
    // Clear stale content immediately so the previous note's data
    // never shows while the new note is loading.
    setTitle("")
    setContent("")
    setTags([])

    getNoteById(noteId).then((note: NoteWithTags | null) => {
      if (!note) return
      setTitle(note.title ?? "")
      setContent(note.content)
      setTags(note.tags)
      savedRef.current  = { title: note.title ?? "", content: note.content }
      latestRef.current = { title: note.title ?? "", content: note.content }
      setLoaded(true)
      // Focus title for new notes, textarea for existing ones
      requestAnimationFrame(() => {
        titleInputRef.current?.focus()
      })
    }).catch(console.error)
  }, [noteId])

  // Auto-save when debounced values settle
  useEffect(() => {
    if (!loaded) return
    // Guard: if debounced values haven't caught up with the current note's
    // actual content yet, they're still carrying the previous note's data.
    // Skip until the debounce reflects what the user is actually looking at.
    if (debouncedTitle !== latestRef.current.title || debouncedContent !== latestRef.current.content) return
    const s = savedRef.current
    if (debouncedTitle === s.title && debouncedContent === s.content) return

    setSaveStatus("saving")
    savedRef.current = { title: debouncedTitle, content: debouncedContent }

    const now = new Date().toISOString()
    updateNote(noteId, {
      title:   debouncedTitle.trim() || null,
      content: debouncedContent,
    }).then(() => {
      // Update the list in the store so title + date reflect immediately
      patchNoteInList(noteId, {
        title:      debouncedTitle.trim() || null,
        updated_at: now,
      })
      setSaveStatus("saved")
      setTimeout(() => setSaveStatus("idle"), 2000)
    }).catch(console.error)
  }, [debouncedTitle, debouncedContent, loaded, noteId, patchNoteInList])

  function handleScroll(e: React.UIEvent<HTMLElement>) {
    const el = e.currentTarget
    const maxScroll = el.scrollHeight - el.clientHeight
    scrollRatioRef.current = maxScroll > 0 ? el.scrollTop / maxScroll : 0
  }

  function handleModeChange(next: Mode) {
    setMode(next)
    requestAnimationFrame(() => {
      const el = next === "edit" ? textareaRef.current : previewRef.current
      if (!el) return
      const maxScroll = el.scrollHeight - el.clientHeight
      el.scrollTop = scrollRatioRef.current * maxScroll
    })
  }

  function changeFontSize(delta: number) {
    setFontSize(prev => {
      const next = Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, prev + delta))
      localStorage.setItem(FONT_SIZE_KEY, String(next))
      return next
    })
  }

  function handleTitleChange(v: string) {
    setTitle(v)
    latestRef.current.title = v
  }

  function handleContentChange(v: string) {
    setContent(v)
    latestRef.current.content = v
  }

  async function handleDelete() {
    await deleteNote(noteId)
    removeNote(noteId)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-5 py-3 border-b shrink-0">
        <div className="flex items-center gap-1">
          <Button
            variant={mode === "edit" ? "secondary" : "ghost"}
            size="xs"
            onClick={() => handleModeChange("edit")}
          >
            <Pencil className="size-3" />
            Edit
          </Button>
          <Button
            variant={mode === "preview" ? "secondary" : "ghost"}
            size="xs"
            onClick={() => handleModeChange("preview")}
          >
            <Eye className="size-3" />
            Preview
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => changeFontSize(-1)}
              disabled={fontSize <= FONT_SIZE_MIN}
            >
              <Minus className="size-3" />
            </Button>
            <span className="w-6 text-center text-xs text-muted-foreground tabular-nums">{fontSize}</span>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => changeFontSize(1)}
              disabled={fontSize >= FONT_SIZE_MAX}
            >
              <Plus className="size-3" />
            </Button>
          </div>
          <Separator orientation="vertical" className="h-4" />
          {saveStatus === "saving" && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="size-3 animate-spin" />
              Saving…
            </span>
          )}
          {saveStatus === "saved" && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Check className="size-3" />
              Saved
            </span>
          )}
          <Separator orientation="vertical" className="h-4" />
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-destructive"
            onClick={handleDelete}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      {/* Title + Tags */}
      <div className="px-5 pt-4 pb-2 shrink-0 space-y-2">
        <input
          ref={titleInputRef}
          className="w-full bg-transparent text-xl font-semibold outline-none placeholder:text-muted-foreground/40"
          placeholder="Untitled"
          value={title}
          onChange={e => handleTitleChange(e.target.value)}
        />
        <NoteTagInput noteId={noteId} tags={tags} onChange={setTags} />
      </div>

      <Separator />

      {/* Body */}
      <div className="flex-1 overflow-hidden">
        {mode === "edit" ? (
          <Textarea
            ref={textareaRef}
            className={cn(
              "h-full w-full resize-none rounded-none border-none shadow-none",
              "px-5 py-4 font-mono leading-relaxed",
              "focus-visible:ring-0"
            )}
            style={{ fontSize }}
            value={content}
            onChange={e => handleContentChange(e.target.value)}
            onScroll={handleScroll}
            placeholder="Start writing in markdown…"
          />
        ) : (
          <div
            ref={previewRef}
            onScroll={handleScroll}
            style={{ fontSize }}
            className="h-full overflow-y-auto px-5 py-4 prose prose-neutral dark:prose-invert max-w-none"
          >

            {content.trim() ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            ) : (
              <p className="text-muted-foreground italic text-sm">Nothing to preview yet.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
