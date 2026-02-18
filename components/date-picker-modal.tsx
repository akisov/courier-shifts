"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface DatePickerModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (date: Date) => void
  selectedDate?: Date | null
}

const WEEKDAY_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay()
  return day === 0 ? 6 : day - 1
}

const MONTH_NAMES = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
]

export function DatePickerModal({ isOpen, onClose, onSelect, selectedDate }: DatePickerModalProps) {
  const [month, setMonth] = useState(selectedDate ? new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1) : new Date(2026, 1, 1))
  const [tempSelected, setTempSelected] = useState<Date | null>(selectedDate || null)

  if (!isOpen) return null

  const daysInMonth = getDaysInMonth(month.getFullYear(), month.getMonth())
  const firstDay = getFirstDayOfMonth(month.getFullYear(), month.getMonth())

  const days: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) {
    days.push(null)
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(d)
  }

  const prevDaysInMonth = getDaysInMonth(
    month.getMonth() === 0 ? month.getFullYear() - 1 : month.getFullYear(),
    month.getMonth() === 0 ? 11 : month.getMonth() - 1
  )
  const trailingDays = (7 - (days.length % 7)) % 7
  for (let i = 1; i <= trailingDays; i++) {
    days.push(null)
  }

  const isDateSelected = (day: number) => {
    if (!tempSelected) return false
    return (
      tempSelected.getDate() === day &&
      tempSelected.getMonth() === month.getMonth() &&
      tempSelected.getFullYear() === month.getFullYear()
    )
  }

  const handleSave = () => {
    if (tempSelected) {
      onSelect(tempSelected)
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-foreground/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-background rounded-t-2xl shadow-2xl animate-in slide-in-from-bottom duration-300">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <button onClick={onClose} className="flex items-center gap-1 text-primary text-sm font-medium">
            <ChevronLeft className="h-4 w-4" />
            Выбор даты
          </button>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground" aria-label="Закрыть">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-4 pb-2">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
              className="p-2 hover:bg-secondary rounded-lg"
              aria-label="Предыдущий месяц"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold">
              {MONTH_NAMES[month.getMonth()]} {month.getFullYear()}
            </span>
            <button
              onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
              className="p-2 hover:bg-secondary rounded-lg"
              aria-label="Следующий месяц"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 mb-1">
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} className="text-center text-xs text-muted-foreground font-medium py-1">
                {label}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-0.5">
            {days.map((day, idx) => {
              if (day === null) {
                const beforeStart = idx < firstDay
                const trailingDay = idx >= firstDay + daysInMonth
                const displayDay = beforeStart
                  ? prevDaysInMonth - firstDay + idx + 1
                  : trailingDay
                    ? idx - firstDay - daysInMonth + 1
                    : null

                return (
                  <div key={`empty-${idx}`} className="flex items-center justify-center h-10 text-xs text-muted-foreground/40">
                    {displayDay}
                  </div>
                )
              }

              const selected = isDateSelected(day)

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setTempSelected(new Date(month.getFullYear(), month.getMonth(), day))}
                  className={cn(
                    "flex items-center justify-center h-10 rounded-lg text-sm transition-colors",
                    selected
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "text-foreground hover:bg-secondary"
                  )}
                >
                  {day}
                </button>
              )
            })}
          </div>
        </div>

        <div className="px-4 pb-6 pt-3">
          <button
            onClick={handleSave}
            disabled={!tempSelected}
            className={cn(
              "w-full rounded-xl py-3.5 text-sm font-semibold transition-all",
              tempSelected
                ? "bg-primary text-primary-foreground active:scale-[0.98]"
                : "bg-muted text-muted-foreground"
            )}
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  )
}
