"use client"

import { useState } from "react"
import { X, CalendarDays } from "lucide-react"
import { cn } from "@/lib/utils"
import { WORKPLACES } from "@/lib/types"
import { TimeSelector } from "./time-selector"
import { DayOfWeekPicker } from "./day-of-week-picker"
import { DatePickerModal } from "./date-picker-modal"

interface PlanShiftModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: {
    date: string
    timeFrom: string
    timeTo: string
    workplaceId: string
    repeat: boolean
    repeatDays: number[]
  }) => void
}

function formatDate(date: Date | null) {
  if (!date) return ""
  const d = date.getDate().toString().padStart(2, "0")
  const m = (date.getMonth() + 1).toString().padStart(2, "0")
  const y = date.getFullYear().toString().slice(-2)
  return `${d}.${m}.${y}`
}

function toISODate(date: Date) {
  const y = date.getFullYear()
  const m = (date.getMonth() + 1).toString().padStart(2, "0")
  const d = date.getDate().toString().padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function PlanShiftModal({ isOpen, onClose, onSubmit }: PlanShiftModalProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [timeFrom, setTimeFrom] = useState("")
  const [timeTo, setTimeTo] = useState("")
  const [repeat, setRepeat] = useState(false)
  const [repeatDays, setRepeatDays] = useState<number[]>([])
  const [selectedWorkplace, setSelectedWorkplace] = useState("")
  const [showDatePicker, setShowDatePicker] = useState(false)

  if (!isOpen) return null

  const isValid = selectedDate && timeFrom && timeTo && selectedWorkplace

  const handleSubmit = () => {
    if (!isValid) return
    onSubmit({
      date: toISODate(selectedDate),
      timeFrom,
      timeTo,
      workplaceId: selectedWorkplace,
      repeat,
      repeatDays,
    })
    resetForm()
    onClose()
  }

  const resetForm = () => {
    setSelectedDate(null)
    setTimeFrom("")
    setTimeTo("")
    setRepeat(false)
    setRepeatDays([])
    setSelectedWorkplace("")
  }

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-end justify-center">
        <div className="absolute inset-0 bg-foreground/50" onClick={() => { resetForm(); onClose() }} />
        <div className="relative w-full max-w-md bg-background rounded-t-2xl shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[90vh] flex flex-col">
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="h-1 w-10 rounded-full bg-border" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 pb-4 pt-1">
            <h2 className="text-xl font-bold text-foreground">Запланировать выход</h2>
            <button onClick={() => { resetForm(); onClose() }} className="p-1 text-foreground hover:text-muted-foreground" aria-label="Закрыть">
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-5 pb-4">
            {/* Date */}
            <div className="mb-5">
              <label className="text-base font-bold text-foreground block mb-2">Дата</label>
              <button
                type="button"
                onClick={() => setShowDatePicker(true)}
                className={cn(
                  "flex w-full flex-col rounded-xl bg-secondary px-4 py-3 text-sm transition-colors text-left",
                )}
              >
                <span className="text-xs text-muted-foreground mb-0.5">Выберите дату</span>
                {selectedDate && <span className="text-foreground font-medium">{formatDate(selectedDate)}</span>}
              </button>
            </div>

            {/* Time */}
            <div className="mb-5">
              <label className="text-base font-bold text-foreground block mb-2">Время работы</label>
              <div className="flex gap-3">
                <TimeSelector label="С" value={timeFrom} onChange={setTimeFrom} placeholder="С" />
                <TimeSelector label="По" value={timeTo} onChange={setTimeTo} placeholder="По" />
              </div>
            </div>

            {/* Repeat toggle */}
            <div className="mb-5">
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-foreground">Повторять выход</span>
                <button
                  type="button"
                  onClick={() => setRepeat(!repeat)}
                  className={cn(
                    "relative h-7 w-12 rounded-full transition-colors",
                    repeat ? "bg-primary" : "bg-border"
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-background shadow transition-transform",
                      repeat && "translate-x-5"
                    )}
                  />
                </button>
              </div>
              {repeat && <DayOfWeekPicker selectedDays={repeatDays} onChange={setRepeatDays} />}
            </div>

            {/* Workplace */}
            <div className="mb-4">
              <label className="text-base font-bold text-foreground block mb-2">Где буду работать</label>
              <div className="flex flex-col rounded-xl overflow-hidden border border-border">
                {WORKPLACES.map((wp, idx) => (
                  <button
                    key={wp.id}
                    type="button"
                    onClick={() => setSelectedWorkplace(wp.id)}
                    className={cn(
                      "flex items-center gap-3 p-3.5 transition-all text-left",
                      idx > 0 && "border-t border-border",
                      selectedWorkplace === wp.id ? "bg-primary/5" : "bg-background"
                    )}
                  >
                    <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                      <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{wp.code}</p>
                      <p className="text-xs text-muted-foreground truncate">{wp.address}</p>
                    </div>
                    <div
                      className={cn(
                        "h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0",
                        selectedWorkplace === wp.id
                          ? "border-primary"
                          : "border-border"
                      )}
                    >
                      {selectedWorkplace === wp.id && (
                        <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Submit button */}
          <div className="px-5 pb-6 pt-2">
            <button
              onClick={handleSubmit}
              disabled={!isValid}
              className={cn(
                "w-full rounded-xl py-3.5 text-sm font-semibold transition-all",
                isValid
                  ? "bg-primary text-primary-foreground active:scale-[0.98]"
                  : "bg-muted text-muted-foreground"
              )}
            >
              Запланировать
            </button>
          </div>
        </div>
      </div>

      <DatePickerModal
        isOpen={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onSelect={(date) => setSelectedDate(date)}
        selectedDate={selectedDate}
      />
    </>
  )
}
