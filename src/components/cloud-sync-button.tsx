import { useState } from "react"
import { Cloud, CloudOff, RefreshCw } from "lucide-react"
import { Button } from "#components/ui/button"
import { syncTodos } from "#lib/sync"
import { cn } from "#lib/utils"

type Status = "idle" | "syncing" | "done" | "error"

export function CloudSyncButton() {
  const [status, setStatus] = useState<Status>("idle")

  async function handleSync() {
    if (status === "syncing") return
    setStatus("syncing")
    try {
      await syncTodos()
      setStatus("done")
      setTimeout(() => setStatus("idle"), 2000)
    } catch {
      setStatus("error")
      setTimeout(() => setStatus("idle"), 3000)
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleSync}
      title={
        status === "syncing" ? "Syncing..."  :
        status === "done"    ? "Synced"      :
        status === "error"   ? "Sync failed" :
        "Sync with cloud"
      }
    >
      {status === "syncing" ? (
        <RefreshCw className="size-4 animate-spin" />
      ) : status === "error" ? (
        <CloudOff className="size-4 text-destructive" />
      ) : (
        <Cloud className={cn("size-4", status === "done" && "text-green-500")} />
      )}
    </Button>
  )
}
