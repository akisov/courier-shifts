"use client"

import { Clock, MapPin, Pencil } from "lucide-react"
import type { ShiftEntry } from "@/lib/types"

interface ShiftListProps {
  shifts: ShiftEntry[]
}

function formatDateHeader(dateStr: string) {
  const date = new Date(dateStr + "T00:00:00")
  const day = date.getDate()
  const months = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"]
  const weekdays = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"]
  return `${day} ${months[date.getMonth()]}, ${weekdays[date.getDay()]}`
}

export function ShiftList({ shifts }: ShiftListProps) {
  const grouped = shifts.reduce<Record<string, ShiftEntry[]>>((acc, shift) => {
    if (!acc[shift.date]) acc[shift.date] = []
    acc[shift.date].push(shift)
    return acc
  }, {})

  const sortedDates = Object.keys(grouped).sort()

  if (sortedDates.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-muted-foreground text-sm">
        Нет запланированных выходов
      </div>
    )
  }

  return (
    <div className="px-4 pb-24">
      <h3 className="text-sm font-semibold text-foreground mb-3">Мои выходы</h3>
      {sortedDates.map((date) => (
        <div key={date} className="mb-4">
          <p className="text-xs font-semibold text-foreground mb-2">
            {formatDateHeader(date)}
          </p>
          <div className="flex flex-col gap-2">
            {grouped[date].map((shift, idx) => (
              <div
                key={shift.id}
                className="flex items-start justify-between bg-secondary rounded-xl p-3"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-sm text-foreground font-medium">
                    <span>
                      {idx + 1}. {shift.timeFrom} - {shift.timeTo}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-primary">
                      <Clock className="h-3 w-3" />
                      {shift.duration}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {shift.address}
                  </div>
                </div>
                <button className="p-1.5 text-muted-foreground hover:text-foreground" aria-label="Редактировать">
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
