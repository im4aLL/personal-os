import { create } from "zustand"
import {
  getProjects, createProject,
  getPhasesForProject, createPhase, updatePhase, deletePhase,
  getWorkItemsForProject, createWorkItem, deleteWorkItem,
} from "#lib/projects"
import type {
  Project, ProjectPhase, WorkItemWithPhase,
  CreateProjectInput,
  CreatePhaseInput,
  CreateWorkItemInput,
} from "#lib/types/project"

interface ProjectsStore {
  projects:    Project[]
  selectedId:  string | null
  phases:      ProjectPhase[]
  workItems:   WorkItemWithPhase[]
  loading:     boolean

  loadProjects:       () => Promise<void>
  refreshProjects:    () => Promise<void>
  selectProject:      (id: string) => Promise<void>

  addProject:         (input: CreateProjectInput) => Promise<Project>
  patchProject:       (id: string, patch: Partial<Project>) => void
  removeProject:      (id: string) => void

  addPhase:           (input: CreatePhaseInput) => Promise<void>
  patchPhase:         (id: string, patch: Partial<ProjectPhase>) => void
  removePhase:        (id: string) => Promise<void>
  movePhase:          (id: string, dir: "up" | "down") => Promise<void>

  addWorkItem:        (input: CreateWorkItemInput) => Promise<void>
  patchWorkItem:      (id: string, patch: Partial<WorkItemWithPhase>) => void
  removeWorkItem:     (id: string) => Promise<void>
  addSeparator:       () => Promise<void>
}

export const useProjectsStore = create<ProjectsStore>((set, get) => ({
  projects:   [],
  selectedId: null,
  phases:     [],
  workItems:  [],
  loading:    true,

  loadProjects: async () => {
    set({ loading: true })
    try {
      const projects = await getProjects()
      set({ projects, loading: false })
    } catch (err) {
      console.error("Failed to load projects:", err)
      set({ loading: false })
    }
  },

  refreshProjects: async () => {
    try {
      const projects = await getProjects()
      set({ projects })
      const { selectedId } = get()
      if (selectedId) {
        const [phases, workItems] = await Promise.all([
          getPhasesForProject(selectedId),
          getWorkItemsForProject(selectedId),
        ])
        set({ phases, workItems })
      }
    } catch (err) {
      console.error("Failed to refresh projects:", err)
    }
  },

  selectProject: async (id) => {
    set({ selectedId: id, phases: [], workItems: [] })
    try {
      const [phases, workItems] = await Promise.all([
        getPhasesForProject(id),
        getWorkItemsForProject(id),
      ])
      set({ phases, workItems })
    } catch (err) {
      console.error("Failed to load project data:", err)
    }
  },

  addProject: async (input) => {
    const project = await createProject(input)
    set(s => ({ projects: [...s.projects, project] }))
    return project
  },

  patchProject: (id, patch) =>
    set(s => ({ projects: s.projects.map(p => p.id === id ? { ...p, ...patch } : p) })),

  removeProject: (id) =>
    set(s => ({
      projects:   s.projects.filter(p => p.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
    })),

  addPhase: async (input) => {
    const { selectedId, phases } = get()
    if (!selectedId) return
    const phase = await createPhase(selectedId, input, phases.length)
    set(s => ({ phases: [...s.phases, phase] }))
  },

  patchPhase: (id, patch) =>
    set(s => ({ phases: s.phases.map(p => p.id === id ? { ...p, ...patch } : p) })),

  removePhase: async (id) => {
    await deletePhase(id)
    set(s => ({ phases: s.phases.filter(p => p.id !== id) }))
  },

  movePhase: async (id, dir) => {
    const { phases } = get()
    const idx = phases.findIndex(p => p.id === id)
    if (idx === -1) return
    const newIdx = dir === "up" ? idx - 1 : idx + 1
    if (newIdx < 0 || newIdx >= phases.length) return

    const reordered = [...phases]
    ;[reordered[idx], reordered[newIdx]] = [reordered[newIdx], reordered[idx]]
    const updated = reordered.map((p, i) => ({ ...p, position: i }))
    set({ phases: updated })

    await Promise.all(updated.map(p => updatePhase(p.id, { position: p.position })))
  },

  addWorkItem: async (input) => {
    const { selectedId } = get()
    if (!selectedId) return
    const item = await createWorkItem(selectedId, input)
    set(s => ({ workItems: [...s.workItems, item] }))
  },

  patchWorkItem: (id, patch) =>
    set(s => ({ workItems: s.workItems.map(w => w.id === id ? { ...w, ...patch } : w) })),

  removeWorkItem: async (id) => {
    await deleteWorkItem(id)
    set(s => ({ workItems: s.workItems.filter(w => w.id !== id) }))
  },

  addSeparator: async () => {
    const { selectedId, workItems } = get()
    if (!selectedId) return
    const item = await createWorkItem(selectedId, {
      phase_id:     null,
      title:        "",
      person:       null,
      comment:      null,
      jira_ticket:  null,
      status:       "pending",
      start_week:   1,
      end_week:     1,
      position:     workItems.length,
      is_separator: true,
    })
    set(s => ({ workItems: [...s.workItems, item] }))
  },
}))
