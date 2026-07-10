import { useDroppable } from "@dnd-kit/core"
import { CheckCircle2, Circle, Clock, Plus } from "lucide-react"

import { Badge } from "#components/ui/badge"
import { Button } from "#components/ui/button"
import { cn } from "#lib/utils"
import type { Todo, TodoStatus } from "#lib/types/todo"
import { TodoCard } from "./todo-card"

const columnConfig: Record<TodoStatus, { label: string; icon: React.ElementType; className: string }> = {
  todo:        { label: "Todo",        icon: Circle,       className: "text-muted-foreground" },
  in_progress: { label: "In Progress", icon: Clock,        className: "text-blue-500"         },
  completed:   { label: "Completed",   icon: CheckCircle2, className: "text-green-500"        },
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
  const { label, icon: Icon, className } = columnConfig[status]

  return (
    <div className="flex flex-col flex-1 min-w-0">
      {/* Column header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <Icon className={cn("size-4", className)} />
        <span className="text-sm font-semibold">{label}</span>
        <Badge variant="secondary" className="ml-auto text-xs h-5 px-1.5">
          {todos.length}
        </Badge>
        <Button variant="ghost" size="icon-sm" onClick={onAdd}>
          <Plus className="size-3.5" />
        </Button>
      </div>

      {/* Droppable area */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex flex-col gap-2 flex-1 rounded-xl p-2 min-h-32 transition-colors",
          "bg-muted/40",
          isOver && "bg-muted ring-2 ring-primary/20"
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
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs text-muted-foreground">No items</p>
          </div>
        )}
      </div>
    </div>
  )
}
