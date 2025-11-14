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
      <Card className="bg-white shadow-lg border-medical-200 mb-6">
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
  const topK: Array<{ label: string; probability: number }> = Array.isArray(topCondition?.top_k)
    ? topCondition.top_k
    : []
  const apiError = topCondition?.error || topCondition?.message

  return (
    <Card className="bg-white shadow-lg border-medical-200 mb-6">
      <div className="p-6">
        <h2 className="text-2xl font-bold text-medical-900 mb-6">Prediction Results</h2>

        {apiError && (
          <div className="mb-4 p-4 rounded border border-red-200 bg-red-50 text-red-800 text-sm">
            {typeof apiError === "string" ? apiError : "Prediction failed. Please try again later."}
          </div>
        )}

        {!apiError && (
          <div className="bg-gradient-to-r from-medical-50 to-medical-100 rounded-lg p-6 mb-6 border border-medical-200">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-medical-600 mb-1">Most Likely Disease</p>
                <h3 className="text-3xl font-bold text-medical-900">{predictedDisease}</h3>
                <p className="text-medical-600 mt-2">Confidence: {confidencePctText}</p>
                <p className="text-medical-600 mt-1">Risk Level: {riskLevel}</p>
              </div>
              <div className="text-right">
                <div className="w-24 h-24 rounded-full bg-medical-600 flex items-center justify-center">
                  <span className="text-3xl font-bold text-white">{confidencePctBadge}</span>
                </div>
              </div>
            </div>
            {topK.length > 1 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-medical-700 mb-2">Other likely conditions</p>
                <ul className="list-disc list-inside text-sm text-medical-700">
                  {topK.slice(1).map((t, i) => (
                    <li key={`${t.label}-${i}`}>
                      {t.label} — {(t.probability * 100).toFixed(1)}%
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="mt-4">
          <h3 className="text-lg font-semibold text-medical-900 mb-2">Provided Symptoms</h3>
          <div className="flex flex-wrap gap-2">
            {safeSymptoms.map((s) => (
              <span
                key={s}
                className="bg-medical-50 border border-medical-200 px-2 py-1 rounded text-sm text-medical-700"
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

        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Disclaimer:</strong> This prediction is for informational purposes only and should not replace
            professional medical advice. Please consult with a healthcare provider for accurate diagnosis and treatment.
          </p>
        </div>
      </div>
    </Card>
  )
}
