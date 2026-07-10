import { X } from "lucide-react"
import { Badge } from "#components/ui/badge"
import { Input } from "#components/ui/input"

const MOCK_TAGS = ["work", "ideas"]

export function NoteTagInput() {
  return (
    <div className="flex items-center gap-1.5 flex-wrap min-h-[28px]">
      {MOCK_TAGS.map((tag) => (
        <Badge
          key={tag}
          variant="secondary"
          className="gap-1 pl-2 pr-1 text-xs h-5 font-normal"
        >
          {tag}
          <button className="rounded-sm opacity-60 hover:opacity-100 transition-opacity">
            <X className="size-2.5" />
          </button>
        </Badge>
      ))}
      <Input
        className="h-5 w-24 border-none shadow-none bg-transparent px-1 text-xs focus-visible:ring-0 placeholder:text-muted-foreground/50"
        placeholder="Add tag…"
        readOnly
      />
    </div>
  )
}
