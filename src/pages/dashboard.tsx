import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router"
import { Plus, NotebookPen, Link as LinkIcon, ClipboardList } from "lucide-react"

import { Button } from "#components/ui/button"
import { Badge } from "#components/ui/badge"
import { cn } from "#lib/utils"

import { useTodosStore } from "#store/todos"
import { useNotesStore } from "#store/notes"
import { useLinksStore } from "#store/links"
import { useWorkLogsStore } from "#store/work-logs"
import { useProjectsStore } from "#store/projects"
import { noteDisplayTitle } from "#lib/types/note"
import { getCurrentWeek } from "#lib/week-utils"
import type { TodoPriority } from "#lib/types/todo"
import { createTodo } from "#lib/todos"
import { TodoDialog, type TodoFormValues } from "#components/todos/todo-dialog"

// ── Helpers ───────────────────────────────────────────────────────────────────

function pad(n: number) { return String(n).padStart(2, "0") }

function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function relativeDate(iso: string): string {
  const then  = new Date(iso).getTime()
  const diff  = Date.now() - then
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  if (mins  < 1)  return "Just now"
  if (mins  < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1)
  const d = new Date(iso)
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday"
  const sameYear = d.getFullYear() === new Date().getFullYear()
  return d.toLocaleDateString(undefined, sameYear
    ? { month: "short", day: "numeric" }
    : { month: "short", day: "numeric", year: "numeric" })
}

function startOfWeek(): Date {
  const d = new Date(); d.setHours(0, 0, 0, 0)
  const day = d.getDay() === 0 ? 6 : d.getDay() - 1   // Mon = 0
  d.setDate(d.getDate() - day)
  return d
}

function domainOf(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, "") } catch { return url }
}

function greeting(): string {
  const h = new Date().getHours()
  if (h < 5)  return "Working late"
  if (h < 12) return "Good morning"
  if (h < 18) return "Good afternoon"
  return "Good evening"
}

const priorityTint: Record<TodoPriority, string> = {
  high:   "text-red-600 bg-red-500/10 dark:text-red-400",
  medium: "text-amber-600 bg-amber-500/10 dark:text-amber-400",
  low:    "text-sky-600 bg-sky-500/10 dark:text-sky-400",
}

// ── Building blocks ────────────────────────────────────────────────────────────

