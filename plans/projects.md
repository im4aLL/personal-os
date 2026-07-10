# Project Planner Feature Plan

## Overview

A simplified Gantt chart modelled on the M3 reference. Each project has its own chart.
Two fixed left columns (Task, Resource) then week columns across the top. Each row is
one task assigned to one person. The task's phase type determines its bar colour — the
colour IS the visual phase indicator, no separate phase column. Blank separator rows
visually group related tasks. Current week column is bolded.

---

## Reference — M3 Gantt Chart

```
         |            | 3/4/2026   | 3/11/2026  | 3/18/2026  | 4/8/2026 ← current (bold)
         |            | Week 1     | Week 2     | Week 3     | Week 6
---------|------------|------------|------------|------------|----------
Task     | Resource   |            |            |            |
---------|------------|------------|------------|------------|----------
KM-17348 | Raj        | [blue    ] |            |            |
KM-17349 | Raj        | [blue    ] |            |            |
KM-17347 | Raj        | [blue    ] |            |            |
KM-17336 | Hadi       | [green   ] |            |            |
KM-17337 | Hadi       | [green   ] |            |            |
         |            |            |            |            |   ← blank separator row
KM-17346 | Raj        |            | [blue    ] |            |
Project  | Raj        |            | [blue    ] |            |
KM-17350 | Raj        |            | [blue    ] |            |
KM-17368 | Hadi       |            | [green   ] |            |
```

Key observations:
- **Only 2 left columns**: Task name + Resource (person)
- **Phase = bar colour**: blue rows = one phase, green = another — defined per project
- **Person name in Resource column**, NOT inside the bar
- **Blank rows** visually separate task groups (no heading text, just spacing)
- **Current week column header is bolded**
- **Week header row 1**: actual date (3/4/2026)
- **Week header row 2**: week number (Week 1)
- Bars are solid coloured cells; one task = one colour across its week range

---

## Decisions Log

| Question | Decision |
|----------|----------|
| Multiple projects | Yes — each project has its own Gantt |
| Left columns | Task name + Resource (person) only |
| Phase indicator | Bar colour — no separate phase column |
| Phases | Custom per project — name + colour (pick colour) |
| Each task's phase | One phase per task (determines bar colour) |
| Bar content | Solid colour — no text inside bar |
| Person | Resource column (col 2) |
| Comment | Per task, shown as tooltip icon on hover |
| Status | Per task: pending / in_progress / done — affects bar style |
| Bar duration | start_week → end_week (form input) |
| Separator rows | Blank visual separators between task groups |
| Week header | Row 1: date · Row 2: week number · Current week: **bold** |
| Week count | Configurable per project |
| Interaction | Form — no drag & drop |

---

## Database Schema

### Migration: `006_projects.sql`

```sql
CREATE TABLE IF NOT EXISTS projects (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  start_date  TEXT NOT NULL,       -- YYYY-MM-DD (week 1 start)
  week_count  INTEGER NOT NULL DEFAULT 12,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

-- Phase types per project: name + colour only
CREATE TABLE IF NOT EXISTS project_phases (
  id         TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,        -- "Backend", "Frontend", "QA", etc.
  color      TEXT NOT NULL,        -- hex e.g. "#93C5FD" (light blue)
  position   INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

-- Each Gantt row: one task + one phase (colour) + one person + week range
CREATE TABLE IF NOT EXISTS work_items (
  id          TEXT PRIMARY KEY,
  project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  phase_id    TEXT NOT NULL REFERENCES project_phases(id),
  title       TEXT NOT NULL,
  person      TEXT,                -- resource column value
  comment     TEXT,                -- shown as tooltip icon
  status      TEXT NOT NULL DEFAULT 'pending',
  start_week  INTEGER NOT NULL,
  end_week    INTEGER NOT NULL,
  position    INTEGER NOT NULL DEFAULT 0,   -- row order
  is_separator INTEGER NOT NULL DEFAULT 0,  -- 1 = blank separator row
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  CONSTRAINT chk_weeks  CHECK (end_week >= start_week),
  CONSTRAINT chk_status CHECK (status IN ('pending','in_progress','done'))
);

CREATE INDEX IF NOT EXISTS idx_project_phases_project ON project_phases (project_id, position);
CREATE INDEX IF NOT EXISTS idx_work_items_project     ON work_items (project_id, position);
```

> **`is_separator`** — a row with `is_separator = 1` renders as a blank spacer row
> in the chart. The user can insert/remove separators between task groups to match the
> Excel layout they're used to.

---

## Week Header Calculation

```ts
interface WeekHeader {
  weekNum: number     // 1, 2, 3 …
  label:   string     // "Week 1"
  date:    string     // "3/4/2026"
  isCurrent: boolean  // true = bold
}

function getWeekHeaders(startDate: string, weekCount: number): WeekHeader[] {
  const current = getCurrentWeek(startDate, weekCount)
  return Array.from({ length: weekCount }, (_, i) => {
    const d = new Date(startDate + "T00:00:00")
    d.setDate(d.getDate() + i * 7)
    return {
      weekNum:   i + 1,
      label:     `Week ${i + 1}`,
      date:      d.toLocaleDateString(undefined, { month: "numeric", day: "numeric", year: "numeric" }),
      isCurrent: current === i + 1,
    }
  })
}

function getCurrentWeek(startDate: string, weekCount: number): number | null {
  const start = new Date(startDate + "T00:00:00")
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const week = Math.floor((today.getTime() - start.getTime()) / 604_800_000) + 1
  return (week >= 1 && week <= weekCount) ? week : null
}
```

