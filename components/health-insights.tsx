"use client"

import { useMemo } from "react"
import { Card } from "@/components/ui/card"

interface HealthInsightsProps {
  prediction: any
}

export function HealthInsightsSkeleton() {
  return (
    <Card className="bg-white shadow-lg border-medical-200">
      <div className="p-6 animate-pulse">
        <div className="h-6 w-56 bg-medical-100 rounded mb-6" />
        <div className="space-y-3">
          <div className="h-20 bg-medical-50 rounded border border-medical-200" />
          <div className="h-6 w-40 bg-medical-100 rounded" />
          <div className="h-14 bg-medical-50 rounded border border-medical-200" />
          <div className="h-6 w-32 bg-medical-100 rounded" />
          <div className="h-14 bg-medical-50 rounded border border-medical-200" />
        </div>
      </div>
    </Card>
  )
}

export default function HealthInsights({ prediction }: HealthInsightsProps) {
  const aiExplanation = prediction?.ai_explanation
  const precautions: string[] = prediction?.precautions || []
  const diet: string[] = prediction?.diet || []
  const riskLevel: string = prediction?.risk_level || prediction?.riskLevel || ""

  const enhancedPrecautions = useMemo(() => {
    const severityFromRisk = (riskLevel || "").toLowerCase()
    const baseSeverity = severityFromRisk.includes("high")
      ? "High"
      : severityFromRisk.includes("medium")
        ? "Medium"
        : severityFromRisk.includes("low")
          ? "Low"
          : "Medium"

    return precautions.map((text) => {
      const t = text.toLowerCase()
      const s = t.includes("urgent") || t.includes("immediately") ? "High" : baseSeverity
      return { text, severity: s }
    })
  }, [precautions, riskLevel])

  const portionedDiet = useMemo(() => {
    const suggestPortion = (item: string) => {
      const t = item.toLowerCase()
      if (t.includes("water") || t.includes("hydration")) return "~8 cups/day"
      if (t.includes("salt") || t.includes("sodium")) return "< 2g/day"
      if (t.includes("fruit") || t.includes("vegetable")) return "2–3 cups/day"
      if (t.includes("protein") || t.includes("lean")) return "~0.8g/kg body weight"
      if (t.includes("fiber")) return "25–30g/day"
      return "Moderate portions"
    }
    return diet.map((text) => ({ text, portion: suggestPortion(text) }))
  }, [diet])

  const metrics = useMemo(() => {
    if (!prediction) {
      return { systolic: undefined, diastolic: undefined, glucose: undefined, cholesterol: undefined }
    }

    // Helper function to safely convert to number
    const toNumber = (value: any): number | undefined => {
      if (value === null || value === undefined) return undefined
      if (typeof value === 'number') {
        // 0 is a valid value, but NaN and Infinity are not
        return Number.isFinite(value) ? value : undefined
      }
      if (typeof value === 'string') {
        const parsed = parseFloat(value)
        return Number.isFinite(parsed) ? parsed : undefined
      }
      return undefined
    }

    // Support both camelCase and snake_case field names
    const systolic = toNumber(prediction.bloodPressureSystolic ?? prediction.blood_pressure_systolic)
    const diastolic = toNumber(prediction.bloodPressureDiastolic ?? prediction.blood_pressure_diastolic)
    const glucose = toNumber(prediction.glucose)
    const cholesterol = toNumber(prediction.cholesterol)
    
    
    return { systolic, diastolic, glucose, cholesterol }
  }, [prediction])

  return (
    <Card className="bg-white shadow-lg border-medical-200">
      <div className="p-6">
        <h2 className="text-2xl font-bold text-medical-900 mb-6">Health Insights & Recommendations</h2>

        {aiExplanation && (
          <div className="mb-6 p-4 bg-medical-50 rounded-lg border border-medical-200">
            <h3 className="font-semibold text-medical-900 mb-2">Overview</h3>
            <p className="text-medical-700 text-sm leading-relaxed">{aiExplanation}</p>
          </div>
        )}

        {enhancedPrecautions.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold text-medical-900 mb-4">Precautions</h3>
            <div className="space-y-3">
              {enhancedPrecautions.map((rec, index) => (
                <div key={index} className="flex gap-3 p-3 bg-medical-50 rounded-lg border border-medical-200">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-medical-600 flex items-center justify-center">
                    <span className="text-white text-sm font-bold">{index + 1}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-medical-700 text-sm">{rec.text}</p>
                  </div>
                  <span
                    className={
                      "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium " +
                      (rec.severity === "High"
                        ? "bg-red-100 text-red-700"
                        : rec.severity === "Medium"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-green-100 text-green-700")
                    }
                    aria-label={`Severity ${rec.severity}`}
                  >
                    {rec.severity}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {portionedDiet.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold text-medical-900 mb-4">Diet Recommendations</h3>
            <div className="space-y-3">
              {portionedDiet.map((rec, index) => (
                <div key={index} className="flex gap-3 p-3 bg-medical-50 rounded-lg border border-medical-200">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-medical-600 flex items-center justify-center">
                    <span className="text-white text-sm font-bold">{index + 1}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-medical-700 text-sm">{rec.text}</p>
                    <p className="text-medical-500 text-xs mt-1">Suggested portion: {rec.portion}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6">
          <div className="p-4 bg-medical-50 rounded-lg border border-medical-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-medical-900">Health Metrics Overview</h3>
              <span className="text-xs text-medical-500 bg-white px-2 py-1 rounded">Current Values</span>
            </div>
            
            {metrics.systolic === undefined && metrics.glucose === undefined && metrics.cholesterol === undefined ? (
              <div className="text-center py-6">
                <div className="text-medical-400 mb-2">
                  <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <p className="text-medical-500 text-sm">No metrics available</p>
                <p className="text-medical-400 text-xs mt-1">Check browser console for debugging info</p>
              </div>
            ) : (
              <div className="space-y-4">
                {metrics.systolic !== undefined && metrics.diastolic !== undefined && (
                  <div className="bg-white p-3 rounded-lg border border-medical-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-medical-900">Blood Pressure</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                        metrics.systolic! > 140 || metrics.diastolic! > 90
                          ? "bg-red-100 text-red-700"
                          : metrics.systolic! > 120 || metrics.diastolic! > 80
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-green-100 text-green-700"
                      }`}>
                        {metrics.systolic! > 140 || metrics.diastolic! > 90 ? "High" : metrics.systolic! > 120 || metrics.diastolic! > 80 ? "Elevated" : "Normal"}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-bold text-medical-900">{metrics.systolic}/{metrics.diastolic}</span>
                      <span className="text-sm text-medical-600">mmHg</span>
                    </div>
                    <p className="text-xs text-medical-500 mt-1">Target: 120/80 mmHg or lower</p>
                  </div>
                )}
                
                {metrics.glucose !== undefined && (
                  <div className="bg-white p-3 rounded-lg border border-medical-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-medical-900">Blood Glucose</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                        metrics.glucose! > 125
                          ? "bg-red-100 text-red-700"
                          : metrics.glucose! > 99
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-green-100 text-green-700"
                      }`}>
                        {metrics.glucose! > 125 ? "High" : metrics.glucose! > 99 ? "Elevated" : "Normal"}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-bold text-medical-900">{metrics.glucose}</span>
                      <span className="text-sm text-medical-600">mg/dL</span>
                    </div>
                    <p className="text-xs text-medical-500 mt-1">Fasting target: 70–99 mg/dL</p>
                  </div>
                )}
                
                {metrics.cholesterol !== undefined && (
                  <div className="bg-white p-3 rounded-lg border border-medical-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-medical-900">Total Cholesterol</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                        metrics.cholesterol! > 240
                          ? "bg-red-100 text-red-700"
                          : metrics.cholesterol! > 200
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-green-100 text-green-700"
                      }`}>
                        {metrics.cholesterol! > 240 ? "High" : metrics.cholesterol! > 200 ? "Borderline" : "Desirable"}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-bold text-medical-900">{metrics.cholesterol}</span>
                      <span className="text-sm text-medical-600">mg/dL</span>
                    </div>
                    <p className="text-xs text-medical-500 mt-1">Desirable: &lt; 200 mg/dL</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}
