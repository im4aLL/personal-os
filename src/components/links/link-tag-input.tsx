import { KeyboardEvent, useRef, useState } from "react"
import { X } from "lucide-react"
import { Badge } from "#components/ui/badge"
import { Input } from "#components/ui/input"
import { cn } from "#lib/utils"

interface LinkTagInputProps {
  tags:        string[]
  suggestions: string[]
  onChange:    (tags: string[]) => void
}

export function LinkTagInput({ tags, suggestions, onChange }: LinkTagInputProps) {
  const [inputValue,  setInputValue]  = useState("")
  const [showDropdown, setShowDropdown] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = suggestions.filter(
    s => s.toLowerCase().includes(inputValue.toLowerCase()) && !tags.includes(s)
  )

  function addTag(raw: string) {
    const name = raw.trim().toLowerCase().replace(/\s+/g, "-")
    if (!name || tags.includes(name)) { setInputValue(""); return }
    onChange([...tags, name])
    setInputValue("")
    setShowDropdown(false)
  }

  function removeTag(name: string) {
    onChange(tags.filter(t => t !== name))
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(inputValue) }
    else if (e.key === "Backspace" && !inputValue && tags.length > 0) removeTag(tags[tags.length - 1])
    else if (e.key === "Escape") setShowDropdown(false)
  }

  return (
    <div className="relative">
      <div
        className="flex items-center gap-1.5 flex-wrap min-h-[28px] cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map(tag => (
          <Badge key={tag} variant="secondary" className="gap-1 pl-2 pr-1 text-xs h-5 font-normal">
            {tag}
            <button
              type="button"
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
          onChange={e => { setInputValue(e.target.value); setShowDropdown(true) }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowDropdown(true)}
          onBlur={() => { setTimeout(() => setShowDropdown(false), 150); if (inputValue.trim()) addTag(inputValue) }}
          className="h-5 w-28 border-none shadow-none bg-transparent px-1 text-xs focus-visible:ring-0 placeholder:text-muted-foreground/50"
          placeholder={tags.length === 0 ? "Add tag…" : ""}
        />
      </div>

      {/* Autocomplete dropdown */}
      {showDropdown && filtered.length > 0 && (
        <div className={cn(
          "absolute left-0 top-full z-50 mt-1 min-w-[140px]",
          "rounded-md border bg-popover shadow-md",
          "py-1 text-xs"
        )}>
          {filtered.map(tag => (
            <button
              key={tag}
              type="button"
              className="w-full px-3 py-1.5 text-left hover:bg-accent transition-colors"
              onMouseDown={e => { e.preventDefault(); addTag(tag) }}
            >
              {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
