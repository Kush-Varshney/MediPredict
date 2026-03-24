"use client"

import { useMemo } from "react"
import { Card } from "@/components/ui/card"

interface HealthInsightsProps {
  prediction: any
}

function badgeToneClass(tone: "emerald" | "amber" | "red" | "cyan" | "slate") {
  if (tone === "red") return "bg-red-500/20 text-red-200 border-red-500/40"
  if (tone === "amber") return "bg-amber-500/20 text-amber-200 border-amber-500/40"
  if (tone === "cyan") return "bg-cyan-500/20 text-cyan-200 border-cyan-500/40"
  if (tone === "emerald") return "bg-emerald-500/20 text-emerald-200 border-emerald-500/40"
  return "bg-slate-700/50 text-slate-300 border-slate-600"
}

/** Fasting-glucose-oriented bands for overview (not a diagnosis). */
function classifyGlucose(mgDl: number) {
  if (mgDl < 70) return { label: "Low", tone: "amber" as const, note: "Below typical fasting range (70–99 mg/dL). If symptomatic, seek care." }
  if (mgDl <= 99) return { label: "Normal", tone: "emerald" as const, note: "Within common fasting target: 70–99 mg/dL." }
  if (mgDl <= 125) return { label: "Elevated", tone: "amber" as const, note: "Impaired fasting range (100–125 mg/dL). Confirm with testing." }
  return { label: "High", tone: "red" as const, note: "Diabetes-range threshold often starts at 126 mg/dL fasting. Clinical follow-up advised." }
}

/** ACC/AHA-style simplified BP categories; includes hypotension when systolic/diastolic are low. */
function classifyBloodPressure(systolic: number, diastolic: number) {
  if (systolic < 90 || diastolic < 60) {
    return {
      label: "Low",
      tone: "amber" as const,
      note: "Readings suggest hypotension for many adults. Verify repeat measures and symptoms.",
    }
  }
  if (systolic >= 140 || diastolic >= 90) {
    return { label: "High", tone: "red" as const, note: "Stage 2 hypertension thresholds (≥140/90). Discuss with a clinician." }
  }
  if (systolic >= 130 || diastolic >= 80) {
    return { label: "Elevated", tone: "amber" as const, note: "Stage 1 range (≥130/80). Lifestyle and monitoring often recommended." }
  }
  if (systolic >= 120 && systolic <= 129 && diastolic < 80) {
    return { label: "Elevated", tone: "cyan" as const, note: "Elevated BP (120–129 & diastolic < 80). Track trends over time." }
  }
  return { label: "Normal", tone: "emerald" as const, note: "Below common elevated thresholds (<120/80)." }
}

/** Total cholesterol; flags implausibly low values (likely entry error). */
function classifyCholesterol(mgDl: number) {
  if (mgDl < 100) {
    return {
      label: "Verify",
      tone: "amber" as const,
      note: "Very low total cholesterol is uncommon—double-check value and units (mg/dL).",
    }
  }
  if (mgDl < 200) return { label: "Desirable", tone: "emerald" as const, note: "Below 200 mg/dL is often considered desirable for total cholesterol." }
  if (mgDl < 240) return { label: "Borderline", tone: "amber" as const, note: "Borderline high (200–239 mg/dL)." }
  return { label: "High", tone: "red" as const, note: "High (≥240 mg/dL). Discuss with a clinician." }
}

