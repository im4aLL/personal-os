import { useEffect, useState } from "react"
import { Button } from "#components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "#components/ui/dialog"
import { Input } from "#components/ui/input"
import { Label } from "#components/ui/label"
import { DatePicker } from "#components/ui/date-picker"
import { useProjectsStore } from "#store/projects"
import { updateProject, deleteProject } from "#lib/projects"
import type { Project } from "#lib/types/project"

interface ProjectDialogProps {
  open:         boolean
  onOpenChange: (open: boolean) => void
  project?:     Project   // present in edit mode
}

const today = () => new Date().toISOString().split("T")[0]

export function ProjectDialog({ open, onOpenChange, project }: ProjectDialogProps) {
  const { addProject, patchProject, removeProject } = useProjectsStore.getState()
  const isEdit = !!project

  const [name,      setName]      = useState("")
  const [startDate, setStartDate] = useState(today())
  const [weekCount, setWeekCount] = useState("12")
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState("")

  useEffect(() => {
    if (!open) return
    if (project) {
      setName(project.name)
      setStartDate(project.start_date)
      setWeekCount(String(project.week_count))
    } else {
      setName(""); setStartDate(today()); setWeekCount("12")
    }
    setError("")
  }, [open, project])

  async function handleSave() {
    if (!name.trim()) { setError("Project name is required"); return }
    const wc = parseInt(weekCount)
    if (isNaN(wc) || wc < 4 || wc > 52) { setError("Weeks must be between 4 and 52"); return }

    setSaving(true)
    try {
      if (isEdit && project) {
        await updateProject(project.id, { name: name.trim(), start_date: startDate, week_count: wc })
        patchProject(project.id, { name: name.trim(), start_date: startDate, week_count: wc })
      } else {
        await addProject({ name: name.trim(), start_date: startDate, week_count: wc })
      }
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!project) return
    await deleteProject(project.id)
    removeProject(project.id)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit project" : "New project"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Project name</Label>
            <Input placeholder="e.g. Personal OS v2" value={name} onChange={e => { setName(e.target.value); setError("") }} autoFocus />
          </div>
          <div className="space-y-2">
            <Label>Start date</Label>
            <DatePicker value={startDate} onChange={v => setStartDate(v ?? today())} className="w-full" />
          </div>
          <div className="space-y-2">
            <Label>Number of weeks</Label>
            <Input type="number" min={4} max={52} value={weekCount} onChange={e => setWeekCount(e.target.value)} />
            <p className="text-xs text-muted-foreground">Between 4 and 52 weeks</p>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <DialogFooter className="gap-2">
          {isEdit && (
            <Button variant="destructive" size="sm" onClick={handleDelete} className="mr-auto">
              Delete
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save changes" : "Create project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
