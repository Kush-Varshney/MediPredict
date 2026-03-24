"use client"

import React, { useMemo } from "react"
import { Modal } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"

interface PredictionSuccessModalProps {
  isOpen: boolean
  onClose: () => void
  prediction: any
  onViewDetails: () => void
  onViewHistory: () => void
}

export default function PredictionSuccessModal({
  isOpen,
  onClose,
  prediction,
  onViewDetails,
  onViewHistory,
}: PredictionSuccessModalProps) {
  const derived = useMemo(() => {
    if (!prediction || typeof prediction !== "object") return null

    const disease = prediction.predicted_disease || prediction.predictedDisease || "Unknown Condition"
    const explanation = String(prediction.ai_explanation || prediction.aiExplanation || "").trim()
    const modelType = String(prediction.model_type || prediction.modelType || "").toLowerCase()
    const predictionSource = String(prediction.prediction_source || "").toLowerCase()
    const persisted = prediction.persisted

    const confidencePctRaw = prediction.confidence_percent ?? prediction.confidencePercent
    const confidenceValRaw = prediction.confidence
    const confidenceSrc = prediction.confidence_source
    const hasPercent = Number.isFinite(Number(confidencePctRaw))
    const hasUnit = Number.isFinite(Number(confidenceValRaw))
    const confidencePercent = hasPercent
      ? Math.max(0, Math.min(100, Number(confidencePctRaw)))
      : hasUnit
        ? Math.max(0, Math.min(100, Number(confidenceValRaw) * 100))
        : null

    const hasSomeNumeric = hasPercent || hasUnit
    const looksLikeFailure =
      modelType.includes("failure") ||
      predictionSource === "failure_fallback" ||
      /medical consultation required|consult a (healthcare|doctor)/i.test(disease) ||
      /automated analysis failed|analysis failed|temporarily unavailable/i.test(explanation)

    let confidenceAvailable = confidenceSrc !== "unavailable" && hasSomeNumeric
    if (looksLikeFailure && (confidencePercent === null || confidencePercent === 0)) {
      confidenceAvailable = false
    }

    const banner = looksLikeFailure
      ? {
          tone: "amber" as const,
          title: "Result limited",
          body:
            "The automated model could not produce a reliable prediction. Your entry may still be saved for your records. Please use clinical judgment and consult a professional.",
        }
      : {
          tone: "emerald" as const,
          title: "Prediction ready",
          body:
            persisted === false
              ? "Analysis complete. Connect your database to persist history, or review details below."
              : "Your health data was analyzed. Review detailed results and recommendations below.",
        }

    let summary = "No narrative insight was generated for this run."
    if (explanation) {
      const dot = explanation.indexOf(".")
      summary = dot >= 0 ? explanation.slice(0, dot + 1) : explanation
    }

    const riskLevel = prediction.risk_level || prediction.riskLevel || "Unknown"
    const clinicalRisk = prediction.clinical_risk || "Unknown"

    return {
      disease,
      explanation,
      riskLevel,
      clinicalRisk,
      confidencePercent,
      confidenceAvailable,
      looksLikeFailure,
      banner,
      summary,
    }
  }, [prediction])

  if (!derived) return null

  const getRiskBadgeClass = (level: string) => {
    const l = (level || "").toLowerCase()
    if (l.includes("high")) return "bg-red-500/20 text-red-200 border border-red-500/40"
    if (l.includes("medium")) return "bg-amber-500/20 text-amber-200 border border-amber-500/40"
    if (l.includes("low")) return "bg-emerald-500/20 text-emerald-200 border border-emerald-500/40"
    return "bg-slate-700/60 text-slate-300 border border-slate-600"
  }

  const barWidth =
    derived.confidenceAvailable && derived.confidencePercent !== null ? derived.confidencePercent : 0
  const showIndeterminate = !derived.confidenceAvailable || derived.confidencePercent === null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Prediction Analysis Complete"
      size="lg"
      footer={
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
          <Button variant="outline" onClick={onViewHistory} className="w-full sm:w-auto">
            View History
          </Button>
          <Button onClick={onViewDetails} className="w-full sm:w-auto">
            View Detailed Results
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <div
          className={
            derived.banner.tone === "amber"
              ? "flex items-start gap-4 p-4 rounded-xl border border-amber-500/35 bg-amber-500/10"
              : "flex items-start gap-4 p-4 rounded-xl border border-emerald-500/35 bg-emerald-500/10"
          }
        >
          <div
            className={
              derived.banner.tone === "amber"
                ? "flex-shrink-0 w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center"
                : "flex-shrink-0 w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center"
            }
          >
            {derived.banner.tone === "amber" ? (
              <svg className="w-6 h-6 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-100">{derived.banner.title}</h3>
            <p className="text-sm text-slate-400 mt-1 leading-relaxed">{derived.banner.body}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-xs font-medium text-cyan-400/90 uppercase tracking-wider mb-2">Predicted condition</h4>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-2xl font-bold text-slate-100">{derived.disease}</span>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getRiskBadgeClass(derived.riskLevel)}`}>
                {derived.riskLevel} risk
              </span>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getRiskBadgeClass(derived.clinicalRisk)}`}>
                {derived.clinicalRisk} clinical
              </span>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-medium text-cyan-400/90 uppercase tracking-wider mb-2">Confidence</h4>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                {showIndeterminate ? (
                  <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-cyan-600/40 to-teal-600/40 animate-pulse" />
                ) : (
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-teal-500 transition-all duration-300"
                    style={{ width: `${barWidth}%` }}
                  />
                )}
              </div>
              <span className="text-sm font-bold text-slate-200 tabular-nums min-w-[5rem] text-right">
                {derived.confidenceAvailable && derived.confidencePercent !== null
                  ? `${Math.round(derived.confidencePercent)}%`
                  : "Unavailable"}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {derived.confidenceAvailable
                ? "Estimate reflects model or advisory output, not a clinical diagnosis."
                : "No reliable score for this run—see full results for context."}
            </p>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-medium text-cyan-400/90 uppercase tracking-wider mb-2">Key insight</h4>
          <p className="text-slate-300 text-sm leading-relaxed bg-slate-800/80 border border-slate-700 p-4 rounded-xl">
            {derived.summary}
          </p>
        </div>
      </div>
    </Modal>
  )
}
