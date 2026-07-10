import { Outlet } from "react-router"
import { AppSidebar } from "#components/app-sidebar"
import { AppHeader } from "#components/app-header"
import { SidebarInset, SidebarProvider } from "#components/ui/sidebar"

export function Layout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AppHeader />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
