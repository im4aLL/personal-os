import { NavLink } from "react-router"
import { Home, Link, ListTodo, FolderKanban, ClipboardList, NotebookPen } from "lucide-react"

import { NavUser } from "#components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "#components/ui/sidebar"

const items = [
  { title: "Dashboard",        to: "/dashboard", icon: Home          },
  { title: "Todo",             to: "/todo",      icon: ListTodo      },
  { title: "Save Links",      to: "/links",     icon: Link          },
  { title: "Project Planner", to: "/projects",  icon: FolderKanban  },
  { title: "Work Log",        to: "/work-log",  icon: ClipboardList },
  { title: "Notes",           to: "/notes",     icon: NotebookPen   },
]

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="#">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="size-4">
                    <rect x="3" y="3" width="7.5" height="7.5" rx="2" />
                    <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" fill="currentColor" opacity="0.5" />
                    <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" fill="currentColor" opacity="0.5" />
                    <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="3.75" />
                  </svg>
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">Personal OS</span>
                  <span className="text-xs text-muted-foreground">v1.0.0 beta</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <NavLink to={item.to}>
                    {({ isActive }) => (
                      <SidebarMenuButton isActive={isActive}>
                        <item.icon />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    )}
                  </NavLink>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