export function HealthInsightsSkeleton() {
  return (
    <Card className="bg-slate-900/70 shadow-lg border-slate-700">
      <div className="p-6 animate-pulse">
        <div className="h-6 w-56 bg-slate-700 rounded mb-6" />
        <div className="space-y-3">
          <div className="h-20 bg-slate-800 rounded border border-slate-700" />
          <div className="h-6 w-40 bg-slate-700 rounded" />
          <div className="h-14 bg-slate-800 rounded border border-slate-700" />
          <div className="h-6 w-32 bg-slate-700 rounded" />
          <div className="h-14 bg-slate-800 rounded border border-slate-700" />
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
  const metricAssessment = prediction?.metric_assessment
  const inputSnapshot = prediction?.input_snapshot || {}

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
    const systolic = toNumber(
      inputSnapshot.bloodPressureSystolic ?? prediction.bloodPressureSystolic ?? prediction.blood_pressure_systolic,
    )
    const diastolic = toNumber(
      inputSnapshot.bloodPressureDiastolic ?? prediction.bloodPressureDiastolic ?? prediction.blood_pressure_diastolic,
    )
    const glucose = toNumber(inputSnapshot.glucose ?? prediction.glucose)
    const cholesterol = toNumber(inputSnapshot.cholesterol ?? prediction.cholesterol)
    
    
    return { systolic, diastolic, glucose, cholesterol }
  }, [prediction, inputSnapshot])

  const bpInsight = useMemo(() => {
    if (metrics.systolic === undefined || metrics.diastolic === undefined) return null
    return classifyBloodPressure(metrics.systolic, metrics.diastolic)
  }, [metrics.systolic, metrics.diastolic])

  const glucoseInsight = useMemo(() => {
    if (metrics.glucose === undefined) return null
    return classifyGlucose(metrics.glucose)
  }, [metrics.glucose])

  const cholInsight = useMemo(() => {
    if (metrics.cholesterol === undefined) return null
    return classifyCholesterol(metrics.cholesterol)
  }, [metrics.cholesterol])

  return (
    <Card className="bg-slate-900/70 shadow-lg border-slate-700">
      <div className="p-6">
        <h2 className="text-2xl font-bold text-slate-100 mb-6">Health Insights & Recommendations</h2>

        {aiExplanation && (
          <div className="mb-6 p-4 bg-slate-800 rounded-lg border border-slate-700">
            <h3 className="font-semibold text-slate-100 mb-2">Overview</h3>
            <p className="text-slate-300 text-sm leading-relaxed">{aiExplanation}</p>
          </div>
        )}
        {!!Array.isArray(metricAssessment?.alerts) && metricAssessment.alerts.length > 0 && (
          <div className="mb-6 p-4 rounded-xl border border-red-500/35 bg-red-500/10">
            <h3 className="font-semibold text-red-200 mb-2">Early Risk Signals</h3>
            <ul className="list-disc list-inside text-sm text-red-100/90 space-y-1">
              {metricAssessment.alerts.map((alert: string, index: number) => (
                <li key={`${alert}-${index}`}>{alert}</li>
              ))}
            </ul>
          </div>
        )}

        {enhancedPrecautions.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold text-slate-100 mb-4">Precautions</h3>
            <div className="space-y-3">
              {enhancedPrecautions.map((rec, index) => (
                <div key={index} className="flex gap-3 p-3 bg-slate-800 rounded-lg border border-slate-700">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center">
                    <span className="text-white text-sm font-bold">{index + 1}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-slate-200 text-sm">{rec.text}</p>
                  </div>
                  <span
                    className={
                      "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border " +
                      (rec.severity === "High"
                        ? badgeToneClass("red")
                        : rec.severity === "Medium"
                          ? badgeToneClass("amber")
                          : badgeToneClass("emerald"))
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
            <h3 className="font-semibold text-slate-100 mb-4">Diet Recommendations</h3>
            <div className="space-y-3">
              {portionedDiet.map((rec, index) => (
                <div key={index} className="flex gap-3 p-3 bg-slate-800 rounded-lg border border-slate-700">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center">
                    <span className="text-white text-sm font-bold">{index + 1}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-slate-200 text-sm">{rec.text}</p>
                    <p className="text-slate-400 text-xs mt-1">Suggested portion: {rec.portion}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6">
          <div className="p-4 bg-slate-800 rounded-lg border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-100">Health Metrics Overview</h3>
              <span className="text-xs text-slate-400 bg-slate-900 px-2 py-1 rounded">Current Values</span>
            </div>
            
            {metrics.systolic === undefined && metrics.glucose === undefined && metrics.cholesterol === undefined ? (
              <div className="text-center py-6">
                <div className="text-slate-500 mb-2">
                  <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <p className="text-slate-400 text-sm">Metrics marked as unknown</p>
                <p className="text-slate-500 text-xs mt-1">Prediction is symptom-driven only.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {bpInsight && (
                  <div className="p-4 rounded-xl border border-slate-700 bg-gradient-to-b from-slate-800 to-slate-900/90 shadow-lg">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/15 border border-cyan-500/30">
                          <svg className="h-4 w-4 text-cyan-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 12h4l2-5 4 10 2-5h4" />
                          </svg>
                        </span>
                        <span className="text-sm font-medium text-slate-200">Blood pressure</span>
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border shrink-0 ${badgeToneClass(bpInsight.tone)}`}>
                        {bpInsight.label}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-slate-100 tabular-nums">
                        {metrics.systolic}/{metrics.diastolic}
                      </span>
                      <span className="text-sm text-slate-400">mmHg</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Reference: many adults aim for &lt;120/80 mmHg unless your clinician advises otherwise.</p>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">{bpInsight.note}</p>
                  </div>
                )}

                {glucoseInsight && (
                  <div className="p-4 rounded-xl border border-slate-700 bg-gradient-to-b from-slate-800 to-slate-900/90 shadow-lg">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-fuchsia-500/15 border border-fuchsia-500/30">
                          <svg className="h-4 w-4 text-fuchsia-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 21c4-4.5 6-7.5 6-10a6 6 0 10-12 0c0 2.5 2 5.5 6 10z" />
                          </svg>
                        </span>
                        <span className="text-sm font-medium text-slate-200">Blood glucose</span>
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border shrink-0 ${badgeToneClass(glucoseInsight.tone)}`}>
                        {glucoseInsight.label}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-slate-100 tabular-nums">{metrics.glucose}</span>
                      <span className="text-sm text-slate-400">mg/dL</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Shown as fasting-oriented bands for quick context only.</p>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">{glucoseInsight.note}</p>
                  </div>
                )}

                {cholInsight && (
                  <div className="p-4 rounded-xl border border-slate-700 bg-gradient-to-b from-slate-800 to-slate-900/90 shadow-lg">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15 border border-amber-500/30">
                          <svg className="h-4 w-4 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 12h18M12 3v18" />
                          </svg>
                        </span>
                        <span className="text-sm font-medium text-slate-200">Total cholesterol</span>
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border shrink-0 ${badgeToneClass(cholInsight.tone)}`}>
                        {cholInsight.label}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-slate-100 tabular-nums">{metrics.cholesterol}</span>
                      <span className="text-sm text-slate-400">mg/dL</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Desirable total cholesterol is often &lt;200 mg/dL (context-dependent).</p>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">{cholInsight.note}</p>
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
