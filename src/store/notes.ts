import { create } from "zustand"
import { getNotes, searchNotes, createNote as createNoteDAL } from "#lib/notes"
import type { Note } from "#lib/types/note"

interface NotesStore {
  notes:      Note[]
  selectedId: string | null
  loading:    boolean

  loadNotes:       () => Promise<void>
  refreshNotes:    () => Promise<void>
  searchNotes:     (query: string) => Promise<void>
  selectNote:      (id: string) => void
  clearSelection:  () => void
  createNote:      () => Promise<void>
  patchNoteInList: (id: string, patch: Partial<Note>) => void
  removeNote:      (id: string) => void
}

export const useNotesStore = create<NotesStore>((set) => ({
  notes:      [],
  selectedId: null,
  loading:    true,

  // Initial load — shows skeleton
  loadNotes: async () => {
    set({ loading: true })
    try {
      const notes = await getNotes()
      set({ notes, loading: false })
    } catch (err) {
      console.error("Failed to load notes:", err)
      set({ loading: false })
    }
  },

  // Silent refresh — no skeleton, used after sync or auto-save
  refreshNotes: async () => {
    try {
      const notes = await getNotes()
      set({ notes })
    } catch (err) {
      console.error("Failed to refresh notes:", err)
    }
  },

  searchNotes: async (query: string) => {
    try {
      const notes = await searchNotes(query)
      set({ notes })
    } catch (err) {
      console.error("Failed to search notes:", err)
    }
  },

  selectNote:     (id) => set({ selectedId: id }),
  clearSelection: ()   => set({ selectedId: null }),

  createNote: async () => {
    try {
      const note = await createNoteDAL()
      set(s => ({ notes: [note, ...s.notes], selectedId: note.id }))
    } catch (err) {
      console.error("Failed to create note:", err)
    }
  },

  patchNoteInList: (id, patch) =>
    set(s => ({ notes: s.notes.map(n => n.id === id ? { ...n, ...patch } : n) })),

  removeNote: (id) =>
    set(s => ({
      notes:      s.notes.filter(n => n.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
    })),
}))
