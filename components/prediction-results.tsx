"use client"

import { Card } from "@/components/ui/card"

interface PredictionResultsProps {
  prediction: any
  symptoms: string[]
}

export default function PredictionResults({ prediction, symptoms }: PredictionResultsProps) {
  const topCondition = prediction
  const safeSymptoms = Array.isArray(symptoms) ? symptoms : symptoms ? [String(symptoms)] : []

  if (!topCondition || typeof topCondition !== "object") {
    return (
      <Card className="bg-slate-900/70 shadow-lg border-slate-700 mb-6">
        <div className="p-6">
          <div className="p-4 rounded border border-red-200 bg-red-50 text-red-800 text-sm">
            Invalid prediction data received. Please try again.
          </div>
        </div>
      </Card>
    )
  }

  const rawConfidence = topCondition?.confidence
  const rawConfidencePercent = topCondition?.confidence_percent
  const numericConfidence = typeof rawConfidence === "number" ? rawConfidence : Number(rawConfidence)
  const numericConfidencePercent = Number.isFinite(rawConfidencePercent)
    ? Number(rawConfidencePercent)
    : Number.isFinite(numericConfidence)
      ? Number((numericConfidence * 100).toFixed(2))
      : Number.NaN
  const hasConfidence = Number.isFinite(numericConfidence)
  const confidencePctText = Number.isFinite(numericConfidencePercent) ? numericConfidencePercent.toFixed(1) + "%" : "—"
  const confidencePctBadge = Number.isFinite(numericConfidencePercent)
    ? Math.round(numericConfidencePercent) + "%"
    : "—"
  const predictedDisease =
    topCondition?.predicted_disease || topCondition?.predictedDisease || topCondition?.prediction || "No result"
  const riskLevel = topCondition?.risk_level || topCondition?.riskLevel || "Unknown"
  const matchedSymptoms: number | undefined = topCondition?.matched_symptoms
  const usedSymptomsPath: boolean | undefined = topCondition?.used_symptoms_path
  const clinicalRisk = topCondition?.clinical_risk || "Unknown"
  const analysisMode = topCondition?.analysis_mode || "unknown"
  const inputSnapshot = topCondition?.input_snapshot || {}
  const confidenceSource = topCondition?.confidence_source || "unknown"
  const uncertaintyLevel = topCondition?.uncertainty?.uncertainty_level || "Unknown"
  const symptomEvidence = topCondition?.symptom_evidence || {}
  const topK: Array<{ label: string; probability: number }> = Array.isArray(topCondition?.top_k)
    ? topCondition.top_k
    : []
  const apiError = topCondition?.error || topCondition?.message
  const bpKnown =
    inputSnapshot.bloodPressureSystolic !== null &&
    inputSnapshot.bloodPressureSystolic !== undefined &&
    inputSnapshot.bloodPressureDiastolic !== null &&
    inputSnapshot.bloodPressureDiastolic !== undefined
  const glucoseKnown = inputSnapshot.glucose !== null && inputSnapshot.glucose !== undefined
  const cholesterolKnown = inputSnapshot.cholesterol !== null && inputSnapshot.cholesterol !== undefined

  return (
    <Card className="bg-slate-900/70 shadow-lg border-slate-700 mb-6">
      <div className="p-6">
        <h2 className="text-2xl font-bold text-slate-100 mb-6">Prediction Results</h2>

        {apiError && (
          <div className="mb-4 p-4 rounded border border-red-200 bg-red-50 text-red-800 text-sm">
            {typeof apiError === "string" ? apiError : "Prediction failed. Please try again later."}
          </div>
        )}

        {!apiError && (
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-lg p-6 mb-6 border border-slate-700">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400 mb-1">Most Likely Disease</p>
                <h3 className="text-3xl font-bold text-slate-100">{predictedDisease}</h3>
                <p className="text-slate-300 mt-2">Confidence: {confidencePctText}</p>
                <p className="text-slate-300 mt-1">Risk Level: {riskLevel}</p>
                <p className="text-slate-300 mt-1">Clinical Risk: {clinicalRisk}</p>
              </div>
              <div className="text-right">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center">
                  <span className="text-3xl font-bold text-white">{confidencePctBadge}</span>
                </div>
              </div>
            </div>
            {topK.length > 1 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-slate-300 mb-2">Other likely conditions</p>
                <ul className="list-disc list-inside text-sm text-slate-300">
                  {topK.slice(1).map((t, i) => (
                    <li key={`${t.label}-${i}`}>
                      {t.label} — {(t.probability * 100).toFixed(1)}%
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2">
                <p className="text-xs text-slate-400">Confidence Source</p>
                <p className="text-sm font-semibold text-slate-200">{String(confidenceSource).replaceAll("_", " ")}</p>
              </div>
              <div className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2">
                <p className="text-xs text-slate-400">Prediction Uncertainty</p>
                <p className="text-sm font-semibold text-slate-200">{uncertaintyLevel}</p>
              </div>
              <div className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2">
                <p className="text-xs text-slate-400">Symptom Match Rate</p>
                <p className="text-sm font-semibold text-slate-200">
                  {typeof symptomEvidence?.match_rate === "number" ? `${(symptomEvidence.match_rate * 100).toFixed(0)}%` : "N/A"}
                </p>
              </div>
            </div>
            <div className="mt-3 rounded-md border border-slate-700 bg-slate-800 px-3 py-2">
              <p className="text-xs text-slate-400">Analysis Mode</p>
              <p className="text-sm font-semibold text-slate-200">{String(analysisMode).replaceAll("_", " ")}</p>
              <p className="text-xs text-slate-400 mt-1">
                Data used: Symptoms, BP {bpKnown ? "provided" : "unknown"}, Glucose {glucoseKnown ? "provided" : "unknown"},
                {" "}Cholesterol {cholesterolKnown ? "provided" : "unknown"}
              </p>
            </div>
          </div>
        )}

        <div className="mt-4">
          <h3 className="text-lg font-semibold text-slate-100 mb-2">Provided Symptoms</h3>
          <div className="flex flex-wrap gap-2">
            {safeSymptoms.map((s) => (
              <span
                key={s}
                className="bg-slate-800 border border-slate-700 px-2 py-1 rounded text-sm text-slate-200"
              >
                {s}
              </span>
            ))}
          </div>
        </div>

        {!!usedSymptomsPath && matchedSymptoms === 0 && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm text-yellow-800">
              None of your selected symptoms matched the model’s vocabulary. The result may rely more on vitals; try
              selecting different or more specific symptoms.
            </p>
          </div>
        )}
        {!!Array.isArray(symptomEvidence?.unmatched) && symptomEvidence.unmatched.length > 0 && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded">
            <p className="text-sm text-amber-800">
              Some symptoms could not be mapped to the ML vocabulary: {symptomEvidence.unmatched.slice(0, 4).join(", ")}
              {symptomEvidence.unmatched.length > 4 ? "..." : ""}.
            </p>
          </div>
        )}

        <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <p className="text-sm text-amber-100">
            <strong>Disclaimer:</strong> This prediction is for informational purposes only and should not replace
            professional medical advice. Please consult with a healthcare provider for accurate diagnosis and treatment.
          </p>
        </div>
      </div>
    </Card>
  )
}
