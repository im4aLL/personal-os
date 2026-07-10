import { KeyboardEvent, useRef, useState } from "react"
import { X } from "lucide-react"
import { Badge } from "#components/ui/badge"
import { Input } from "#components/ui/input"
import { setTagsForNote } from "#lib/notes"

interface NoteTagInputProps {
  noteId: string
  tags:   string[]
  onChange: (tags: string[]) => void
}

export function NoteTagInput({ noteId, tags, onChange }: NoteTagInputProps) {
  const [inputValue, setInputValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  async function commitTag(raw: string) {
    const name = raw.trim().toLowerCase().replace(/\s+/g, "-")
    if (!name || tags.includes(name)) {
      setInputValue("")
      return
    }
    const next = [...tags, name]
    onChange(next)
    setInputValue("")
    await setTagsForNote(noteId, next)
  }

  async function removeTag(name: string) {
    const next = tags.filter(t => t !== name)
    onChange(next)
    await setTagsForNote(noteId, next)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      commitTag(inputValue)
    } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1])
    }
  }

  return (
    <div
      className="flex items-center gap-1.5 flex-wrap min-h-[28px] cursor-text"
      onClick={() => inputRef.current?.focus()}
    >
      {tags.map(tag => (
        <Badge
          key={tag}
          variant="secondary"
          className="gap-1 pl-2 pr-1 text-xs h-5 font-normal"
        >
          {tag}
          <button
            className="rounded-sm opacity-60 hover:opacity-100 transition-opacity"
            onClick={e => { e.stopPropagation(); removeTag(tag) }}
          >
            <X className="size-2.5" />
          </button>
        </Badge>
      ))}
      <Input
        ref={inputRef}
        value={inputValue}
        onChange={e => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => { if (inputValue.trim()) commitTag(inputValue) }}
        className="h-5 w-24 border-none shadow-none bg-transparent px-1 text-xs focus-visible:ring-0 placeholder:text-muted-foreground/50"
        placeholder={tags.length === 0 ? "Add tag…" : ""}
      />
    </div>
  )
}
