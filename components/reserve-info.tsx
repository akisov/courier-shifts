"use client"

import { Info } from "lucide-react"

export function ReserveInfo() {
  return (
    <div className="mx-4 mb-3 flex items-start gap-2.5 rounded-xl bg-[#e3f2fd] p-3.5">
      <Info className="h-4 w-4 mt-0.5 text-[#1976d2] shrink-0" />
      <p className="text-sm text-[#1565c0] leading-relaxed font-medium">
        Заполняйте график своей доступности, чтобы кураторы могли назначать вас на смены
      </p>
    </div>
  )
}
