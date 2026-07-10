import { useState } from "react"
import { FolderKanban } from "lucide-react"
import { ProjectList } from "#components/projects/project-list"
import { GanttView } from "#components/projects/gantt-view"

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
      <FolderKanban className="size-10 opacity-20" />
      <div className="text-center space-y-1">
        <p className="text-sm font-medium">No project selected</p>
        <p className="text-xs opacity-70">Select a project or create a new one</p>
      </div>
    </div>
  )
}

export default function ProjectsPage() {
  const [selectedId, setSelectedId] = useState<string | null>("1")

  return (
    <div className="flex h-full gap-0 -m-6">
      <ProjectList selectedId={selectedId} onSelect={setSelectedId} />
      <div className="flex-1 min-w-0">
        {selectedId ? <GanttView /> : <EmptyState />}
      </div>
    </div>
  )
}
