"use client"

import { cn } from "@/lib/utils"

interface TabSwitcherProps {
  activeTab: "shifts" | "reserve"
  onTabChange: (tab: "shifts" | "reserve") => void
}

export function TabSwitcher({ activeTab, onTabChange }: TabSwitcherProps) {
  return (
    <div className="flex items-center justify-center px-4 py-3">
      <div className="flex w-full rounded-xl bg-secondary p-1 gap-1">
        <button
          onClick={() => onTabChange("shifts")}
          className={cn(
            "flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all",
            activeTab === "shifts"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-foreground/60 hover:text-foreground"
          )}
        >
          Мои выходы
        </button>
        <button
          onClick={() => onTabChange("reserve")}
          className={cn(
            "flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all",
            activeTab === "reserve"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-foreground/60 hover:text-foreground"
          )}
        >
          Резерв
        </button>
      </div>
    </div>
  )
}
