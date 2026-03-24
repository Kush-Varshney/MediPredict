"use client"

import React, { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface Prediction {
  _id: string
  createdAt: string
  predictedDisease?: string
  predicted_disease?: string
  confidencePercent?: number
  confidence_percent?: number
  riskLevel?: string
  risk_level?: string
  symptoms: string[]
  age: number
  gender: string
  weight: number
  bloodPressureSystolic?: number
  bloodPressureDiastolic?: number
  glucose?: number
  cholesterol?: number
  precautions?: string[]
  diet?: string[]
  aiExplanation?: string
  ai_explanation?: string
}

export default function HistoryList({ predictions }: { predictions: Prediction[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  const getRiskColor = (level?: string) => {
    const l = (level || "").toLowerCase()
    if (l.includes("high")) return "bg-red-500/15 text-red-200 border-red-500/40"
    if (l.includes("medium")) return "bg-amber-500/15 text-amber-200 border-amber-500/40"
    if (l.includes("low")) return "bg-emerald-500/15 text-emerald-200 border-emerald-500/40"
    return "bg-slate-700/40 text-slate-200 border-slate-600"
  }

  if (predictions.length === 0) {
    return (
      <div className="text-center py-12 bg-slate-900/70 rounded-lg border border-slate-700 shadow-sm">
        <div className="mx-auto w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-slate-200 font-medium">No history records found.</p>
        <p className="text-slate-400 text-sm mt-1">Make a new prediction to populate your history.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {predictions.map((pred, idx) => {
        const id = pred._id || `pred-${idx}`
        const isExpanded = expandedId === id
        const disease = pred.predictedDisease || pred.predicted_disease || "Unknown"
        const confidence = Math.round(pred.confidencePercent || pred.confidence_percent || 0)
        const risk = pred.riskLevel || pred.risk_level || "Unknown"
        const date = new Date(pred.createdAt).toLocaleDateString(undefined, {
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
        const explanation = pred.aiExplanation || pred.ai_explanation
        const precautions = pred.precautions || []
        
        return (
          <Card key={id} className={`border-slate-700 transition-all duration-200 ${isExpanded ? 'ring-2 ring-cyan-500 shadow-lg' : 'hover:shadow-md'}`}>
            <CardContent className="p-0">
              {/* Header / Summary View */}
              <div 
                className="p-5 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
                onClick={() => toggleExpand(id)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-lg font-bold text-slate-100">{disease}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${getRiskColor(risk)}`}>
                      {risk} Risk
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-400">
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {date}
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {confidence}% Confidence
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="hidden md:block text-right">
                    <div className="text-xs text-slate-500 uppercase tracking-wider">Symptoms</div>
                    <div className="text-sm text-slate-300 max-w-[200px] truncate">
                      {pred.symptoms.join(", ")}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="shrink-0">
                    {isExpanded ? "Less Details" : "View Details"}
                  </Button>
                </div>
              </div>

              {/* Expanded Details View */}
              {isExpanded && (
                <div className="px-5 pb-5 border-t border-slate-700 bg-slate-900/60 animate-in slide-in-from-top-2 duration-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                    
                    {/* Health Snapshot */}
                    <div>
                      <h4 className="text-sm font-bold text-slate-100 mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        Health Snapshot
                      </h4>
                      <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 grid grid-cols-2 gap-y-2 text-sm">
                        <div className="text-slate-400">Age/Gender:</div>
                        <div className="text-slate-100 font-medium">{pred.age} / {pred.gender}</div>
                        
                        <div className="text-slate-400">Weight:</div>
                        <div className="text-slate-100 font-medium">{pred.weight} kg</div>
                        
                        <div className="text-slate-400">Blood Pressure:</div>
                        <div className="text-slate-100 font-medium">
                          {pred.bloodPressureSystolic}/{pred.bloodPressureDiastolic} mmHg
                        </div>
                        
                        <div className="text-slate-400">Glucose:</div>
                        <div className="text-slate-100 font-medium">{pred.glucose} mg/dL</div>
                        
                        <div className="text-slate-400">Cholesterol:</div>
                        <div className="text-slate-100 font-medium">{pred.cholesterol} mg/dL</div>
                      </div>
                      
                      <div className="mt-4">
                        <h4 className="text-sm font-bold text-slate-100 mb-2">Reported Symptoms</h4>
                        <div className="flex flex-wrap gap-2">
                          {pred.symptoms.map((s, i) => (
                            <span key={i} className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-slate-200">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* AI Insights */}
                    <div>
                      <h4 className="text-sm font-bold text-slate-100 mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                        AI Insights
                      </h4>
                      {explanation && (
                        <div className="mb-4 text-sm text-slate-200 leading-relaxed bg-slate-800 p-3 rounded-lg border border-slate-700">
                          {explanation}
                        </div>
                      )}
                      
                      {precautions.length > 0 && (
                        <div>
                          <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Recommended Actions</h5>
                          <ul className="space-y-1">
                            {precautions.slice(0, 3).map((p, i) => (
                              <li key={i} className="text-sm text-slate-200 flex items-start gap-2">
                                <span className="text-green-500 mt-0.5">✓</span>
                                {p}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
