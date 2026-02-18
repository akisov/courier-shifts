"use client"

import { useState, useMemo } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ShiftEntry, PlannedReserve } from "@/lib/types"

interface MonthCalendarProps {
  shifts: ShiftEntry[]
  reserves: PlannedReserve[]
  activeTab: "shifts" | "reserve"
  selectedDate: Date | null
  onSelectDate: (date: Date) => void
}

const WEEKDAY_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay()
  return day === 0 ? 6 : day - 1
}

function formatMonthYear(date: Date) {
  const months = [
    "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
    "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
  ]
  return `${months[date.getMonth()]} ${date.getFullYear()}`
}

export function MonthCalendar({
  shifts,
  reserves,
  activeTab,
  selectedDate,
  onSelectDate,
}: MonthCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date(2025, 9, 1))

  const daysInMonth = getDaysInMonth(currentMonth.getFullYear(), currentMonth.getMonth())
  const firstDay = getFirstDayOfMonth(currentMonth.getFullYear(), currentMonth.getMonth())

  const shiftDates = useMemo(() => {
    const set = new Set<string>()
    shifts.forEach((s) => set.add(s.date))
    return set
  }, [shifts])

  const reserveDates = useMemo(() => {
    const map = new Map<string, string>()
    reserves.forEach((r) => map.set(r.date, r.status))
    return map
  }, [reserves])

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }

  const days: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) {
    days.push(null)
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(d)
  }

  const isSelected = (day: number) => {
    if (!selectedDate) return false
    return (
      selectedDate.getDate() === day &&
      selectedDate.getMonth() === currentMonth.getMonth() &&
      selectedDate.getFullYear() === currentMonth.getFullYear()
    )
  }

  const getDateString = (day: number) => {
    const m = currentMonth.getMonth() + 1
    const d = day
    return `${currentMonth.getFullYear()}-${m.toString().padStart(2, "0")}-${d.toString().padStart(2, "0")}`
  }

  const hasShift = (day: number) => shiftDates.has(getDateString(day))

  const getReserveStatus = (day: number) => reserveDates.get(getDateString(day))

  return (
    <div className="px-4 py-2">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="p-2 rounded-lg hover:bg-secondary transition-colors"
          aria-label="Предыдущий месяц"
        >
          <ChevronLeft className="h-5 w-5 text-foreground" />
        </button>
        <span className="text-base font-bold text-foreground">
          {formatMonthYear(currentMonth)}
        </span>
        <button
          onClick={nextMonth}
          className="p-2 rounded-lg hover:bg-secondary transition-colors"
          aria-label="Следующий месяц"
        >
          <ChevronRight className="h-5 w-5 text-foreground" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-y-1 mb-1">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="text-center text-xs text-muted-foreground font-medium py-1">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {days.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} />
          }

          const selected = isSelected(day)
          const hasShiftDay = activeTab === "shifts" && hasShift(day)
          const reserveStatus = activeTab === "reserve" ? getReserveStatus(day) : undefined

          return (
            <button
              key={day}
              onClick={() =>
                onSelectDate(
                  new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
                )
              }
              className={cn(
                "relative flex flex-col items-center justify-center h-11 rounded-xl text-sm font-medium transition-colors",
                selected
                  ? "bg-primary text-primary-foreground font-bold"
                  : "text-foreground hover:bg-secondary"
              )}
            >
              <span>{day}</span>
              {hasShiftDay && !selected && (
                <span className="absolute bottom-0.5 h-1.5 w-1.5 rounded-full bg-primary" />
              )}
              {reserveStatus && !selected && (
                <span
                  className={cn(
                    "absolute bottom-0.5 h-1.5 w-1.5 rounded-full",
                    reserveStatus === "can" && "bg-primary",
                    reserveStatus === "if_needed" && "bg-[#f5c518]",
                    reserveStatus === "cannot" && "bg-destructive"
                  )}
                />
              )}
            </button>
          )
        })}
      </div>

      {activeTab === "reserve" && (
        <div className="flex items-center justify-center gap-5 mt-4 text-xs text-foreground/70">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-primary" />
            <span>Могу</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#f5c518]" />
            <span>При необходимости</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-destructive" />
            <span>Не могу</span>
          </div>
        </div>
      )}
    </div>
  )
}
