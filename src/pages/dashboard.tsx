import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router"
import {
  Link as LinkIcon, FolderKanban, ClipboardList, NotebookPen,
  Clock, Circle, ArrowRight, TrendingUp, Calendar, Plus,
  AlertTriangle, CalendarClock, Sparkles, CheckCircle2, Inbox,
} from "lucide-react"

import { Card, CardContent } from "#components/ui/card"
import { Badge } from "#components/ui/badge"
import { Button } from "#components/ui/button"
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
  high:   "text-red-600 bg-red-500/10 border-red-500/20 dark:text-red-400",
  medium: "text-amber-600 bg-amber-500/10 border-amber-500/20 dark:text-amber-400",
  low:    "text-sky-600 bg-sky-500/10 border-sky-500/20 dark:text-sky-400",
}

// ── Building blocks ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
      {children}
    </p>
  )
}

function SectionHead({ title, icon: Icon, to }: { title: string; icon: React.ElementType; to?: string }) {
  return (
    <div className="flex items-center justify-between px-1">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      {to && (
        <Link to={to} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors">
          View all <ArrowRight className="size-3" />
        </Link>
      )}
    </div>
  )
}

function EmptyState({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground/60">
      <Icon className="size-6 opacity-50" />
      <p className="text-xs">{text}</p>
    </div>
  )
}

