"use client"

import { ChevronLeft } from "lucide-react"

export function AppHeader() {
  return (
    <header className="flex items-center h-12 px-4 border-b border-border bg-background">
      <button className="flex items-center gap-1 text-primary font-medium text-sm">
        <ChevronLeft className="h-5 w-5" />
        <span>Даты выходов</span>
      </button>
    </header>
  )
}
