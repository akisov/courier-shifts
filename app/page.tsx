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
import type { PlannedShift, PlannedReserve } from "@/lib/types"
import { Clock, Pencil } from "lucide-react"

export default function HomePage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<"shifts" | "reserve">("shifts")
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showShiftModal, setShowShiftModal] = useState(false)
  const [showReserveModal, setShowReserveModal] = useState(false)
  const [editingShift, setEditingShift] = useState<PlannedShift | null>(null)
  const [editingReserve, setEditingReserve] = useState<PlannedReserve | null>(null)
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

  const {
    shifts,
    plannedShifts,
    plannedReserves,
    addPlannedShift,
    addPlannedReserve,
    updatePlannedShift,
    deletePlannedShift,
    updatePlannedReserve,
    deletePlannedReserve,
    loading,
  } = useAppStore()

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

      <div className="flex-1 overflow-y-auto mt-3 pb-24">
        {activeTab === "shifts" ? (
          <PlannedShiftList
            plannedShifts={plannedShifts}
            onEdit={(shift) => setEditingShift(shift)}
          />
        ) : (
          <ReserveList
            reserves={plannedReserves}
            onEdit={(reserve) => setEditingReserve(reserve)}
          />
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

      {/* New shift modal */}
      <PlanShiftModal
        isOpen={showShiftModal}
        onClose={() => setShowShiftModal(false)}
        onSubmit={(data) => addPlannedShift(data)}
        initialDate={selectedDate ?? undefined}
      />

      {/* Edit shift modal */}
      <PlanShiftModal
        isOpen={!!editingShift}
        onClose={() => setEditingShift(null)}
        editData={editingShift ?? undefined}
        onSubmit={(data) => {
          if (editingShift) updatePlannedShift(editingShift.id, data)
        }}
        onDelete={(id) => deletePlannedShift(id)}
      />

      {/* New reserve modal */}
      <PlanReserveModal
        isOpen={showReserveModal}
        onClose={() => setShowReserveModal(false)}
        onSubmit={(data) => addPlannedReserve(data)}
        initialDate={selectedDate ?? undefined}
      />

      {/* Edit reserve modal */}
      <PlanReserveModal
        isOpen={!!editingReserve}
        onClose={() => setEditingReserve(null)}
        editData={editingReserve ?? undefined}
        onSubmit={(data) => {
          if (editingReserve) updatePlannedReserve(editingReserve.id, data)
        }}
        onDelete={(id) => deletePlannedReserve(id)}
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

function PlannedShiftList({
  plannedShifts,
  onEdit,
}: {
  plannedShifts: PlannedShift[]
  onEdit: (shift: PlannedShift) => void
}) {
  const months = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"]
  const weekdays = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"]

  const grouped = plannedShifts.reduce<Record<string, PlannedShift[]>>((acc, s) => {
    if (!acc[s.date]) acc[s.date] = []
    acc[s.date].push(s)
    return acc
  }, {})
  const sortedDates = Object.keys(grouped).sort()

  return (
    <div className="mx-4 rounded-2xl border border-border overflow-hidden bg-background">
      <div className="px-4 py-4 border-b border-border">
        <h3 className="text-base font-bold text-foreground">Мои выходы</h3>
      </div>

      {plannedShifts.length === 0 ? (
        <div className="px-4 py-8 text-center text-muted-foreground text-sm">
          Нет запланированных выходов
        </div>
      ) : (
        sortedDates.map((date, dateIdx) => {
          const d = new Date(date + "T00:00:00")
          const header = `${d.getDate()} ${months[d.getMonth()]}, ${weekdays[d.getDay()]}`
          return (
            <div key={date} className={dateIdx > 0 ? "border-t border-border" : ""}>
              <p className="px-4 pt-3 pb-1 text-base font-bold text-foreground">{header}</p>
              {grouped[date].map((shift, idx) => {
                const workplace = WORKPLACES.find(w => w.id === shift.workplaceId)
                const duration = calcDuration(shift.timeFrom, shift.timeTo)
                return (
                  <div key={shift.id} className="flex items-center justify-between px-4 py-3 border-t border-border">
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
                        <p className="text-xs text-muted-foreground">{workplace.address}</p>
                      )}
                    </div>
                    <button
                      onClick={() => onEdit(shift)}
                      className="ml-3 h-9 w-9 flex items-center justify-center rounded-xl bg-secondary text-muted-foreground hover:text-foreground transition-colors outline-none"
                      aria-label="Редактировать"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </div>
                )
              })}
            </div>
          )
        })
      )}
    </div>
  )
}

function ReserveList({
  reserves,
  onEdit,
}: {
  reserves: PlannedReserve[]
  onEdit: (reserve: PlannedReserve) => void
}) {
  const months = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"]
  const weekdays = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"]

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

  const grouped = reserves.reduce<Record<string, PlannedReserve[]>>((acc, r) => {
    if (!acc[r.date]) acc[r.date] = []
    acc[r.date].push(r)
    return acc
  }, {})
  const sortedDates = Object.keys(grouped).sort()

  return (
    <div className="mx-4 rounded-2xl border border-border overflow-hidden bg-background">
      <div className="px-4 py-4 border-b border-border">
        <h3 className="text-base font-bold text-foreground">Мои резервы</h3>
      </div>

      {reserves.length === 0 ? (
        <div className="px-4 py-8 text-center text-muted-foreground text-sm">
          Нет запланированных резервов
        </div>
      ) : (
        sortedDates.map((date, dateIdx) => {
          const d = new Date(date + "T00:00:00")
          const header = `${d.getDate()} ${months[d.getMonth()]}, ${weekdays[d.getDay()]}`
          return (
            <div key={date} className={dateIdx > 0 ? "border-t border-border" : ""}>
              <p className="px-4 pt-3 pb-1 text-base font-bold text-foreground">{header}</p>
              {grouped[date].map((reserve) => (
                <div key={reserve.id} className="flex items-center justify-between px-4 py-3 border-t border-border">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-foreground">
                        {reserve.timeFrom} - {reserve.timeTo}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusColors[reserve.status] || ""}`}>
                        {statusLabels[reserve.status] || reserve.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {locationLabels[reserve.location] || reserve.location}
                    </p>
                  </div>
                  <button
                    onClick={() => onEdit(reserve)}
                    className="ml-3 h-9 w-9 flex items-center justify-center rounded-xl bg-secondary text-muted-foreground hover:text-foreground transition-colors outline-none"
                    aria-label="Редактировать"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )
        })
      )}
    </div>
  )
}
