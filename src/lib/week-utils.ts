export interface WeekHeader {
  weekNum:   number
  date:      string
  isCurrent: boolean
}

export function getCurrentWeek(startDate: string, weekCount: number): number | null {
  const start = new Date(startDate + "T00:00:00")
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const week  = Math.floor((today.getTime() - start.getTime()) / 604_800_000) + 1
  return (week >= 1 && week <= weekCount) ? week : null
}

export function getWeekHeaders(startDate: string, weekCount: number): WeekHeader[] {
  const current = getCurrentWeek(startDate, weekCount)
  return Array.from({ length: weekCount }, (_, i) => {
    const d = new Date(startDate + "T00:00:00")
    d.setDate(d.getDate() + i * 7)
    return {
      weekNum:   i + 1,
      date:      d.toLocaleDateString(undefined, { month: "numeric", day: "numeric", year: "numeric" }),
      isCurrent: current === i + 1,
    }
  })
}

export function getProjectDateRange(startDate: string, weekCount: number): string {
  const start = new Date(startDate + "T00:00:00")
  const end   = new Date(start)
  end.setDate(start.getDate() + weekCount * 7 - 1)
  const thisYear = new Date().getFullYear()
  const base: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }
  const withYear: Intl.DateTimeFormatOptions = { ...base, year: "numeric" }
  const startStr = start.toLocaleDateString(undefined, start.getFullYear() !== thisYear ? withYear : base)
  const endStr   = end.toLocaleDateString(undefined, withYear)
  return `${startStr} – ${endStr}`
}
