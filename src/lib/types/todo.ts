export type TodoStatus = 'todo' | 'in_progress' | 'completed'
export type TodoPriority = 'low' | 'medium' | 'high'

export interface Todo {
  id: string
  title: string
  description: string | null
  status: TodoStatus
  priority: TodoPriority | null
  due_date: string | null      // ISO date string e.g. "2026-07-15"
  position: number
  created_at: string           // ISO datetime string
  updated_at: string           // ISO datetime string
}

export type CreateTodoInput = Pick<Todo, 'title'> & Partial<Pick<Todo, 'description' | 'status' | 'priority' | 'due_date' | 'position'>>
export type UpdateTodoInput = Partial<Pick<Todo, 'title' | 'description' | 'status' | 'priority' | 'due_date' | 'position'>>
