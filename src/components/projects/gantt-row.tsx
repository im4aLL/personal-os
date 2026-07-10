import { MessageSquare, Pencil, Trash2, ExternalLink, MoreHorizontal } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "#components/ui/tooltip"
import { Button } from "#components/ui/button"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "#components/ui/dropdown-menu"
import { openUrl } from "@tauri-apps/plugin-opener"
import { cn } from "#lib/utils"
import type { WorkItemWithPhase } from "#lib/types/project"

const STATUS_OPACITY = { pending: 0.4, in_progress: 0.75, done: 1 }

interface GanttRowProps {
  item:      WorkItemWithPhase
  weekCount: number
  onEdit:    (item: WorkItemWithPhase) => void
  onDelete:  (id: string) => void
}

function SeparatorRow({ weekCount, onDelete }: { weekCount: number; onDelete: () => void }) {
  const cols = `320px 120px repeat(${weekCount}, minmax(72px, 1fr))`
  return (
    <div
      className="group grid border-b-2 border-border/50"
      style={{ gridTemplateColumns: cols, height: "40px" }}
    >
      <div className="bg-background border-r flex items-center px-2">
        <Button
          variant="ghost"
          size="icon-xs"
          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="size-3" />
        </Button>
      </div>
      <div className="bg-background border-r" />
    </div>
  )
}

export function GanttRow({ item, weekCount, onEdit, onDelete }: GanttRowProps) {
  if (item.is_separator) return <SeparatorRow weekCount={weekCount} onDelete={() => onDelete(item.id)} />

  const cols     = `320px 120px repeat(${weekCount}, minmax(72px, 1fr))`
  const opacity  = STATUS_OPACITY[item.status]
  const isDone   = item.status === "done"
  const colStart = item.start_week + 2
  const colEnd   = item.end_week   + 3
  const color    = item.phase?.color ?? "#94a3b8"

  return (
    <div
      className="group grid border-b border-border/40 hover:bg-accent/20 transition-colors"
      style={{ gridTemplateColumns: cols, gridTemplateRows: "40px" }}
    >
      {/* Task */}
      <div className="z-20 flex items-center gap-1.5 border-r bg-background px-3"
        style={{ gridColumn: 1, gridRow: 1 }}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className={cn(
                "text-sm truncate flex-1 flex items-center gap-1",
                isDone && "line-through text-muted-foreground",
                item.jira_ticket && "cursor-pointer hover:underline"
              )}
              onClick={() => {
                if (item.jira_ticket?.startsWith("http"))
                  openUrl(item.jira_ticket).catch(console.error)
              }}
            >
              <span className="truncate">{item.title}</span>
              {item.jira_ticket?.startsWith("http") && (
                <ExternalLink className="size-3 shrink-0 text-muted-foreground/60" />
              )}
            </span>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p className="text-xs">{item.title}</p>
          </TooltipContent>
        </Tooltip>
        {item.status === "in_progress" && (
          <span className="size-2 rounded-full bg-blue-400 animate-pulse shrink-0" />
        )}
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-xs">
                <MoreHorizontal className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(item)}>
                <Pencil className="size-3.5" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onDelete(item.id)}
              >
                <Trash2 className="size-3.5" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Person */}
      <div className="z-20 flex items-center border-r bg-background px-3"
        style={{ gridColumn: 2, gridRow: 1 }}>
        <span className="text-xs text-muted-foreground truncate">{item.person ?? ""}</span>
      </div>

      {/* Week cell borders */}
      {Array.from({ length: weekCount }, (_, i) => (
        <div key={i} className="border-r border-border/20"
          style={{ gridColumn: i + 3, gridRow: 1 }} />
      ))}

      {/* Gantt bar */}
      <div
        className="z-10 self-center mx-0.5 rounded-sm"
        style={{
          gridColumn: `${colStart} / ${colEnd}`,
          gridRow: 1,
          height: "26px",
          background: color,
          opacity,
        }}
      />
    </div>
  )
}
