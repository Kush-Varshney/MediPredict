"use client"

import { Card } from "@/components/ui/card"

export default function HealthInsightsPlaceholder() {
  return (
    <Card className="bg-white shadow-lg border-medical-200">
      <div className="p-6 h-96 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div
            aria-hidden="true"
            className="mx-auto mb-4 w-14 h-14 rounded-full bg-medical-100 flex items-center justify-center"
          >
            <span className="text-medical-700 font-bold">HI</span>
          </div>
          <h2 className="text-2xl font-bold text-medical-900">Health Insights & Recommendations</h2>
          <p className="text-medical-600 mt-2">Sign in to access personalized health insights and recommendations</p>
        </div>
      </div>
    </Card>
  )
}