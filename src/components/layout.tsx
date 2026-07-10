import { useEffect } from "react"
import { Outlet } from "react-router"
import { AppSidebar } from "#components/app-sidebar"
import { AppHeader } from "#components/app-header"
import { SidebarInset, SidebarProvider } from "#components/ui/sidebar"
import { syncTodos } from "#lib/sync"
import { getAppMode } from "#lib/config"

export function Layout() {
  useEffect(() => {
    if (getAppMode() === "cloud") {
      syncTodos().catch((err) => console.warn("Startup sync failed:", err))
    }
  }, [])
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AppHeader />
        <main className="flex-1 min-w-0 p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
