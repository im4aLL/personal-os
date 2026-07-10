import { useEffect, useRef, useState } from "react"
import { Search, Plus, Link2 } from "lucide-react"
import { useDebounce } from "use-debounce"
import { useVirtualizer } from "@tanstack/react-virtual"

import { Button } from "#components/ui/button"
import { Input } from "#components/ui/input"
import { Badge } from "#components/ui/badge"
import { Skeleton } from "#components/ui/skeleton"
import { cn } from "#lib/utils"
import { useLinksStore } from "#store/links"
import { LinkListItem } from "./link-list-item"
import { AddLinkDialog } from "./add-link-dialog"

export function LinkList() {
  const links   = useLinksStore(s => s.links)
  const allTags = useLinksStore(s => s.allTags)
  const loading = useLinksStore(s => s.loading)
  const { loadLinks, refreshLinks, searchLinks, filterByTag } = useLinksStore.getState()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [activeTag,  setActiveTag]  = useState<string | null>(null)
  const [search,     setSearch]     = useState("")
  const [debouncedSearch] = useDebounce(search, 300)

  const scrollRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count:           links.length,
    getScrollElement: () => scrollRef.current,
    estimateSize:    () => 80,   // estimated row height in px
    overscan:        5,
  })

  useEffect(() => { loadLinks() }, [loadLinks])

  useEffect(() => {
    const handler = () => refreshLinks()
    window.addEventListener("personal-os:sync-complete", handler)
    return () => window.removeEventListener("personal-os:sync-complete", handler)
  }, [refreshLinks])

  // Search / filter — scroll back to top when results change
  useEffect(() => {
    virtualizer.scrollToIndex(0)
    if (debouncedSearch.trim()) {
      setActiveTag(null)
      searchLinks(debouncedSearch.trim())
    } else if (activeTag) {
      filterByTag(activeTag)
    } else {
      loadLinks()
    }
  }, [debouncedSearch, activeTag, loadLinks, searchLinks, filterByTag, virtualizer])

  function handleTagClick(tag: string) {
    setSearch("")
    setActiveTag(prev => prev === tag ? null : tag)
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            className="pl-8 h-9 text-sm"
            placeholder="Search links…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Button className="ml-auto" onClick={() => setDialogOpen(true)}>
          <Plus className="size-4" />
          Save link
        </Button>
      </div>

      {/* Tag filter pills */}
      {allTags.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {allTags.map(tag => (
            <Badge
              key={tag}
              variant={activeTag === tag ? "default" : "outline"}
              className="cursor-pointer text-xs font-normal"
              onClick={() => handleTagClick(tag)}
            >
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-start gap-3 rounded-lg border p-3">
              <Skeleton className="size-8 rounded shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : links.length === 0 ? (
        <div className={cn("flex flex-col items-center justify-center flex-1 gap-3 text-muted-foreground")}>
          <Link2 className="size-10 opacity-20" />
          <div className="text-center space-y-1">
            <p className="text-sm font-medium">
              {search || activeTag ? "No links match your search" : "No links yet"}
            </p>
            <p className="text-xs opacity-70">
              {search || activeTag ? "Try a different search or tag" : "Save your first link to get started"}
            </p>
          </div>
        </div>
      ) : (
        /* Scroll container — virtualizer measures this */
        <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0">
          {/* Total height sizer — keeps the scrollbar accurate */}
          <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
            {virtualizer.getVirtualItems().map(item => (
              <div
                key={item.key}
                data-index={item.index}
                ref={virtualizer.measureElement}
                style={{ position: "absolute", top: 0, left: 0, right: 0, transform: `translateY(${item.start}px)` }}
                className="pb-2"
              >
                <LinkListItem
                  link={links[item.index]}
                  onTagClick={handleTagClick}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <AddLinkDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  )
}