---

## Remote Schema (Turso sync)

Add both tables + indexes to `REMOTE_SCHEMAS` in `src/lib/schema.ts`.
Sync order: `projects → project_phases → work_items`.
Add `syncProjects()` in `src/lib/sync.ts`.

---

## Data Access Layer

**File:** `src/lib/projects.ts`

```ts
getProjects()
createProject(input)              // name, start_date, week_count
updateProject(id, input)
deleteProject(id)                 // cascades phases + items

getPhasesForProject(id)
createPhase(projectId, input)     // name, color
updatePhase(id, input)
deletePhase(id)                   // only if no items use it

getWorkItemsForProject(id)        // ordered by position, includes phase
createWorkItem(projectId, input)
updateWorkItem(id, input)
deleteWorkItem(id)
insertSeparator(projectId, afterPosition)  // insert blank row
reorderWorkItems(projectId, orderedIds)
```

**Types** — `src/lib/types/project.ts`

```ts
interface Project {
  id: string; name: string; start_date: string
  week_count: number; created_at: string; updated_at: string
}

interface ProjectPhase {
  id: string; project_id: string; name: string
  color: string; position: number; created_at: string
}

interface WorkItem {
  id: string; project_id: string; phase_id: string
  title: string; person: string | null; comment: string | null
  status: 'pending' | 'in_progress' | 'done'
  start_week: number; end_week: number
  position: number; is_separator: boolean
  created_at: string; updated_at: string
  phase?: ProjectPhase   // joined when fetching
}
```

---

## UI Layout

```
ProjectPlannerPage
├── Left panel (200px, fixed)              project-list.tsx
│   ├── "+ New project" button
│   └── ProjectListItem × n (name + date range)
└── Right panel (flex-1, overflow-x scroll)
    ├── Empty state
    └── GanttView
        ├── project-header.tsx
        │   ├── Project name + date range
        │   ├── Phase legend (colour swatch + name × n)
        │   └── "Manage phases" · "Edit project" buttons
        └── Scrollable chart (overflow-x: auto)
            ├── Header rows (sticky top)
            │   ├── Row 1 dates: [sticky Task/Resource cols] [date × n]
            │   └── Row 2 weeks: [sticky cols]               [Week N × n]
            │                                                  ↑ current week = font-bold
            └── Work item rows
                ├── Separator row → full-width blank row (8px tall)
                └── Task row      → gantt-row.tsx
                    ├── Col 1 sticky: title + comment icon (hover tooltip)
                    ├── Col 2 sticky: person (muted) + status dot
                    └── Week cols:
                        └── Bar: grid-column start→end, bg=phase.color
                            Status affects opacity:
                            pending     → 40% opacity
                            in_progress → 75% opacity
                            done        → 100% opacity + strikethrough on title
```

---

## Gantt Bar Rendering — CSS Grid

```
grid-template-columns: 260px 120px repeat(week_count, minmax(72px, 1fr))
                       ↑task    ↑person  ↑week columns
```

Bar element for each work item:
```tsx
<div
  style={{
    gridColumn: `${item.start_week + 2} / ${item.end_week + 3}`,
    // +2 offset: col 1 = task, col 2 = person
    backgroundColor: phase.color,
    opacity: item.status === 'pending' ? 0.4 : item.status === 'in_progress' ? 0.75 : 1,
  }}
  className="rounded-sm h-7 my-1"
/>
```

Sticky columns use `position: sticky; left: 0` (task) and `left: 260px` (person)
with solid background so they don't scroll.

---

## Dialogs

### `project-dialog.tsx`
- Name (required)
- Start date (`<input type="date">`, default today)
- Number of weeks (number, default 12, range 4–52)

### `phase-manager-dialog.tsx`
- List: colour swatch + name + delete button
  - Delete disabled if phase has work items (show count)
- Add row: `<input type="color">` + name text input + Add button
- Reorder: up/down buttons

### `work-item-dialog.tsx`
- Phase — Select from project phases (required, shows colour swatch)
- Title — text input (required)
- Resource/Person — text input (optional)
- Start week — number 1→week_count (required)
- End week — number ≥ start week (required)
- Status — Pending / In Progress / Done
- Comment — textarea (optional)

**"+ Add separator"** button in the chart toolbar inserts a blank spacer row at the
bottom (draggable to reorder alongside task rows).

---

## Implementation Order

1. `006_projects.sql`
2. `lib.rs` — register migration for both DB files
3. `schema.ts` — add to `REMOTE_SCHEMAS`
4. `src/lib/types/project.ts`
5. `src/lib/week-utils.ts` (`getWeekHeaders`, `getCurrentWeek`)
6. `src/lib/projects.ts` (DAL)
7. `sync.ts` — `syncProjects()`
8. Components:
   - `project-dialog.tsx`
   - `phase-manager-dialog.tsx`
   - `work-item-dialog.tsx`
   - `gantt-row.tsx`
   - `gantt-view.tsx`
   - `project-header.tsx`
   - `project-list.tsx`
9. `src/pages/projects.tsx`

---

## Out of Scope (for now)

- Drag & drop to reorder rows or resize bars
- Task dependencies / arrows
- Export to PDF or image
- Milestone markers
- Multiple people per task row
- Filter by phase or person
- Linking to Todos / Work Log entries
