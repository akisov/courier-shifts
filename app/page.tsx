"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AppHeader } from "@/components/app-header"
import { TabSwitcher } from "@/components/tab-switcher"
import { MonthCalendar } from "@/components/month-calendar"
import { ReserveInfo } from "@/components/reserve-info"
import { PlanShiftModal } from "@/components/plan-shift-modal"
import { PlanReserveModal } from "@/components/plan-reserve-modal"
import { useAppStore } from "@/lib/store"
import { supabase } from "@/lib/supabase"
import { WORKPLACES } from "@/lib/types"
import { Clock, MapPin, Pencil } from "lucide-react"

export default function HomePage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<"shifts" | "reserve">("shifts")
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showShiftModal, setShowShiftModal] = useState(false)
  const [showReserveModal, setShowReserveModal] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) {
        router.replace("/login")
      } else {
        setAuthChecked(true)
      }
    })()
  }, [router])

  const { shifts, plannedShifts, plannedReserves, addPlannedShift, addPlannedReserve, loading } = useAppStore()

  if (!authChecked || loading) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Загрузка...</p>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-background flex flex-col max-w-md mx-auto relative">
      <AppHeader />
      <TabSwitcher activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === "reserve" && <ReserveInfo />}

      <MonthCalendar
        shifts={shifts}
        plannedShifts={plannedShifts}
        reserves={plannedReserves}
        activeTab={activeTab}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
      />

      <div className="h-px bg-border mx-4" />

      <div className="flex-1 overflow-y-auto mt-3">
        {activeTab === "shifts" ? (
          <PlannedShiftList plannedShifts={plannedShifts} />
        ) : (
          <ReserveList reserves={plannedReserves} />
        )}
      </div>

      <div className="sticky bottom-0 px-4 pb-6 pt-3 bg-gradient-to-t from-background via-background to-transparent">
        <button
          onClick={() => {
            if (activeTab === "shifts") {
              setShowShiftModal(true)
            } else {
              setShowReserveModal(true)
            }
          }}
          className="w-full rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground active:scale-[0.98] transition-transform"
        >
          {activeTab === "shifts" ? "Запланировать выход" : "Запланировать резерв"}
        </button>
      </div>

      <PlanShiftModal
        isOpen={showShiftModal}
        onClose={() => setShowShiftModal(false)}
        onSubmit={(data) => {
          addPlannedShift(data)
        }}
      />

      <PlanReserveModal
        isOpen={showReserveModal}
        onClose={() => setShowReserveModal(false)}
        onSubmit={(data) => {
          addPlannedReserve(data)
        }}
      />
    </div>
  )
}

function calcDuration(from: string, to: string): string {
  const [fh, fm] = from.split(":").map(Number)
  const [th, tm] = to.split(":").map(Number)
  let mins = (th * 60 + tm) - (fh * 60 + fm)
  if (mins < 0) mins += 24 * 60
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}ч ${m}м` : `${h} ч`
}

function PlannedShiftList({ plannedShifts }: { plannedShifts: { id: string; date: string; timeFrom: string; timeTo: string; workplaceId: string }[] }) {
  if (plannedShifts.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-muted-foreground text-sm">
        Нет запланированных выходов
      </div>
    )
  }

  const grouped = plannedShifts.reduce<Record<string, typeof plannedShifts>>((acc, s) => {
    if (!acc[s.date]) acc[s.date] = []
    acc[s.date].push(s)
    return acc
  }, {})

  const sortedDates = Object.keys(grouped).sort()
  const months = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"]
  const weekdays = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"]

  return (
    <div className="px-4 pb-24">
      <h3 className="text-base font-bold text-foreground mb-3">Мои выходы</h3>
      {sortedDates.map((date) => {
        const d = new Date(date + "T00:00:00")
        const header = `${d.getDate()} ${months[d.getMonth()]}, ${weekdays[d.getDay()]}`
        const wp = WORKPLACES.find(w => w.id === grouped[date][0]?.workplaceId)
        return (
          <div key={date} className="mb-1">
            <p className="text-base font-bold text-foreground py-2">{header}</p>
            <div className="flex flex-col">
              {grouped[date].map((shift, idx) => {
                const workplace = WORKPLACES.find(w => w.id === shift.workplaceId) ?? wp
                const duration = calcDuration(shift.timeFrom, shift.timeTo)
                return (
                  <div key={shift.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-foreground">
                          {idx + 1}. {shift.timeFrom} - {shift.timeTo}
                        </span>
                        <span className="flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                          <Clock className="h-3 w-3" />
                          {duration}
                        </span>
                      </div>
                      {workplace && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {workplace.address}
                        </div>
                      )}
                    </div>
                    <button className="ml-3 h-9 w-9 flex items-center justify-center rounded-xl bg-secondary text-muted-foreground hover:text-foreground" aria-label="Редактировать">
                      <Pencil className="h-4 w-4" />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ReserveList({ reserves }: { reserves: { id: string; date: string; timeFrom: string; timeTo: string; status: string; location: string }[] }) {
  if (reserves.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-muted-foreground text-sm">
        Нет запланированных резервов
      </div>
    )
  }

  const statusLabels: Record<string, string> = {
    can: "Могу",
    if_needed: "При необходимости",
    cannot: "Не могу",
  }

  const locationLabels: Record<string, string> = {
    own_points: "Только в своих точках",
    whole_city: "По всему городу",
  }

  const statusColors: Record<string, string> = {
    can: "bg-primary/10 text-primary",
    if_needed: "bg-[#f5c518]/10 text-[#b8940e]",
    cannot: "bg-destructive/10 text-destructive",
  }

  return (
    <div className="px-4 pb-24">
      <h3 className="text-sm font-semibold text-foreground mb-3">Мои резервы</h3>
      <div className="flex flex-col gap-2">
        {reserves.map((reserve) => {
          const date = new Date(reserve.date + "T00:00:00")
          const d = date.getDate().toString().padStart(2, "0")
          const m = (date.getMonth() + 1).toString().padStart(2, "0")
          return (
            <div key={reserve.id} className="bg-secondary rounded-xl p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-foreground">
                  {d}.{m} | {reserve.timeFrom} - {reserve.timeTo}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${statusColors[reserve.status] || ""}`}>
                  {statusLabels[reserve.status] || reserve.status}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {locationLabels[reserve.location] || reserve.location}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
