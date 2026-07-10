export interface WorkLog {
  id:          string
  title:       string
  description: string | null
  start_date:  string          // YYYY-MM-DD
  end_date:    string          // YYYY-MM-DD
  created_at:  string
  updated_at:  string
  tags?:       string[]
}

export interface WorkLogTag {
  id:          string
  work_log_id: string
  name:        string
  created_at:  string
}

export interface WorkLogWithTags extends WorkLog {
  tags: string[]
}

export interface CreateWorkLogInput {
  title:       string
  description: string | null
  start_date:  string
  end_date:    string
  tags:        string[]
}

export type UpdateWorkLogInput = Partial<Pick<WorkLog, "title" | "description" | "start_date" | "end_date">>

export interface WorkLogFilter {
  query?:     string
  dateFrom?:  string
  dateTo?:    string
}
