"use client"

import React from "react"

export const Alert: React.FC<React.HTMLAttributes<HTMLDivElement> & { variant?: "default" | "destructive" }> = ({
  className = "",
  variant = "default",
  ...props
}) => (
  <div
    className={`${
      variant === "destructive"
        ? "border-red-300 bg-red-50 text-red-800"
        : "border-medical-200 bg-medical-50 text-medical-800"
    } border rounded-md p-3 ${className}`}
    {...props}
  />
)

export const AlertDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({ className = "", ...props }) => (
  <p className={`text-sm ${className}`} {...props} />
)

export default Alert


