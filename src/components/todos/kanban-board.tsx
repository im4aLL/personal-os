import { useEffect, useMemo, useState } from "react"
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import { Archive, Search } from "lucide-react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "#components/ui/alert-dialog"
import { Button, buttonVariants } from "#components/ui/button"
import { Input } from "#components/ui/input"
import { Skeleton } from "#components/ui/skeleton"
import { cn } from "#lib/utils"
import { createTodo, updateTodo, deleteTodo, deleteTodos, archiveTodos } from "#lib/todos"
import type { Todo, TodoStatus } from "#lib/types/todo"
import { createWorkLog } from "#lib/work-logs"
import { useTodosStore } from "#store/todos"
import { useWorkLogsStore } from "#store/work-logs"
import { ArchivedTodosDialog } from "./archived-todos-dialog"
import { KanbanColumn } from "./kanban-column"
import { TodoCard } from "./todo-card"
import { TodoDialog, type TodoFormValues } from "./todo-dialog"

const COLUMNS: TodoStatus[] = ["todo", "in_progress", "completed"]

export function KanbanBoard() {
  const todos   = useTodosStore(s => s.todos)
  const loading = useTodosStore(s => s.loading)
  const { loadTodos, addTodo, patchTodo, removeTodo, removeTodos } = useTodosStore.getState()

  const [search,        setSearch]        = useState("")
  const [activeId,      setActiveId]      = useState<string | null>(null)
  const [dialogOpen,    setDialogOpen]    = useState(false)
  const [editingTodo,   setEditingTodo]   = useState<Todo | null>(null)
  const [defaultStatus, setDefaultStatus] = useState<TodoStatus>("todo")
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false)
  const [archivedOpen, setArchivedOpen] = useState(false)

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  )

  useEffect(() => { loadTodos() }, [loadTodos])

  // Client-side search filter
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return todos
    return todos.filter(t =>
      t.title.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q)
    )
  }, [todos, search])

  // Group by status
  const byStatus = useMemo(
    () => COLUMNS.reduce(
      (acc, s) => ({ ...acc, [s]: filtered.filter(t => t.status === s) }),
      {} as Record<TodoStatus, Todo[]>
    ),
    [filtered]
  )

  const activeTodo = todos.find(t => t.id === activeId)

  // ── DnD handlers ────────────────────────────────────────────────
  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(active.id as string)
  }

  async function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null)
    if (!over) return

    const id         = active.id as string
    const overId     = over.id as string
    const activeTodo = todos.find(t => t.id === id)
    if (!activeTodo) return

    const targetStatus = COLUMNS.includes(overId as TodoStatus)
      ? (overId as TodoStatus)
      : todos.find(t => t.id === overId)?.status ?? activeTodo.status

    if (targetStatus === activeTodo.status) return

    patchTodo(id, { status: targetStatus })
    try {
      await updateTodo(id, { status: targetStatus })
    } catch (err) {
      console.error("Failed to update todo:", err)
      loadTodos() // revert on failure
    }
  }

  // ── Dialog handlers ──────────────────────────────────────────────
  function openCreate(status: TodoStatus) {
    setEditingTodo(null)
    setDefaultStatus(status)
    setDialogOpen(true)
  }

  function openEdit(todo: Todo) {
    setEditingTodo(todo)
    setDialogOpen(true)
  }

  async function handleSave(values: TodoFormValues) {
    const priority = values.priority === "none" ? null : values.priority as Todo["priority"]
    const due_date = values.due_date?.trim() || null

    if (editingTodo) {
      const patch = {
        title:       values.title,
        description: values.description?.trim() || null,
        priority,
        due_date,
        status:      values.status,
      }
      await updateTodo(editingTodo.id, patch)
      patchTodo(editingTodo.id, patch)
    } else {
      const created = await createTodo({
        title:       values.title,
        description: values.description?.trim() || null,
        priority,
        due_date,
        status:      values.status ?? defaultStatus,
        position:    byStatus[defaultStatus].length,
      })
      addTodo(created)
    }
  }

  async function handleDelete(id: string) {
    removeTodo(id)
    try {
      await deleteTodo(id)
    } catch (err) {
      console.error("Failed to delete todo:", err)
      loadTodos() // revert on failure
    }
  }

  async function handleAddWorkLog(todo: Todo) {
    const today = new Date().toISOString().split("T")[0]
    try {
      const created = await createWorkLog({
        title:       todo.title,
        description: todo.description,
        start_date:  today,
        end_date:    today,
        tags:        [],
      })
      useWorkLogsStore.getState().addWorkLog(created)
      toast.success("Added to work log")
    } catch (err) {
      console.error("Failed to create work log from todo:", err)
      toast.error("Failed to add work log")
    }
  }

  async function handleArchiveCompleted() {
    const ids = byStatus.completed.map(t => t.id)
    if (!ids.length) return
    removeTodos(ids)
    try {
      await archiveTodos(ids)
    } catch (err) {
      console.error("Failed to archive completed todos:", err)
      loadTodos() // revert on failure
    }
  }

  async function handleClearCompleted() {
    const ids = byStatus.completed.map(t => t.id)
    setClearConfirmOpen(false)
    if (!ids.length) return
    removeTodos(ids)
    try {
      await deleteTodos(ids)
    } catch (err) {
      console.error("Failed to clear completed todos:", err)
      loadTodos() // revert on failure
    }
  }

  // ── Render ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex gap-4 h-full">
        {COLUMNS.map(s => (
          <div key={s} className="flex-1 space-y-2">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col gap-4 h-full")}>
      {/* Search bar */}
      <div className="flex items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            className="pl-8 h-8 text-sm"
            placeholder="Search todos..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-muted-foreground hover:text-foreground"
          onClick={() => setArchivedOpen(true)}
        >
          <Archive className="size-3.5" />
          Archived
        </Button>
      </div>

      {/* Kanban columns */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="flex gap-4 flex-1 min-h-0 overflow-x-auto pb-2">
          {COLUMNS.map(status => (
            <KanbanColumn
              key={status}
              status={status}
              todos={byStatus[status]}
              onAdd={() => openCreate(status)}
              onEdit={openEdit}
              onDelete={handleDelete}
              onAddWorkLog={handleAddWorkLog}
              onArchiveCompleted={handleArchiveCompleted}
              onClearCompleted={() => setClearConfirmOpen(true)}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTodo && (
            <TodoCard
              todo={activeTodo}
              isOverlay
              onEdit={() => {}}
              onDelete={() => {}}
            />
          )}
        </DragOverlay>
      </DndContext>

      {/* Create / Edit dialog */}
      <TodoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        todo={editingTodo ?? undefined}
        defaultStatus={defaultStatus}
        onSave={handleSave}
      />

      {/* Clear completed confirmation */}
      <AlertDialog open={clearConfirmOpen} onOpenChange={setClearConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear completed todos?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {byStatus.completed.length} completed{" "}
              {byStatus.completed.length === 1 ? "todo" : "todos"}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              onClick={handleClearCompleted}
            >
              Clear all
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Archived todos */}
      <ArchivedTodosDialog open={archivedOpen} onOpenChange={setArchivedOpen} />
    </div>
  )
}
