import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

import { Button } from "#components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "#components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "#components/ui/form"
import { Input } from "#components/ui/input"
import { getProfile, saveProfile, type UserProfile } from "#lib/profile"

const schema = z.object({
  name:  z.string().min(1, "Name is required"),
  email: z.string().email("Enter a valid email"),
})

type Values = z.infer<typeof schema>

interface ProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (profile: UserProfile) => void
}

export function ProfileDialog({ open, onOpenChange, onSaved }: ProfileDialogProps) {
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "" },
  })

  useEffect(() => {
    if (open) {
      getProfile().then(p => form.reset({ name: p?.name ?? "", email: p?.email ?? "" }))
    }
  }, [open, form])

  async function handleSubmit(values: Values) {
    const profile: UserProfile = { name: values.name, email: values.email }
    await saveProfile(profile)
    onSaved(profile)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField control={form.control} name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full name</FormLabel>
                  <FormControl><Input placeholder="Alex Johnson" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField control={form.control} name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl><Input type="email" placeholder="alex@example.com" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
