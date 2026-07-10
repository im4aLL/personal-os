import { useRef, useState } from "react"
import { Globe, Trash2, ExternalLink } from "lucide-react"
import { openUrl } from "@tauri-apps/plugin-opener"

import { Badge } from "#components/ui/badge"
import { Button } from "#components/ui/button"
import { cn } from "#lib/utils"
import { updateLink, deleteLink } from "#lib/links"
import { useLinksStore } from "#store/links"
import type { LinkWithTags } from "#lib/types/link"

interface LinkListItemProps {
  link:       LinkWithTags
  onTagClick: (tag: string) => void
}

export function LinkListItem({ link, onTagClick }: LinkListItemProps) {
  const { patchLinkInList, removeLink } = useLinksStore.getState()

  const [isEditing, setIsEditing] = useState(false)
  const [title,     setTitle]     = useState(link.title)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleTitleClick() {
    setIsEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  async function commitTitle() {
    setIsEditing(false)
    const trimmed = title.trim()
    if (!trimmed || trimmed === link.title) { setTitle(link.title); return }
    patchLinkInList(link.id, { title: trimmed })
    await updateLink(link.id, { title: trimmed })
  }

  async function handleDelete() {
    removeLink(link.id)
    await deleteLink(link.id)
  }

  return (
    <div className="group flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/50">
      {/* Favicon */}
      <div className="flex size-8 shrink-0 items-center justify-center rounded bg-muted overflow-hidden mt-0.5">
        {link.favicon_url ? (
          <img
            src={link.favicon_url}
            alt=""
            className="size-4"
            onError={e => { e.currentTarget.style.display = "none"; e.currentTarget.nextElementSibling?.removeAttribute("style") }}
          />
        ) : null}
        <Globe className={cn("size-4 text-muted-foreground", link.favicon_url && "hidden")} />
      </div>

      {/* Main content */}
      <div className="min-w-0 flex-1">
        {/* Title — inline editable */}
        {isEditing ? (
          <input
            ref={inputRef}
            className="w-full text-sm font-medium bg-transparent outline-none border-b border-ring pb-0.5"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={e => {
              if (e.key === "Enter") { e.currentTarget.blur() }
              if (e.key === "Escape") { setTitle(link.title); setIsEditing(false) }
            }}
          />
        ) : (
          <div className="flex items-center gap-1.5">
            <p
              className="text-sm font-medium leading-snug truncate cursor-pointer hover:underline"
              onClick={handleTitleClick}
            >
              {link.title}
            </p>
            <ExternalLink className="size-3 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        )}

        {/* Domain */}
        <p
          className="text-xs text-muted-foreground truncate hover:underline cursor-pointer w-fit"
          onClick={() => openUrl(link.url).catch(console.error)}
        >
          {new URL(link.url).hostname}
        </p>

        {/* Tags */}
        {link.tags.length > 0 && (
          <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
            {link.tags.map(tag => (
              <Badge
                key={tag}
                variant="secondary"
                className="text-[10px] px-1.5 py-0 h-4 font-normal cursor-pointer hover:bg-secondary/80"
                onClick={() => onTagClick(tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Date + delete */}
      <div className="flex shrink-0 items-center gap-1">
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {new Date(link.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={handleDelete}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}
