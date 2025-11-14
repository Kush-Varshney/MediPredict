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
      className={`w-full px-3 py-2 border border-medical-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-medical-500 ${className}`}
      {...props}
    />
  )
})

export default Input


