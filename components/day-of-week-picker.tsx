"use client"

import { cn } from "@/lib/utils"
import { DAYS_OF_WEEK } from "@/lib/types"

interface DayOfWeekPickerProps {
  selectedDays: number[]
  onChange: (days: number[]) => void
}

export function DayOfWeekPicker({ selectedDays, onChange }: DayOfWeekPickerProps) {
  const toggle = (dayId: number) => {
    if (selectedDays.includes(dayId)) {
      onChange(selectedDays.filter((d) => d !== dayId))
    } else {
      onChange([...selectedDays, dayId])
    }
  }

  return (
    <div className="mt-2">
      <p className="text-xs text-muted-foreground mb-2">Каждую неделю</p>
      <div className="flex flex-wrap gap-2">
        {DAYS_OF_WEEK.map((day) => {
          const selected = selectedDays.includes(day.id)
          return (
            <button
              key={day.id}
              type="button"
              onClick={() => toggle(day.id)}
              className={cn(
                "h-9 w-9 rounded-full text-xs font-medium transition-all",
                selected
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-foreground hover:bg-border"
              )}
            >
              {day.short}
            </button>
          )
        })}
      </div>
    </div>
  )
}
