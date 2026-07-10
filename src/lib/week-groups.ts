import type { WorkLogWithTags } from "#lib/types/work-log"

export interface WeekGroup {
  label:   string   // "This week" | "Last week" | "Week of Jul 7"
  weekKey: string   // "2026-W28" for stable React keys
  logs:    WorkLogWithTags[]
}

// Returns the ISO week key "YYYY-Www" for a given YYYY-MM-DD string.
// Week starts on Monday (ISO 8601).
function getWeekKey(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number)
  const date = new Date(y, m - 1, d)

  // ISO week: Thursday of the week determines the year
  const day       = date.getDay() === 0 ? 7 : date.getDay()  // Mon=1 … Sun=7
  const thursday  = new Date(date)
  thursday.setDate(date.getDate() + (4 - day))

  const yearStart = new Date(thursday.getFullYear(), 0, 1)
  const weekNum   = Math.ceil(((thursday.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7)

  return `${thursday.getFullYear()}-W${String(weekNum).padStart(2, "0")}`
}

// Returns the Monday of the week containing dateStr.
function getMondayOf(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number)
  const date = new Date(y, m - 1, d)
  const day  = date.getDay() === 0 ? 6 : date.getDay() - 1  // Mon=0 … Sun=6
  const mon  = new Date(date)
  mon.setDate(date.getDate() - day)
  return mon
}

function getWeekLabel(dateStr: string): string {
  const thisWeekKey = getWeekKey(new Date().toISOString().split("T")[0])
  const weekKey     = getWeekKey(dateStr)

  if (weekKey === thisWeekKey) return "This week"

  // Last week
  const lastMonday = new Date()
  const todayDay   = lastMonday.getDay() === 0 ? 6 : lastMonday.getDay() - 1
  lastMonday.setDate(lastMonday.getDate() - todayDay - 7)
  const lastWeekKey = getWeekKey(lastMonday.toISOString().split("T")[0])
  if (weekKey === lastWeekKey) return "Last week"

  // Older: "Week of Jul 7"
  const monday    = getMondayOf(dateStr)
  const thisYear  = new Date().getFullYear()
  const formatted = monday.toLocaleDateString(undefined, {
    month: "short",
    day:   "numeric",
    ...(monday.getFullYear() !== thisYear ? { year: "numeric" } : {}),
  })
  return `Week of ${formatted}`
}

export function groupByWeek(logs: WorkLogWithTags[]): WeekGroup[] {
  const map = new Map<string, WeekGroup>()

  for (const log of logs) {
    const key = getWeekKey(log.start_date)
    if (!map.has(key)) {
      map.set(key, {
        label:   getWeekLabel(log.start_date),
        weekKey: key,
        logs:    [],
      })
    }
    map.get(key)!.logs.push(log)
  }

  // Groups already ordered newest-first because logs come in start_date DESC order
  return Array.from(map.values())
}
