import { Badge } from "#components/ui/badge"
import { Separator } from "#components/ui/separator"
import { WorkLogItem } from "./work-log-item"
import type { WeekGroup as WeekGroupType } from "#lib/week-groups"
import type { WorkLogWithTags } from "#lib/types/work-log"

interface WeekGroupProps {
  group:  WeekGroupType
  onEdit: (log: WorkLogWithTags) => void
}

export function WeekGroup({ group, onEdit }: WeekGroupProps) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1 px-1">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {group.label}
        </span>
        <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-normal">
          {group.logs.length} {group.logs.length === 1 ? "entry" : "entries"}
        </Badge>
        <Separator className="flex-1" />
      </div>

      <div className="flex flex-col">
        {group.logs.map(log => (
          <WorkLogItem key={log.id} log={log} onEdit={onEdit} />
        ))}
      </div>
    </div>
  )
}
