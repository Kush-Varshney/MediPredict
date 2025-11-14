"use client"

import React from "react"

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline"
  size?: "sm" | "md" | "lg"
}

export const Button: React.FC<ButtonProps> = ({
  className = "",
  variant = "default",
  size = "md",
  children,
  ...props
}) => {
  const base = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-medical-500 disabled:opacity-50 disabled:pointer-events-none"
  const variants = {
    default: "bg-medical-600 text-white hover:bg-medical-700",
    outline: "border border-medical-300 text-medical-700 hover:bg-medical-50",
  }
  const sizes = {
    sm: "h-9 px-3 text-sm",
    md: "h-10 px-4 text-sm",
    lg: "h-11 px-5 text-base",
  }
  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  )
}

export default Button


