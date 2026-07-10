# Work Log Feature Plan

## Overview

A log of completed work items. Each entry has a title, optional description, a date
(defaults to today), and optional tags. Entries are displayed grouped by week, newest
week first. Filterable by title search and date range.

---

## Decisions Log

| Question | Decision |
|----------|----------|
| Date format | Date only (no time) — `YYYY-MM-DD` |
| Duration | Not needed |
| Display | Grouped by week, newest week first |
| Tags | Optional, same UX as notes/links (type + Enter) |
| Filter | Title search + date range picker |
| Delete | Permanent |

---

## Database Schema

### Migration: `005_work_logs.sql`

```sql
CREATE TABLE IF NOT EXISTS work_logs (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT,
  date        TEXT NOT NULL,             -- ISO date string YYYY-MM-DD
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS work_log_tags (
  id           TEXT PRIMARY KEY,
  work_log_id  TEXT NOT NULL REFERENCES work_logs(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  created_at   TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_work_logs_date           ON work_logs (date DESC);
CREATE INDEX IF NOT EXISTS idx_work_log_tags_work_log_id ON work_log_tags (work_log_id);
CREATE INDEX IF NOT EXISTS idx_work_log_tags_name        ON work_log_tags (name);
```

---

## Remote Schema (Turso sync)

Add both tables + indexes to `REMOTE_SCHEMAS` in `src/lib/schema.ts`.
Add `syncWorkLogs()` in `src/lib/sync.ts`, call it inside the main sync function.

---

## Data Access Layer

**File:** `src/lib/work-logs.ts`

```ts
getWorkLogs(filter?)              // all logs date DESC, optional filter
searchWorkLogs(query, dateRange?) // LIKE on title + optional date range
createWorkLog(input)              // insert log + tags
updateWorkLog(id, input)          // title, description, date
deleteWorkLog(id)                 // permanent, cascade removes tags
getTagsForWorkLog(id)             // string[]
setTagsForWorkLog(id, tags)       // replace all tags
getAllUsedTags()                  // DISTINCT names for autocomplete
```

**Filter type:**
```ts
interface WorkLogFilter {
  query?    : string   // title search
  dateFrom? : string   // YYYY-MM-DD inclusive
  dateTo?   : string   // YYYY-MM-DD inclusive
}
```

**Types** (`src/lib/types/work-log.ts`):
```ts
interface WorkLog {
  id:          string
  title:       string
  description: string | null
  date:        string          // YYYY-MM-DD
  created_at:  string
  updated_at:  string
  tags?:       string[]
}

interface CreateWorkLogInput {
  title:       string
  description: string | null
  date:        string
  tags:        string[]
}

type UpdateWorkLogInput = Partial<Pick<WorkLog, 'title' | 'description' | 'date'>>
```

---

## Week Grouping Logic

Group logs client-side after fetching. Each group has a human-readable label:

```ts
function getWeekLabel(dateStr: string): string {
  // Returns:
  // "This week"       — current ISO week
  // "Last week"       — previous ISO week
  // "Week of Jul 7"   — older weeks (Monday date of that week)
}

interface WeekGroup {
  label: string          // "This week", "Last week", "Week of Jul 7"
  weekKey: string        // e.g. "2026-W28" for stable keying
  logs: WorkLog[]
}

function groupByWeek(logs: WorkLog[]): WeekGroup[]
```

Week starts on **Monday** (ISO standard).  
Groups are ordered newest week first. Within each group logs are newest date first.

---

## UI Layout

```
WorkLogPage
├── Toolbar
│   ├── Search input (filter by title)
│   ├── Date range: [From date] → [To date]   (native date inputs)
│   ├── Clear filters button (shown when any filter active)
│   └── "+ Add entry" button → opens WorkLogDialog
└── Grouped list
    └── WeekGroup × n (newest first)
        ├── Week header: "This week" / "Last week" / "Week of Jul 7"  +  item count
        └── WorkLogItem × n
            ├── Date badge (e.g. "Mon, Jul 7")
            ├── Title
            ├── Description (truncated to 2 lines if present)
            ├── Tag badges
            └── Edit + Delete buttons (hover to reveal)
```

---

## Component Details

### `work-log-dialog.tsx`
Used for both create and edit.

Fields:
- **Title** — text input, required
- **Description** — textarea, optional
- **Date** — `<input type="date">` defaulting to today, fully editable
- **Tags** — tag input with autocomplete from previously used tags

Behaviour:
- Create mode: date pre-filled with today
- Edit mode: all fields pre-filled from existing entry
- Save → `createWorkLog` or `updateWorkLog` → background sync

### `work-log-item.tsx`
- Date badge: short weekday + date (e.g. `Mon, Jul 7`)
- Title in semibold
- Description below in muted text, `line-clamp-2`
- Tags as small badges
- Edit icon → opens `WorkLogDialog` in edit mode
- Delete icon → permanent delete (both revealed on row hover)

### `week-group.tsx`
- Header with week label + count badge (e.g. `This week · 4 entries`)
- Renders `WorkLogItem` list inside

### `work-log-list.tsx`
- Fetches all logs on mount (with tags)
- Applies filters client-side for search (re-fetches from DB for date range)
- Groups by week via `groupByWeek()`
- Listens for `personal-os:sync-complete` → silent refresh
- Empty state: "No entries yet" / "No results for current filters"

---

## Date Range Filter Behaviour

- Both `From` and `To` are optional independently
- If only `From` set → show logs from that date onward
- If only `To` set → show logs up to that date
- If both set → show logs within range (inclusive)
- "Clear filters" button resets both date inputs and search query
- Quick presets as text buttons next to the date inputs:
  `This week` · `Last week` · `This month`

---

## Sync Considerations

- `syncWorkLogs()` syncs `work_logs` (last-write-wins on `updated_at`)
- `work_log_tags` sync: same pattern as other tag tables
- Background sync after create/update/delete — always `{ silent: true }`
- `sync-complete` event → silent refresh in `work-log-list.tsx`

---

## Implementation Order

1. `005_work_logs.sql` migration
2. `lib.rs`: register migration for both DB files
3. `schema.ts`: add to `REMOTE_SCHEMAS`
4. `src/lib/types/work-log.ts`
5. `src/lib/work-logs.ts` (DAL)
6. `src/lib/week-groups.ts` (grouping + label helpers)
7. `sync.ts`: add `syncWorkLogs()`
8. Components (in order):
   - `work-log-tag-input.tsx` (or reuse shared tag input if extracted)
   - `work-log-dialog.tsx`
   - `work-log-item.tsx`
   - `week-group.tsx`
   - `work-log-list.tsx`
9. Update `src/pages/work-log.tsx`

---

## Out of Scope (for now)

- Weekly/monthly summary stats (total entries, most active days)
- Export to CSV
- Duration / time tracking
- Recurring log templates
- Calendar view