// Segmented progress ring for task distribution
function TaskRing({ todo, inProgress, completed }: { todo: number; inProgress: number; completed: number }) {
  const total = todo + inProgress + completed
  const pct   = total === 0 ? 0 : Math.round((completed / total) * 100)
  const r = 46, C = 2 * Math.PI * r
  const segs = [
    { val: completed,  cls: "stroke-green-500" },
    { val: inProgress, cls: "stroke-blue-500"  },
    { val: todo,       cls: "stroke-muted-foreground/30" },
  ]

  let offset = 0
  return (
    <div className="relative size-32 shrink-0">
      <svg viewBox="0 0 120 120" className="size-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" strokeWidth="12" className="stroke-muted/40" />
        {total > 0 && segs.map((s, i) => {
          const len   = (s.val / total) * C
          const dash  = `${len} ${C - len}`
          const el = (
            <circle
              key={i}
              cx="60" cy="60" r={r}
              fill="none"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={dash}
              strokeDashoffset={-offset}
              className={cn(s.cls, "transition-all duration-500")}
            />
          )
          offset += len
          return el
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold tabular-nums leading-none">{pct}%</span>
        <span className="text-[11px] text-muted-foreground mt-1">done</span>
      </div>
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
  const iso   = todayISO()

  // Task breakdown
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

  // Unified activity timeline
  const activity = useMemo(() => {
    type Item = { id: string; kind: "note" | "link" | "work"; title: string; meta: string; date: string; to: string }
    const items: Item[] = [
      ...notes.map(n => ({ id: n.id, kind: "note" as const, title: noteDisplayTitle(n), meta: "Note",     date: n.updated_at,                    to: "/notes" })),
      ...links.map(l => ({ id: l.id, kind: "link" as const, title: l.title,             meta: domainOf(l.url), date: l.created_at,               to: "/links" })),
      ...logs.map(w  => ({ id: w.id, kind: "work" as const, title: w.title,             meta: "Work log",  date: w.start_date + "T12:00:00", to: "/work-log" })),
    ]
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 7)
  }, [notes, links, logs])

  const activityMeta = {
    note: { icon: NotebookPen, tint: "text-violet-500 bg-violet-500/10" },
    link: { icon: LinkIcon,    tint: "text-emerald-500 bg-emerald-500/10" },
    work: { icon: ClipboardList, tint: "text-amber-500 bg-amber-500/10" },
  }

  const stats = [
    { label: "In Progress", value: counts.inProgress, icon: Clock,        to: "/todo",     tint: "text-blue-500 bg-blue-500/10"       },
    { label: "Notes",       value: notes.length,      icon: NotebookPen,  to: "/notes",    tint: "text-violet-500 bg-violet-500/10"   },
    { label: "Saved Links", value: links.length,      icon: LinkIcon,     to: "/links",    tint: "text-emerald-500 bg-emerald-500/10" },
    { label: "This Week",   value: thisWeekCount,     icon: ClipboardList, to: "/work-log", tint: "text-amber-500 bg-amber-500/10"     },
  ]

  const summaryBits: string[] = []
  if (counts.inProgress) summaryBits.push(`${counts.inProgress} in progress`)
  if (dueToday.length)   summaryBits.push(`${dueToday.length} due today`)
  if (overdue.length)    summaryBits.push(`${overdue.length} overdue`)

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{greeting()}</h1>
          <p className="text-muted-foreground text-sm flex items-center gap-1.5">
            <Calendar className="size-3.5" /> {today}
            {summaryBits.length > 0 && (
              <span className="text-muted-foreground/50">· {summaryBits.join(" · ")}</span>
            )}
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setQuickAddOpen(true)}>
          <Plus className="size-4" /> Quick add
        </Button>
      </div>

      <TodoDialog
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        defaultStatus="todo"
        onSave={handleQuickAdd}
      />

      {/* Focus zone: ring + stats */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Task distribution */}
        <Card className="lg:col-span-1 justify-center">
          <CardContent className="flex items-center gap-5">
            <TaskRing todo={counts.todo} inProgress={counts.inProgress} completed={counts.completed} />
            <div className="space-y-2.5 min-w-0 flex-1">
              <SectionLabel>Tasks</SectionLabel>
              {[
                { label: "To do",       val: counts.todo,       dot: "bg-muted-foreground/40" },
                { label: "In progress", val: counts.inProgress, dot: "bg-blue-500" },
                { label: "Completed",   val: counts.completed,  dot: "bg-green-500" },
              ].map(row => (
                <div key={row.label} className="flex items-center gap-2 text-sm">
                  <span className={cn("size-2 rounded-full shrink-0", row.dot)} />
                  <span className="text-muted-foreground flex-1">{row.label}</span>
                  <span className="font-medium tabular-nums ml-auto text-right">{row.val}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Stat tiles */}
        <div className="lg:col-span-2 grid gap-4 grid-cols-2">
          {stats.map(stat => (
            <Link key={stat.label} to={stat.to} className="group">
              <Card className="h-full py-0 transition-all hover:shadow-sm hover:border-foreground/15">
                <CardContent className="flex items-center gap-3 p-4 h-full">
                  <div className={cn("flex size-11 items-center justify-center rounded-xl shrink-0 transition-transform group-hover:scale-105", stat.tint)}>
                    <stat.icon className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-semibold leading-none tabular-nums">{stat.value}</p>
                    <p className="text-xs text-muted-foreground mt-1.5 truncate">{stat.label}</p>
                  </div>
                  <ArrowRight className="size-4 ml-auto text-muted-foreground/0 group-hover:text-muted-foreground/60 transition-colors shrink-0" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Today & Overdue */}
      <section className="space-y-3">
        <SectionHead title="Today & Overdue" icon={CalendarClock} to="/todo" />
        <Card>
          <CardContent className="space-y-1">
            {focus.length === 0 ? (
              <EmptyState icon={CheckCircle2} text="Nothing due — you're all caught up" />
            ) : focus.map(t => {
              const od = t.due_date! < iso
              return (
                <div key={t.id} className="flex items-center gap-3 py-2 px-2 -mx-2 rounded-md hover:bg-accent/50 transition-colors">
                  {od
                    ? <AlertTriangle className="size-4 text-destructive shrink-0" />
                    : <Circle className="size-4 text-blue-500 shrink-0" />}
                  <span className="text-sm flex-1 truncate">{t.title}</span>
                  {t.priority && (
                    <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-4 capitalize", priorityTint[t.priority])}>
                      {t.priority}
                    </Badge>
                  )}
                  <span className={cn("text-xs shrink-0 tabular-nums", od ? "text-destructive font-medium" : "text-muted-foreground")}>
                    {od ? "Overdue" : "Today"}
                  </span>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </section>

      {/* In progress + Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* In progress */}
        <section className="space-y-3">
          <SectionHead title="In Progress" icon={Clock} to="/todo" />
          <Card className="h-full">
            <CardContent className="space-y-1">
              {inProgress.length === 0 ? (
                <EmptyState icon={Inbox} text="Nothing in progress right now" />
              ) : inProgress.slice(0, 6).map(todo => (
                <div key={todo.id} className="flex items-center gap-3 py-2 px-2 -mx-2 rounded-md hover:bg-accent/50 transition-colors">
                  <Circle className="size-3.5 text-blue-500 shrink-0" />
                  <span className="text-sm flex-1 truncate">{todo.title}</span>
                  {todo.priority && (
                    <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-4 capitalize", priorityTint[todo.priority])}>
                      {todo.priority}
                    </Badge>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        {/* Activity timeline */}
        <section className="space-y-3">
          <SectionHead title="Recent Activity" icon={Sparkles} />
          <Card className="h-full">
            <CardContent className="space-y-1">
              {activity.length === 0 ? (
                <EmptyState icon={Sparkles} text="No activity yet" />
              ) : activity.map(item => {
                const m = activityMeta[item.kind]
                return (
                  <Link key={`${item.kind}-${item.id}`} to={item.to}
                    className="flex items-center gap-3 py-2 px-2 -mx-2 rounded-md hover:bg-accent/50 transition-colors">
                    <div className={cn("flex size-7 items-center justify-center rounded-lg shrink-0", m.tint)}>
                      <m.icon className="size-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm truncate">{item.title}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{item.meta}</p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{relativeDate(item.date)}</span>
                  </Link>
                )
              })}
            </CardContent>
          </Card>
        </section>
      </div>

      {/* Active projects */}
      <section className="space-y-3 pt-6">
        <SectionHead title="Active Projects" icon={FolderKanban} to="/projects" />
        <Card>
          <CardContent className="space-y-4">
            {projects.length === 0 ? (
              <EmptyState icon={FolderKanban} text="No projects yet" />
            ) : projects.map(project => {
              const currentWeek = getCurrentWeek(project.start_date, project.week_count)
              const week = currentWeek ?? 0
              const pct  = Math.min(100, Math.round((week / project.week_count) * 100))
              return (
                <div key={project.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{project.name}</span>
                    <span className="flex items-center gap-2 text-xs text-muted-foreground">
                      <TrendingUp className="size-3" />
                      {currentWeek ? `Week ${week}/${project.week_count}` : `${project.week_count} weeks`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums w-9 text-right shrink-0">{pct}%</span>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
