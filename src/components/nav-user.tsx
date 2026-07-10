import { useState } from "react"
import { useNavigate } from "react-router"
import { ChevronsUpDown, RefreshCw, Unplug } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "#components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "#components/ui/sidebar"
import { clearTursoConfig } from "#lib/config"
import { syncTodos } from "#lib/sync"
import { cn } from "#lib/utils"

interface NavUserProps {
  user: {
    name: string
    email: string
    avatar: string
  }
}

export function NavUser({ user }: NavUserProps) {
  const { isMobile } = useSidebar()
  const navigate = useNavigate()
  const [syncLabel,  setSyncLabel]  = useState("Sync Now")
  const [syncing,    setSyncing]    = useState(false)
  const [syncStatus, setSyncStatus] = useState<"idle" | "done" | "error">("idle")

  async function handleSync() {
    if (syncing) return
    setSyncing(true)
    setSyncLabel("Syncing...")
    try {
      await syncTodos()
      setSyncStatus("done")
      setSyncLabel("Synced")
      setTimeout(() => { setSyncing(false); setSyncStatus("idle"); setSyncLabel("Sync") }, 3000)
    } catch (err) {
      console.error("Sync error:", err)
      setSyncStatus("error")
      setSyncLabel("Sync failed")
      setTimeout(() => { setSyncing(false); setSyncStatus("idle"); setSyncLabel("Sync") }, 4000)
    }
  }

  function handleDisconnect() {
    clearTursoConfig()
    navigate("/setup", { replace: true })
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="rounded-lg">
                  {user.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{user.name}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            {/* User info */}
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg">
                    {user.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            {/* Sync */}
            <DropdownMenuItem
              onClick={handleSync}
              className={cn(
                syncStatus === "done"  && "text-green-500 focus:text-green-500",
                syncStatus === "error" && "text-destructive focus:text-destructive",
              )}
            >
              <RefreshCw className={cn("size-4", syncing && "animate-spin")} />
              {syncLabel}
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* Disconnect */}
            <DropdownMenuItem
              onClick={handleDisconnect}
              className="text-destructive focus:text-destructive"
            >
              <Unplug />
              Disconnect database
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
