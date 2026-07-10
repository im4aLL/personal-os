import { NavLink } from "react-router"
import { Link, ListTodo, FolderKanban, ClipboardList, NotebookPen } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "#components/ui/sidebar"

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
      <SidebarHeader className="px-3 py-3 text-base font-semibold">
        Personal OS
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
    </Sidebar>
  )
}
