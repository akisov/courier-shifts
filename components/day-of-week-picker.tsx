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

  const firstRow = DAYS_OF_WEEK.slice(0, 4) // Пн Вт Ср Чт
  const secondRow = DAYS_OF_WEEK.slice(4)   // Пт Сб Вс

  return (
    <div className="mt-3">
      <p className="text-xs text-muted-foreground mb-2">Каждую неделю</p>
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-4 gap-2">
          {firstRow.map((day) => {
            const selected = selectedDays.includes(day.id)
            return (
              <button
                key={day.id}
                type="button"
                onClick={() => toggle(day.id)}
                className={cn(
                  "py-3 rounded-xl text-sm font-semibold transition-all",
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
        <div className="grid grid-cols-3 gap-2">
          {secondRow.map((day) => {
            const selected = selectedDays.includes(day.id)
            return (
              <button
                key={day.id}
                type="button"
                onClick={() => toggle(day.id)}
                className={cn(
                  "py-3 rounded-xl text-sm font-semibold transition-all",
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
    </div>
  )
}
