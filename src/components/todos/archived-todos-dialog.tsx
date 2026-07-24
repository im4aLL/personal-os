import { useEffect, useState } from "react"
import { Archive, RotateCcw, Trash2 } from "lucide-react"

import { Button } from "#components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "#components/ui/dialog"
import { Skeleton } from "#components/ui/skeleton"
import { getArchivedTodos, restoreTodos, deleteTodos } from "#lib/todos"
import type { Todo } from "#lib/types/todo"
import { useTodosStore } from "#store/todos"

interface ArchivedTodosDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ArchivedTodosDialog({ open, onOpenChange }: ArchivedTodosDialogProps) {
  const { addTodos } = useTodosStore.getState()

  const [archived, setArchived] = useState<Todo[]>([])
  const [loading,  setLoading]  = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    getArchivedTodos()
      .then(setArchived)
      .catch(err => console.error("Failed to load archived todos:", err))
      .finally(() => setLoading(false))
  }, [open])

  async function handleRestore(todo: Todo) {
    setArchived(prev => prev.filter(t => t.id !== todo.id))
    addTodos([{ ...todo, archived: false }])
    try {
      await restoreTodos([todo.id])
    } catch (err) {
      console.error("Failed to restore todo:", err)
      setArchived(prev => [todo, ...prev])
    }
  }

  async function handleDelete(todo: Todo) {
    setArchived(prev => prev.filter(t => t.id !== todo.id))
    try {
      await deleteTodos([todo.id])
    } catch (err) {
      console.error("Failed to delete archived todo:", err)
      setArchived(prev => [todo, ...prev])
    }
  }

  async function handleRestoreAll() {
    const toRestore = archived
    setArchived([])
    addTodos(toRestore.map(t => ({ ...t, archived: false })))
    try {
      await restoreTodos(toRestore.map(t => t.id))
    } catch (err) {
      console.error("Failed to restore all archived todos:", err)
      setArchived(toRestore)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="flex-row items-center justify-between gap-2 space-y-0 pr-6">
          <DialogTitle>Archived todos</DialogTitle>
          {archived.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
              onClick={handleRestoreAll}
            >
              <RotateCcw className="size-3.5" />
              Restore all
            </Button>
          )}
        </DialogHeader>

        <div className="max-h-96 overflow-y-auto -mx-1 px-1">
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
          ) : archived.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
              <Archive className="size-8 opacity-40" />
              <p className="text-sm">No archived todos</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {archived.map(todo => (
                <div
                  key={todo.id}
                  className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 p-2.5"
                >
                  <p className="flex-1 min-w-0 text-sm font-medium leading-snug line-clamp-1">
                    {todo.title}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={() => handleRestore(todo)}
                    title="Restore"
                  >
                    <RotateCcw className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(todo)}
                    title="Delete permanently"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
