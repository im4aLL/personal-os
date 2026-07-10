import { MessageSquare, Pencil, Trash2 } from "lucide-react"
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from "#components/ui/tooltip"
import { Button } from "#components/ui/button"
import { cn } from "#lib/utils"

export interface MockWorkItem {
  id:         string
  title:      string
  person:     string | null
  phaseColor: string
  status:     "pending" | "in_progress" | "done"
  startWeek:  number
  endWeek:    number
  comment:    string | null
  isSeparator?: boolean
}

const STATUS_OPACITY: Record<MockWorkItem["status"], number> = {
  pending:     0.4,
  in_progress: 0.75,
  done:        1,
}

interface GanttRowProps {
  item:      MockWorkItem
  weekCount: number
  onEdit:    () => void
  onDelete:  () => void
}

// Separator row
function SeparatorRow({ weekCount }: { weekCount: number }) {
  return (
    <div
      className="grid border-b-2 border-border/50"
      style={{ gridTemplateColumns: `260px 120px repeat(${weekCount}, minmax(72px, 1fr))`, height: "40px" }}
    >
      <div className="bg-background border-r" />
      <div className="bg-background border-r" />
    </div>
  )
}

export function GanttRow({ item, weekCount, onEdit, onDelete }: GanttRowProps) {
  if (item.isSeparator) return <SeparatorRow weekCount={weekCount} />

  const opacity  = STATUS_OPACITY[item.status]
  const isDone   = item.status === "done"
  // grid col offset: 2 fixed cols then week cols start at col 3
  const colStart = item.startWeek + 2
  const colEnd   = item.endWeek   + 3

  return (
    <div
      className="group grid border-b border-border/40 hover:bg-accent/20 transition-colors"
      style={{
        gridTemplateColumns: `260px 120px repeat(${weekCount}, minmax(72px, 1fr))`,
        gridTemplateRows: "40px",
      }}
    >
      {/* Col 1 — Task */}
      <div
        className="z-20 flex items-center gap-1.5 border-r bg-background px-3"
        style={{ gridColumn: 1, gridRow: 1 }}
      >
        <span className={cn("text-sm truncate flex-1", isDone && "line-through text-muted-foreground")}>
          {item.title}
        </span>
        {item.comment && (
          <Tooltip>
            <TooltipTrigger asChild>
              <MessageSquare className="size-3.5 shrink-0 text-muted-foreground/60" />
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-[200px]">
              <p className="text-xs">{item.comment}</p>
            </TooltipContent>
          </Tooltip>
        )}
        <div className="flex shrink-0 gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon-xs" onClick={onEdit}>
            <Pencil className="size-3" />
          </Button>
          <Button variant="ghost" size="icon-xs" className="hover:text-destructive" onClick={onDelete}>
            <Trash2 className="size-3" />
          </Button>
        </div>
      </div>

      {/* Col 2 — Person */}
      <div
        className="z-20 flex items-center border-r bg-background px-3"
        style={{ gridColumn: 2, gridRow: 1 }}
      >
        <span className="text-xs text-muted-foreground truncate">{item.person ?? ""}</span>
      </div>

      {/* Week cell borders */}
      {Array.from({ length: weekCount }, (_, i) => (
        <div
          key={i}
          className="border-r border-border/20"
          style={{ gridColumn: i + 3, gridRow: 1 }}
        />
      ))}

      {/* Gantt bar — spans across week columns using grid placement */}
      <div
        className="z-10 self-center mx-0.5 rounded-sm"
        style={{
          gridColumn: `${colStart} / ${colEnd}`,
          gridRow:    1,
          height:     "26px",
          background: item.phaseColor,
          opacity,
        }}
      />
    </div>
  )
}
