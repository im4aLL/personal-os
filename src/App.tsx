import { createHashRouter, RouterProvider, Navigate } from "react-router"
import "./App.css"

import { Layout }       from "#components/layout"
import DashboardPage    from "#pages/dashboard"
import LinksPage        from "#pages/links"
import TodoPage         from "#pages/todo"
import ProjectsPage     from "#pages/projects"
import WorkLogPage      from "#pages/work-log"
import NotesPage        from "#pages/notes"

const router = createHashRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard", element: <DashboardPage />  },
      { path: "links",    element: <LinksPage />    },
      { path: "todo",     element: <TodoPage />     },
      { path: "projects", element: <ProjectsPage /> },
      { path: "work-log", element: <WorkLogPage />  },
      { path: "notes",    element: <NotesPage />    },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
