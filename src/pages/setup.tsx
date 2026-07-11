import { useState } from "react"
import { useNavigate } from "react-router"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { DatabaseZap, HardDrive, Cloud, UserCircle } from "lucide-react"

import { saveTursoConfig, clearTursoConfig, setAppMode } from "#lib/config"
import { saveProfile, getProfile } from "#lib/profile"
import { tursoExecute, tursoSelect } from "#lib/turso"
import { applyRemoteSchema } from "#lib/schema"
import { syncTodos } from "#lib/sync"
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

// ── Schemas ───────────────────────────────────────────────────────
const cloudSchema = z.object({
  url:   z.string().min(1, "Database URL is required").refine(
    v => v.startsWith("https://") || v.startsWith("libsql://"),
    "Must start with https:// or libsql://"
  ),
  token: z.string().min(1, "Auth token is required"),
})

const profileSchema = z.object({
  name:  z.string().min(1, "Name is required"),
  email: z.string().email("Enter a valid email"),
})

type CloudValues   = z.infer<typeof cloudSchema>
type ProfileValues = z.infer<typeof profileSchema>
type Step = "choose" | "cloud-form" | "profile"

export default function SetupPage() {
  const navigate = useNavigate()
  const [step, setStep]         = useState<Step>("choose")
  const [prevStep, setPrevStep] = useState<Step>("choose")
  const [error, setError]       = useState<string | null>(null)

  const cloudForm = useForm<CloudValues>({
    resolver: zodResolver(cloudSchema),
    defaultValues: { url: "", token: "" },
  })

  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: "", email: "" },
  })

  function goToProfile(from: Step) { setPrevStep(from); setStep("profile") }

  function handleLocalOnly() {
    setAppMode("local")
    goToProfile("choose")
  }

  async function handleCloudSubmit(values: CloudValues) {
    setError(null)
    const url = values.url.replace(/\/$/, "")
    try {
      clearTursoConfig()
      saveTursoConfig({ url, token: values.token })
      await tursoSelect("SELECT 1")
      await applyRemoteSchema(tursoExecute)
      setAppMode("cloud")
      // Pull existing data (profile, todos) from cloud before deciding next step
      await syncTodos()
      const existing = await getProfile()
      if (existing) {
        navigate("/dashboard", { replace: true })
      } else {
        goToProfile("cloud-form")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not connect. Check your URL and token.")
    }
  }

  async function handleProfileSubmit(values: ProfileValues) {
    await saveProfile({ name: values.name, email: values.email })
    navigate("/dashboard", { replace: true })
  }

  const stepTitle: Record<Step, string> = {
    "choose":     "Welcome to Personal OS",
    "cloud-form": "Connect your database",
    "profile":    "Your profile",
  }

  const stepSub: Record<Step, string> = {
    "choose":     "Choose how you want to store your data.",
    "cloud-form": "Sync automatically across devices using Turso.",
    "profile":    "Just your name and email — stored locally, never shared.",
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              {step === "profile" ? <UserCircle className="size-6" /> : <DatabaseZap className="size-6" />}
            </div>
          </div>
          <h1 className="text-2xl font-semibold">{stepTitle[step]}</h1>
          <p className="text-sm text-muted-foreground">{stepSub[step]}</p>
        </div>

        {/* Step 1 — Choose mode */}
        {step === "choose" && (
          <>
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
            <p className="text-center text-xs text-muted-foreground">
              Don't have a Turso account?{" "}
              <a href="https://app.turso.tech" target="_blank" rel="noreferrer"
                className="underline underline-offset-4 hover:text-foreground">
                Create one free →
              </a>
            </p>
          </>
        )}

        {/* Step 2 — Turso form */}
        {step === "cloud-form" && (
          <Form {...cloudForm}>
            <form onSubmit={cloudForm.handleSubmit(handleCloudSubmit)} className="space-y-4">
              <FormField control={cloudForm.control} name="url"
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
              <FormField control={cloudForm.control} name="token"
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
                <Button type="button" variant="outline" className="flex-1"
                  onClick={() => { setStep("choose"); setError(null) }}>
                  Back
                </Button>
                <Button type="submit" className="flex-1" disabled={cloudForm.formState.isSubmitting}>
                  {cloudForm.formState.isSubmitting ? "Connecting..." : "Connect"}
                </Button>
              </div>
            </form>
          </Form>
        )}

        {/* Step 3 — Profile */}
        {step === "profile" && (
          <Form {...profileForm}>
            <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} className="space-y-4">
              <FormField control={profileForm.control} name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full name</FormLabel>
                    <FormControl>
                      <Input placeholder="Alex Johnson" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField control={profileForm.control} name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="alex@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <p className="text-xs text-muted-foreground">
                Your email is used to load your{" "}
                <a href="https://gravatar.com" target="_blank" rel="noreferrer"
                  className="underline underline-offset-4 hover:text-foreground">
                  Gravatar
                </a>{" "}
                avatar. It is stored only on this device.
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep(prevStep)}
                >
                  Back
                </Button>
                <Button type="submit" className="flex-1">
                  Get started
                </Button>
              </div>
            </form>
          </Form>
        )}
      </div>
    </div>
  )
}
