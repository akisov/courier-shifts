"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AppHeader } from "@/components/app-header"
import { TabSwitcher } from "@/components/tab-switcher"
import { MonthCalendar } from "@/components/month-calendar"
import { ShiftList } from "@/components/shift-list"
import { ReserveInfo } from "@/components/reserve-info"
import { PlanShiftModal } from "@/components/plan-shift-modal"
import { PlanReserveModal } from "@/components/plan-reserve-modal"
import { useAppStore } from "@/lib/store"
import { supabase } from "@/lib/supabase"

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
        reserves={plannedReserves}
        activeTab={activeTab}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
      />

      <div className="h-px bg-border mx-4" />

      <div className="flex-1 overflow-y-auto mt-3">
        {activeTab === "shifts" ? (
          <ShiftList shifts={shifts} />
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
