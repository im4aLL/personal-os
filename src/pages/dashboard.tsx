import { Link } from "react-router"
import { Link as LinkIcon, ListTodo, FolderKanban, ClipboardList, NotebookPen } from "lucide-react"

const items = [
  { title: "Save Links",      to: "/links",    icon: LinkIcon,      description: "Save and search links by tag."                        },
  { title: "Todo",            to: "/todo",      icon: ListTodo,      description: "Manage tasks across Todo, In Progress and Completed." },
  { title: "Project Planner", to: "/projects",  icon: FolderKanban,  description: "Plan projects with Kanban and timeline views."        },
  { title: "Work Log",        to: "/work-log",  icon: ClipboardList, description: "Track what you've done with start and end dates."     },
  { title: "Notes",           to: "/notes",     icon: NotebookPen,   description: "Write and manage notes with draft support."           },
]

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground mt-1 text-sm">What would you like to work on?</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Link
            key={item.title}
            to={item.to}
            className="group rounded-xl border bg-card p-5 text-card-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <div className="mb-3 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-muted group-hover:bg-background transition-colors">
                <item.icon className="size-5" />
              </div>
              <span className="font-semibold">{item.title}</span>
            </div>
            <p className="text-sm text-muted-foreground group-hover:text-accent-foreground/80">
              {item.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  )
}
