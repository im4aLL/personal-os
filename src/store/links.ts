import { create } from "zustand"
import { getLinks, searchLinks, getLinksByTag, getAllUsedTags } from "#lib/links"
import type { LinkWithTags } from "#lib/types/link"

interface LinksStore {
  links:     LinkWithTags[]
  allTags:   string[]
  loading:   boolean

  loadLinks:       () => Promise<void>
  refreshLinks:    () => Promise<void>
  searchLinks:     (query: string) => Promise<void>
  filterByTag:     (tag: string) => Promise<void>
  addLink:         (link: LinkWithTags) => void
  patchLinkInList: (id: string, patch: Partial<LinkWithTags>) => void
  removeLink:      (id: string) => void
  reloadTags:      () => Promise<void>
}

export const useLinksStore = create<LinksStore>((set) => ({
  links:   [],
  allTags: [],
  loading: true,

  loadLinks: async () => {
    set({ loading: true })
    try {
      const [links, allTags] = await Promise.all([getLinks(), getAllUsedTags()])
      set({ links, allTags, loading: false })
    } catch (err) {
      console.error("Failed to load links:", err)
      set({ loading: false })
    }
  },

  refreshLinks: async () => {
    try {
      const [links, allTags] = await Promise.all([getLinks(), getAllUsedTags()])
      set({ links, allTags })
    } catch (err) {
      console.error("Failed to refresh links:", err)
    }
  },

  searchLinks: async (query: string) => {
    try {
      const links = query.trim() ? await searchLinks(query) : await getLinks()
      set({ links })
    } catch (err) {
      console.error("Failed to search links:", err)
    }
  },

  filterByTag: async (tag: string) => {
    try {
      const links = await getLinksByTag(tag)
      set({ links })
    } catch (err) {
      console.error("Failed to filter links by tag:", err)
    }
  },

  addLink:         (link)        => set(s => ({ links: [link, ...s.links] })),
  patchLinkInList: (id, patch)   => set(s => ({ links: s.links.map(l => l.id === id ? { ...l, ...patch } : l) })),
  removeLink:      (id)          => set(s => ({ links: s.links.filter(l => l.id !== id) })),
  reloadTags:      async ()      => {
    const allTags = await getAllUsedTags()
    set({ allTags })
  },
}))
