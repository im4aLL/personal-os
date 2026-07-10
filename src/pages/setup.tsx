import { useState } from "react"
import { useNavigate } from "react-router"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { DatabaseZap, HardDrive, Cloud } from "lucide-react"

import { saveTursoConfig, clearTursoConfig, setAppMode } from "#lib/config"
import { tursoExecute, tursoSelect } from "#lib/turso"
import { REMOTE_SCHEMAS } from "#lib/schema"
import { Button } from "#components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "#components/ui/form"
import { Input } from "#components/ui/input"
import { cn } from "#lib/utils"

const formSchema = z.object({
  url:   z.string().min(1, "Database URL is required").refine(
    v => v.startsWith("https://") || v.startsWith("libsql://"),
    "Must start with https:// or libsql://"
  ),
  token: z.string().min(1, "Auth token is required"),
})

type FormValues = z.infer<typeof formSchema>

type Step = "choose" | "cloud-form"

export default function SetupPage() {
  const navigate     = useNavigate()
  const [step, setStep] = useState<Step>("choose")
  const [error, setError] = useState<string | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { url: "", token: "" },
  })

  function handleLocalOnly() {
    setAppMode("local")
    navigate("/dashboard", { replace: true })
  }

  async function handleCloudSubmit(values: FormValues) {
    setError(null)
    const url = values.url.replace(/\/$/, "")
    try {
      clearTursoConfig()
      saveTursoConfig({ url, token: values.token })
      await tursoSelect("SELECT 1")
      for (const sql of REMOTE_SCHEMAS) {
        await tursoExecute(sql)
      }
      setAppMode("cloud")
      navigate("/dashboard", { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not connect. Check your URL and token.")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <DatabaseZap className="size-6" />
            </div>
          </div>
          <h1 className="text-2xl font-semibold">Welcome to Personal OS</h1>
          <p className="text-sm text-muted-foreground">
            {step === "choose"
              ? "Choose how you want to store your data."
              : "Connect your Turso database to sync across devices."}
          </p>
        </div>

        {/* Step 1 — Choose mode */}
        {step === "choose" && (
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={handleLocalOnly}
              className={cn(
                "flex flex-col items-center gap-3 rounded-xl border p-6 text-center transition-colors",
                "hover:bg-muted hover:border-foreground/20"
              )}
            >
              <HardDrive className="size-8 text-muted-foreground" />
              <div>
                <p className="font-semibold text-sm">Local only</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Data stays on this machine. Export / import to move between devices.
                </p>
              </div>
            </button>

            <button
              onClick={() => setStep("cloud-form")}
              className={cn(
                "flex flex-col items-center gap-3 rounded-xl border p-6 text-center transition-colors",
                "hover:bg-muted hover:border-foreground/20"
              )}
            >
              <Cloud className="size-8 text-muted-foreground" />
              <div>
                <p className="font-semibold text-sm">Connect to cloud</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Sync automatically across devices using Turso.
                </p>
              </div>
            </button>
          </div>
        )}

        {/* Step 2 — Turso form */}
        {step === "cloud-form" && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleCloudSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Database URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://your-db.turso.io  or  libsql://..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="token"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Auth Token</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="eyJ..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => { setStep("choose"); setError(null) }}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting ? "Connecting..." : "Connect"}
                </Button>
              </div>
            </form>
          </Form>
        )}

        {step === "choose" && (
          <p className="text-center text-xs text-muted-foreground">
            Don't have a Turso account?{" "}
            <a
              href="https://app.turso.tech"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4 hover:text-foreground"
            >
              Create one free →
            </a>
          </p>
        )}
      </div>
    </div>
  )
}
