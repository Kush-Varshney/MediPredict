"use client"

import React from "react"

type Props = { children: React.ReactNode }

type State = { hasError: boolean }

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: any, info: any) {
    console.error("[ErrorBoundary] Caught error:", error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-red-50 border border-red-200 rounded">
          <p className="text-red-700 font-medium">Something went wrong while rendering this section.</p>
          <p className="text-red-600 text-sm mt-1">Please try again or refresh the page.</p>
        </div>
      )
    }
    return this.props.children
  }
}