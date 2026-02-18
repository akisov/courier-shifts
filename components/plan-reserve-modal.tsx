"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ShiftStatus, LocationType } from "@/lib/types"
import { TimeSelector } from "./time-selector"
import { DayOfWeekPicker } from "./day-of-week-picker"
import { DatePickerModal } from "./date-picker-modal"

interface PlanReserveModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: {
    date: string
    timeFrom: string
    timeTo: string
    status: ShiftStatus
    location: LocationType
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

const STATUS_OPTIONS: { value: ShiftStatus; label: string }[] = [
  { value: "can", label: "Могу" },
  { value: "if_needed", label: "При необходимости" },
  { value: "cannot", label: "Не могу" },
]

const LOCATION_OPTIONS: { value: LocationType; label: string }[] = [
  { value: "own_points", label: "Только в своих точках" },
  { value: "whole_city", label: "По всему городу" },
]

export function PlanReserveModal({ isOpen, onClose, onSubmit }: PlanReserveModalProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [timeFrom, setTimeFrom] = useState("")
  const [timeTo, setTimeTo] = useState("")
  const [status, setStatus] = useState<ShiftStatus | null>(null)
  const [location, setLocation] = useState<LocationType | null>(null)
  const [repeat, setRepeat] = useState(false)
  const [repeatDays, setRepeatDays] = useState<number[]>([])
  const [showDatePicker, setShowDatePicker] = useState(false)

  if (!isOpen) return null

  const isValid = selectedDate && timeFrom && timeTo && status && location

  const handleSubmit = () => {
    if (!isValid) return
    onSubmit({
      date: toISODate(selectedDate),
      timeFrom,
      timeTo,
      status,
      location,
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
    setStatus(null)
    setLocation(null)
    setRepeat(false)
    setRepeatDays([])
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
            <h2 className="text-xl font-bold text-foreground">Запланировать резерв</h2>
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
                className="flex w-full flex-col rounded-xl bg-secondary px-4 py-3 text-sm transition-colors text-left"
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

            {/* Status */}
            <div className="mb-5">
              <label className="text-base font-bold text-foreground block mb-2">Статус</label>
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setStatus(option.value)}
                    className={cn(
                      "rounded-lg border px-4 py-2.5 text-sm font-medium transition-all",
                      status === option.value
                        ? option.value === "can"
                          ? "border-primary bg-primary/10 text-primary"
                          : option.value === "if_needed"
                            ? "border-[#f5c518] bg-[#f5c518]/10 text-[#b8940e]"
                            : "border-destructive bg-destructive/10 text-destructive"
                        : "border-border bg-background text-foreground hover:bg-secondary"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Location */}
            <div className="mb-5">
              <label className="text-base font-bold text-foreground block mb-2">Локация</label>
              <div className="flex flex-wrap gap-2">
                {LOCATION_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setLocation(option.value)}
                    className={cn(
                      "rounded-lg border px-4 py-2.5 text-sm font-medium transition-all",
                      location === option.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-foreground hover:bg-secondary"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Repeat toggle */}
            <div className="mb-4">
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-foreground">Повторять резерв</span>
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
