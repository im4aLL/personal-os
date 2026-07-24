import { createHashRouter, RouterProvider, Navigate, redirect } from "react-router"
import "./App.css"

import { getTursoConfig, getAppMode } from "#lib/config"
import { getProfile } from "#lib/profile"
import { Layout }         from "#components/layout"
import { Toaster }        from "#components/ui/sonner"
import SetupPage          from "#pages/setup"
import DashboardPage      from "#pages/dashboard"
import LinksPage          from "#pages/links"
import TodoPage           from "#pages/todo"
import ProjectsPage       from "#pages/projects"
import WorkLogPage        from "#pages/work-log"
import NotesPage          from "#pages/notes"

async function requireConfig() {
  const mode = getAppMode()
  if (!mode) return redirect("/setup")
  if (mode === "cloud" && !getTursoConfig()) return redirect("/setup")
  try {
    const profile = await getProfile()
    if (!profile) return redirect("/setup")
  } catch {
    return redirect("/setup")
  }
  return null
}

const router = createHashRouter([
  {
    path: "/setup",
    element: <SetupPage />,
  },
  {
    path: "/",
    element: <Layout />,
    loader: requireConfig,
    children: [
      { index: true,        element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard",  element: <DashboardPage />,  loader: requireConfig },
      { path: "links",      element: <LinksPage />,      loader: requireConfig },
      { path: "todo",       element: <TodoPage />,       loader: requireConfig },
      { path: "projects",   element: <ProjectsPage />,   loader: requireConfig },
      { path: "work-log",   element: <WorkLogPage />,    loader: requireConfig },
      { path: "notes",      element: <NotesPage />,      loader: requireConfig },
    ],
  },
])

export default function App() {
  return (
    <>
      <RouterProvider router={router} />
      <Toaster />
    </>
  )
}
