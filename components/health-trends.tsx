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

  const getBpStatus = (sys: number | null, dia: number | null) => {
    if (sys === null || dia === null) return { label: "Unknown", tone: "slate" }
    if (sys >= 140 || dia >= 90) return { label: "High", tone: "red" }
    if (sys >= 120 || dia >= 80) return { label: "Elevated", tone: "amber" }
    return { label: "Normal", tone: "emerald" }
  }

  const getGlucoseStatus = (value: number | null) => {
    if (value === null) return { label: "Unknown", tone: "slate" }
    if (value >= 126) return { label: "High", tone: "red" }
    if (value >= 100) return { label: "Elevated", tone: "amber" }
    return { label: "Normal", tone: "emerald" }
  }

  const getCholesterolStatus = (value: number | null) => {
    if (value === null) return { label: "Unknown", tone: "slate" }
    if (value >= 240) return { label: "High", tone: "red" }
    if (value >= 200) return { label: "Elevated", tone: "amber" }
    return { label: "Normal", tone: "emerald" }
  }

  const statusClass = (tone: string) => {
    if (tone === "red") return "bg-red-500/15 text-red-200 border-red-500/40"
    if (tone === "amber") return "bg-amber-500/15 text-amber-200 border-amber-500/40"
    if (tone === "emerald") return "bg-emerald-500/15 text-emerald-200 border-emerald-500/40"
    return "bg-slate-700/40 text-slate-200 border-slate-600"
  }

  // Only show if we have at least 1 prediction with metrics
  const hasData = systolicVals.length > 0 || glucoseVals.length > 0 || cholVals.length > 0

  if (!hasData) {
    return (
      <Card className="bg-slate-900/70 border-slate-700">
        <div className="p-6 text-center">
          <p className="text-slate-300 text-sm">Make predictions to see your health metrics summary.</p>
        </div>
      </Card>
    )
  }

  const bpStatus = getBpStatus(insights.bp.systolicAvg, insights.bp.diastolicAvg)
  const glucoseStatus = getGlucoseStatus(insights.glucose.avg)
  const cholStatus = getCholesterolStatus(insights.cholesterol.avg)

  return (
    <Card className="bg-slate-900/70 border-slate-700">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-100">Health Metrics Summary</h3>
            <p className="text-slate-400 text-sm">Average values from your prediction history</p>
          </div>
          <span className="text-xs text-slate-300 border border-slate-600 bg-slate-800 px-2 py-1 rounded">
            Trend Snapshot
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {systolicVals.length > 0 && (
            <div className="p-4 bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700 rounded-lg shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-cyan-500/15 border border-cyan-500/30">
                    <svg className="h-4 w-4 text-cyan-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 12h4l2-5 4 10 2-5h4" />
                    </svg>
                  </span>
                  <p className="text-sm font-medium text-slate-300">Average Blood Pressure</p>
                </div>
                <span className={`text-[11px] px-2 py-0.5 rounded-full border ${statusClass(bpStatus.tone)}`}>
                  {bpStatus.label}
                </span>
              </div>
              <p className="text-2xl font-bold text-slate-100">
                {insights.bp.systolicAvg ?? "-"}/{insights.bp.diastolicAvg ?? "-"}
              </p>
              <p className="text-xs text-slate-400 mt-1">mmHg</p>
              <p className="text-xs text-slate-500 mt-2">Based on {systolicVals.length} reading{systolicVals.length !== 1 ? "s" : ""}</p>
            </div>
          )}
          {glucoseVals.length > 0 && (
            <div className="p-4 bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700 rounded-lg shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-fuchsia-500/15 border border-fuchsia-500/30">
                    <svg className="h-4 w-4 text-fuchsia-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 21c4-4.5 6-7.5 6-10a6 6 0 10-12 0c0 2.5 2 5.5 6 10z" />
                    </svg>
                  </span>
                  <p className="text-sm font-medium text-slate-300">Average Glucose</p>
                </div>
                <span className={`text-[11px] px-2 py-0.5 rounded-full border ${statusClass(glucoseStatus.tone)}`}>
                  {glucoseStatus.label}
                </span>
              </div>
              <p className="text-2xl font-bold text-slate-100">{insights.glucose.avg ?? "-"}</p>
              <p className="text-xs text-slate-400 mt-1">mg/dL</p>
              <p className="text-xs text-slate-500 mt-2">Based on {glucoseVals.length} reading{glucoseVals.length !== 1 ? "s" : ""}</p>
            </div>
          )}
          {cholVals.length > 0 && (
            <div className="p-4 bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700 rounded-lg shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-amber-500/15 border border-amber-500/30">
                    <svg className="h-4 w-4 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 12h18M12 3v18" />
                    </svg>
                  </span>
                  <p className="text-sm font-medium text-slate-300">Average Cholesterol</p>
                </div>
                <span className={`text-[11px] px-2 py-0.5 rounded-full border ${statusClass(cholStatus.tone)}`}>
                  {cholStatus.label}
                </span>
              </div>
              <p className="text-2xl font-bold text-slate-100">{insights.cholesterol.avg ?? "-"}</p>
              <p className="text-xs text-slate-400 mt-1">mg/dL</p>
              <p className="text-xs text-slate-500 mt-2">Based on {cholVals.length} reading{cholVals.length !== 1 ? "s" : ""}</p>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
