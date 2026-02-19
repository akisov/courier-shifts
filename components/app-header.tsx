"use client"

import { ChevronLeft, LogOut } from "lucide-react"

interface AppHeaderProps {
  onLogout?: () => void
}

export function AppHeader({ onLogout }: AppHeaderProps) {
  return (
    <header className="flex items-center justify-between h-12 px-4 border-b border-border bg-background">
      <button className="flex items-center gap-1 text-primary font-medium text-sm">
        <ChevronLeft className="h-5 w-5" />
        <span>Даты выходов</span>
      </button>
      {onLogout && (
        <button
          onClick={onLogout}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Выйти
        </button>
      )}
    </header>
  )
}
