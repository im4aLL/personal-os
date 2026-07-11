import { useDroppable } from "@dnd-kit/core"
import { CheckCircle2, Circle, Clock, Plus } from "lucide-react"

import { Badge } from "#components/ui/badge"
import { Button } from "#components/ui/button"
import { cn } from "#lib/utils"
import type { Todo, TodoStatus } from "#lib/types/todo"
import { TodoCard } from "./todo-card"

const columnConfig: Record<TodoStatus, { label: string; icon: React.ElementType; className: string; dot: string; accent: string }> = {
  todo:        { label: "Todo",        icon: Circle,       className: "text-muted-foreground", dot: "bg-muted-foreground/40", accent: "" },
  in_progress: { label: "In Progress", icon: Clock,        className: "text-blue-500",         dot: "bg-blue-500",           accent: "ring-blue-500/30" },
  completed:   { label: "Completed",   icon: CheckCircle2, className: "text-green-500",        dot: "bg-green-500",          accent: "ring-green-500/30" },
}

interface KanbanColumnProps {
  status: TodoStatus
  todos: Todo[]
  onAdd: () => void
  onEdit: (todo: Todo) => void
  onDelete: (id: string) => void
}

export function KanbanColumn({ status, todos, onAdd, onEdit, onDelete }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  const { label, dot, accent } = columnConfig[status]

  return (
    <div className="flex flex-col flex-1 min-w-0">
      {/* Column header */}
      <div className="flex items-center gap-2 mb-2 px-2">
        <span className={cn("size-2 rounded-full", dot)} />
        <span className="text-sm font-semibold tracking-tight">{label}</span>
        <Badge variant="secondary" className="text-[11px] h-5 min-w-5 justify-center px-1.5 rounded-full font-medium">
          {todos.length}
        </Badge>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onAdd}
          className="ml-auto text-muted-foreground hover:text-foreground"
        >
          <Plus className="size-4" />
        </Button>
      </div>

      {/* Droppable area */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex flex-col gap-2 flex-1 rounded-xl p-2 min-h-32 transition-all",
          "bg-muted/30 ring-1 ring-inset ring-border/50",
          isOver && cn("bg-muted/70 ring-2", accent || "ring-primary/30")
        )}
      >
        {todos.map((todo) => (
          <TodoCard
            key={todo.id}
            todo={todo}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}

        {todos.length === 0 && (
          <div className="flex-1 flex items-center justify-center rounded-lg border border-dashed border-border/60 m-1">
            <p className="text-xs text-muted-foreground/70">Drop items here</p>
          </div>
        )}
      </div>
    </div>
  )
}
