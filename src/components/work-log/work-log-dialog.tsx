import { useEffect, useState } from "react"

import { Button } from "#components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#components/ui/dialog"
import { Input } from "#components/ui/input"
import { Label } from "#components/ui/label"
import { Textarea } from "#components/ui/textarea"
import { DatePicker } from "#components/ui/date-picker"
import { WorkLogTagInput } from "./work-log-tag-input"
import { createWorkLog, updateWorkLog, setTagsForWorkLog } from "#lib/work-logs"
import { useWorkLogsStore } from "#store/work-logs"
import type { WorkLogWithTags } from "#lib/types/work-log"

interface WorkLogDialogProps {
  open:         boolean
  onOpenChange: (open: boolean) => void
  log?:         WorkLogWithTags   // present in edit mode
}

const today = () => new Date().toISOString().split("T")[0]

export function WorkLogDialog({ open, onOpenChange, log }: WorkLogDialogProps) {
  const { addWorkLog, patchWorkLog, reloadTags, allTags } = useWorkLogsStore.getState()
  const isEdit = !!log

  const [title,       setTitle]       = useState("")
  const [description, setDescription] = useState("")
  const [startDate,   setStartDate]   = useState(today())
  const [endDate,     setEndDate]     = useState(today())
  const [tags,        setTags]        = useState<string[]>([])
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState("")

  useEffect(() => {
    if (!open) return
    if (log) {
      setTitle(log.title)
      setDescription(log.description ?? "")
      setStartDate(log.start_date)
      setEndDate(log.end_date)
      setTags(log.tags)
    } else {
      setTitle(""); setDescription(""); setStartDate(today()); setEndDate(today()); setTags([])
    }
    setError("")
  }, [open, log])

  async function handleSave() {
    if (!title.trim()) { setError("Title is required"); return }
    if (startDate > endDate) { setError("End date must be on or after start date"); return }

    setSaving(true)
    try {
      if (isEdit && log) {
        await updateWorkLog(log.id, {
          title:       title.trim(),
          description: description.trim() || null,
          start_date:  startDate,
          end_date:    endDate,
        })
        await setTagsForWorkLog(log.id, tags)
        patchWorkLog(log.id, {
          title:       title.trim(),
          description: description.trim() || null,
          start_date:  startDate,
          end_date:    endDate,
          tags,
        })
      } else {
        const created = await createWorkLog({
          title:       title.trim(),
          description: description.trim() || null,
          start_date:  startDate,
          end_date:    endDate,
          tags,
        })
        addWorkLog(created)
      }
      await reloadTags()
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
          <DialogTitle>{isEdit ? "Edit entry" : "Add entry"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              placeholder="What did you work on?"
              value={title}
              onChange={e => { setTitle(e.target.value); setError("") }}
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>
              Description <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              placeholder="Add more details…"
              className="resize-none break-all"
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start date</Label>
              <DatePicker value={startDate} onChange={v => setStartDate(v ?? today())} className="w-full" />
            </div>
            <div className="space-y-2">
              <Label>End date</Label>
              <DatePicker value={endDate} onChange={v => setEndDate(v ?? today())} className="w-full" />
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>
              Tags <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <WorkLogTagInput tags={tags} suggestions={allTags} onChange={setTags} />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save changes" : "Add entry"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
