import { useState } from "react"
import { Trash2, ChevronUp, ChevronDown, Plus } from "lucide-react"
import { Button } from "#components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "#components/ui/dialog"
import { Input } from "#components/ui/input"
import { cn } from "#lib/utils"
import { useProjectsStore } from "#store/projects"

interface PhaseManagerDialogProps {
  open:         boolean
  onOpenChange: (open: boolean) => void
}

export function PhaseManagerDialog({ open, onOpenChange }: PhaseManagerDialogProps) {
  const phases    = useProjectsStore(s => s.phases)
  const workItems = useProjectsStore(s => s.workItems)
  const { addPhase, removePhase, movePhase } = useProjectsStore.getState()

  const [newName,  setNewName]  = useState("")
  const [newColor, setNewColor] = useState("#93C5FD")
  const [saving,   setSaving]   = useState(false)

  function itemCountForPhase(phaseId: string) {
    return workItems.filter(w => !w.is_separator && w.phase_id === phaseId).length
  }

  async function handleAdd() {
    if (!newName.trim()) return
    setSaving(true)
    try {
      await addPhase({ name: newName.trim(), color: newColor })
      setNewName(""); setNewColor("#93C5FD")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Manage phases</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            {phases.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-2">No phases yet</p>
            )}
            {phases.map((phase, i) => {
              const count = itemCountForPhase(phase.id)
              return (
                <div key={phase.id} className="flex items-center gap-2 rounded-lg border px-3 py-2">
                  <span className="size-4 rounded-sm shrink-0" style={{ background: phase.color }} />
                  <span className="flex-1 text-sm">{phase.name}</span>
                  <span className="text-xs text-muted-foreground">{count} item{count !== 1 ? "s" : ""}</span>
                  <div className="flex items-center gap-0.5">
                    <Button variant="ghost" size="icon-xs" disabled={i === 0} onClick={() => movePhase(phase.id, "up")}>
                      <ChevronUp className="size-3" />
                    </Button>
                    <Button variant="ghost" size="icon-xs" disabled={i === phases.length - 1} onClick={() => movePhase(phase.id, "down")}>
                      <ChevronDown className="size-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      disabled={count > 0}
                      className={cn(count > 0 ? "opacity-30" : "text-muted-foreground hover:text-destructive")}
                      onClick={() => removePhase(phase.id)}
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex items-center gap-2 border-t pt-4">
            <input
              type="color"
              value={newColor}
              onChange={e => setNewColor(e.target.value)}
              className="size-8 shrink-0 rounded cursor-pointer border border-input"
            />
            <Input
              placeholder="Phase name…"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAdd()}
              className="flex-1"
            />
            <Button size="sm" variant="secondary" disabled={!newName.trim() || saving} onClick={handleAdd}>
              <Plus className="size-3.5" />
              Add
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
