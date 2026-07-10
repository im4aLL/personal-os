import { useState } from "react"
import { Button } from "#components/ui/button"
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "#components/ui/dialog"
import { Input } from "#components/ui/input"
import { Label } from "#components/ui/label"
import { DatePicker } from "#components/ui/date-picker"

interface ProjectDialogProps {
  open:         boolean
  onOpenChange: (open: boolean) => void
  mode?:        "create" | "edit"
}

export function ProjectDialog({ open, onOpenChange, mode = "create" }: ProjectDialogProps) {
  const isEdit   = mode === "edit"
  const [weeks, setWeeks] = useState(isEdit ? "12" : "12")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit project" : "New project"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Project name</Label>
            <Input placeholder="e.g. Personal OS v2" defaultValue={isEdit ? "Personal OS" : ""} autoFocus />
          </div>

          <div className="space-y-2">
            <Label>Start date</Label>
            <DatePicker
              value={isEdit ? "2026-06-01" : new Date().toISOString().split("T")[0]}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label>Number of weeks</Label>
            <Input
              type="number"
              min={4}
              max={52}
              value={weeks}
              onChange={e => setWeeks(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Between 4 and 52 weeks</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => onOpenChange(false)}>
            {isEdit ? "Save changes" : "Create project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
