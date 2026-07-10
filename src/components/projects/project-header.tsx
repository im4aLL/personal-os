import { useState } from "react"
import { Settings, Pencil, Plus, SeparatorHorizontal } from "lucide-react"
import { Button } from "#components/ui/button"
import { Separator } from "#components/ui/separator"
import { ProjectDialog } from "./project-dialog"
import { PhaseManagerDialog } from "./phase-manager-dialog"
import { WorkItemDialog } from "./work-item-dialog"
import { useProjectsStore } from "#store/projects"
import { getProjectDateRange } from "#lib/week-utils"
import type { Project } from "#lib/types/project"

interface ProjectHeaderProps {
  project: Project
}

export function ProjectHeader({ project }: ProjectHeaderProps) {
  const phases    = useProjectsStore(s => s.phases)
  const { addSeparator } = useProjectsStore.getState()

  const [editOpen,    setEditOpen]    = useState(false)
  const [phaseOpen,   setPhaseOpen]   = useState(false)
  const [addItemOpen, setAddItemOpen] = useState(false)

  const dateRange = getProjectDateRange(project.start_date, project.week_count)

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-3 border-b shrink-0 flex-wrap">
        <div className="min-w-0">
          <h2 className="text-base font-semibold leading-tight">{project.name}</h2>
          <p className="text-xs text-muted-foreground">{dateRange} · {project.week_count} weeks</p>
        </div>

        {phases.length > 0 && <Separator orientation="vertical" className="h-6" />}

        <div className="flex items-center gap-3 flex-wrap">
          {phases.map(phase => (
            <div key={phase.id} className="flex items-center gap-1.5">
              <span className="size-3 rounded-sm shrink-0" style={{ background: phase.color }} />
              <span className="text-xs text-muted-foreground">{phase.name}</span>
            </div>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={() => setAddItemOpen(true)}>
            <Plus className="size-3.5" />
            Add item
          </Button>
          <Button variant="ghost" size="sm" onClick={addSeparator}>
            <SeparatorHorizontal className="size-3.5" />
            Separator
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setPhaseOpen(true)}>
            <Settings className="size-3.5" />
            Phases
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => setEditOpen(true)}>
            <Pencil className="size-4" />
          </Button>
        </div>
      </div>

      <ProjectDialog      open={editOpen}    onOpenChange={setEditOpen}    project={project} />
      <PhaseManagerDialog open={phaseOpen}   onOpenChange={setPhaseOpen} />
      <WorkItemDialog     open={addItemOpen} onOpenChange={setAddItemOpen} />
    </>
  )
}
