import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "#components/ui/button"
import { cn } from "#lib/utils"
import { ProjectDialog } from "./project-dialog"

interface MockProject {
  id:        string
  name:      string
  dateRange: string
}

const MOCK_PROJECTS: MockProject[] = [
  { id: "1", name: "Personal OS",   dateRange: "Jun – Aug 2026" },
  { id: "2", name: "Client Portal", dateRange: "Jul – Sep 2026" },
]

interface ProjectListProps {
  selectedId: string | null
  onSelect:   (id: string) => void
}

export function ProjectList({ selectedId, onSelect }: ProjectListProps) {
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <>
      <div className="flex flex-col shrink-0 border-r w-[200px]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-[13px] border-b">
          <span className="text-sm font-semibold">Projects</span>
          <Button variant="ghost" size="icon-sm" onClick={() => setDialogOpen(true)}>
            <Plus className="size-4" />
          </Button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {MOCK_PROJECTS.map(project => (
            <button
              key={project.id}
              onClick={() => onSelect(project.id)}
              className={cn(
                "w-full text-left px-3 py-2 rounded-lg transition-colors hover:bg-accent",
                selectedId === project.id && "bg-accent"
              )}
            >
              <p className="text-sm font-medium truncate">{project.name}</p>
              <p className="text-xs text-muted-foreground">{project.dateRange}</p>
            </button>
          ))}
        </div>
      </div>

      <ProjectDialog open={dialogOpen} onOpenChange={setDialogOpen} mode="create" />
    </>
  )
}
