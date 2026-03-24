"use client"

import { Card } from "@/components/ui/card"

export default function HealthInsightsPlaceholder() {
  return (
    <Card className="bg-slate-900/70 shadow-lg border-slate-700">
      <div className="p-6 h-96 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div
            aria-hidden="true"
            className="mx-auto mb-4 w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center"
          >
            <span className="text-cyan-300 font-bold">HI</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-100">Health Insights & Recommendations</h2>
          <p className="text-slate-300 mt-2">Sign in to access personalized health insights and recommendations</p>
        </div>
      </div>
    </Card>
  )
}