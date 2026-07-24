import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { Archive, MoreHorizontal, Plus, Trash2 } from "lucide-react"

import { Button } from "#components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "#components/ui/dropdown-menu"
import { cn } from "#lib/utils"
import type { Todo, TodoStatus } from "#lib/types/todo"
import { TodoCard } from "./todo-card"

const columnConfig: Record<TodoStatus, { label: string; dot: string }> = {
  todo:        { label: "Todo",        dot: "bg-muted-foreground/40" },
  in_progress: { label: "In Progress", dot: "bg-accent-ink" },
  completed:   { label: "Completed",   dot: "bg-emerald-500" },
}

interface KanbanColumnProps {
  status: TodoStatus
  todos: Todo[]
  isDropTarget?: boolean
  onAdd: () => void
  onEdit: (todo: Todo) => void
  onDelete: (id: string) => void
  onAddWorkLog?: (todo: Todo) => void
  onArchiveCompleted?: () => void
  onClearCompleted?: () => void
}

export function KanbanColumn({ status, todos, isDropTarget, onAdd, onEdit, onDelete, onAddWorkLog, onArchiveCompleted, onClearCompleted }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  const highlighted = isOver || isDropTarget
  const { label, dot } = columnConfig[status]
  const showCompletedActions = status === "completed" && todos.length > 0

  return (
    <div className="flex flex-col flex-1 min-w-0 min-h-0">
      {/* Column header */}
      <div className="flex items-center gap-2 mb-2 px-2">
        <span className={cn("size-2 rounded-full", dot)} />
        <span className="text-sm font-semibold tracking-tight">{label}</span>
        <span className="text-xs text-muted-foreground tabular-nums">{todos.length}</span>
        {showCompletedActions && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="ml-auto text-muted-foreground hover:text-foreground"
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={onArchiveCompleted}>
                <Archive className="size-4" />
                Archive all
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={onClearCompleted}>
                <Trash2 className="size-4" />
                Clear all
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onAdd}
          className={cn("text-muted-foreground hover:text-foreground", !showCompletedActions && "ml-auto")}
        >
          <Plus className="size-4" />
        </Button>
      </div>

      {/* Droppable area — outer div scrolls, inner div lays out cards */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 min-h-0 rounded-lg p-2 overflow-y-auto transition-colors",
          "border border-transparent",
          highlighted ? "border-accent-ink/40 bg-accent-ink/5" : "bg-muted/20"
        )}
      >
        <SortableContext items={todos.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {todos.length === 0 ? (
            <div className="h-full min-h-28 flex items-center justify-center rounded-lg border border-dashed border-border/60 m-1">
              <p className="text-xs text-muted-foreground/70">Drop items here</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {todos.map((todo) => (
                <TodoCard
                  key={todo.id}
                  todo={todo}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onAddWorkLog={onAddWorkLog}
                />
              ))}
            </div>
          )}
        </SortableContext>
      </div>
    </div>
  )
}
