import { useState } from "react"
import { CalendarIcon } from "lucide-react"
import { format, parseISO } from "date-fns"

import { Button } from "#components/ui/button"
import { Calendar } from "#components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "#components/ui/popover"
import { cn } from "#lib/utils"

interface DatePickerProps {
  value?:       string           // YYYY-MM-DD
  onChange?:    (val: string | undefined) => void
  placeholder?: string
  className?:   string
}

export function DatePicker({ value, onChange, placeholder = "Pick a date", className }: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const selected = value ? parseISO(value) : undefined

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn("w-[160px] justify-start text-left font-normal", !value && "text-muted-foreground", className)}
        >
          <CalendarIcon className="size-3.5 shrink-0" />
          {value ? format(parseISO(value), "MMM d, yyyy") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(d) => {
            onChange?.(d ? format(d, "yyyy-MM-dd") : undefined)
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
