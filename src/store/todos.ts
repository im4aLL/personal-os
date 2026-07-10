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
  patchTodo:    (id: string, patch: Partial<Todo>) => void
  removeTodo:   (id: string)   => void
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
  patchTodo:  (id, patch)      => set(s => ({ todos: s.todos.map(t => t.id === id ? { ...t, ...patch } : t) })),
  removeTodo: (id)             => set(s => ({ todos: s.todos.filter(t => t.id !== id) })),
}))
