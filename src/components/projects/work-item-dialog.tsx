import { useState } from "react"
import { Button } from "#components/ui/button"
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "#components/ui/dialog"
import { Input } from "#components/ui/input"
import { Label } from "#components/ui/label"
import { Textarea } from "#components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "#components/ui/select"

const MOCK_PHASES = [
  { id: "1", name: "Backend",  color: "#93C5FD" },
  { id: "2", name: "Frontend", color: "#86EFAC" },
  { id: "3", name: "QA",       color: "#FCD34D" },
]

interface WorkItemDialogProps {
  open:         boolean
  onOpenChange: (open: boolean) => void
  mode?:        "create" | "edit"
  weekCount?:   number
}

export function WorkItemDialog({ open, onOpenChange, mode = "create", weekCount = 12 }: WorkItemDialogProps) {
  const isEdit = mode === "edit"
  const [phaseId, setPhaseId] = useState(isEdit ? "1" : "")
  const [status, setStatus]   = useState(isEdit ? "in_progress" : "pending")

  const selectedPhase = MOCK_PHASES.find(p => p.id === phaseId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit work item" : "Add work item"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Phase */}
          <div className="space-y-2">
            <Label>Phase</Label>
            <Select value={phaseId} onValueChange={setPhaseId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a phase">
                  {selectedPhase && (
                    <div className="flex items-center gap-2">
                      <span className="size-3 rounded-sm" style={{ background: selectedPhase.color }} />
                      {selectedPhase.name}
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {MOCK_PHASES.map(p => (
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

          {/* Title */}
          <div className="space-y-2">
            <Label>Title</Label>
            <Input placeholder="Task name" defaultValue={isEdit ? "API endpoints" : ""} autoFocus />
          </div>

          {/* Person */}
          <div className="space-y-2">
            <Label>Resource <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input placeholder="Person name" defaultValue={isEdit ? "Raj" : ""} />
          </div>

          {/* Week range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start week</Label>
              <Input type="number" min={1} max={weekCount} defaultValue={isEdit ? "2" : "1"} />
            </div>
            <div className="space-y-2">
              <Label>End week</Label>
              <Input type="number" min={1} max={weekCount} defaultValue={isEdit ? "3" : "1"} />
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <Label>Comment <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Textarea
              placeholder="Notes visible as tooltip on hover…"
              className="resize-none"
              rows={2}
              defaultValue={isEdit ? "Blocked on auth service being ready" : ""}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => onOpenChange(false)}>
            {isEdit ? "Save changes" : "Add item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
