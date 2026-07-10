export interface Project {
  id:         string
  name:       string
  start_date: string   // YYYY-MM-DD
  week_count: number
  created_at: string
  updated_at: string
}

export interface ProjectPhase {
  id:         string
  project_id: string
  name:       string
  color:      string   // hex e.g. "#93C5FD"
  position:   number
  created_at: string
}

export interface WorkItem {
  id:           string
  project_id:   string
  phase_id:     string | null
  title:        string
  person:       string | null
  comment:      string | null
  jira_ticket:  string | null
  status:       "pending" | "in_progress" | "done"
  start_week:   number
  end_week:     number
  position:     number
  is_separator: boolean
  created_at:   string
  updated_at:   string
}

export interface WorkItemWithPhase extends WorkItem {
  phase: ProjectPhase | null
}

export interface CreateProjectInput {
  name:       string
  start_date: string
  week_count: number
}

export type UpdateProjectInput = Partial<Pick<Project, "name" | "start_date" | "week_count">>

export interface CreatePhaseInput {
  name:  string
  color: string
}

export type UpdatePhaseInput = Partial<Pick<ProjectPhase, "name" | "color" | "position">>

export interface CreateWorkItemInput {
  phase_id:     string | null
  title:        string
  person:       string | null
  comment:      string | null
  jira_ticket:  string | null
  status:       WorkItem["status"]
  start_week:   number
  end_week:     number
  position:     number
  is_separator: boolean
}

export type UpdateWorkItemInput = Partial<Pick<WorkItem,
  "phase_id" | "title" | "person" | "comment" | "jira_ticket" | "status" | "start_week" | "end_week" | "position"
>>
