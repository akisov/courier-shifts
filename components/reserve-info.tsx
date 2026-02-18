"use client"

import { Info } from "lucide-react"

export function ReserveInfo() {
  return (
    <div className="mx-4 mb-3 flex items-start gap-2 rounded-xl bg-[#e8f5e9] p-3">
      <Info className="h-4 w-4 mt-0.5 text-primary shrink-0" />
      <p className="text-xs text-foreground leading-relaxed">
        Заполните график своей доступности, чтобы кураторы могли назначать вас на смены
      </p>
    </div>
  )
}
