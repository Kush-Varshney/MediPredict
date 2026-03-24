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
  const base = "inline-flex items-center justify-center rounded-md font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-400 disabled:opacity-50 disabled:pointer-events-none"
  const variants = {
    default: "bg-gradient-to-r from-cyan-500 to-teal-500 text-white hover:from-cyan-400 hover:to-teal-400 shadow-[0_0_20px_rgba(45,212,191,0.25)]",
    outline: "border border-slate-600 text-slate-200 hover:bg-slate-800",
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


