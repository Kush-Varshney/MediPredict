"use client"

import React, { createContext, useContext, useId, useMemo, useState } from "react"

type TabsContextValue = {
  value: string
  setValue: (v: string) => void
}

const TabsContext = createContext<TabsContextValue | null>(null)

export function Tabs({
  defaultValue,
  value: controlledValue,
  onValueChange,
  className,
  children,
}: {
  defaultValue?: string
  value?: string
  onValueChange?: (v: string) => void
  className?: string
  children: React.ReactNode
}) {
  const [uncontrolled, setUncontrolled] = useState(defaultValue || "")
  const isControlled = controlledValue !== undefined
  const value = isControlled ? (controlledValue as string) : uncontrolled
  const setValue = (v: string) => {
    if (!isControlled) setUncontrolled(v)
    onValueChange?.(v)
  }

  const ctx = useMemo(() => ({ value, setValue }), [value])

  return (
    <div className={className}>
      <TabsContext.Provider value={ctx}>{children}</TabsContext.Provider>
    </div>
  )
}

export function TabsList({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={className}>{children}</div>
}

export function TabsTrigger({ value, className, children }: { value: string; className?: string; children: React.ReactNode }) {
  const ctx = useContext(TabsContext)
  if (!ctx) return null
  const isActive = ctx.value === value
  return (
    <button
      type="button"
      className={[
        "inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
        "focus:outline-none focus:ring-2",
        isActive ? "bg-medical-600 text-white" : "bg-white text-medical-700 hover:bg-medical-100",
        className || "",
      ].join(" ")}
      aria-pressed={isActive}
      onClick={() => ctx.setValue(value)}
    >
      {children}
    </button>
  )
}

export function TabsContent({ value, className, children }: { value: string; className?: string; children: React.ReactNode }) {
  const ctx = useContext(TabsContext)
  if (!ctx) return null
  if (ctx.value !== value) return null
  const sectionId = useId()
  return (
    <section id={sectionId} className={className}>
      {children}
    </section>
  )
}




