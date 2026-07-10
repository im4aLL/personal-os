import { useState } from "react"
import { useNavigate } from "react-router"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { DatabaseZap } from "lucide-react"

import { saveTursoConfig, clearTursoConfig } from "#lib/config"
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

const formSchema = z.object({
  url:   z.string().min(1, "Database URL is required").refine(
    v => v.startsWith("https://") || v.startsWith("libsql://"),
    "Must start with https:// or libsql://"
  ),
  token: z.string().min(1, "Auth token is required"),
})

type FormValues = z.infer<typeof formSchema>

export default function SetupPage() {
  const navigate = useNavigate()
  const [error, setError]   = useState<string | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { url: "", token: "" },
  })

  async function handleSubmit(values: FormValues) {
    setError(null)
    // Strip trailing slash — Rust handles libsql:// vs https:// conversion
    const url = values.url.replace(/\/$/, "")

    try {
      clearTursoConfig()
      saveTursoConfig({ url, token: values.token })
      // Validate connection
      await tursoSelect("SELECT 1")
      // Create all remote tables for a new user
      for (const sql of REMOTE_SCHEMAS) {
        await tursoExecute(sql)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not connect. Check your URL and token.")
      return
    }

    navigate("/dashboard", { replace: true })
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
          <h1 className="text-2xl font-semibold">Connect your database</h1>
          <p className="text-sm text-muted-foreground">
            Personal OS uses{" "}
            <a
              href="https://turso.tech"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4 hover:text-foreground"
            >
              Turso
            </a>{" "}
            to sync your data across devices. Create a free database and paste
            the credentials below.
          </p>
        </div>

        {/* Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Database URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://your-db.turso.io  or  libsql://your-db.turso.io" {...field} />
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

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? "Connecting..." : "Connect"}
            </Button>
          </form>
        </Form>

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
      </div>
    </div>
  )
}
