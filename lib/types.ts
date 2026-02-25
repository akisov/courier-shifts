export type ShiftStatus = "can" | "if_needed" | "cannot" | "vacation" | "sick_leave"

export type LocationType = "own_points" | "whole_city"

export interface Workplace {
  id: string
  code: string
  address: string
}

export interface PlannedShift {
  id: string
  date: string
  timeFrom: string
  timeTo: string
  workplaceId: string
  repeat: boolean
  repeatDays?: number[]
  repeatUntil?: string
  confirmedByAdmin?: boolean
  updatedAt?: string
}

export interface PlannedReserve {
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
  updatedAt?: string
}

export interface ShiftEntry {
  id: string
  date: string
  timeFrom: string
  timeTo: string
  duration: string
  workplace: string
  address: string
}

export const WORKPLACES: Workplace[] = [
  { id: "1", code: "4799", address: "Каширское шоссе, 23к1Б" },
  { id: "2", code: "4799", address: "Каширское шоссе, 23к1Б" },
  { id: "3", code: "4799", address: "Каширское шоссе, 23к1Б" },
]

export const TIME_OPTIONS = [
  "07:00", "07:30", "08:00", "08:30", "09:00", "09:30",
  "10:00", "10:30", "11:00", "11:30", "12:00", "12:30",
  "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00", "17:30", "18:00", "18:30",
  "19:00", "19:30", "20:00", "20:30", "21:00", "21:30",
  "22:00", "22:30", "23:00",
]

export const DAYS_OF_WEEK = [
  { id: 1, short: "Пн" },
  { id: 2, short: "Вт" },
  { id: 3, short: "Ср" },
  { id: 4, short: "Чт" },
  { id: 5, short: "Пт" },
  { id: 6, short: "Сб" },
  { id: 0, short: "Вс" },
]
