"use client"

import { useMemo } from "react"
import { Card } from "@/components/ui/card"

type Prediction = {
  createdAt: string
  bloodPressureSystolic?: number
  bloodPressureDiastolic?: number
  glucose?: number
  cholesterol?: number
}

export default function HealthTrends({ predictions }: { predictions: Prediction[] }) {
  const sorted = useMemo(
    () => [...predictions].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [predictions],
  )

  const systolicVals = sorted.map((p) => Number(p.bloodPressureSystolic)).filter((n) => Number.isFinite(n))
  const diastolicVals = sorted.map((p) => Number(p.bloodPressureDiastolic)).filter((n) => Number.isFinite(n))
  const glucoseVals = sorted.map((p) => Number(p.glucose)).filter((n) => Number.isFinite(n))
  const cholVals = sorted.map((p) => Number(p.cholesterol)).filter((n) => Number.isFinite(n))

  const insights = useMemo(() => {
    const avg = (arr: number[]) => (arr.length ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length) : null)
    return {
      bp: {
        systolicAvg: avg(systolicVals),
        diastolicAvg: avg(diastolicVals),
      },
      glucose: { avg: avg(glucoseVals) },
      cholesterol: { avg: avg(cholVals) },
    }
  }, [systolicVals, diastolicVals, glucoseVals, cholVals])

  // Only show if we have at least 1 prediction with metrics
  const hasData = systolicVals.length > 0 || glucoseVals.length > 0 || cholVals.length > 0

  if (!hasData) {
    return (
      <Card className="bg-white border-medical-200">
        <div className="p-6 text-center">
          <p className="text-medical-600 text-sm">Make predictions to see your health metrics summary.</p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="bg-white border-medical-200">
      <div className="p-6">
        <h3 className="text-lg font-semibold text-medical-900 mb-4">Health Metrics Summary</h3>
        <p className="text-medical-600 text-sm mb-4">Average values from your prediction history</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {systolicVals.length > 0 && (
            <div className="p-4 bg-medical-50 border border-medical-200 rounded-lg">
              <p className="text-sm font-medium text-medical-700 mb-1">Average Blood Pressure</p>
              <p className="text-2xl font-bold text-medical-900">
                {insights.bp.systolicAvg ?? "-"}/{insights.bp.diastolicAvg ?? "-"}
              </p>
              <p className="text-xs text-medical-500 mt-1">mmHg</p>
              <p className="text-xs text-medical-400 mt-2">Based on {systolicVals.length} reading{systolicVals.length !== 1 ? 's' : ''}</p>
            </div>
          )}
          {glucoseVals.length > 0 && (
            <div className="p-4 bg-medical-50 border border-medical-200 rounded-lg">
              <p className="text-sm font-medium text-medical-700 mb-1">Average Glucose</p>
              <p className="text-2xl font-bold text-medical-900">{insights.glucose.avg ?? "-"}</p>
              <p className="text-xs text-medical-500 mt-1">mg/dL</p>
              <p className="text-xs text-medical-400 mt-2">Based on {glucoseVals.length} reading{glucoseVals.length !== 1 ? 's' : ''}</p>
            </div>
          )}
          {cholVals.length > 0 && (
            <div className="p-4 bg-medical-50 border border-medical-200 rounded-lg">
              <p className="text-sm font-medium text-medical-700 mb-1">Average Cholesterol</p>
              <p className="text-2xl font-bold text-medical-900">{insights.cholesterol.avg ?? "-"}</p>
              <p className="text-xs text-medical-500 mt-1">mg/dL</p>
              <p className="text-xs text-medical-400 mt-2">Based on {cholVals.length} reading{cholVals.length !== 1 ? 's' : ''}</p>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
