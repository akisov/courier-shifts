"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ShiftStatus, LocationType } from "@/lib/types"
import { TimeSelector } from "./time-selector"
import { DayOfWeekPicker } from "./day-of-week-picker"
import { DatePickerModal } from "./date-picker-modal"

interface EditData {
  id: string
  date: string
  dateTo?: string
  timeFrom: string
  timeTo: string
  status: ShiftStatus
  location: LocationType
  repeat: boolean
  repeatDays?: number[]
  repeatUntil?: string
}

interface PlanReserveModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: {
    date: string
    dateTo?: string
    timeFrom: string
    timeTo: string
    status: ShiftStatus
    location: LocationType
    repeat: boolean
    repeatDays: number[]
    repeatUntil?: string
  }) => void
  editData?: EditData
  onDelete?: (id: string) => void
  initialDate?: Date
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

function parseISODate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number)
  return new Date(y, m - 1, d)
}

const STATUS_OPTIONS: { value: ShiftStatus; label: string; group: "avail" | "absence" }[] = [
  { value: "can",       label: "Могу",               group: "avail" },
  { value: "if_needed", label: "При необходимости",   group: "avail" },
  { value: "cannot",    label: "Не могу",             group: "avail" },
  { value: "vacation",  label: "Отпуск",              group: "absence" },
  { value: "sick_leave",label: "Больничный",          group: "absence" },
]

const LOCATION_OPTIONS: { value: LocationType; label: string }[] = [
  { value: "own_points", label: "Только в своих точках" },
  { value: "whole_city", label: "По всему городу" },
]

function statusActiveClass(value: ShiftStatus) {
  switch (value) {
    case "can":       return "border-primary bg-primary/10 text-primary"
    case "if_needed": return "border-[#f5c518] bg-[#f5c518]/10 text-[#b8940e]"
    case "cannot":    return "border-destructive bg-destructive/10 text-destructive"
    case "vacation":  return "border-blue-500 bg-blue-500/10 text-blue-600"
    case "sick_leave":return "border-orange-500 bg-orange-500/10 text-orange-600"
  }
}

