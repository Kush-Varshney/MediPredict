"use client"

import React from "react"

type InputProps = React.InputHTMLAttributes<HTMLInputElement>

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { className = "", ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={`w-full px-3 py-2 border border-slate-600 bg-slate-900/80 text-slate-100 rounded-lg text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 ${className}`}
      {...props}
    />
  )
})

export default Input


