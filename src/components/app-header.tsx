import { useMatches } from "react-router"
import { SidebarTrigger } from "#components/ui/sidebar"
import { Separator } from "#components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "#components/ui/breadcrumb"
import { ThemeToggle } from "#components/theme-toggle"

const titles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/links":    "Save Links",
  "/todo":     "Todo",
  "/projects": "Project Planner",
  "/work-log": "Work Log",
  "/notes":    "Notes",
}

export function AppHeader() {
  const matches = useMatches()
  const last = matches[matches.length - 1]
  const title = titles[last?.pathname ?? ""] ?? "Personal OS"

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>{title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <div className="ml-auto px-4">
        <ThemeToggle />
      </div>
    </header>
  )
}