export function PlanReserveModal({ isOpen, onClose, onSubmit, editData, onDelete, initialDate }: PlanReserveModalProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [dateTo, setDateTo] = useState<Date | null>(null)
  const [timeFrom, setTimeFrom] = useState("")
  const [timeTo, setTimeTo] = useState("")
  const [status, setStatus] = useState<ShiftStatus | null>(null)
  const [location, setLocation] = useState<LocationType | null>(null)
  const [repeat, setRepeat] = useState(false)
  const [repeatDays, setRepeatDays] = useState<number[]>([])
  const [repeatUntil, setRepeatUntil] = useState<Date | null>(null)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showDateToPicker, setShowDateToPicker] = useState(false)
  const [showRepeatUntilPicker, setShowRepeatUntilPicker] = useState(false)

  const isEditMode = !!editData
  const isAbsence = status === "vacation" || status === "sick_leave"

  useEffect(() => {
    if (isOpen && editData) {
      setSelectedDate(parseISODate(editData.date))
      setDateTo(editData.dateTo ? parseISODate(editData.dateTo) : null)
      setTimeFrom(editData.timeFrom)
      setTimeTo(editData.timeTo)
      setStatus(editData.status)
      setLocation(editData.location)
      setRepeat(editData.repeat)
      setRepeatDays(editData.repeatDays || [])
      setRepeatUntil(editData.repeatUntil ? parseISODate(editData.repeatUntil) : null)
    } else if (isOpen && initialDate) {
      setSelectedDate(initialDate)
    }
    if (!isOpen) {
      setSelectedDate(null)
      setDateTo(null)
      setTimeFrom("")
      setTimeTo("")
      setStatus(null)
      setLocation(null)
      setRepeat(false)
      setRepeatDays([])
      setRepeatUntil(null)
    }
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null

  const isValid = isAbsence
    ? !!(selectedDate && status)
    : !!(selectedDate && timeFrom && timeTo && status && location)

  const handleSubmit = () => {
    if (!isValid) return
    if (isAbsence) {
      onSubmit({
        date: toISODate(selectedDate!),
        dateTo: dateTo ? toISODate(dateTo) : undefined,
        timeFrom: "00:00",
        timeTo: "23:59",
        status: status!,
        location: "own_points",
        repeat: false,
        repeatDays: [],
      })
    } else {
      onSubmit({
        date: toISODate(selectedDate!),
        timeFrom,
        timeTo,
        status: status!,
        location: location!,
        repeat,
        repeatDays,
        repeatUntil: repeatUntil ? toISODate(repeatUntil) : undefined,
      })
    }
    onClose()
  }

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-end justify-center">
        <div className="absolute inset-0 bg-foreground/50" onClick={onClose} />
        <div className="relative w-full max-w-md bg-background rounded-t-2xl shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[90vh] flex flex-col">
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="h-1 w-10 rounded-full bg-border" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 pb-4 pt-1">
            <h2 className="text-xl font-bold text-foreground">
              {isEditMode ? "Редактировать резерв" : "Запланировать резерв"}
            </h2>
            <button onClick={onClose} className="p-1 text-foreground hover:text-muted-foreground" aria-label="Закрыть">
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-5 pb-4">
            {/* Status — first, so user picks type before seeing date fields */}
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
                        ? statusActiveClass(option.value)
                        : "border-border bg-background text-foreground hover:bg-secondary"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date — single for regular, range for absence */}
            <div className="mb-5">
              <label className="text-base font-bold text-foreground block mb-2">
                {isAbsence ? "Период" : "Дата"}
              </label>
              {isAbsence ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDatePicker(true)}
                    className="flex-1 flex flex-col rounded-xl bg-secondary px-4 py-3 text-sm text-left"
                  >
                    <span className="text-xs text-muted-foreground mb-0.5">С</span>
                    {selectedDate
                      ? <span className="text-foreground font-medium">{formatDate(selectedDate)}</span>
                      : <span className="text-muted-foreground">Не выбрана</span>
                    }
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDateToPicker(true)}
                    className="flex-1 flex flex-col rounded-xl bg-secondary px-4 py-3 text-sm text-left"
                  >
                    <span className="text-xs text-muted-foreground mb-0.5">По</span>
                    {dateTo
                      ? <span className="text-foreground font-medium">{formatDate(dateTo)}</span>
                      : <span className="text-muted-foreground">Не выбрана</span>
                    }
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowDatePicker(true)}
                  className="flex w-full flex-col rounded-xl bg-secondary px-4 py-3 text-sm transition-colors text-left"
                >
                  <span className="text-xs text-muted-foreground mb-0.5">Выберите дату</span>
                  {selectedDate
                    ? <span className="text-foreground font-medium">{formatDate(selectedDate)}</span>
                    : <span className="text-muted-foreground">Не выбрана</span>
                  }
                </button>
              )}
            </div>

            {/* Time — only for regular statuses */}
            {!isAbsence && (
              <div className="mb-5">
                <label className="text-base font-bold text-foreground block mb-2">Время работы</label>
                <div className="flex gap-3">
                  <TimeSelector label="С" value={timeFrom} onChange={setTimeFrom} placeholder="С" />
                  <TimeSelector label="По" value={timeTo} onChange={setTimeTo} placeholder="По" />
                </div>
              </div>
            )}

            {/* Location — only for regular statuses */}
            {!isAbsence && (
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
            )}

            {/* Repeat — only for regular statuses */}
            {!isAbsence && (
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
                {repeat && (
                  <>
                    <DayOfWeekPicker selectedDays={repeatDays} onChange={setRepeatDays} />
                    <div className="mt-3">
                      <label className="text-sm font-semibold text-foreground block mb-2">До какой даты?</label>
                      <button
                        type="button"
                        onClick={() => setShowRepeatUntilPicker(true)}
                        className="flex w-full flex-col rounded-xl bg-secondary px-4 py-3 text-sm transition-colors text-left"
                      >
                        <span className="text-xs text-muted-foreground mb-0.5">Повторять до</span>
                        {repeatUntil
                          ? <span className="text-foreground font-medium">{formatDate(repeatUntil)}</span>
                          : <span className="text-muted-foreground">Не указано</span>
                        }
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="px-5 pb-6 pt-2 flex flex-col gap-2">
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
              {isEditMode ? "Сохранить изменения" : "Запланировать"}
            </button>

            {isEditMode && onDelete && editData && (
              <button
                onClick={() => { onDelete(editData.id); onClose() }}
                className="w-full rounded-xl py-3.5 text-sm font-semibold text-destructive border border-destructive/30 active:scale-[0.98] transition-all"
              >
                Удалить резерв
              </button>
            )}
          </div>
        </div>
      </div>

      <DatePickerModal
        isOpen={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onSelect={(date) => setSelectedDate(date)}
        selectedDate={selectedDate}
      />

      <DatePickerModal
        isOpen={showDateToPicker}
        onClose={() => setShowDateToPicker(false)}
        onSelect={(date) => setDateTo(date)}
        selectedDate={dateTo}
      />

      <DatePickerModal
        isOpen={showRepeatUntilPicker}
        onClose={() => setShowRepeatUntilPicker(false)}
        onSelect={(date) => setRepeatUntil(date)}
        selectedDate={repeatUntil}
      />
    </>
  )
}
