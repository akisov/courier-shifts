"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { WORKPLACES } from "@/lib/types"
import {
  Clock, MapPin, LogOut, Users, ChevronLeft, ChevronRight,
  ChevronDown, ChevronUp, Pencil, Check, X as XIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Profile {
  id: string
  name: string | null
  email: string | null
  role: string
}

interface AdminShift {
  id: string
  user_id: string
  date: string
  time_from: string
  time_to: string
  workplace_id: string
}

interface AdminReserve {
  id: string
  user_id: string
  date: string
  time_from: string
  time_to: string
  status: string
  location: string
}

const MONTH_NAMES = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
]
const WEEKDAY_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]
const monthsShort = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"]
const weekdaysShort = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"]

const statusLabels: Record<string, string> = {
  can: "Могу",
  if_needed: "При необходимости",
  cannot: "Не могу",
}
const statusColors: Record<string, string> = {
  can: "bg-primary/10 text-primary",
  if_needed: "bg-[#f5c518]/10 text-[#b8940e]",
  cannot: "bg-destructive/10 text-destructive",
}
const locationLabels: Record<string, string> = {
  own_points: "Только в своих точках",
  whole_city: "По всему городу",
}

function formatDateHeader(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00")
  return `${d.getDate()} ${monthsShort[d.getMonth()]}, ${weekdaysShort[d.getDay()]}`
}

function toDateStr(date: Date) {
  const y = date.getFullYear()
  const m = (date.getMonth() + 1).toString().padStart(2, "0")
  const d = date.getDate().toString().padStart(2, "0")
  return `${y}-${m}-${d}`
}

