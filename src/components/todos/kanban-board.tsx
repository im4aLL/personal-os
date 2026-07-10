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
import { Search } from "lucide-react"

import { Input } from "#components/ui/input"
import { Skeleton } from "#components/ui/skeleton"
import { cn } from "#lib/utils"
import {
  getTodos,
  createTodo,
  updateTodo,
  deleteTodo,
} from "#lib/todos"
import type { Todo, TodoStatus } from "#lib/types/todo"
import { KanbanColumn } from "./kanban-column"
import { TodoCard } from "./todo-card"
import { TodoDialog, type TodoFormValues } from "./todo-dialog"

const COLUMNS: TodoStatus[] = ["todo", "in_progress", "completed"]

export function KanbanBoard() {
  const [todos, setTodos]               = useState<Todo[]>([])
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState("")
  const [activeId, setActiveId]         = useState<string | null>(null)
  const [dialogOpen, setDialogOpen]     = useState(false)
  const [editingTodo, setEditingTodo]   = useState<Todo | null>(null)
  const [defaultStatus, setDefaultStatus] = useState<TodoStatus>("todo")

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  )

  useEffect(() => { loadTodos() }, [])

  useEffect(() => {
    const handler = () => loadTodos()
    window.addEventListener("personal-os:sync-complete", handler)
    return () => window.removeEventListener("personal-os:sync-complete", handler)
  }, [])

  async function loadTodos() {
    try {
      setLoading(true)
      setTodos(await getTodos())
    } catch (err) {
      console.error("Failed to load todos:", err)
    } finally {
      setLoading(false)
    }
  }

  // Client-side search filter
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return todos
    return todos.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q)
    )
  }, [todos, search])

  // Group by status
  const byStatus = useMemo(
    () =>
      COLUMNS.reduce(
        (acc, s) => ({ ...acc, [s]: filtered.filter((t) => t.status === s) }),
        {} as Record<TodoStatus, Todo[]>
      ),
    [filtered]
  )

  const activeTodo = todos.find((t) => t.id === activeId)

  // ── DnD handlers ────────────────────────────────────────────────
  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(active.id as string)
  }

  async function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null)
    if (!over) return

    const activeId  = active.id as string
    const overId    = over.id as string
    const activeTodo = todos.find((t) => t.id === activeId)
    if (!activeTodo) return

    const targetStatus = COLUMNS.includes(overId as TodoStatus)
      ? (overId as TodoStatus)
      : todos.find((t) => t.id === overId)?.status ?? activeTodo.status

    if (targetStatus === activeTodo.status) return

    setTodos((prev) =>
      prev.map((t) => (t.id === activeId ? { ...t, status: targetStatus } : t))
    )
    try {
      await updateTodo(activeId, { status: targetStatus })
    } catch (err) {
      console.error("Failed to update todo:", err)
      await loadTodos() // revert on failure
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
      const updated = {
        title:       values.title,
        description: values.description?.trim() || null,
        priority,
        due_date,
        status:      values.status,
      }
      await updateTodo(editingTodo.id, updated)
      setTodos((prev) =>
        prev.map((t) => (t.id === editingTodo.id ? { ...t, ...updated } : t))
      )
    } else {
      const created = await createTodo({
        title:       values.title,
        description: values.description?.trim() || null,
        priority,
        due_date,
        status:      values.status ?? defaultStatus,
        position:    byStatus[defaultStatus].length,
      })
      setTodos((prev) => [...prev, created])
    }
  }

  async function handleDelete(id: string) {
    setTodos((prev) => prev.filter((t) => t.id !== id))
    try {
      await deleteTodo(id)
    } catch (err) {
      console.error("Failed to delete todo:", err)
      await loadTodos()
    }
  }

  // ── Render ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex gap-4 h-full">
        {COLUMNS.map((s) => (
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
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
        <Input
          className="pl-8 h-8 text-sm"
          placeholder="Search todos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Kanban columns */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="flex gap-4 flex-1 overflow-x-auto pb-2">
          {COLUMNS.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              todos={byStatus[status]}
              onAdd={() => openCreate(status)}
              onEdit={openEdit}
              onDelete={handleDelete}
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
    </div>
  )
}
