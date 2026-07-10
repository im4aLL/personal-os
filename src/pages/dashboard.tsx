import { useEffect, useMemo } from "react"
import { Link } from "react-router"
import {
  Link as LinkIcon, FolderKanban, ClipboardList, NotebookPen,
  Clock, CheckCircle2, Circle, ArrowRight, TrendingUp, Calendar,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "#components/ui/card"
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

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function shortDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number)
  const date = new Date(y, m - 1, d)
  const sameYear = y === new Date().getFullYear()
  return date.toLocaleDateString(undefined, sameYear
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
  try { return new URL(url).hostname } catch { return url }
}

const priorityTint: Record<TodoPriority, string> = {
  high:   "text-red-600 bg-red-500/10 border-red-500/20 dark:text-red-400",
  medium: "text-amber-600 bg-amber-500/10 border-amber-500/20 dark:text-amber-400",
  low:    "text-sky-600 bg-sky-500/10 border-sky-500/20 dark:text-sky-400",
}

// ── Widget shell ──────────────────────────────────────────────────────────────

function WidgetHeader({ title, icon: Icon, to }: { title: string; icon: React.ElementType; to: string }) {
  return (
    <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
      <CardTitle className="flex items-center gap-2 text-sm font-semibold">
        <Icon className="size-4 text-muted-foreground" />
        {title}
      </CardTitle>
      <Link to={to} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors">
        View all <ArrowRight className="size-3" />
      </Link>
    </CardHeader>
  )
}

function EmptyRow({ text }: { text: string }) {
  return <p className="text-xs text-muted-foreground py-2">{text}</p>
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const todos    = useTodosStore(s => s.todos)
  const notes    = useNotesStore(s => s.notes)
  const links    = useLinksStore(s => s.links)
  const logs     = useWorkLogsStore(s => s.logs)
  const projects = useProjectsStore(s => s.projects)

  useEffect(() => {
    useTodosStore.getState().loadTodos()
    useNotesStore.getState().loadNotes()
    useLinksStore.getState().loadLinks()
    useWorkLogsStore.getState().loadWorkLogs()
    useProjectsStore.getState().loadProjects()
  }, [])

  const inProgress = useMemo(() => todos.filter(t => t.status === "in_progress"), [todos])

  const thisWeekCount = useMemo(() => {
    const start = startOfWeek().getTime()
    return logs.filter(l => new Date(l.start_date + "T00:00:00").getTime() >= start).length
  }, [logs])

  const recentWork  = useMemo(() =>
    [...logs].sort((a, b) => b.start_date.localeCompare(a.start_date)).slice(0, 4), [logs])

  const recentNotes = useMemo(() => notes.slice(0, 4), [notes])
  const recentLinks = useMemo(() => links.slice(0, 4), [links])

  const today = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })

  const stats = [
    { label: "In Progress", value: inProgress.length, icon: Clock,         to: "/todo",     tint: "text-blue-500 bg-blue-500/10"       },
    { label: "Notes",       value: notes.length,      icon: NotebookPen,   to: "/notes",    tint: "text-violet-500 bg-violet-500/10"   },
    { label: "Saved Links", value: links.length,      icon: LinkIcon,      to: "/links",    tint: "text-emerald-500 bg-emerald-500/10" },
    { label: "This Week",   value: thisWeekCount,     icon: ClipboardList, to: "/work-log", tint: "text-amber-500 bg-amber-500/10"     },
  ]

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-semibold">Good to see you</h1>
        <p className="text-muted-foreground mt-1 text-sm flex items-center gap-1.5">
          <Calendar className="size-3.5" /> {today}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {stats.map(stat => (
          <Link key={stat.label} to={stat.to}>
            <Card className="py-0 transition-colors hover:bg-accent/40">
              <CardContent className="flex items-center gap-3 p-4">
                <div className={cn("flex size-10 items-center justify-center rounded-lg shrink-0", stat.tint)}>
                  <stat.icon className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-semibold leading-none">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-1 truncate">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Widget grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* In progress todos */}
        <Card className="gap-0">
          <WidgetHeader title="In Progress" icon={Clock} to="/todo" />
          <CardContent className="space-y-1">
            {inProgress.length === 0 ? (
              <EmptyRow text="Nothing in progress right now" />
            ) : inProgress.slice(0, 5).map(todo => (
              <div key={todo.id} className="flex items-center gap-2.5 py-1.5">
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

        {/* Recent work log */}
        <Card className="gap-0">
          <WidgetHeader title="Recent Work" icon={ClipboardList} to="/work-log" />
          <CardContent className="space-y-1">
            {recentWork.length === 0 ? (
              <EmptyRow text="No work logged yet" />
            ) : recentWork.map(work => (
              <div key={work.id} className="flex items-center gap-2.5 py-1.5">
                <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
                <span className="text-sm flex-1 truncate">{work.title}</span>
                <span className="text-xs text-muted-foreground shrink-0">{shortDate(work.start_date)}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent notes */}
        <Card className="gap-0">
          <WidgetHeader title="Recent Notes" icon={NotebookPen} to="/notes" />
          <CardContent className="space-y-1">
            {recentNotes.length === 0 ? (
              <EmptyRow text="No notes yet" />
            ) : recentNotes.map(note => (
              <div key={note.id} className="flex items-center gap-2.5 py-1.5">
                <NotebookPen className="size-3.5 text-violet-500 shrink-0" />
                <span className="text-sm flex-1 truncate">{noteDisplayTitle(note)}</span>
                <span className="text-xs text-muted-foreground shrink-0">{relativeDate(note.updated_at)}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent links */}
        <Card className="gap-0">
          <WidgetHeader title="Recent Links" icon={LinkIcon} to="/links" />
          <CardContent className="space-y-1">
            {recentLinks.length === 0 ? (
              <EmptyRow text="No links saved yet" />
            ) : recentLinks.map(link => (
              <div key={link.id} className="flex items-center gap-2.5 py-1.5">
                {link.favicon_url ? (
                  <img src={link.favicon_url} alt="" className="size-3.5 shrink-0 rounded-sm" />
                ) : (
                  <LinkIcon className="size-3.5 shrink-0 text-muted-foreground" />
                )}
                <span className="text-sm flex-1 truncate">{link.title}</span>
                <span className="text-xs text-muted-foreground shrink-0 truncate max-w-[120px]">{domainOf(link.url)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Active projects — full width */}
      <Card className="gap-0">
        <WidgetHeader title="Active Projects" icon={FolderKanban} to="/projects" />
        <CardContent className="space-y-4 pt-1">
          {projects.length === 0 ? (
            <EmptyRow text="No projects yet" />
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
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
