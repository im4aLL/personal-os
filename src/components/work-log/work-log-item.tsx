import { Pencil, Trash2 } from "lucide-react"

import { Badge } from "#components/ui/badge"
import { Button } from "#components/ui/button"
import { cn } from "#lib/utils"
import { deleteWorkLog } from "#lib/work-logs"
import { useWorkLogsStore } from "#store/work-logs"
import type { WorkLogWithTags } from "#lib/types/work-log"

const CURRENT_YEAR = new Date().getFullYear()

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString(undefined, {
    month: "short",
    day:   "numeric",
    ...(y !== CURRENT_YEAR ? { year: "numeric" } : {}),
  })
}

interface WorkLogItemProps {
  log:     WorkLogWithTags
  onEdit:  (log: WorkLogWithTags) => void
}

export function WorkLogItem({ log, onEdit }: WorkLogItemProps) {
  const { removeWorkLog } = useWorkLogsStore.getState()

  async function handleDelete() {
    removeWorkLog(log.id)
    await deleteWorkLog(log.id)
  }

  return (
    <div className={cn(
      "group flex items-start gap-6 rounded-lg px-3 py-2.5 transition-colors",
      "hover:bg-accent/50"
    )}>
      {/* Date range */}
      <span className="shrink-0 mt-0.5 text-xs font-medium text-muted-foreground w-44 pt-px whitespace-nowrap text-right">
        {log.start_date === log.end_date
          ? formatDate(log.start_date)
          : `${formatDate(log.start_date)} – ${formatDate(log.end_date)}`}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-snug">{log.title}</p>

        {log.description && (
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
            {log.description}
          </p>
        )}

        {log.tags.length > 0 && (
          <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
            {log.tags.map(tag => (
              <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-normal">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Actions — hover reveal */}
      <div className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon-sm" onClick={() => onEdit(log)}>
          <Pencil className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:text-destructive"
          onClick={handleDelete}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}
