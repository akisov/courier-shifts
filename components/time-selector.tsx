"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { TIME_OPTIONS } from "@/lib/types"

interface TimeSelectorProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function TimeSelector({ label, value, onChange, placeholder = "" }: TimeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div ref={ref} className="relative flex-1">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex w-full items-center justify-between rounded-xl bg-secondary px-4 py-3.5 text-sm transition-colors",
          value ? "text-foreground" : "text-muted-foreground",
        )}
      >
        <span className="font-medium">{value || label}</span>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-background shadow-lg max-h-52 overflow-y-auto">
          {TIME_OPTIONS.map((time) => (
            <button
              key={time}
              type="button"
              onClick={() => {
                onChange(time)
                setIsOpen(false)
              }}
              className={cn(
                "w-full px-4 py-3 text-left text-sm hover:bg-secondary transition-colors",
                value === time && "bg-primary/10 text-primary font-semibold"
              )}
            >
              {time}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
