import { useState } from "react"
import { cn } from "#lib/utils"
import { ProjectHeader } from "./project-header"
import { GanttRow, type MockWorkItem } from "./gantt-row"
import { WorkItemDialog } from "./work-item-dialog"

// ── Mock data ─────────────────────────────────────────────────────────────────

const WEEK_COUNT  = 12
const START_DATE  = "2026-06-01"

// Jun 1 + 5 weeks = Jul 6 → current week is 6
const CURRENT_WEEK = 6

interface WeekHeader {
  weekNum:   number
  date:      string
  isCurrent: boolean
}

function buildHeaders(): WeekHeader[] {
  return Array.from({ length: WEEK_COUNT }, (_, i) => {
    const d = new Date(START_DATE + "T00:00:00")
    d.setDate(d.getDate() + i * 7)
    return {
      weekNum:   i + 1,
      date:      d.toLocaleDateString(undefined, { month: "numeric", day: "numeric", year: "numeric" }),
      isCurrent: i + 1 === CURRENT_WEEK,
    }
  })
}

const WEEK_HEADERS = buildHeaders()

const MOCK_ITEMS: MockWorkItem[] = [
  { id: "1",  title: "Database schema design", person: "Raj",  phaseColor: "#93C5FD", status: "done",        startWeek: 1, endWeek: 2,  comment: null },
  { id: "2",  title: "API endpoints",          person: "Raj",  phaseColor: "#93C5FD", status: "done",        startWeek: 2, endWeek: 3,  comment: "REST + tRPC endpoints" },
  { id: "3",  title: "Auth service",           person: "Hadi", phaseColor: "#93C5FD", status: "in_progress", startWeek: 3, endWeek: 5,  comment: null },
  { id: "s1", title: "", person: null, phaseColor: "", status: "pending", startWeek: 0, endWeek: 0, comment: null, isSeparator: true },
  { id: "4",  title: "Dashboard UI",           person: "Hadi", phaseColor: "#86EFAC", status: "in_progress", startWeek: 4, endWeek: 6,  comment: null },
  { id: "5",  title: "Notes page",             person: "Hadi", phaseColor: "#86EFAC", status: "in_progress", startWeek: 5, endWeek: 7,  comment: null },
  { id: "6",  title: "Links page",             person: "Hadi", phaseColor: "#86EFAC", status: "pending",     startWeek: 6, endWeek: 8,  comment: "Includes virtual scrolling" },
  { id: "7",  title: "Work log + Projects",    person: "Hadi", phaseColor: "#86EFAC", status: "pending",     startWeek: 7, endWeek: 9,  comment: null },
  { id: "s2", title: "", person: null, phaseColor: "", status: "pending", startWeek: 0, endWeek: 0, comment: null, isSeparator: true },
  { id: "8",  title: "Unit tests",             person: "Raj",  phaseColor: "#FCD34D", status: "pending",     startWeek: 7, endWeek: 9,  comment: null },
  { id: "9",  title: "Integration tests",      person: "Raj",  phaseColor: "#FCD34D", status: "pending",     startWeek: 9, endWeek: 11, comment: null },
  { id: "10", title: "Release candidate",      person: "Raj",  phaseColor: "#FCD34D", status: "pending",     startWeek: 11, endWeek: 12, comment: null },
]

const COLS = `260px 120px repeat(${WEEK_COUNT}, minmax(72px, 1fr))`

// ── Component ─────────────────────────────────────────────────────────────────

export function GanttView() {
  const [editOpen,    setEditOpen]    = useState(false)
  const [_editingId,  setEditingId]   = useState<string | null>(null)

  function handleEdit(id: string) {
    setEditingId(id)
    setEditOpen(true)
  }

  return (
    <div className="flex flex-col h-full min-w-0">
      <ProjectHeader
        name="Personal OS"
        dateRange="Jun 1 – Aug 24, 2026"
        weekCount={WEEK_COUNT}
      />

      {/* Chart — bounded to available width, scrolls both axes */}
      <div className="flex-1 overflow-auto isolate min-h-0 min-w-0 w-full">
        <div className="min-w-max">
          {/* Header row 1 — dates */}
          <div
            className="grid sticky top-0 z-30 border-b bg-background"
            style={{ gridTemplateColumns: COLS }}
          >
            <div className="z-40 bg-background border-r px-3 py-1.5 text-xs font-semibold text-muted-foreground">
              Task
            </div>
            <div className="bg-background border-r px-3 py-1.5 text-xs font-semibold text-muted-foreground">
              Resource
            </div>
            {WEEK_HEADERS.map(w => (
              <div
                key={w.weekNum}
                className={cn(
                  "border-r px-2 py-1.5 text-xs text-center",
                  w.isCurrent ? "font-bold text-foreground" : "text-muted-foreground"
                )}
              >
                {w.date}
              </div>
            ))}
          </div>

          {/* Header row 2 — week numbers */}
          <div
            className="grid sticky border-b bg-muted/30"
            style={{ gridTemplateColumns: COLS, top: "29px", zIndex: 30 }}
          >
            <div className="z-40 bg-muted/30 border-r px-3 py-1" />
            <div className="bg-muted/30 border-r px-3 py-1" />
            {WEEK_HEADERS.map(w => (
              <div
                key={w.weekNum}
                className={cn(
                  "border-r px-2 py-1 text-xs text-center",
                  w.isCurrent
                    ? "font-bold text-foreground bg-primary/5"
                    : "text-muted-foreground"
                )}
              >
                Week {w.weekNum}
              </div>
            ))}
          </div>

          {/* Work item rows */}
          {MOCK_ITEMS.map(item => (
            <GanttRow
              key={item.id}
              item={item}
              weekCount={WEEK_COUNT}
              onEdit={() => handleEdit(item.id)}
              onDelete={() => {}}
            />
          ))}
        </div>
      </div>

      <WorkItemDialog open={editOpen} onOpenChange={setEditOpen} mode="edit" weekCount={WEEK_COUNT} />
    </div>
  )
}
