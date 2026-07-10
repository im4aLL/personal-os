import { useState } from "react"
import { Trash2, ChevronUp, ChevronDown, Plus } from "lucide-react"
import { Button } from "#components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "#components/ui/dialog"
import { Input } from "#components/ui/input"
import { cn } from "#lib/utils"

interface Phase {
  id:    string
  name:  string
  color: string
  items: number   // work items using this phase
}

const MOCK_PHASES: Phase[] = [
  { id: "1", name: "Backend",  color: "#93C5FD", items: 3 },
  { id: "2", name: "Frontend", color: "#86EFAC", items: 4 },
  { id: "3", name: "QA",       color: "#FCD34D", items: 2 },
]

interface PhaseManagerDialogProps {
  open:         boolean
  onOpenChange: (open: boolean) => void
}

export function PhaseManagerDialog({ open, onOpenChange }: PhaseManagerDialogProps) {
  const [phases]   = useState<Phase[]>(MOCK_PHASES)
  const [newName,  setNewName]  = useState("")
  const [newColor, setNewColor] = useState("#93C5FD")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Manage phases</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Existing phases */}
          <div className="space-y-1.5">
            {phases.map((phase, i) => (
              <div key={phase.id} className="flex items-center gap-2 rounded-lg border px-3 py-2">
                {/* Colour swatch */}
                <span className="size-4 rounded-sm shrink-0" style={{ background: phase.color }} />
                <span className="flex-1 text-sm">{phase.name}</span>
                <span className="text-xs text-muted-foreground">{phase.items} item{phase.items !== 1 ? "s" : ""}</span>
                <div className="flex items-center gap-0.5">
                  <Button variant="ghost" size="icon-xs" disabled={i === 0}>
                    <ChevronUp className="size-3" />
                  </Button>
                  <Button variant="ghost" size="icon-xs" disabled={i === phases.length - 1}>
                    <ChevronDown className="size-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    disabled={phase.items > 0}
                    className={cn(phase.items > 0 ? "opacity-30" : "text-muted-foreground hover:text-destructive")}
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Add new phase */}
          <div className="flex items-center gap-2 border-t pt-4">
            <input
              type="color"
              value={newColor}
              onChange={e => setNewColor(e.target.value)}
              className="size-8 shrink-0 rounded cursor-pointer border border-input"
              title="Pick colour"
            />
            <Input
              placeholder="Phase name…"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="flex-1"
            />
            <Button size="sm" variant="secondary" disabled={!newName.trim()}>
              <Plus className="size-3.5" />
              Add
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
