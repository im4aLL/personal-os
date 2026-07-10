import { useState } from "react"
import { RefreshCw } from "lucide-react"
import { syncTodos } from "#lib/sync"
import { cn } from "#lib/utils"
import { SidebarMenuButton, SidebarMenuItem } from "#components/ui/sidebar"

export function SyncMenuItem() {
  const [status, setStatus] = useState<"idle" | "syncing" | "done" | "error">("idle")
  const [label, setLabel]   = useState("Sync")

  async function handleSync() {
    if (status === "syncing") return
    setStatus("syncing")
    setLabel("Syncing...")
    try {
      await syncTodos()
      setStatus("done")
      setLabel("Synced")
      setTimeout(() => { setStatus("idle"); setLabel("Sync") }, 3000)
    } catch (err) {
      console.error("Sync error:", err)
      setStatus("error")
      setLabel("Sync failed")
      setTimeout(() => { setStatus("idle"); setLabel("Sync") }, 4000)
    }
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        onClick={handleSync}
        className={cn(
          status === "done"  && "text-green-500",
          status === "error" && "text-destructive",
        )}
      >
        <RefreshCw className={cn("size-4", status === "syncing" && "animate-spin")} />
        <span>{label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}
