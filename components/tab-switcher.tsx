"use client"

import { cn } from "@/lib/utils"

interface TabSwitcherProps {
  activeTab: "shifts" | "reserve"
  onTabChange: (tab: "shifts" | "reserve") => void
}

export function TabSwitcher({ activeTab, onTabChange }: TabSwitcherProps) {
  return (
    <div className="flex items-center justify-center px-4 py-3">
      <div className="flex w-full max-w-xs rounded-lg bg-secondary p-1">
        <button
          onClick={() => onTabChange("shifts")}
          className={cn(
            "flex-1 rounded-md py-2 text-sm font-medium transition-all",
            activeTab === "shifts"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Мои выходы
        </button>
        <button
          onClick={() => onTabChange("reserve")}
          className={cn(
            "flex-1 rounded-md py-2 text-sm font-medium transition-all",
            activeTab === "reserve"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Резерв
        </button>
      </div>
    </div>
  )
}
