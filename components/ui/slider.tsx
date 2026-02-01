
"use client"

import React from "react"

type SliderProps = React.InputHTMLAttributes<HTMLInputElement>

export const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ className = "", ...props }, ref) => {
    return (
      <input
        type="range"
        ref={ref}
        className={`w-full h-2 bg-medical-200 rounded-lg appearance-none cursor-pointer accent-medical-600 ${className}`}
        {...props}
      />
    )
  }
)
Slider.displayName = "Slider"
