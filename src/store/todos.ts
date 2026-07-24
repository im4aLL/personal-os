import { create } from "zustand"
import { getTodos } from "#lib/todos"
import type { Todo } from "#lib/types/todo"

interface TodosStore {
  todos:   Todo[]
  loading: boolean

  loadTodos:    () => Promise<void>
  refreshTodos: () => Promise<void>
  setTodos:     (todos: Todo[]) => void
  addTodo:      (todo: Todo)    => void
  addTodos:     (todos: Todo[]) => void
  patchTodo:    (id: string, patch: Partial<Todo>) => void
  removeTodo:   (id: string)   => void
  removeTodos:  (ids: string[]) => void
  reorderTodos: (orderedIds: string[]) => void
}

export const useTodosStore = create<TodosStore>((set) => ({
  todos:   [],
  loading: true,

  // Initial load — shows skeleton
  loadTodos: async () => {
    set({ loading: true })
    try {
      const todos = await getTodos()
      set({ todos, loading: false })
    } catch (err) {
      console.error("Failed to load todos:", err)
      set({ loading: false })
    }
  },

  // Silent refresh — no skeleton, used after sync
  refreshTodos: async () => {
    try {
      const todos = await getTodos()
      set({ todos })
    } catch (err) {
      console.error("Failed to refresh todos:", err)
    }
  },

  setTodos:   (todos)          => set({ todos }),
  addTodo:    (todo)           => set(s => ({ todos: [...s.todos, todo] })),
  addTodos:   (todos)          => set(s => ({ todos: [...s.todos, ...todos] })),
  patchTodo:  (id, patch)      => set(s => ({ todos: s.todos.map(t => t.id === id ? { ...t, ...patch } : t) })),
  removeTodo: (id)             => set(s => ({ todos: s.todos.filter(t => t.id !== id) })),
  removeTodos: (ids)           => set(s => { const idSet = new Set(ids); return { todos: s.todos.filter(t => !idSet.has(t.id)) } }),

  // Reorders the todos matching `orderedIds` (all from one status column) in place,
  // assigning each a fresh 0-based `position` while preserving their interleaving
  // with todos from other columns.
  reorderTodos: (orderedIds) => set(s => {
    const orderedSet = new Set(orderedIds)
    const reordered  = orderedIds
      .map((id, i) => {
        const todo = s.todos.find(t => t.id === id)
        return todo ? { ...todo, position: i } : null
      })
      .filter((t): t is Todo => t !== null)

    let cursor = 0
    const todos = s.todos.map(t => orderedSet.has(t.id) ? reordered[cursor++] : t)
    return { todos }
  }),
}))