function calcDuration(from: string, to: string): string {
  const [fh, fm] = from.split(":").map(Number)
  const [th, tm] = to.split(":").map(Number)
  let mins = (th * 60 + tm) - (fh * 60 + fm)
  if (mins < 0) mins += 24 * 60
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}ч ${m}м` : `${h}ч`
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay()
  return day === 0 ? 6 : day - 1
}

function DateBlock({ date, children }: { date: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="mb-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-2"
      >
        <span className="text-base font-bold text-foreground">{formatDateHeader(date)}</span>
        {open
          ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
          : <ChevronDown className="h-4 w-4 text-muted-foreground" />
        }
      </button>
      {open && <div className="flex flex-col gap-2">{children}</div>}
    </div>
  )
}

type Tab = "calendar" | "shifts" | "reserve" | "couriers"

export default function AdminPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>("calendar")
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [shifts, setShifts] = useState<AdminShift[]>([])
  const [reserves, setReserves] = useState<AdminReserve[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Calendar
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  // Courier name editing
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function init() {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace("/login"); return }

      const { data: myProfile } = await supabase
        .from("profiles").select("role").eq("id", user.id).single()
      if (!myProfile || myProfile.role !== "admin") { router.replace("/"); return }

      const [profilesRes, shiftsRes, reservesRes] = await Promise.all([
        supabase.from("profiles").select("id, name, email, role").order("name"),
        supabase.from("planned_shifts").select("*").order("date"),
        supabase.from("planned_reserves").select("*").order("date"),
      ])

      if (profilesRes.error) {
        setError("Ошибка загрузки. Убедитесь, что выполнили SQL в Supabase.")
        setLoading(false)
        return
      }

      setProfiles(profilesRes.data || [])
      setShifts(shiftsRes.data || [])
      setReserves(reservesRes.data || [])
      setLoading(false)
    }
    init()
  }, [router])

  const getCourierName = useCallback((userId: string) => {
    const p = profiles.find(p => p.id === userId)
    if (p?.name) return p.name
    if (p?.email) return p.email.split("@")[0]
    return "Курьер"
  }, [profiles])

  // Calendar derived data
  const shiftCountByDate = useMemo(() => {
    const map = new Map<string, number>()
    shifts.forEach(s => map.set(s.date, (map.get(s.date) || 0) + 1))
    return map
  }, [shifts])

  const reserveStatusesByDate = useMemo(() => {
    const map = new Map<string, Set<string>>()
    reserves.forEach(r => {
      if (!map.has(r.date)) map.set(r.date, new Set())
      map.get(r.date)!.add(r.status)
    })
    return map
  }, [reserves])

  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(currentMonth.getFullYear(), currentMonth.getMonth())
    const firstDay = getFirstDayOfMonth(currentMonth.getFullYear(), currentMonth.getMonth())
    const days: (number | null)[] = []
    for (let i = 0; i < firstDay; i++) days.push(null)
    for (let d = 1; d <= daysInMonth; d++) days.push(d)
    return days
  }, [currentMonth])

  const getCalendarDateStr = (day: number) => {
    const m = (currentMonth.getMonth() + 1).toString().padStart(2, "0")
    const d = day.toString().padStart(2, "0")
    return `${currentMonth.getFullYear()}-${m}-${d}`
  }

  const isSelectedDay = (day: number) =>
    !!selectedDate &&
    selectedDate.getDate() === day &&
    selectedDate.getMonth() === currentMonth.getMonth() &&
    selectedDate.getFullYear() === currentMonth.getFullYear()

  const selectedDateStr = selectedDate ? toDateStr(selectedDate) : null
  const selectedShifts = selectedDateStr ? shifts.filter(s => s.date === selectedDateStr) : []
  const selectedReserves = selectedDateStr ? reserves.filter(r => r.date === selectedDateStr) : []

  // Month prefix for filtering
  const monthPrefix = `${currentMonth.getFullYear()}-${(currentMonth.getMonth() + 1).toString().padStart(2, "0")}`

  // Filtered by current month
  const monthShifts = useMemo(() => shifts.filter(s => s.date.startsWith(monthPrefix)), [shifts, monthPrefix])
  const monthReserves = useMemo(() => reserves.filter(r => r.date.startsWith(monthPrefix)), [reserves, monthPrefix])

  // List data (filtered by month)
  const shiftsByDate = useMemo(() => monthShifts.reduce<Record<string, AdminShift[]>>((acc, s) => {
    if (!acc[s.date]) acc[s.date] = []
    acc[s.date].push(s)
    return acc
  }, {}), [monthShifts])

  const reservesByDate = useMemo(() => monthReserves.reduce<Record<string, AdminReserve[]>>((acc, r) => {
    if (!acc[r.date]) acc[r.date] = []
    acc[r.date].push(r)
    return acc
  }, {}), [monthReserves])

  const shiftDates = Object.keys(shiftsByDate).sort()
  const reserveDates = Object.keys(reservesByDate).sort()
  const couriers = profiles.filter(p => p.role !== "admin")

  // Save courier name
  const handleSaveName = async () => {
    if (!editingId) return
    setSaving(true)
    const { error } = await supabase
      .from("profiles")
      .update({ name: editName.trim() })
      .eq("id", editingId)
    if (!error) {
      setProfiles(prev => prev.map(p =>
        p.id === editingId ? { ...p, name: editName.trim() } : p
      ))
      setEditingId(null)
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Загрузка...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-dvh bg-background flex flex-col items-center justify-center gap-4 px-6">
        <p className="text-destructive text-sm text-center">{error}</p>
        <button onClick={() => router.replace("/")} className="text-sm text-primary underline">
          На главную
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-background flex flex-col max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold text-foreground">Панель куратора</h1>
        </div>
        <button
          onClick={async () => { await supabase.auth.signOut(); router.replace("/login") }}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Выйти
        </button>
      </div>

      {/* Month navigation — global for all tabs */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <button
          onClick={() => { setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)); setSelectedDate(null) }}
          className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
        >
          <ChevronLeft className="h-5 w-5 text-foreground" />
        </button>
        <span className="text-base font-bold text-foreground">
          {MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </span>
        <button
          onClick={() => { setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)); setSelectedDate(null) }}
          className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
        >
          <ChevronRight className="h-5 w-5 text-foreground" />
        </button>
      </div>

      {/* Stats — filtered by current month */}
      <div className="flex gap-3 px-4 pt-2 pb-3">
        <div className="flex-1 bg-primary/10 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-primary">{couriers.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Курьеров</p>
        </div>
        <div className="flex-1 bg-secondary rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-foreground">{monthShifts.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Выходов</p>
        </div>
        <div className="flex-1 bg-secondary rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-foreground">{monthReserves.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Резервов</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 px-4 pb-3">
        {([
          { key: "calendar", label: "Календарь" },
          { key: "shifts",   label: "Выходы" },
          { key: "reserve",  label: "Резервы" },
          { key: "couriers", label: "Курьеры" },
        ] as { key: Tab; label: string }[]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex-1 py-2 rounded-xl text-xs font-semibold transition-colors",
              activeTab === tab.key
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="h-px bg-border mx-4 mb-3" />

      {/* ── CALENDAR TAB ── */}
      {activeTab === "calendar" && (
        <div className="flex-1 overflow-y-auto px-4 pb-10">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAY_LABELS.map(l => (
              <div key={l} className="text-center text-xs text-muted-foreground font-medium py-1">
                {l}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-y-1">
            {calendarDays.map((day, idx) => {
              if (day === null) return <div key={`e-${idx}`} />
              const dateStr = getCalendarDateStr(day)
              const count = shiftCountByDate.get(dateStr) || 0
              const statuses = reserveStatusesByDate.get(dateStr)
              const selected = isSelectedDay(day)
              const hasData = count > 0 || !!statuses

              return (
                <button
                  key={day}
                  onClick={() =>
                    setSelectedDate(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day))
                  }
                  className={cn(
                    "relative flex flex-col items-center justify-center h-12 rounded-xl text-sm font-medium transition-colors border",
                    selected
                      ? "bg-primary text-primary-foreground font-bold border-transparent"
                      : hasData
                        ? "bg-secondary border-transparent"
                        : "text-foreground hover:bg-secondary border-transparent"
                  )}
                >
                  <span>{day}</span>

                  {/* Shift count badge */}
                  {count > 0 && !selected && (
                    <span className="absolute top-0.5 right-0.5 h-4 min-w-4 px-0.5 text-[9px] font-bold bg-primary text-primary-foreground rounded-full flex items-center justify-center">
                      {count}
                    </span>
                  )}

                  {/* Reserve status dots */}
                  {statuses && !selected && (
                    <div className="absolute bottom-0.5 flex gap-0.5">
                      {statuses.has("can") && (
                        <span className="h-1 w-1 rounded-full bg-primary" />
                      )}
                      {statuses.has("if_needed") && (
                        <span className="h-1 w-1 rounded-full bg-[#f5c518]" />
                      )}
                      {statuses.has("cannot") && (
                        <span className="h-1 w-1 rounded-full bg-destructive" />
                      )}
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-5 mt-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className="h-4 w-4 text-[9px] font-bold bg-primary text-primary-foreground rounded-full flex items-center justify-center">
                N
              </span>
              <span>кол-во выходов</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary" />
              <span className="h-2 w-2 rounded-full bg-[#f5c518]" />
              <span className="h-2 w-2 rounded-full bg-destructive" />
              <span>резервы</span>
            </div>
          </div>

          {/* Selected day details */}
          {selectedDate && (
            <div className="mt-5">
              <h3 className="text-base font-bold text-foreground mb-3">
                {formatDateHeader(toDateStr(selectedDate))}
              </h3>

              {selectedShifts.length === 0 && selectedReserves.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Нет записей на этот день
                </p>
              )}

              {selectedShifts.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Выходы
                  </p>
                  <div className="flex flex-col gap-2">
                    {selectedShifts.map(shift => {
                      const wp = WORKPLACES.find(w => w.id === shift.workplace_id)
                      return (
                        <div key={shift.id} className="bg-secondary rounded-xl p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-semibold text-foreground">
                              {getCourierName(shift.user_id)}
                            </span>
                            <span className="flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                              <Clock className="h-3 w-3" />
                              {calcDuration(shift.time_from, shift.time_to)}
                            </span>
                          </div>
                          <p className="text-sm text-foreground">
                            {shift.time_from} — {shift.time_to}
                          </p>
                          {wp && (
                            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              {wp.address}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {selectedReserves.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Резервы
                  </p>
                  <div className="flex flex-col gap-2">
                    {selectedReserves.map(reserve => (
                      <div key={reserve.id} className="bg-secondary rounded-xl p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold text-foreground">
                            {getCourierName(reserve.user_id)}
                          </span>
                          <span className={cn("text-xs px-2 py-0.5 rounded-md font-medium", statusColors[reserve.status] || "")}>
                            {statusLabels[reserve.status] || reserve.status}
                          </span>
                        </div>
                        <p className="text-sm text-foreground">
                          {reserve.time_from} — {reserve.time_to}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {locationLabels[reserve.location] || reserve.location}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── SHIFTS TAB ── */}
      {activeTab === "shifts" && (
        <div className="flex-1 overflow-y-auto px-4 pb-10">
          {shiftDates.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-10">
              Нет выходов в {MONTH_NAMES[currentMonth.getMonth()].toLowerCase()}
            </p>
          ) : shiftDates.map(date => (
            <DateBlock key={date} date={date}>
              {shiftsByDate[date].map(shift => {
                const wp = WORKPLACES.find(w => w.id === shift.workplace_id)
                return (
                  <div key={shift.id} className="bg-secondary rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-foreground">
                        {getCourierName(shift.user_id)}
                      </span>
                      <span className="flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                        <Clock className="h-3 w-3" />
                        {calcDuration(shift.time_from, shift.time_to)}
                      </span>
                    </div>
                    <p className="text-sm text-foreground">{shift.time_from} — {shift.time_to}</p>
                    {wp && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {wp.address}
                      </div>
                    )}
                  </div>
                )
              })}
            </DateBlock>
          ))}
        </div>
      )}

      {/* ── RESERVES TAB ── */}
      {activeTab === "reserve" && (
        <div className="flex-1 overflow-y-auto px-4 pb-10">
          {reserveDates.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-10">
              Нет резервов в {MONTH_NAMES[currentMonth.getMonth()].toLowerCase()}
            </p>
          ) : reserveDates.map(date => (
            <DateBlock key={date} date={date}>
              {reservesByDate[date].map(reserve => (
                <div key={reserve.id} className="bg-secondary rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-foreground">
                      {getCourierName(reserve.user_id)}
                    </span>
                    <span className={cn("text-xs px-2 py-0.5 rounded-md font-medium", statusColors[reserve.status] || "")}>
                      {statusLabels[reserve.status] || reserve.status}
                    </span>
                  </div>
                  <p className="text-sm text-foreground">{reserve.time_from} — {reserve.time_to}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {locationLabels[reserve.location] || reserve.location}
                  </p>
                </div>
              ))}
            </DateBlock>
          ))}
        </div>
      )}

      {/* ── COURIERS TAB ── */}
      {activeTab === "couriers" && (
        <div className="flex-1 overflow-y-auto px-4 pb-10">
          <p className="text-xs text-muted-foreground mb-4">
            Нажмите ✏️ чтобы задать имя курьеру (Фамилия Имя)
          </p>
          {couriers.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-10">Нет курьеров</p>
          ) : (
            <div className="flex flex-col gap-2">
              {couriers.map(courier => (
                <div key={courier.id} className="bg-secondary rounded-xl p-3">
                  {editingId === courier.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        placeholder="Иванов Иван"
                        autoFocus
                        onKeyDown={e => { if (e.key === "Enter") handleSaveName() }}
                        className="flex-1 bg-background rounded-lg px-3 py-2 text-sm text-foreground border border-border outline-none focus:border-primary"
                      />
                      <button
                        onClick={handleSaveName}
                        disabled={saving}
                        className="h-9 w-9 flex items-center justify-center rounded-xl bg-primary text-primary-foreground shrink-0"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="h-9 w-9 flex items-center justify-center rounded-xl bg-border text-foreground shrink-0"
                      >
                        <XIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {courier.name
                            ? courier.name
                            : <span className="text-muted-foreground italic font-normal">Без имени</span>
                          }
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">{courier.email}</p>
                      </div>
                      <button
                        onClick={() => {
                          setEditingId(courier.id)
                          setEditName(courier.name || "")
                        }}
                        className="h-9 w-9 flex items-center justify-center rounded-xl bg-background text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
