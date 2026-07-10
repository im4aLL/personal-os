import { create } from "zustand"
import { getWorkLogs, getAllUsedTags } from "#lib/work-logs"
import { groupByWeek, type WeekGroup } from "#lib/week-groups"
import type { WorkLogWithTags } from "#lib/types/work-log"
import type { WorkLogFilter } from "#lib/types/work-log"

interface WorkLogsStore {
  logs:       WorkLogWithTags[]
  groups:     WeekGroup[]
  allTags:    string[]
  loading:    boolean
  filter:     WorkLogFilter

  loadWorkLogs:    () => Promise<void>
  refreshWorkLogs: () => Promise<void>
  applyFilter:     (filter: WorkLogFilter) => Promise<void>
  addWorkLog:      (log: WorkLogWithTags) => void
  patchWorkLog:    (id: string, patch: Partial<WorkLogWithTags>) => void
  removeWorkLog:   (id: string) => void
  reloadTags:      () => Promise<void>
}

function buildGroups(logs: WorkLogWithTags[]): WeekGroup[] {
  return groupByWeek(logs)
}

export const useWorkLogsStore = create<WorkLogsStore>((set, get) => ({
  logs:    [],
  groups:  [],
  allTags: [],
  loading: true,
  filter:  {},

  loadWorkLogs: async () => {
    set({ loading: true })
    try {
      const [logs, allTags] = await Promise.all([getWorkLogs(), getAllUsedTags()])
      set({ logs, groups: buildGroups(logs), allTags, loading: false })
    } catch (err) {
      console.error("Failed to load work logs:", err)
      set({ loading: false })
    }
  },

  refreshWorkLogs: async () => {
    try {
      const filter = get().filter
      const [logs, allTags] = await Promise.all([getWorkLogs(filter), getAllUsedTags()])
      set({ logs, groups: buildGroups(logs), allTags })
    } catch (err) {
      console.error("Failed to refresh work logs:", err)
    }
  },

  applyFilter: async (filter: WorkLogFilter) => {
    set({ filter })
    try {
      const logs = await getWorkLogs(filter)
      set({ logs, groups: buildGroups(logs) })
    } catch (err) {
      console.error("Failed to filter work logs:", err)
    }
  },

  addWorkLog: (log) =>
    set(s => {
      const logs = [log, ...s.logs]
      return { logs, groups: buildGroups(logs) }
    }),

  patchWorkLog: (id, patch) =>
    set(s => {
      const logs = s.logs.map(l => l.id === id ? { ...l, ...patch } : l)
      return { logs, groups: buildGroups(logs) }
    }),

  removeWorkLog: (id) =>
    set(s => {
      const logs = s.logs.filter(l => l.id !== id)
      return { logs, groups: buildGroups(logs) }
    }),

  reloadTags: async () => {
    const allTags = await getAllUsedTags()
    set({ allTags })
  },
}))
