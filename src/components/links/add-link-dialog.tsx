import { useRef, useState } from "react"
import { Globe, Loader2 } from "lucide-react"
import { invoke } from "@tauri-apps/api/core"

import { Button } from "#components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#components/ui/dialog"
import { Input } from "#components/ui/input"
import { Label } from "#components/ui/label"
import { LinkTagInput } from "./link-tag-input"
import { checkDuplicateUrl, createLink } from "#lib/links"
import { useLinksStore } from "#store/links"

type Step = "url" | "fetching" | "confirm"

interface FetchedMeta {
  title:       string
  favicon_url: string
}

interface AddLinkDialogProps {
  open:         boolean
  onOpenChange: (open: boolean) => void
}

function isValidUrl(value: string): boolean {
  try { new URL(value); return true } catch { return false }
}

function extractDomain(url: string): string {
  try { return new URL(url).hostname } catch { return url }
}

export function AddLinkDialog({ open, onOpenChange }: AddLinkDialogProps) {
  const { addLink, reloadTags, allTags } = useLinksStore.getState()

  const [step,        setStep]       = useState<Step>("url")
  const [url,         setUrl]        = useState("")
  const [meta,        setMeta]       = useState<FetchedMeta | null>(null)
  const [editTitle,   setEditTitle]  = useState("")
  const [tags,        setTags]       = useState<string[]>([])
  const [error,       setError]      = useState("")
  const [saving,      setSaving]     = useState(false)
  const urlInputRef = useRef<HTMLInputElement>(null)

  function handleOpenChange(val: boolean) {
    if (!val) reset()
    onOpenChange(val)
  }

  function reset() {
    setStep("url"); setUrl(""); setMeta(null)
    setEditTitle(""); setTags([]); setError(""); setSaving(false)
  }

  async function handleFetch() {
    setError("")
    if (!isValidUrl(url)) { setError("Enter a valid URL (include https://)"); return }

    const isDupe = await checkDuplicateUrl(url)
    if (isDupe) { setError("This link is already saved"); return }

    setStep("fetching")
    try {
      const fetched = await invoke<FetchedMeta>("fetch_link_metadata", { url })
      setMeta(fetched)
      setEditTitle(fetched.title)
      setStep("confirm")
    } catch {
      // Fetch failed — let user proceed with domain as title
      const domain = extractDomain(url)
      setMeta({ title: domain, favicon_url: `https://www.google.com/s2/favicons?domain=${domain}&sz=32` })
      setEditTitle(domain)
      setStep("confirm")
    }
  }

  async function handleSave() {
    if (!meta) return
    setSaving(true)
    try {
      const link = await createLink({
        url,
        title:       editTitle.trim() || extractDomain(url),
        favicon_url: meta.favicon_url,
        tags,
      })
      addLink(link)
      await reloadTags()
      handleOpenChange(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg.includes("UNIQUE") ? "This link is already saved" : "Failed to save link")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save link</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* URL input */}
          <div className="space-y-2">
            <Label>URL</Label>
            <div className="flex gap-2">
              <Input
                ref={urlInputRef}
                placeholder="https://example.com/article"
                value={url}
                onChange={e => { setUrl(e.target.value); setError("") }}
                onKeyDown={e => e.key === "Enter" && step === "url" && handleFetch()}
                readOnly={step !== "url"}
                autoFocus
              />
              {step === "url" && (
                <Button type="button" variant="secondary" className="shrink-0" onClick={handleFetch}>
                  Fetch
                </Button>
              )}
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>

          {step === "fetching" && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Fetching title…
            </div>
          )}

          {step === "confirm" && meta && (
            <>
              {/* Preview card */}
              <div className="flex items-center gap-2.5 rounded-lg border p-2.5">
                <div className="flex size-8 shrink-0 items-center justify-center rounded bg-muted overflow-hidden">
                  <img
                    src={meta.favicon_url}
                    alt=""
                    className="size-4"
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none" }}
                  />
                  <Globe className="size-4 text-muted-foreground hidden [img+&]:block" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{editTitle || extractDomain(url)}</p>
                  <p className="text-xs text-muted-foreground truncate">{extractDomain(url)}</p>
                </div>
              </div>

              {/* Editable title */}
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  placeholder="Page title"
                />
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label>
                  Tags <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <LinkTagInput tags={tags} suggestions={allTags} onChange={setTags} />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          {step === "confirm" && (
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save link"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
