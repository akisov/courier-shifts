"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { WORKPLACES } from "@/lib/types"
import {
  Clock, MapPin, LogOut, Users, ChevronLeft, ChevronRight,
  Pencil, Check, X as XIcon, UserPlus, Eye, EyeOff,
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
  date_to?: string
  time_from: string
  time_to: string
  status: string
  location: string
  confirmed?: boolean
  comment?: string
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
  vacation: "Отпуск",
  sick_leave: "Больничный",
}
const statusColors: Record<string, string> = {
  can: "bg-primary/10 text-primary",
  if_needed: "bg-[#f5c518]/10 text-[#b8940e]",
  cannot: "bg-destructive/10 text-destructive",
  vacation: "bg-blue-500/10 text-blue-600",
  sick_leave: "bg-orange-500/10 text-orange-600",
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

  // Create courier
  const [showCreateCourier, setShowCreateCourier] = useState(false)
  const [newEmail, setNewEmail] = useState("")
  const [newName, setNewName] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Confirming reserves
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

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

  const handleCreateCourier = async () => {
    if (!newEmail || !newPassword) return
    setCreating(true)
    setCreateError(null)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setCreating(false); return }

    const res = await fetch("/api/create-courier", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ email: newEmail, name: newName, password: newPassword }),
    })

    const json = await res.json()
    if (!res.ok) {
      setCreateError(json.error || "Ошибка при создании")
      setCreating(false)
      return
    }

    setProfiles(prev => [...prev, json])
    setShowCreateCourier(false)
    setNewEmail("")
    setNewName("")
    setNewPassword("")
    setCreating(false)
  }

  const confirmReserve = async (reserve: AdminReserve) => {
    setConfirmingId(reserve.id)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setConfirmingId(null); return }

    await supabase.from("planned_shifts").insert({
      user_id: reserve.user_id,
      date: reserve.date,
      time_from: reserve.time_from,
      time_to: reserve.time_to,
      workplace_id: null,
      repeat: false,
      confirmed_by_admin: true,
    })

    await supabase.from("planned_reserves").update({
      confirmed: true,
      confirmed_by: user.id,
      confirmed_at: new Date().toISOString(),
    }).eq("id", reserve.id)

    setReserves(prev => prev.map(r => r.id === reserve.id ? { ...r, confirmed: true } : r))
    setConfirmingId(null)
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
      <div className="px-4 pb-3">
        <div className="flex w-full rounded-xl bg-secondary p-1 gap-1">
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
                "flex-1 py-2 rounded-lg text-xs font-semibold transition-colors outline-none",
                activeTab === tab.key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-foreground/60"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
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
                <div className="mb-4 rounded-2xl border border-border overflow-hidden bg-background">
                  <div className="px-4 py-3 border-b border-border">
                    <h3 className="text-sm font-bold text-foreground">Выходы</h3>
                  </div>
                  {selectedShifts.map((shift, idx) => {
                    const wp = WORKPLACES.find(w => w.id === shift.workplace_id)
                    return (
                      <div key={shift.id} className={cn("flex items-center justify-between px-4 py-3", idx > 0 && "border-t border-border")}>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-foreground">
                              {getCourierName(shift.user_id)}
                            </span>
                            <span className="flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                              <Clock className="h-3 w-3" />
                              {calcDuration(shift.time_from, shift.time_to)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {shift.time_from} — {shift.time_to}{wp && ` · ${wp.address}`}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {selectedReserves.length > 0 && (
                <div className="rounded-2xl border border-border overflow-hidden bg-background">
                  <div className="px-4 py-3 border-b border-border">
                    <h3 className="text-sm font-bold text-foreground">Резервы</h3>
                  </div>
                  {selectedReserves.map((reserve, idx) => {
                    const isAbsence = reserve.status === "vacation" || reserve.status === "sick_leave"
                    return (
                      <div key={reserve.id} className={cn("px-4 py-3", idx > 0 && "border-t border-border")}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-foreground">
                            {getCourierName(reserve.user_id)}
                          </span>
                          <span className={cn("text-xs px-2 py-0.5 rounded-md font-medium", statusColors[reserve.status] || "")}>
                            {statusLabels[reserve.status] || reserve.status}
                          </span>
                        </div>
                        {isAbsence ? (
                          reserve.date_to && (
                            <p className="text-xs text-muted-foreground">до {formatDateHeader(reserve.date_to)}</p>
                          )
                        ) : (
                          <>
                            <p className="text-xs text-muted-foreground">
                              {reserve.time_from} — {reserve.time_to} · {locationLabels[reserve.location] || reserve.location}
                            </p>
                            {reserve.comment && (
                              <p className="text-xs text-muted-foreground mt-0.5 italic">{reserve.comment}</p>
                            )}
                            <div className="mt-2">
                              {reserve.confirmed ? (
                                <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-lg">✓ Назначен</span>
                              ) : reserve.status !== "cannot" && (
                                <button
                                  onClick={() => confirmReserve(reserve)}
                                  disabled={confirmingId === reserve.id}
                                  className="text-xs font-semibold text-primary-foreground bg-primary px-3 py-1.5 rounded-lg disabled:opacity-60 transition-opacity"
                                >
                                  {confirmingId === reserve.id ? "..." : "Назначить"}
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    )
                  })}
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
          ) : (
            <div className="rounded-2xl border border-border overflow-hidden bg-background">
              <div className="px-4 py-4 border-b border-border">
                <h3 className="text-base font-bold text-foreground">Выходы</h3>
              </div>
              {shiftDates.map((date, dateIdx) => (
                <div key={date} className={dateIdx > 0 ? "border-t border-border" : ""}>
                  <p className="px-4 pt-3 pb-1 text-base font-bold text-foreground">{formatDateHeader(date)}</p>
                  {shiftsByDate[date].map(shift => {
                    const wp = WORKPLACES.find(w => w.id === shift.workplace_id)
                    return (
                      <div key={shift.id} className="flex items-center justify-between px-4 py-3 border-t border-border">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-foreground">
                              {getCourierName(shift.user_id)}
                            </span>
                            <span className="flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                              <Clock className="h-3 w-3" />
                              {calcDuration(shift.time_from, shift.time_to)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {shift.time_from} — {shift.time_to}{wp && ` · ${wp.address}`}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── RESERVES TAB ── */}
      {activeTab === "reserve" && (
        <div className="flex-1 overflow-y-auto px-4 pb-10">
          {reserveDates.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-10">
              Нет резервов в {MONTH_NAMES[currentMonth.getMonth()].toLowerCase()}
            </p>
          ) : (
            <div className="rounded-2xl border border-border overflow-hidden bg-background">
              <div className="px-4 py-4 border-b border-border">
                <h3 className="text-base font-bold text-foreground">Резервы</h3>
              </div>
              {reserveDates.map((date, dateIdx) => (
                <div key={date} className={dateIdx > 0 ? "border-t border-border" : ""}>
                  <p className="px-4 pt-3 pb-1 text-base font-bold text-foreground">{formatDateHeader(date)}</p>
                  {reservesByDate[date].map(reserve => {
                    const isAbsence = reserve.status === "vacation" || reserve.status === "sick_leave"
                    return (
                      <div key={reserve.id} className="flex items-center justify-between px-4 py-3 border-t border-border">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-foreground">
                              {getCourierName(reserve.user_id)}
                            </span>
                            <span className={cn("text-xs px-2 py-0.5 rounded-full font-semibold", statusColors[reserve.status] || "")}>
                              {statusLabels[reserve.status] || reserve.status}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {isAbsence
                              ? reserve.date_to ? `до ${formatDateHeader(reserve.date_to)}` : ""
                              : `${reserve.time_from} — ${reserve.time_to} · ${locationLabels[reserve.location] || reserve.location}`
                            }
                          </p>
                          {reserve.comment && (
                            <p className="text-xs text-muted-foreground mt-0.5 italic">{reserve.comment}</p>
                          )}
                        </div>
                        {!isAbsence && (
                          <div className="ml-3 shrink-0">
                            {reserve.confirmed ? (
                              <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-lg">
                                ✓ Назначен
                              </span>
                            ) : reserve.status !== "cannot" && (
                              <button
                                onClick={() => confirmReserve(reserve)}
                                disabled={confirmingId === reserve.id}
                                className="text-xs font-semibold text-primary-foreground bg-primary px-3 py-1.5 rounded-lg disabled:opacity-60 transition-opacity outline-none"
                              >
                                {confirmingId === reserve.id ? "..." : "Назначить"}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── COURIERS TAB ── */}
      {activeTab === "couriers" && (
        <div className="flex-1 overflow-y-auto px-4 pb-10">
          {couriers.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-6">Нет курьеров</p>
          ) : (
            <div className="rounded-2xl border border-border overflow-hidden bg-background mb-4">
              <div className="px-4 py-4 border-b border-border">
                <h3 className="text-base font-bold text-foreground">Курьеры</h3>
              </div>
              {couriers.map((courier, idx) => (
                <div key={courier.id} className={cn("px-4 py-3", idx > 0 && "border-t border-border")}>
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
                        className="h-9 w-9 flex items-center justify-center rounded-xl bg-secondary text-foreground shrink-0"
                      >
                        <XIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">
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
                        className="h-9 w-9 flex items-center justify-center rounded-xl bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => { setShowCreateCourier(true); setCreateError(null) }}
            className="w-full rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Добавить курьера
          </button>
        </div>
      )}

      {/* ── CREATE COURIER MODAL ── */}
      {showCreateCourier && (
        <div className="fixed inset-0 z-40 flex items-end justify-center">
          <div className="absolute inset-0 bg-foreground/50" onClick={() => setShowCreateCourier(false)} />
          <div className="relative w-full max-w-md bg-background rounded-t-2xl shadow-2xl animate-in slide-in-from-bottom duration-300">
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-border" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-4 pt-1">
              <h2 className="text-xl font-bold text-foreground">Новый курьер</h2>
              <button onClick={() => setShowCreateCourier(false)} className="p-1 text-foreground hover:text-muted-foreground">
                <XIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Fields */}
            <div className="px-5 pb-2 flex flex-col gap-4">
              <div>
                <label className="text-sm font-semibold text-foreground block mb-1.5">Имя (Фамилия Имя)</label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Иванов Иван"
                  className="w-full bg-secondary rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-foreground block mb-1.5">Email</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="courier@example.com"
                  autoCapitalize="none"
                  className="w-full bg-secondary rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-foreground block mb-1.5">Пароль</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Минимум 6 символов"
                    onKeyDown={e => { if (e.key === "Enter") handleCreateCourier() }}
                    className="w-full bg-secondary rounded-xl px-4 py-3 pr-11 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground outline-none"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {createError && (
                <p className="text-sm text-destructive">{createError}</p>
              )}
            </div>

            {/* Button */}
            <div className="px-5 pb-8 pt-4">
              <button
                onClick={handleCreateCourier}
                disabled={creating || !newEmail || !newPassword}
                className={cn(
                  "w-full rounded-xl py-3.5 text-sm font-semibold transition-all",
                  !creating && newEmail && newPassword
                    ? "bg-primary text-primary-foreground active:scale-[0.98]"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {creating ? "Создание..." : "Создать курьера"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
