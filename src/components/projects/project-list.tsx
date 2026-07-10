import { useEffect, useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "#components/ui/button"
import { Skeleton } from "#components/ui/skeleton"
import { cn } from "#lib/utils"
import { ProjectDialog } from "./project-dialog"
import { useProjectsStore } from "#store/projects"

export function ProjectList() {
  const projects   = useProjectsStore(s => s.projects)
  const selectedId = useProjectsStore(s => s.selectedId)
  const loading    = useProjectsStore(s => s.loading)
  const { loadProjects, selectProject } = useProjectsStore.getState()

  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => { loadProjects() }, [loadProjects])

  return (
    <>
      <div className="flex flex-col shrink-0 border-r w-[200px]">
        <div className="flex items-center justify-between px-4 py-[13px] border-b">
          <span className="text-sm font-semibold">Projects</span>
          <Button variant="ghost" size="icon-sm" onClick={() => setDialogOpen(true)}>
            <Plus className="size-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {loading ? (
            <div className="space-y-1 p-1">
              {[1, 2].map(i => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
            </div>
          ) : projects.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center pt-4">No projects yet</p>
          ) : (
            projects.map(project => (
              <button
                key={project.id}
                onClick={() => selectProject(project.id)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-lg transition-colors hover:bg-accent",
                  selectedId === project.id && "bg-accent"
                )}
              >
                <p className="text-sm font-medium truncate">{project.name}</p>
                <p className="text-xs text-muted-foreground">{project.week_count}w · {project.start_date}</p>
              </button>
            ))
          )}
        </div>
      </div>

      <ProjectDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  )
}
