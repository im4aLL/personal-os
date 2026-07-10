import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import { TooltipProvider } from "#components/ui/tooltip"
import { ErrorBoundary } from "#components/error-boundary"
import { ThemeProvider } from "#components/theme-provider"

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <App />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
