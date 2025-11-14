"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import SymptomForm from "@/components/symptom-form"
import PredictionResults from "@/components/prediction-results"
import { HealthInsightsSkeleton } from "@/components/health-insights"
import Header from "@/components/header"
import ErrorBoundary from "@/components/error-boundary"
import HealthInsightsPlaceholder from "@/components/health-insights-placeholder"

const HealthInsights = dynamic(() => import("@/components/health-insights"), {
  // Show skeleton while code loads
  loading: () => <HealthInsightsSkeleton />,
  ssr: true,
})

export default function Home() {
  const [prediction, setPrediction] = useState(null)
  const [loading, setLoading] = useState(false)
  const [symptoms, setSymptoms] = useState<string[]>([])
  const [error, setError] = useState<string>("")
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)

  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token")
      setIsAuthenticated(!!token)
    }
  }, [])

  // Save prediction to localStorage for offline access (only if authenticated)
  // Note: Authenticated users should use the dashboard which fetches from API
  useEffect(() => {
    if (prediction && isAuthenticated && typeof window !== "undefined") {
      // Use a small delay to ensure symptoms state is updated
      const timeoutId = setTimeout(() => {
        try {
          const history = JSON.parse(localStorage.getItem("predictions_history") || "[]")
          const newEntry = {
            id: Date.now().toString(),
            ...prediction,
            symptoms: symptoms || [], // Ensure symptoms is an array
            timestamp: new Date().toISOString(),
          }
          history.unshift(newEntry)
          // Keep last 50 predictions
          localStorage.setItem("predictions_history", JSON.stringify(history.slice(0, 50)))
        } catch (e) {
          console.error("[Home] Failed to save prediction to local storage:", e)
        }
      }, 100) // Small delay to avoid race condition
      
      return () => clearTimeout(timeoutId)
    }
  }, [prediction, symptoms, isAuthenticated])

  const handleSubmit = async (payload: {
    age: number
    gender: "M" | "F" | "Other"
    weight: number
    bloodPressureSystolic: number
    bloodPressureDiastolic: number
    glucose: number
    cholesterol: number
    symptoms: string[]
  }) => {
    // Prevent submissions for unauthenticated users (defense-in-depth)
    if (!isAuthenticated) {
      setError("Authentication required. Please sign in to use prediction features.")
      return
    }
    if (payload.age < 1 || payload.age > 150) {
      setError("Age must be between 1 and 150")
      return
    }
    if (payload.weight < 20 || payload.weight > 300) {
      setError("Weight must be between 20 and 300 kg")
      return
    }
    if (payload.bloodPressureSystolic < 50 || payload.bloodPressureSystolic > 250) {
      setError("Systolic BP must be between 50 and 250")
      return
    }
    if (payload.bloodPressureDiastolic < 30 || payload.bloodPressureDiastolic > 150) {
      setError("Diastolic BP must be between 30 and 150")
      return
    }
    if (payload.glucose < 40 || payload.glucose > 400) {
      setError("Glucose must be between 40 and 400 mg/dL")
      return
    }
    if (payload.cholesterol < 50 || payload.cholesterol > 500) {
      setError("Cholesterol must be between 50 and 500 mg/dL")
      return
    }

    setLoading(true)
    setError("")
    // Set symptoms before API call to avoid race condition
    setSymptoms(payload.symptoms || [])
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
      const response = await fetch("/api/predict", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      })

      let errorData: any = {}
      try {
        errorData = await response.clone().json()
      } catch {
        errorData = { error: `Server returned ${response.status}: ${response.statusText}` }
      }

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          setError("Please sign in to save predictions to your account. Guest predictions are saved locally.")
        } else if (response.status >= 500) {
          setError("Server error. Make sure the backend is running on port 3001.")
        } else {
          setError(errorData.message || errorData.error || "Failed to get prediction")
        }
        setLoading(false)
        return
      }

      if (!errorData || typeof errorData !== "object") {
        setError("Invalid response format from server")
        setLoading(false)
        return
      }

      if (errorData.error || errorData.message) {
        setError(errorData.message || errorData.error || "Failed to get prediction")
        setLoading(false)
        return
      }
      setPrediction(errorData)
    } catch (error) {
      console.error("[v0] Prediction error:", error)
      const message = error instanceof Error ? error.message : String(error)
      setError(`Network error: ${message}. Make sure the backend is running on port 3001.`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-medical-50 to-medical-100">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            {isAuthenticated ? (
              <SymptomForm onSubmit={handleSubmit} loading={loading} />
            ) : (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold text-medical-700">Welcome to MediPredict</h2>
                <p className="text-medical-500 mt-2">
                  Please sign in or create an account to access AI-powered health insights and disease prediction features.
                </p>
              </div>
            )}
          </div>
          <div className="lg:col-span-2">
            {error && (
              <div className="mb-4 p-4 rounded border border-red-200 bg-red-50 text-red-800 text-sm">{error}</div>
            )}
            {loading && (
              <div className="flex items-center justify-center h-96 bg-white rounded-lg shadow-lg">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-medical-600 mx-auto mb-4"></div>
                  <p className="text-medical-600 font-medium">Analyzing symptoms...</p>
                </div>
              </div>
            )}
            {prediction && !loading && (
              <ErrorBoundary>
                <PredictionResults prediction={prediction} symptoms={symptoms} />
                <HealthInsights prediction={prediction} />
              </ErrorBoundary>
            )}
            {!prediction && !loading && !error && (
              isAuthenticated ? (
                <div className="bg-white rounded-lg shadow-lg p-8 text-center h-96 flex items-center justify-center">
                  <div>
                    <p className="text-medical-600 text-lg font-medium">Enter your symptoms to get started</p>
                    <p className="text-medical-400 mt-2">
                      Our AI will analyze your symptoms and provide health insights
                    </p>
                  </div>
                </div>
              ) : (
                <HealthInsightsPlaceholder />
              )
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
