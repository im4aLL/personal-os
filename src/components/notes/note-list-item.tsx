import { cn } from "#lib/utils"

interface NoteListItemProps {
  title: string
  date: string
  selected?: boolean
  onClick?: () => void
}

export function NoteListItem({ title, date, selected, onClick }: NoteListItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-3 py-2.5 rounded-lg transition-colors group",
        "hover:bg-accent",
        selected && "bg-accent"
      )}
    >
      <p
        className={cn(
          "text-sm font-medium leading-snug truncate",
          selected ? "text-accent-foreground" : "text-foreground"
        )}
      >
        {title}
      </p>
      <p className="text-xs text-muted-foreground mt-0.5">{date}</p>
    </button>
  )
}
