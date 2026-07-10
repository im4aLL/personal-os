import { useEffect, useState } from "react"
import { Search, Plus, X, ClipboardList } from "lucide-react"
import { useDebounce } from "use-debounce"

import { Button } from "#components/ui/button"
import { Input } from "#components/ui/input"
import { Skeleton } from "#components/ui/skeleton"
import { DatePicker } from "#components/ui/date-picker"
import { cn } from "#lib/utils"
import { useWorkLogsStore } from "#store/work-logs"
import { WeekGroup } from "./week-group"
import { WorkLogDialog } from "./work-log-dialog"
import type { WorkLogWithTags } from "#lib/types/work-log"

export function WorkLogList() {
  const groups  = useWorkLogsStore(s => s.groups)
  const loading = useWorkLogsStore(s => s.loading)
  const { loadWorkLogs, refreshWorkLogs, applyFilter } = useWorkLogsStore.getState()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingLog, setEditingLog] = useState<WorkLogWithTags | undefined>(undefined)
  const [search,     setSearch]     = useState("")
  const [dateFrom,   setDateFrom]   = useState("")
  const [dateTo,     setDateTo]     = useState("")

  const [debouncedSearch] = useDebounce(search, 300)

  const hasFilters = !!search || !!dateFrom || !!dateTo

  useEffect(() => { loadWorkLogs() }, [loadWorkLogs])

  useEffect(() => {
    const handler = () => refreshWorkLogs()
    window.addEventListener("personal-os:sync-complete", handler)
    return () => window.removeEventListener("personal-os:sync-complete", handler)
  }, [refreshWorkLogs])

  // Re-apply filter whenever search or dates change
  useEffect(() => {
    applyFilter({
      query:    debouncedSearch.trim() || undefined,
      dateFrom: dateFrom || undefined,
      dateTo:   dateTo   || undefined,
    })
  }, [debouncedSearch, dateFrom, dateTo, applyFilter])

  function openCreate() {
    setEditingLog(undefined)
    setDialogOpen(true)
  }

  function openEdit(log: WorkLogWithTags) {
    setEditingLog(log)
    setDialogOpen(true)
  }

  function clearFilters() { setSearch(""); setDateFrom(""); setDateTo("") }

  function setPreset(preset: "this-week" | "last-week" | "this-month") {
    const now   = new Date()
    const today = now.toISOString().split("T")[0]
    if (preset === "this-week") {
      const day = now.getDay() === 0 ? 6 : now.getDay() - 1
      const mon = new Date(now); mon.setDate(now.getDate() - day)
      setDateFrom(mon.toISOString().split("T")[0]); setDateTo(today)
    } else if (preset === "last-week") {
      const day = now.getDay() === 0 ? 6 : now.getDay() - 1
      const mon = new Date(now); mon.setDate(now.getDate() - day - 7)
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
      setDateFrom(mon.toISOString().split("T")[0]); setDateTo(sun.toISOString().split("T")[0])
    } else {
      setDateFrom(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`)
      setDateTo(today)
    }
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Row 1 — Search + Add */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            className="pl-8 h-9 text-sm"
            placeholder="Search entries…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Button className="ml-auto" onClick={openCreate}>
          <Plus className="size-4" />
          Add entry
        </Button>
      </div>

      {/* Row 2 — Date range + presets + clear */}
      <div className="flex items-center gap-2 flex-wrap">
        <DatePicker value={dateFrom} onChange={v => setDateFrom(v ?? "")} placeholder="From" />
        <span className="text-xs text-muted-foreground">→</span>
        <DatePicker value={dateTo}   onChange={v => setDateTo(v ?? "")}   placeholder="To" />

        <div className="flex items-center gap-1 ml-1">
          {(["this-week", "last-week", "this-month"] as const).map(preset => (
            <Button key={preset} variant="ghost" size="xs" className="text-muted-foreground" onClick={() => setPreset(preset)}>
              {preset === "this-week" ? "This week" : preset === "last-week" ? "Last week" : "This month"}
            </Button>
          ))}
        </div>

        {hasFilters && (
          <Button variant="ghost" size="xs" className="text-muted-foreground ml-auto" onClick={clearFilters}>
            <X className="size-3" />
            Clear
          </Button>
        )}
      </div>

      {/* Grouped list */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {loading ? (
          <div className="space-y-6">
            {[1, 2].map(g => (
              <div key={g} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
              </div>
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className={cn("flex flex-col items-center justify-center h-full gap-3 text-muted-foreground")}>
            <ClipboardList className="size-10 opacity-20" />
            <div className="text-center space-y-1">
              <p className="text-sm font-medium">{hasFilters ? "No entries match your filters" : "No entries yet"}</p>
              <p className="text-xs opacity-70">{hasFilters ? "Try adjusting your search or date range" : "Start logging what you work on each day"}</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {groups.map(group => (
              <WeekGroup key={group.weekKey} group={group} onEdit={openEdit} />
            ))}
          </div>
        )}
      </div>

      <WorkLogDialog open={dialogOpen} onOpenChange={setDialogOpen} log={editingLog} />
    </div>
  )
}
