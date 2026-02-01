"use client"

import React from "react"
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
  if (!prediction) return null

  const disease = prediction.predicted_disease || prediction.predictedDisease || "Unknown Condition"
  const confidence = prediction.confidence_percent || prediction.confidencePercent || 0
  const riskLevel = prediction.risk_level || prediction.riskLevel || "Unknown"
  const explanation = prediction.ai_explanation || prediction.aiExplanation || ""
  
  // Extract first sentence of explanation for summary
  const summary = explanation.split('.')[0] + '.'

  const getRiskColor = (level: string) => {
    const l = level.toLowerCase()
    if (l.includes("high")) return "text-red-600 bg-red-100"
    if (l.includes("medium")) return "text-yellow-600 bg-yellow-100"
    return "text-green-600 bg-green-100"
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Prediction Analysis Complete"
      size="lg"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onViewHistory}>
            View History
          </Button>
          <Button onClick={onViewDetails}>
            View Detailed Results
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="flex items-center gap-4 p-4 bg-medical-50 rounded-lg border border-medical-100">
          <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-medical-900">Analysis Successful</h3>
            <p className="text-sm text-medical-600">
              Your health data has been processed and saved to your history.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-medical-500 uppercase tracking-wider mb-2">Predicted Condition</h4>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold text-medical-900">{disease}</span>
              <span className={`px-2 py-1 rounded-full text-xs font-bold ${getRiskColor(riskLevel)}`}>
                {riskLevel} Risk
              </span>
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-medical-500 uppercase tracking-wider mb-2">Confidence Score</h4>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-medical-600 rounded-full"
                  style={{ width: `${confidence}%` }}
                />
              </div>
              <span className="text-sm font-bold text-medical-700">{Math.round(confidence)}%</span>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-medical-500 uppercase tracking-wider mb-2">Key Insight</h4>
          <p className="text-medical-700 leading-relaxed bg-white border border-medical-100 p-4 rounded-lg">
            {summary}
          </p>
        </div>
      </div>
    </Modal>
  )
}