function SectionHead({ title, to }: { title: string; to?: string }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      {to && (
        <Link to={to} className="text-xs text-muted-foreground hover:text-accent-ink transition-colors">
          View all →
        </Link>
      )}
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center rounded-lg border border-dashed p-6">
      <p className="text-xs text-muted-foreground/70">{text}</p>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const todos    = useTodosStore(s => s.todos)
  const notes    = useNotesStore(s => s.notes)
  const links    = useLinksStore(s => s.links)
  const logs     = useWorkLogsStore(s => s.logs)
  const projects = useProjectsStore(s => s.projects)

  const [quickAddOpen, setQuickAddOpen] = useState(false)

  useEffect(() => {
    useTodosStore.getState().loadTodos()
    useNotesStore.getState().loadNotes()
    useLinksStore.getState().loadLinks()
    useWorkLogsStore.getState().loadWorkLogs()
    useProjectsStore.getState().loadProjects()
  }, [])

  const today = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })
  const iso = todayISO()

  const counts = useMemo(() => ({
    todo:       todos.filter(t => t.status === "todo").length,
    inProgress: todos.filter(t => t.status === "in_progress").length,
    completed:  todos.filter(t => t.status === "completed").length,
  }), [todos])

  async function handleQuickAdd(values: TodoFormValues) {
    const priority = values.priority === "none" ? null : values.priority as TodoPriority
    const created = await createTodo({
      title:       values.title,
      description: values.description?.trim() || null,
      priority,
      due_date:    values.due_date?.trim() || null,
      status:      values.status ?? "todo",
      position:    counts.todo,
    })
    useTodosStore.getState().addTodo(created)
  }

  const inProgress = useMemo(() => todos.filter(t => t.status === "in_progress"), [todos])

  const overdue = useMemo(() =>
    todos.filter(t => t.status !== "completed" && t.due_date && t.due_date < iso), [todos, iso])
  const dueToday = useMemo(() =>
    todos.filter(t => t.status !== "completed" && t.due_date === iso), [todos, iso])

  const focus = useMemo(() =>
    [...overdue, ...dueToday]
      .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""))
      .slice(0, 6),
    [overdue, dueToday])

  const thisWeekCount = useMemo(() => {
    const start = startOfWeek().getTime()
    return logs.filter(l => new Date(l.start_date + "T00:00:00").getTime() >= start).length
  }, [logs])

  const activity = useMemo(() => {
    type Item = { id: string; kind: "note" | "link" | "work"; title: string; meta: string; date: string; to: string }
    const items: Item[] = [
      ...notes.map(n => ({ id: n.id, kind: "note" as const, title: noteDisplayTitle(n), meta: "Note",     date: n.updated_at,               to: "/notes" })),
      ...links.map(l => ({ id: l.id, kind: "link" as const, title: l.title,             meta: domainOf(l.url), date: l.created_at,          to: "/links" })),
      ...logs.map(w  => ({ id: w.id, kind: "work" as const, title: w.title,             meta: "Work log",  date: w.start_date + "T12:00:00", to: "/work-log" })),
    ]
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 7)
  }, [notes, links, logs])

  const activityIcon = { note: NotebookPen, link: LinkIcon, work: ClipboardList }

  const stats = [
    { label: "In Progress",    value: counts.inProgress, to: "/todo" },
    { label: "Notes",          value: notes.length,      to: "/notes" },
    { label: "Saved Links",    value: links.length,      to: "/links" },
    { label: "Logged this week", value: thisWeekCount,   to: "/work-log" },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{greeting()}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {today}
            {overdue.length > 0 && <span className="text-destructive"> · {overdue.length} overdue</span>}
            {dueToday.length > 0 && <span> · {dueToday.length} due today</span>}
          </p>
        </div>
        <Button onClick={() => setQuickAddOpen(true)}>
          <Plus className="size-4" />
          Quick add
        </Button>
      </div>

      <TodoDialog
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        defaultStatus="todo"
        onSave={handleQuickAdd}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map(stat => (
          <Link
            key={stat.label}
            to={stat.to}
            className="rounded-lg border p-4 transition-colors hover:bg-accent/50"
          >
            <p className="text-2xl font-semibold tabular-nums leading-none">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-1.5">{stat.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.7fr_1fr]">
        {/* Left: focus */}
        <div className="space-y-6">
          <div>
            <SectionHead title="Today & Overdue" to="/todo" />
            <div className="mt-3 space-y-2">
              {focus.length === 0 ? (
                <EmptyState text="Nothing due — you're all caught up" />
              ) : focus.map(t => {
                const od = t.due_date! < iso
                return (
                  <div key={t.id} className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/50">
                    <span className={cn("size-2 rounded-full shrink-0", od ? "bg-destructive" : "bg-sky-500")} />
                    <span className="flex-1 text-sm truncate">{t.title}</span>
                    {t.priority && (
                      <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-4", priorityTint[t.priority])}>
                        {t.priority}
                      </Badge>
                    )}
                    <span className={cn("text-xs whitespace-nowrap", od ? "text-destructive font-medium" : "text-muted-foreground")}>
                      {od ? "Overdue" : "Today"}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          <div>
            <SectionHead title="Active Projects" to="/projects" />
            <div className="mt-3 space-y-2">
              {projects.length === 0 ? (
                <EmptyState text="No projects yet" />
              ) : projects.map(project => {
                const currentWeek = getCurrentWeek(project.start_date, project.week_count)
                const week = currentWeek ?? 0
                const pct  = Math.min(100, Math.round((week / project.week_count) * 100))
                return (
                  <div key={project.id} className="rounded-lg border p-3 transition-colors hover:bg-accent/50">
                    <div className="flex items-baseline justify-between text-sm mb-2">
                      <span className="font-medium">{project.name}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {currentWeek ? `Week ${week}/${project.week_count}` : `${project.week_count} weeks`} · {pct}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-accent-ink rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right: rail */}
        <div className="space-y-6">
          <div>
            <SectionHead title="In Progress" to="/todo" />
            <div className="mt-3 space-y-2">
              {inProgress.length === 0 ? (
                <EmptyState text="Nothing in progress right now" />
              ) : inProgress.slice(0, 6).map(todo => (
                <div key={todo.id} className="flex items-center gap-2.5 rounded-lg border p-3 transition-colors hover:bg-accent/50">
                  <span className="size-2 rounded-full bg-accent-ink shrink-0" />
                  <span className="text-sm truncate">{todo.title}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <SectionHead title="Recent Activity" />
            <div className="mt-3 space-y-2">
              {activity.length === 0 ? (
                <EmptyState text="No activity yet" />
              ) : activity.map(item => {
                const Icon = activityIcon[item.kind]
                return (
                  <Link
                    key={`${item.kind}-${item.id}`}
                    to={item.to}
                    className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/50"
                  >
                    <div className="flex size-8 shrink-0 items-center justify-center rounded bg-muted">
                      <Icon className="size-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.meta} · {relativeDate(item.date)}</p>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
