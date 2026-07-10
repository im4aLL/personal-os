import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import { TooltipProvider } from "#components/ui/tooltip"
import { ErrorBoundary } from "#components/error-boundary"

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <TooltipProvider>
        <App />
      </TooltipProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
