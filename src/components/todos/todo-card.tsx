import { useDraggable } from "@dnd-kit/core"
import { Calendar, GripVertical, MoreHorizontal, Pencil, Trash2 } from "lucide-react"

import { Badge } from "#components/ui/badge"
import { Button } from "#components/ui/button"
import { Card, CardContent } from "#components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "#components/ui/dropdown-menu"
import { cn } from "#lib/utils"
import type { Todo, TodoPriority } from "#lib/types/todo"

const priorityConfig: Record<TodoPriority, { label: string; className: string; strip: string }> = {
  low:    { label: "Low",    className: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",   strip: "bg-sky-500"   },
  medium: { label: "Medium", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20", strip: "bg-amber-500" },
  high:   { label: "High",   className: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",   strip: "bg-red-500"   },
}

function formatDueDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number)
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(
    new Date(y, m - 1, d)
  )
}

function isOverdue(dateStr: string, status: Todo["status"]) {
  if (status === "completed") return false
  const [y, m, d] = dateStr.split("-").map(Number)
  return new Date(y, m - 1, d) < new Date(new Date().setHours(0, 0, 0, 0))
}

interface TodoCardProps {
  todo: Todo
  onEdit: (todo: Todo) => void
  onDelete: (id: string) => void
  isOverlay?: boolean
}

export function TodoCard({ todo, onEdit, onDelete, isOverlay }: TodoCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: todo.id,
    disabled: isOverlay,
  })

  return (
    <Card
      ref={setNodeRef}
      className={cn(
        "group relative overflow-hidden select-none py-0 gap-0 shadow-none",
        "transition-all duration-150 hover:shadow-sm hover:border-foreground/15",
        isDragging && !isOverlay && "opacity-30",
        isOverlay && "rotate-2 shadow-lg cursor-grabbing",
      )}
    >
      {todo.priority && (
        <span className={cn("absolute inset-y-0 left-0 w-1", priorityConfig[todo.priority].strip)} />
      )}
      <CardContent className="p-3 space-y-2">
        {/* Title row */}
        <div className="flex items-center gap-1.5">
          <button
            className="shrink-0 cursor-grab touch-none text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
            {...listeners}
            {...attributes}
          >
            <GripVertical className="size-3.5" />
          </button>

          <p className="flex-1 text-sm font-medium leading-snug line-clamp-2">
            {todo.title}
          </p>

          {!isOverlay && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity -mr-1"
                >
                  <MoreHorizontal className="size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => onEdit(todo)}>
                  <Pencil />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={() => onDelete(todo.id)}
                >
                  <Trash2 />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Description */}
        {todo.description && (
          <p className="pl-5 text-xs text-muted-foreground line-clamp-2">
            {todo.description}
          </p>
        )}

        {/* Badges */}
        {(todo.priority || todo.due_date) && (
          <div className="pl-5 flex items-center gap-1.5 flex-wrap">
            {todo.priority && (
              <Badge
                variant="outline"
                className={cn("text-[10px] px-1.5 py-0 h-4", priorityConfig[todo.priority].className)}
              >
                {priorityConfig[todo.priority].label}
              </Badge>
            )}
            {todo.due_date && (
              <span
                className={cn(
                  "flex items-center gap-0.5 text-[10px]",
                  isOverdue(todo.due_date, todo.status)
                    ? "text-destructive font-medium"
                    : "text-muted-foreground"
                )}
              >
                <Calendar className="size-2.5" />
                {formatDueDate(todo.due_date)}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
