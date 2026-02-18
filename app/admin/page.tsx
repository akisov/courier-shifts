"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { WORKPLACES } from "@/lib/types"
import { Clock, MapPin, LogOut, Users, CalendarDays, ChevronDown, ChevronUp } from "lucide-react"
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

const months = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"]
const weekdays = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"]

function formatDateHeader(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00")
  return `${d.getDate()} ${months[d.getMonth()]}, ${weekdays[d.getDay()]}`
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

function DateBlock({
  date,
  children,
}: {
  date: string
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(true)
  return (
    <div className="mb-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-2"
      >
        <span className="text-base font-bold text-foreground">{formatDateHeader(date)}</span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {open && <div className="flex flex-col gap-2">{children}</div>}
    </div>
  )
}

export default function AdminPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<"shifts" | "reserve">("shifts")
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [shifts, setShifts] = useState<AdminShift[]>([])
  const [reserves, setReserves] = useState<AdminReserve[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      setLoading(true)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace("/login"); return }

      const { data: myProfile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()

      if (!myProfile || myProfile.role !== "admin") {
        router.replace("/")
        return
      }

      const [profilesRes, shiftsRes, reservesRes] = await Promise.all([
        supabase.from("profiles").select("id, name, email, role").order("name"),
        supabase.from("planned_shifts").select("*").order("date"),
        supabase.from("planned_reserves").select("*").order("date"),
      ])

      if (profilesRes.error) {
        setError("Ошибка загрузки данных. Убедитесь, что созданы нужные таблицы в Supabase.")
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

  const getCourierName = (userId: string) => {
    const p = profiles.find((p) => p.id === userId)
    if (p?.name) return p.name
    if (p?.email) return p.email.split("@")[0]
    return "Курьер"
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
        <button
          onClick={() => router.replace("/")}
          className="text-sm text-primary underline"
        >
          На главную
        </button>
      </div>
    )
  }

  const courierCount = profiles.filter((p) => p.role !== "admin").length

  const shiftsByDate = shifts.reduce<Record<string, AdminShift[]>>((acc, s) => {
    if (!acc[s.date]) acc[s.date] = []
    acc[s.date].push(s)
    return acc
  }, {})

  const reservesByDate = reserves.reduce<Record<string, AdminReserve[]>>((acc, r) => {
    if (!acc[r.date]) acc[r.date] = []
    acc[r.date].push(r)
    return acc
  }, {})

  const shiftDates = Object.keys(shiftsByDate).sort()
  const reserveDates = Object.keys(reservesByDate).sort()

  return (
    <div className="min-h-dvh bg-background flex flex-col max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold text-foreground">Панель куратора</h1>
        </div>
        <button
          onClick={async () => {
            await supabase.auth.signOut()
            router.replace("/login")
          }}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Выйти
        </button>
      </div>

      {/* Stats */}
      <div className="flex gap-3 px-4 pt-4 pb-3">
        <div className="flex-1 bg-primary/10 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-primary">{courierCount}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Курьеров</p>
        </div>
        <div className="flex-1 bg-secondary rounded-xl p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-0.5">
            <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-2xl font-bold text-foreground">{shifts.length}</p>
          </div>
          <p className="text-xs text-muted-foreground">Выходов</p>
        </div>
        <div className="flex-1 bg-secondary rounded-xl p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-0.5">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-2xl font-bold text-foreground">{reserves.length}</p>
          </div>
          <p className="text-xs text-muted-foreground">Резервов</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-4 pb-3">
        <button
          onClick={() => setActiveTab("shifts")}
          className={cn(
            "flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors",
            activeTab === "shifts"
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-muted-foreground"
          )}
        >
          Выходы
        </button>
        <button
          onClick={() => setActiveTab("reserve")}
          className={cn(
            "flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors",
            activeTab === "reserve"
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-muted-foreground"
          )}
        >
          Резервы
        </button>
      </div>

      <div className="h-px bg-border mx-4 mb-3" />

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-10">
        {activeTab === "shifts" ? (
          shiftDates.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-10">
              Нет запланированных выходов
            </p>
          ) : (
            shiftDates.map((date) => (
              <DateBlock key={date} date={date}>
                {shiftsByDate[date].map((shift) => {
                  const workplace = WORKPLACES.find((w) => w.id === shift.workplace_id)
                  const duration = calcDuration(shift.time_from, shift.time_to)
                  return (
                    <div key={shift.id} className="bg-secondary rounded-xl p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-foreground">
                          {getCourierName(shift.user_id)}
                        </span>
                        <span className="flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                          <Clock className="h-3 w-3" />
                          {duration}
                        </span>
                      </div>
                      <p className="text-sm text-foreground">
                        {shift.time_from} — {shift.time_to}
                      </p>
                      {workplace && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {workplace.address}
                        </div>
                      )}
                    </div>
                  )
                })}
              </DateBlock>
            ))
          )
        ) : (
          reserveDates.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-10">
              Нет запланированных резервов
            </p>
          ) : (
            reserveDates.map((date) => (
              <DateBlock key={date} date={date}>
                {reservesByDate[date].map((reserve) => (
                  <div key={reserve.id} className="bg-secondary rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-foreground">
                        {getCourierName(reserve.user_id)}
                      </span>
                      <span
                        className={cn(
                          "text-xs px-2 py-0.5 rounded-md font-medium",
                          statusColors[reserve.status] || ""
                        )}
                      >
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
              </DateBlock>
            ))
          )
        )}
      </div>
    </div>
  )
}
