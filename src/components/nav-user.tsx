import { useEffect, useState } from "react"
import { useNavigate } from "react-router"
import { ChevronsUpDown, RefreshCw, Unplug, Download, Upload, UserPen } from "lucide-react"

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
import { clearAll, getAppMode } from "#lib/config"
import { getProfile, gravatarUrl, type UserProfile } from "#lib/profile"
import { syncTodos } from "#lib/sync"
import { exportDb, importDb } from "#lib/db"
import { cn } from "#lib/utils"
import { save, open } from "@tauri-apps/plugin-dialog"
import { ProfileDialog } from "#components/profile-dialog"

export function NavUser() {
  const { isMobile } = useSidebar()
  const navigate     = useNavigate()
  const isCloud      = getAppMode() === "cloud"

  const [profile,   setProfile]   = useState<UserProfile | null>(null)
  const [avatarSrc, setAvatarSrc] = useState("")
  const [profileDialogOpen, setProfileDialogOpen] = useState(false)

  const [syncLabel,  setSyncLabel]  = useState("Sync")
  const [syncing,    setSyncing]    = useState(false)
  const [syncStatus, setSyncStatus] = useState<"idle" | "done" | "error">("idle")

  useEffect(() => {
    getProfile().then(setProfile)
  }, [])

  useEffect(() => {
    if (profile?.email) {
      gravatarUrl(profile.email).then(setAvatarSrc)
    }
  }, [profile])

  async function handleSync() {
    if (syncing) return
    setSyncing(true); setSyncLabel("Syncing...")
    try {
      await syncTodos()
      setSyncStatus("done"); setSyncLabel("Synced")
      setTimeout(() => { setSyncing(false); setSyncStatus("idle"); setSyncLabel("Sync") }, 3000)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error("Sync error:", msg)
      setSyncStatus("error"); setSyncLabel(msg)
      setTimeout(() => { setSyncing(false); setSyncStatus("idle"); setSyncLabel("Sync") }, 5000)
    }
  }

  async function handleExport() {
    const dest = await save({
      defaultPath: "personal-os-backup.db",
      filters: [{ name: "SQLite Database", extensions: ["db"] }],
    })
    if (dest) await exportDb(dest)
  }

  async function handleImport() {
    const src = await open({
      multiple: false,
      filters: [{ name: "SQLite Database", extensions: ["db"] }],
    })
    if (src) { await importDb(src as string); window.location.reload() }
  }

  function handleDisconnect() {
    clearAll()
    navigate("/setup", { replace: true })
  }

  const name     = profile?.name  ?? "—"
  const email    = profile?.email ?? "—"
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={avatarSrc} alt={name} />
                  <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{name}</span>
                  <span className="truncate text-xs">{email}</span>
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
              {/* User info header */}
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={avatarSrc} alt={name} />
                    <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{name}</span>
                    <span className="truncate text-xs">{email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator />

              <DropdownMenuItem onSelect={() => setProfileDialogOpen(true)}>
                <UserPen />
                Edit profile
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* Cloud: Sync */}
              {isCloud && (
                <DropdownMenuItem
                  onSelect={handleSync}
                  className={cn(
                    syncStatus === "done"  && "text-green-500 focus:text-green-500",
                    syncStatus === "error" && "text-destructive focus:text-destructive",
                  )}
                >
                  <RefreshCw className={cn("size-4", syncing && "animate-spin")} />
                  {syncLabel}
                </DropdownMenuItem>
              )}

              {/* Local: Export / Import */}
              {!isCloud && (
                <>
                  <DropdownMenuItem onSelect={handleExport}>
                    <Download />
                    Export database
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={handleImport}>
                    <Upload />
                    Import database
                  </DropdownMenuItem>
                </>
              )}

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onSelect={handleDisconnect}
                className="text-destructive focus:text-destructive"
              >
                <Unplug />
                {isCloud ? "Disconnect database" : "Reset & change mode"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <ProfileDialog
        open={profileDialogOpen}
        onOpenChange={setProfileDialogOpen}
        onSaved={setProfile}
      />
    </>
  )
}
