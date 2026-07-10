import { useState } from "react"
import { cn } from "#lib/utils"
import { ProjectHeader } from "./project-header"
import { GanttRow } from "./gantt-row"
import { WorkItemDialog } from "./work-item-dialog"
import { useProjectsStore } from "#store/projects"
import { getWeekHeaders } from "#lib/week-utils"
import type { Project, WorkItemWithPhase } from "#lib/types/project"

interface GanttViewProps {
  project: Project
}

export function GanttView({ project }: GanttViewProps) {
  const workItems = useProjectsStore(s => s.workItems)

  const [editItem, setEditItem] = useState<WorkItemWithPhase | undefined>()
  const [editOpen, setEditOpen] = useState(false)

  const weekHeaders = getWeekHeaders(project.start_date, project.week_count)
  const COLS        = `320px 120px repeat(${project.week_count}, minmax(72px, 1fr))`

  function handleEdit(item: WorkItemWithPhase) {
    setEditItem(item)
    setEditOpen(true)
  }

  function handleDelete(id: string) {
    useProjectsStore.getState().removeWorkItem(id)
  }

  return (
    <div className="flex flex-col h-full min-w-0">
      <ProjectHeader project={project} />

      <div className="flex-1 overflow-auto isolate min-h-0 min-w-0 w-full">
        <div className="min-w-max">
          {/* Header row 1 — dates */}
          <div className="grid sticky top-0 z-30 border-b bg-background"
            style={{ gridTemplateColumns: COLS }}>
            <div className="bg-background border-r px-3 py-1.5 text-xs font-semibold text-muted-foreground">Task</div>
            <div className="bg-background border-r px-3 py-1.5 text-xs font-semibold text-muted-foreground">Resource</div>
            {weekHeaders.map(w => (
              <div key={w.weekNum}
                className={cn("border-r px-2 py-1.5 text-xs text-center",
                  w.isCurrent ? "font-bold text-foreground" : "text-muted-foreground")}>
                {w.date}
              </div>
            ))}
          </div>

          {/* Header row 2 — week numbers */}
          <div className="grid sticky border-b bg-muted/30"
            style={{ gridTemplateColumns: COLS, top: "29px", zIndex: 30 }}>
            <div className="bg-muted/30 border-r px-3 py-1" />
            <div className="bg-muted/30 border-r px-3 py-1" />
            {weekHeaders.map(w => (
              <div key={w.weekNum}
                className={cn("border-r px-2 py-1 text-xs text-center",
                  w.isCurrent ? "font-bold text-foreground bg-primary/5" : "text-muted-foreground")}>
                Week {w.weekNum}
              </div>
            ))}
          </div>

          {/* Work item rows */}
          {workItems.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
              No items yet — click "Add item" to get started
            </div>
          ) : (
            workItems.map(item => (
              <GanttRow
                key={item.id}
                item={item}
                weekCount={project.week_count}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>
      </div>

      <WorkItemDialog open={editOpen} onOpenChange={setEditOpen} item={editItem} />
    </div>
  )
}
