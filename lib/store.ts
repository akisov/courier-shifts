import { useState, useEffect, useCallback } from "react"
import { supabase } from "./supabase"
import type { PlannedShift, PlannedReserve } from "./types"

export function useAppStore() {
  const [plannedShifts, setPlannedShifts] = useState<PlannedShift[]>([])
  const [plannedReserves, setPlannedReserves] = useState<PlannedReserve[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const [shiftsRes, reservesRes] = await Promise.all([
        supabase.from("planned_shifts").select("*").eq("user_id", user.id).order("date"),
        supabase.from("planned_reserves").select("*").eq("user_id", user.id).order("date"),
      ])

      if (shiftsRes.data) {
        setPlannedShifts(shiftsRes.data.map(r => ({
          id: r.id,
          date: r.date,
          timeFrom: r.time_from,
          timeTo: r.time_to,
          workplaceId: r.workplace_id,
          repeat: r.repeat,
          repeatDays: r.repeat_days,
          repeatUntil: r.repeat_until,
          confirmedByAdmin: r.confirmed_by_admin ?? false,
        })))
      }

      if (reservesRes.data) {
        setPlannedReserves(reservesRes.data.map(r => ({
          id: r.id,
          date: r.date,
          dateTo: r.date_to ?? undefined,
          timeFrom: r.time_from,
          timeTo: r.time_to,
          status: r.status,
          location: r.location,
          repeat: r.repeat,
          repeatDays: r.repeat_days,
          repeatUntil: r.repeat_until,
        })))
      }

      setLoading(false)
    }

    fetchData()
  }, [])

  const addPlannedShift = useCallback(async (shift: Omit<PlannedShift, "id">) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase.from("planned_shifts").insert({
      user_id: user.id,
      date: shift.date,
      time_from: shift.timeFrom,
      time_to: shift.timeTo,
      workplace_id: shift.workplaceId,
      repeat: shift.repeat,
      repeat_days: shift.repeatDays,
      repeat_until: shift.repeatUntil,
    }).select().single()

    if (!error && data) {
      setPlannedShifts(prev => [...prev, {
        id: data.id,
        date: data.date,
        timeFrom: data.time_from,
        timeTo: data.time_to,
        workplaceId: data.workplace_id,
        repeat: data.repeat,
        repeatDays: data.repeat_days,
        repeatUntil: data.repeat_until,
      }])
    }
  }, [])

  const addPlannedReserve = useCallback(async (reserve: Omit<PlannedReserve, "id">) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase.from("planned_reserves").insert({
      user_id: user.id,
      date: reserve.date,
      date_to: reserve.dateTo ?? null,
      time_from: reserve.timeFrom,
      time_to: reserve.timeTo,
      status: reserve.status,
      location: reserve.location,
      repeat: reserve.repeat,
      repeat_days: reserve.repeatDays,
      repeat_until: reserve.repeatUntil,
    }).select().single()

    if (!error && data) {
      setPlannedReserves(prev => [...prev, {
        id: data.id,
        date: data.date,
        dateTo: data.date_to ?? undefined,
        timeFrom: data.time_from,
        timeTo: data.time_to,
        status: data.status,
        location: data.location,
        repeat: data.repeat,
        repeatDays: data.repeat_days,
        repeatUntil: data.repeat_until,
      }])
    }
  }, [])

  const updatePlannedShift = useCallback(async (id: string, shift: Omit<PlannedShift, "id">) => {
    const { error } = await supabase.from("planned_shifts").update({
      date: shift.date,
      time_from: shift.timeFrom,
      time_to: shift.timeTo,
      workplace_id: shift.workplaceId,
      repeat: shift.repeat,
      repeat_days: shift.repeatDays,
      repeat_until: shift.repeatUntil,
    }).eq("id", id)

    if (!error) {
      setPlannedShifts(prev => prev.map(s => s.id === id ? { ...shift, id } : s))
    }
  }, [])

  const deletePlannedShift = useCallback(async (id: string) => {
    const { error } = await supabase.from("planned_shifts").delete().eq("id", id)
    if (!error) {
      setPlannedShifts(prev => prev.filter(s => s.id !== id))
    }
  }, [])

  const updatePlannedReserve = useCallback(async (id: string, reserve: Omit<PlannedReserve, "id">) => {
    const { error } = await supabase.from("planned_reserves").update({
      date: reserve.date,
      date_to: reserve.dateTo ?? null,
      time_from: reserve.timeFrom,
      time_to: reserve.timeTo,
      status: reserve.status,
      location: reserve.location,
      repeat: reserve.repeat,
      repeat_days: reserve.repeatDays,
      repeat_until: reserve.repeatUntil,
    }).eq("id", id)

    if (!error) {
      setPlannedReserves(prev => prev.map(r => r.id === id ? { ...reserve, id } : r))
    }
  }, [])

  const deletePlannedReserve = useCallback(async (id: string) => {
    const { error } = await supabase.from("planned_reserves").delete().eq("id", id)
    if (!error) {
      setPlannedReserves(prev => prev.filter(r => r.id !== id))
    }
  }, [])

  return {
    shifts: [],
    plannedShifts,
    plannedReserves,
    addPlannedShift,
    addPlannedReserve,
    updatePlannedShift,
    deletePlannedShift,
    updatePlannedReserve,
    deletePlannedReserve,
    loading,
  }
}
