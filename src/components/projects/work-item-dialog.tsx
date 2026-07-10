import { useEffect, useState } from "react"
import { Button } from "#components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "#components/ui/dialog"
import { Input } from "#components/ui/input"
import { Label } from "#components/ui/label"
import { Textarea } from "#components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#components/ui/select"
import { useProjectsStore } from "#store/projects"
import { updateWorkItem } from "#lib/projects"
import type { WorkItemWithPhase } from "#lib/types/project"

interface WorkItemDialogProps {
  open:         boolean
  onOpenChange: (open: boolean) => void
  item?:        WorkItemWithPhase   // present in edit mode
}

export function WorkItemDialog({ open, onOpenChange, item }: WorkItemDialogProps) {
  const phases    = useProjectsStore(s => s.phases)
  const workItems = useProjectsStore(s => s.workItems)
  const { addWorkItem, patchWorkItem, removeWorkItem } = useProjectsStore.getState()
  const selectedProject = useProjectsStore(s => s.projects.find(p => p.id === s.selectedId))
  const weekCount = selectedProject?.week_count ?? 12
  const isEdit    = !!item

  const [phaseId,    setPhaseId]    = useState("")
  const [title,      setTitle]      = useState("")
  const [person,     setPerson]     = useState("")
  const [jiraTicket, setJiraTicket] = useState("")
  const [startW,     setStartW]     = useState("1")
  const [endW,     setEndW]     = useState("1")
  const [status,   setStatus]   = useState<"pending" | "in_progress" | "done">("pending")
  const [comment,  setComment]  = useState("")
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState("")

  useEffect(() => {
    if (!open) return
    if (item) {
      setPhaseId(item.phase_id ?? "")
      setTitle(item.title)
      setPerson(item.person ?? "")
      setJiraTicket(item.jira_ticket ?? "")
      setStartW(String(item.start_week))
      setEndW(String(item.end_week))
      setStatus(item.status)
      setComment(item.comment ?? "")
    } else {
      setPhaseId(phases[0]?.id ?? "")
      setTitle(""); setPerson(""); setJiraTicket(""); setStartW("1"); setEndW("1")
      setStatus("pending"); setComment("")
    }
    setError("")
  }, [open, item, phases])

  async function handleSave() {
    if (!title.trim()) { setError("Title is required"); return }
    if (!phaseId)      { setError("Phase is required"); return }
    const sw = parseInt(startW), ew = parseInt(endW)
    if (isNaN(sw) || sw < 1 || sw > weekCount) { setError(`Start week must be 1–${weekCount}`); return }
    if (isNaN(ew) || ew < sw || ew > weekCount) { setError(`End week must be ≥ start week and ≤ ${weekCount}`); return }

    setSaving(true)
    try {
      const patch = {
        phase_id: phaseId, title: title.trim(),
        person: person.trim() || null, comment: comment.trim() || null,
        jira_ticket: jiraTicket.trim() || null,
        status, start_week: sw, end_week: ew,
      }
      if (isEdit && item) {
        await updateWorkItem(item.id, patch)
        const phase = phases.find(p => p.id === phaseId) ?? null
        patchWorkItem(item.id, { ...patch, phase })
      } else {
        await addWorkItem({
          ...patch, is_separator: false,
          position: workItems.length,
        })
      }
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit work item" : "Add work item"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Phase</Label>
            <Select value={phaseId} onValueChange={setPhaseId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a phase" />
              </SelectTrigger>
              <SelectContent>
                {phases.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    <div className="flex items-center gap-2">
                      <span className="size-3 rounded-sm" style={{ background: p.color }} />
                      {p.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Title</Label>
            <Input placeholder="Task name" value={title} onChange={e => { setTitle(e.target.value); setError("") }} autoFocus />
          </div>

          <div className="space-y-2">
            <Label>Resource <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input placeholder="Person name" value={person} onChange={e => setPerson(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Jira ticket <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input placeholder="e.g. KM-1234" value={jiraTicket} onChange={e => setJiraTicket(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start week</Label>
              <Input type="number" min={1} max={weekCount} value={startW} onChange={e => setStartW(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>End week</Label>
              <Input type="number" min={1} max={weekCount} value={endW} onChange={e => setEndW(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={v => setStatus(v as typeof status)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Comment <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Textarea placeholder="Notes visible as tooltip on hover…" className="resize-none" rows={2}
              value={comment} onChange={e => setComment(e.target.value)} />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <DialogFooter className="gap-2">
          {isEdit && (
            <Button variant="destructive" size="sm" className="mr-auto"
              onClick={() => { removeWorkItem(item!.id); onOpenChange(false) }}>
              Delete
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save changes" : "Add item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
