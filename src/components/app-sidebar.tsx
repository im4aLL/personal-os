import { NavLink } from "react-router"
import { Link, ListTodo, FolderKanban, ClipboardList, NotebookPen } from "lucide-react"

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
} from "#components/ui/sidebar"

const user = {
  name: "Md Habibullah Al Hadi",
  email: "hadicse@gmail.com",
  avatar: "",
}

const items = [
  { title: "Save Links",      to: "/links",    icon: Link          },
  { title: "Todo",            to: "/todo",     icon: ListTodo      },
  { title: "Project Planner", to: "/projects", icon: FolderKanban  },
  { title: "Work Log",        to: "/work-log", icon: ClipboardList },
  { title: "Notes",           to: "/notes",    icon: NotebookPen   },
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
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4">
                    <path d="M7 2h10" />
                    <path d="M5 6h14" />
                    <rect width="18" height="12" x="3" y="10" rx="2" />
                  </svg>
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">Personal OS</span>
                  <span className="text-xs text-muted-foreground">v0.1.0</span>
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
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
