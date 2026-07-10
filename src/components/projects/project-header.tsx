import { useState } from "react"
import { Settings, Pencil, Plus } from "lucide-react"
import { Button } from "#components/ui/button"
import { Separator } from "#components/ui/separator"
import { ProjectDialog } from "./project-dialog"
import { PhaseManagerDialog } from "./phase-manager-dialog"
import { WorkItemDialog } from "./work-item-dialog"

const MOCK_PHASES = [
  { id: "1", name: "Backend",  color: "#93C5FD" },
  { id: "2", name: "Frontend", color: "#86EFAC" },
  { id: "3", name: "QA",       color: "#FCD34D" },
]

interface ProjectHeaderProps {
  name:      string
  dateRange: string
  weekCount: number
}

export function ProjectHeader({ name, dateRange, weekCount }: ProjectHeaderProps) {
  const [editOpen,    setEditOpen]    = useState(false)
  const [phaseOpen,   setPhaseOpen]   = useState(false)
  const [addItemOpen, setAddItemOpen] = useState(false)

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-3 border-b shrink-0 flex-wrap">
        {/* Project name + date */}
        <div className="min-w-0">
          <h2 className="text-base font-semibold leading-tight">{name}</h2>
          <p className="text-xs text-muted-foreground">{dateRange} · {weekCount} weeks</p>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Phase legend */}
        <div className="flex items-center gap-3 flex-wrap">
          {MOCK_PHASES.map(phase => (
            <div key={phase.id} className="flex items-center gap-1.5">
              <span className="size-3 rounded-sm shrink-0" style={{ background: phase.color }} />
              <span className="text-xs text-muted-foreground">{phase.name}</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="ml-auto flex items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={() => setAddItemOpen(true)}>
            <Plus className="size-3.5" />
            Add item
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

      <ProjectDialog   open={editOpen}    onOpenChange={setEditOpen}    mode="edit" />
      <PhaseManagerDialog open={phaseOpen} onOpenChange={setPhaseOpen} />
      <WorkItemDialog  open={addItemOpen} onOpenChange={setAddItemOpen} weekCount={weekCount} />
    </>
  )
}
